import { runNewsResearch, trimForPrompt } from '@linkedinpost/researcher';
import type { ResearchArticleRef } from '@linkedinpost/researcher';
import { extractArticleInsights } from './players/articleInsights';
import { buildRequirementReport } from './players/requirementReport';
import { loadBundledRepository } from './players/patternRepository';
import { findPattern, recordPatternOutcome } from './players/patternFinder';
import { createVariants } from './players/creator';
import { reviewContent } from './players/review';
import { scoreDraftQuality } from './players/qualityScorer';
import { relateImages } from './players/imageRelator';
import { buildCandidatesFromRelator } from './players/imagePicker';
import { runEnrichment } from './modules/_shared/orchestrator';
import { createEnrichedVariants } from './modules/_shared/creator';
import { selectTopVariants } from './modules/_shared/selector';
import { formatForChannel } from './modules/channel-adapter/index';
import { FEATURE_ENRICHMENT } from '../../worker/src/generated/features';
import type { Env, GenerateRequest, GenerateResponse, ComposableAssets, PerVariantImageCandidates, ImageCandidate, TextVariant, NodeRunRecord } from './types';
import { resolveGenerationWorkerLlmRef } from './llmFromWorker';
import { extractHashtagsFromVariants } from './modules/_shared/types';
import { withRetry } from './players/retryUtils';

const EMPTY_ASSETS: ComposableAssets = {
  brandContext: '',
  globalRules: '',
  fewShotExamples: '',
  reviewChecklist: [],
  authorProfile: '',
};

