import type { D1Database } from '@cloudflare/workers-types';
import type { WorkerEnvForLlm } from '../../llm/types';
import type { SheetRow } from '../../generation/types';
import type { ContentReviewConfig, ContentReviewReport, ContentReviewVerdict } from './types';
import { DEFAULT_CONTENT_REVIEW_CONFIG } from './types';
import { runTextReview } from './textReviewRunner';
import { runImageReview } from './imageReviewRunner';
import { buildNewsContext } from './newsContextBuilder';
import { parseRowImageUrls } from '../../media/selectedImageUrls';

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
  const cfg: ContentReviewConfig = { ...DEFAULT_CONTENT_REVIEW_CONFIG, ...config };
  const fingerprint = computeFingerprint(row);
  const topic = String(row.topic || '');
  const postText = String(row.selectedText || '');
  const channel = String(row.topicDeliveryChannel || 'linkedin');

  // Text review
  const textResult = await runTextReview(env, cfg.textModelId, topic, postText, channel);

  // Image review (cap at maxImages)
  const imageUrls = parseRowImageUrls(row).slice(0, cfg.maxImages);
  const imageResults = imageUrls.length > 0
    ? await runImageReview(env, cfg.visionModelId, imageUrls, topic, postText, channel)
    : [];

  // News context
  const newsContext = await buildNewsContext(
    env.PIPELINE_DB,
    spreadsheetId,
    String(row.topicId || ''),
    cfg.newsMode,
  );

  const verdicts: ContentReviewVerdict[] = [
    textResult.verdict,
    ...imageResults.map((r) => r.verdict),
  ];
  const overallVerdict = mergeVerdict(verdicts);

  return {
    fingerprint,
    reviewedAt: new Date().toISOString(),
    textResult,
    imageResults,
    newsModeUsed: cfg.newsMode,
    newsSnippet: newsContext,
    overallVerdict,
  };
}
