import { runNewsResearch, trimForPrompt } from '@linkedinpost/researcher';
import type { ResearchArticleRef } from '@linkedinpost/researcher';
import { buildRequirementReport } from './players/requirementReport';
import { loadBundledRepository } from './players/patternRepository';
import { findPattern } from './players/patternFinder';
import { createVariants } from './players/creator';
import { reviewContent } from './players/review';
import { relateImages } from './players/imageRelator';
import { buildCandidatesFromRelator } from './players/imagePicker';
import { runEnrichment } from './modules/_shared/orchestrator';
import { createEnrichedVariants } from './modules/_shared/creator';
import { selectTopVariants } from './modules/_shared/selector';
import { formatForChannel } from './modules/channel-adapter/index';
import { FEATURE_ENRICHMENT } from '../../worker/src/generated/features';
import type { Env, GenerateRequest, GenerateResponse, ComposableAssets, PerVariantImageCandidates, ImageCandidate, TextVariant, NodeRunRecord } from './types';
import { resolveGenerationWorkerLlmRef } from './llmFromWorker';

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
  const runId = crypto.randomUUID();

  // 0. RequirementReport
  const report = buildRequirementReport(req);
  trace.requirementReport = report;

  // 1. LLM ref from shared provider catalog
  onProgress?.('llm_ref', 'Resolving LLM provider...');
  const llmRef = await resolveGenerationWorkerLlmRef(env, req.llm);
  trace.llmRef = llmRef;

  // 2. PatternRepository + PatternFinder
  onProgress?.('pattern', `Finding best content pattern (${llmRef.provider}/${llmRef.model})...`);
  const repo = loadBundledRepository();
  const finder = await findPattern(repo, report, env, llmRef, req.preferPatternId);
  trace.patternFinder = finder;

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
        const result = await runNewsResearch(env, req.newsResearchConfig, {
          topicId: runId,
          topic: report.topic,
          date: windowEnd,
          windowStart,
          windowEnd,
        });
        research = trimForPrompt(result.articles);
        trace.research = { articleCount: research.length, warnings: result.warnings };
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
    onProgress?.('enrichment', 'Running content enrichment...');
    const [, enrichmentResult] = await Promise.all([
      researchTask(),
      runEnrichment(report, pattern, env, llmRef),
    ]);
    const enrichmentBundle = enrichmentResult.bundle;
    nodeRunRecords = enrichmentResult.records;
    trace.enrichmentBundle = enrichmentBundle;

    // Enhanced Creator (4 parallel groups -> 8-12 variants)
    onProgress?.('creator', 'Generating content variants...');
    const allVariants = await createEnrichedVariants(
      pattern, report, research, enrichmentBundle, assets, env, llmRef,
    );
    trace.creatorVariantCount = allVariants.length;
    trace.creatorGroups = [...new Set(allVariants.map((v) => v.emphasisGroup))];

    // Selector (rule filter + LLM judge -> top 4)
    onProgress?.('selector', 'Selecting top variants...');
    const scored = await selectTopVariants(allVariants, enrichmentBundle, report, env, llmRef);
    trace.selectorScores = scored.map((v) => ({ label: v.label, ...v.scores }));

    // Channel adapter
    const formatted = scored.map((v) => ({
      ...v,
      text: formatForChannel(v, enrichmentBundle.typography, report.channel).formattedText,
    }));

    variants = formatted;
  } else {
    // --- LEGACY PATH ---
    await researchTask();
    onProgress?.('creator', 'Generating content variants...');
    variants = await createVariants(pattern, report, research, assets, env, llmRef);
    trace.creatorVariantCount = variants.length;
  }

  // 5. Review
  onProgress?.('review', 'Reviewing content...');
  const review = reviewContent(variants, report);
  trace.review = review;

  // 6. ImageRelator + ImagePicker (per-variant, parallel)
  let perVariantImageCandidates: PerVariantImageCandidates[] = [];
  let imageCandidates: ImageCandidate[] = [];
  if (!req.skipImages) {
    onProgress?.('images', 'Finding relevant images...');
    const relatorResults = await Promise.all(
      variants.map((v) => relateImages(v, pattern, report, env, llmRef))
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
      keywordCount: rel.searchKeywords.length,
    }));
  } else {
    trace.imageRelator = 'skipped';
  }

  // 7. Persist run to D1
  onProgress?.('saving', 'Saving run to database...');
  await db
    .prepare(
      `INSERT INTO generation_runs
        (run_id, spreadsheet_id, topic, channel, pattern_id, pattern_runner_up,
         pattern_rationale, requirement_report_json, variants_json,
         image_candidates_json, review_json, trace_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      'completed',
    )
    .run();

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
    trace,
    nodeRuns: nodeRunRecords,
  };
}
