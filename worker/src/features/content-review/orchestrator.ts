import type { D1Database } from '@cloudflare/workers-types';
import type { WorkerEnvForLlm } from '../../llm/types';
import type { SheetRow } from '../../generation/types';
import type { ContentReviewConfig, ContentReviewReport, ContentReviewVerdict } from './types';
import { DEFAULT_CONTENT_REVIEW_CONFIG } from './types';
import { runTextReview } from './textReviewRunner';
import { runImageReview } from './imageReviewRunner';
import { buildNewsContext } from './newsContextBuilder';
import { parseRowImageUrls } from '../../media/selectedImageUrls';
import { logLlmUsage } from '../../db/llm-usage';

function computeFingerprint(row: SheetRow): string {
  const parts = [
    row.topicId,
    row.selectedText || '',
    row.topic,
    (row.selectedImageUrlsJson || ''),
  ].join('|');
  // Simple hash: djb2
  let hash = 5381;
  for (let i = 0; i < parts.length; i++) {
    hash = ((hash << 5) + hash) ^ parts.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16);
}

function mergeVerdict(verdicts: ContentReviewVerdict[]): ContentReviewVerdict {
  if (verdicts.includes('block')) return 'block';
  if (verdicts.includes('flag')) return 'flag';
  return 'pass';
}

export async function runContentReview(
  env: WorkerEnvForLlm & { PIPELINE_DB: D1Database },
  spreadsheetId: string,
  row: SheetRow,
  config?: Partial<ContentReviewConfig>,
): Promise<ContentReviewReport> {
  const p = config ?? {};
  const cfg: ContentReviewConfig = {
    ...DEFAULT_CONTENT_REVIEW_CONFIG,
    ...p,
    textRef: p.textRef ?? DEFAULT_CONTENT_REVIEW_CONFIG.textRef,
    visionRef: p.visionRef ?? DEFAULT_CONTENT_REVIEW_CONFIG.visionRef,
    newsMode: p.newsMode ?? DEFAULT_CONTENT_REVIEW_CONFIG.newsMode,
    maxImages: p.maxImages ?? DEFAULT_CONTENT_REVIEW_CONFIG.maxImages,
  };
  const fingerprint = computeFingerprint(row);
  const topic = String(row.topic || '');
  const postText = String(row.selectedText || '');
  const channel = String(row.topicDeliveryChannel || 'linkedin');

  // Text review
  const { result: textResult, usage: textUsage } = await runTextReview(env, cfg.textRef, topic, postText, channel);
  await logLlmUsage(env.PIPELINE_DB, {
    spreadsheetId,
    userId: row.topicId,
    provider: cfg.textRef.provider,
    model: cfg.textRef.model,
    settingKey: 'content_review_text',
    promptTokens: textUsage.promptTokens,
    completionTokens: textUsage.completionTokens,
  });

  // Image review (cap at maxImages)
  const imageUrls = parseRowImageUrls(row).slice(0, cfg.maxImages);
  const imageReview = imageUrls.length > 0
    ? await runImageReview(env, cfg.visionRef, imageUrls, topic, postText, channel)
    : { results: [], totalUsage: { promptTokens: 0, completionTokens: 0 } };
  if (imageReview.totalUsage.promptTokens > 0 || imageReview.totalUsage.completionTokens > 0) {
    await logLlmUsage(env.PIPELINE_DB, {
      spreadsheetId,
      userId: row.topicId,
      provider: cfg.visionRef.provider,
      model: cfg.visionRef.model,
      settingKey: 'content_review_vision',
      promptTokens: imageReview.totalUsage.promptTokens,
      completionTokens: imageReview.totalUsage.completionTokens,
    });
  }

  // News context
  const newsContext = await buildNewsContext(
    env.PIPELINE_DB,
    spreadsheetId,
    String(row.topicId || ''),
    cfg.newsMode,
  );

  const verdicts: ContentReviewVerdict[] = [
    textResult.verdict,
    ...imageReview.results.map((r) => r.verdict),
  ];
  const overallVerdict = mergeVerdict(verdicts);

  return {
    fingerprint,
    reviewedAt: new Date().toISOString(),
    textResult,
    imageResults: imageReview.results,
    newsModeUsed: cfg.newsMode,
    newsSnippet: newsContext,
    overallVerdict,
  };
}
