import type { LlmRef } from '@repo/llm-core';
import { GOOGLE_MODEL_DEFAULT } from '../../google-model-policy';

export interface ContentReviewStoredNormalized {
  textRef: LlmRef;
  visionRef: LlmRef;
  newsMode: 'existing' | 'fresh';
}

/** Normalize KV / API payload. Handles both old and new formats for read compatibility. */
export function normalizeContentReviewStored(raw: unknown): ContentReviewStoredNormalized {
  if (!raw || typeof raw !== 'object') {
    return {
      textRef: { provider: 'gemini', model: GOOGLE_MODEL_DEFAULT },
      visionRef: { provider: 'gemini', model: GOOGLE_MODEL_DEFAULT },
      newsMode: 'existing',
    };
  }
  const o = raw as Record<string, unknown>;

  // Prefer stored textRef/visionRef, fall back to legacy string fields for old KV entries
  const textRef = isLlmRef(o.textRef)
    ? (o.textRef as LlmRef)
    : { provider: 'gemini' as const, model: String(o.textModelId ?? '').trim() || GOOGLE_MODEL_DEFAULT };
  const visionRef = isLlmRef(o.visionRef)
    ? (o.visionRef as LlmRef)
    : { provider: 'gemini' as const, model: String(o.visionModelId ?? '').trim() || GOOGLE_MODEL_DEFAULT };

  return {
    textRef,
    visionRef,
    newsMode: o.newsMode === 'fresh' ? 'fresh' : 'existing',
  };
}

function isLlmRef(v: unknown): v is LlmRef {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as Record<string, unknown>).provider === 'string' &&
    typeof (v as Record<string, unknown>).model === 'string'
  );
}
