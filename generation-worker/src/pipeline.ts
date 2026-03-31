import { runNewsResearch, trimForPrompt } from '@linkedinpost/researcher';
import type { ResearchArticleRef } from '@linkedinpost/researcher';
import { buildRequirementReport } from './players/requirementReport';
import { loadBundledRepository } from './players/patternRepository';
import { findPattern } from './players/patternFinder';
import { createVariants } from './players/creator';
import { reviewContent } from './players/review';
import { relateImages } from './players/imageRelator';
import { buildCandidatesFromRelator } from './players/imagePicker';
import type { Env, GenerateRequest, GenerateResponse, ComposableAssets } from './types';

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
): Promise<GenerateResponse> {
  const trace: Record<string, unknown> = {};
  const runId = crypto.randomUUID();

  // 0. RequirementReport
  const report = buildRequirementReport(req);
  trace.requirementReport = report;

  // 1. PatternRepository + PatternFinder
  const repo = loadBundledRepository();
  const finder = await findPattern(repo, report, env, req.preferPatternId);
  trace.patternFinder = finder;

  const pattern = repo.getById(finder.primaryId);
  if (!pattern) throw new Error(`Pattern not found: ${finder.primaryId}`);

  // 2. Research (optional — only when factual flag set)
  let research: ResearchArticleRef[] = [];
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

  // 3. Creator
  const assets = req.composableAssets ?? EMPTY_ASSETS;
  const variants = await createVariants(pattern, report, research, assets, env);
  trace.creatorVariantCount = variants.length;

  // 4. Review
  const review = reviewContent(variants, report);
  trace.review = review;

  // 5. ImageRelator + ImagePicker
  const primaryVariant = variants[0];
  const relator = await relateImages(primaryVariant, pattern, report, env);
  const imageCandidates = buildCandidatesFromRelator(relator);
  trace.imageRelator = { visualBrief: relator.visualBrief, keywordCount: relator.searchKeywords.length };

  // 6. Persist run to D1
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
    review,
    trace,
  };
}