export async function runPipeline(
  req: GenerateRequest,
  env: Env,
  db: D1Database,
  onProgress?: (step: string, label: string) => void,
): Promise<GenerateResponse> {
  const trace: Record<string, unknown> = {};
  const timings: Record<string, number> = {};
  const runId = crypto.randomUUID();
  const stageStart = (name: string) => { timings[name] = Date.now(); onProgress?.('stage', name); };
  const stageEnd = (name: string) => { timings[name] = Date.now() - timings[name]; };

  // 0. RequirementReport
  stageStart('requirementReport');
  const report = buildRequirementReport(req);
  trace.requirementReport = report;
  stageEnd('requirementReport');

  // 1. LLM ref from shared provider catalog
  stageStart('llm_ref');
  onProgress?.('llm_ref', 'Resolving LLM provider...');
  const llmRef = await resolveGenerationWorkerLlmRef(env, req.llm);
  trace.llmRef = llmRef;
  stageEnd('llm_ref');

  // 2. PatternRepository + PatternFinder
  stageStart('pattern');
  onProgress?.('pattern', `Finding best content pattern (${llmRef.provider}/${llmRef.model})...`);
  const repo = loadBundledRepository();
  const finder = await withRetry(
    () => findPattern(repo, report, env, llmRef, req.preferPatternId),
    {
      maxAttempts: 2,
      baseDelayMs: 500,
      maxDelayMs: 5000,
      retryIf: (err) => /\bstatus 429\b|\bstatus 5\d\d\b|rate limit|overloaded|timeout|unavailable/i.test(String(err)),
    },
  );
  trace.patternFinder = finder;
  stageEnd('pattern');

  const pattern = repo.getById(finder.primaryId);
  if (!pattern) throw new Error(`Pattern not found: ${finder.primaryId}`);

  // 3. Research (optional — only when factual flag set)
  onProgress?.('research', 'Running news research...');
  let research: ResearchArticleRef[] = [];
  const researchTask = async () => {
    if (report.factual && req.newsResearchConfig) {
      try {
        const windowStart = req.newsWindowStart ?? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
        const windowEnd = req.newsWindowEnd ?? new Date().toISOString().slice(0, 10);
        const result = await withRetry(
          () => runNewsResearch(env, req.newsResearchConfig, {
            topicId: runId,
            topic: report.topic,
            date: windowEnd,
            windowStart,
            windowEnd,
          }),
          {
            maxAttempts: 2,
            baseDelayMs: 1000,
            maxDelayMs: 10000,
            retryIf: (err) => /\bstatus 429\b|\bstatus 5\d\d\b|rate limit|overloaded|timeout|unavailable/i.test(String(err)),
          },
        );
        research = trimForPrompt(result.articles);
        trace.research = { articleCount: research.length, warnings: result.warnings };
        // Extract insights from research articles for better post drafts
        if (research.length > 0) {
          const { insights, hashtags } = extractArticleInsights(research, report.topic);
          trace.articleInsights = { ...insights, suggestedHashtags: hashtags };
        }
      } catch (e) {
        trace.researchError = String(e);
      }
    }
  };

  let variants: TextVariant[];
  let nodeRunRecords: NodeRunRecord[] = [];
  const assets = req.composableAssets ?? EMPTY_ASSETS;

  if (FEATURE_ENRICHMENT) {
    // --- ENRICHMENT PATH ---
    // Run research and enrichment in parallel
    stageStart('enrichment');
    onProgress?.('enrichment', 'Running content enrichment...');
    const enabledSkillIds = req.enrichmentSkills && req.enrichmentSkills.length > 0
      ? new Set(req.enrichmentSkills.filter((s) => s.enabled !== false).map((s) => s.id))
      : undefined;
    const localDocuments = req.contextDocuments?.map(d => ({ name: d.name, content: d.content }));
    const [, enrichmentResult] = await Promise.all([
      researchTask(),
      runEnrichment(report, pattern, env, llmRef, enabledSkillIds, localDocuments),
    ]);
    const enrichmentBundle = enrichmentResult.bundle;
    nodeRunRecords = enrichmentResult.records;
    trace.enrichmentBundle = enrichmentBundle;
    stageEnd('enrichment');

    // Enhanced Creator (4 parallel groups -> 8-12 variants)
    stageStart('creator');
    onProgress?.('creator', 'Generating content variants...');
    const allVariants = await createEnrichedVariants(
      pattern, report, research, enrichmentBundle, assets, env, llmRef,
    );
    trace.creatorVariantCount = allVariants.length;
    trace.creatorGroups = [...new Set(allVariants.map((v) => v.emphasisGroup))];
    stageEnd('creator');

    // Selector (rule filter + LLM judge -> top 4)
    stageStart('selector');
    onProgress?.('selector', 'Selecting top variants...');
    const scored = await withRetry(
      () => selectTopVariants(allVariants, enrichmentBundle, report, env, llmRef),
      {
        maxAttempts: 2,
        baseDelayMs: 500,
        maxDelayMs: 8000,
        retryIf: (err) => /\bstatus 429\b|\bstatus 5\d\d\b|rate limit|overloaded|timeout|unavailable/i.test(String(err)),
      },
    );
    trace.selectorScores = scored.map((v) => ({ label: v.label, ...v.scores }));
    stageEnd('selector');

    // Channel adapter
    stageStart('channelAdapter');
    const formatted = scored.map((v) => ({
      ...v,
      text: formatForChannel(v, enrichmentBundle.typography, report.channel).formattedText,
    }));
    stageEnd('channelAdapter');

    if (formatted.length === 0) {
      throw new Error('Content generation produced no usable variants. All generation groups failed — check LLM provider configuration and try again.');
    }
    variants = formatted;
  } else {
    // --- LEGACY PATH ---
    stageStart('research');
    await researchTask();
    stageEnd('research');
    stageStart('creator');
    onProgress?.('creator', 'Generating content variants...');
    variants = await createVariants(pattern, report, research, assets, env, llmRef);
    trace.creatorVariantCount = variants.length;
    stageEnd('creator');
  }

  // 5. Review
  stageStart('review');
  onProgress?.('review', 'Reviewing content...');
  const review = reviewContent(variants, report);
  trace.review = review;
  await recordPatternOutcome(env, finder.primaryId, review.verdict);
  stageEnd('review');

  // 5b. Quality scoring (parallel with review, before image generation)
  stageStart('qualityScoring');
  const qualityScores = scoreDraftQuality(variants);
  trace.qualityScores = qualityScores.map(q => ({ overall: q.overall, passed: q.passed }));
  stageEnd('qualityScoring');

  // 5c. Hashtag extraction from content
  stageStart('hashtags');
  const hashtagResult = extractHashtagsFromVariants(variants);
  trace.hashtags = hashtagResult;
  stageEnd('hashtags');

  // 6. ImageRelator + ImagePicker (per-variant, parallel)
  stageStart('images');
  let perVariantImageCandidates: PerVariantImageCandidates[] = [];
  let imageCandidates: ImageCandidate[] = [];
  if (!req.skipImages) {
    onProgress?.('images', 'Finding relevant images...');
    const relatorResults = await Promise.all(
      variants.map((v) => withRetry(
        () => relateImages(v, pattern, report, env, llmRef),
        {
          maxAttempts: 2,
          baseDelayMs: 500,
          maxDelayMs: 5000,
          retryIf: (err) => /\bstatus 429\b|\bstatus 5\d\d\b|rate limit|overloaded|timeout|unavailable/i.test(String(err)),
        },
      )),
    );
    perVariantImageCandidates = await Promise.all(
      relatorResults.map(async (rel, i) => ({
        variantIndex: i,
        candidates: await buildCandidatesFromRelator(rel, i, env, req.imageGen),
      })),
    );
    imageCandidates = perVariantImageCandidates.flatMap((pv) => pv.candidates);
    trace.imageRelator = relatorResults.map((rel, i) => ({
      variantIndex: i,
      visualBrief: rel.visualBrief,
      styleHints: rel.styleHints,
      keywordCount: rel.searchKeywords.length,
    }));
    stageEnd('images');
  } else {
    trace.imageRelator = 'skipped';
    stageEnd('images');
  }

  // 7. Persist run to D1
  stageStart('persist');
  onProgress?.('saving', 'Saving run to database...');
  await withRetry(
    () => db
      .prepare(
        `INSERT INTO generation_runs
        (run_id, spreadsheet_id, topic, channel, pattern_id, pattern_runner_up,
         pattern_rationale, requirement_report_json, variants_json,
         image_candidates_json, review_json, trace_json, hashtags_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        runId,
        req.spreadsheetId ?? '',
        report.topic,
        report.channel,
        finder.primaryId,
        finder.runnerUpId,
        finder.rationale,
        JSON.stringify(report),
        JSON.stringify(variants),
        JSON.stringify(imageCandidates),
        JSON.stringify(review),
        JSON.stringify(trace),
        JSON.stringify(hashtagResult.topHashtags),
        'completed',
      )
      .run(),
    {
      maxAttempts: 3,
      baseDelayMs: 200,
      maxDelayMs: 3000,
      retryIf: (err) => /\bD1| Database| write| sqlite|constraint/i.test(String(err)),
    },
  );

  stageEnd('persist');
  trace.timings = timings;
  const totalMs = Object.values(timings).reduce((a, b) => a + b, 0);
  trace.totalPipelineMs = totalMs;

  return {
    runId,
    requirementReport: report,
    primaryPatternId: finder.primaryId,
    runnerUpPatternId: finder.runnerUpId,
    patternRationale: finder.rationale,
    variants,
    imageCandidates,
    perVariantImageCandidates,
    review,
    hashtags: hashtagResult.topHashtags,
    trace,
    nodeRuns: nodeRunRecords,
  };
}
