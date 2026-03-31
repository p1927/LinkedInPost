import { GOOGLE_MODEL_DEFAULT } from '../../google-model-policy';

export interface ContentReviewStoredNormalized {
  textModelId: string;
  visionModelId: string;
  newsMode: 'existing' | 'fresh';
}

/** Normalize KV / API payload so Gemini model ids are never empty. */
export function normalizeContentReviewStored(raw: unknown): ContentReviewStoredNormalized {
  if (!raw || typeof raw !== 'object') {
    return {
      textModelId: GOOGLE_MODEL_DEFAULT,
      visionModelId: GOOGLE_MODEL_DEFAULT,
      newsMode: 'existing',
    };
  }
  const o = raw as Record<string, unknown>;
  const text = String(o.textModelId ?? '').trim() || GOOGLE_MODEL_DEFAULT;
  const vision = String(o.visionModelId ?? '').trim() || GOOGLE_MODEL_DEFAULT;
  return {
    textModelId: text,
    visionModelId: vision,
    newsMode: o.newsMode === 'fresh' ? 'fresh' : 'existing',
  };
}
