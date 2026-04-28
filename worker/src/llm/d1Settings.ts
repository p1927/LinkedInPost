import type { LlmRef } from './types';

export type LlmSettingKey =
  | 'review_generation'
  | 'generation_worker'
  | 'content_review_text'
  | 'content_review_vision'
  | 'enrichment_persona'
  | 'enrichment_emotion'
  | 'enrichment_psychology'
  | 'enrichment_persuasion'
  | 'enrichment_copywriting'
  | 'enrichment_storytelling'
  | 'enrichment_image_strategy'
  | 'enrichment_vocabulary'
  | 'enrichment_trending';

export const LLM_SETTING_KEYS: readonly LlmSettingKey[] = [
  'review_generation',
  'generation_worker',
  'content_review_text',
  'content_review_vision',
  'enrichment_persona',
  'enrichment_emotion',
  'enrichment_psychology',
  'enrichment_persuasion',
  'enrichment_copywriting',
  'enrichment_storytelling',
  'enrichment_image_strategy',
  'enrichment_vocabulary',
  'enrichment_trending',
];

export type LlmSettingsMap = Record<LlmSettingKey, LlmRef>;

interface LlmSettingRow {
  setting_key: string;
  provider: string;
  model: string;
}

function toRef(row: LlmSettingRow): LlmRef | null {
  if ((row.provider === 'gemini' || row.provider === 'grok' || row.provider === 'openrouter' || row.provider === 'minimax') && row.model.trim()) {
    return { provider: row.provider, model: row.model.trim() };
  }
  return null;
}

export async function getLlmSettingsFromD1(
  db: D1Database,
  spreadsheetId: string,
): Promise<Partial<LlmSettingsMap>> {
  const result = await db
    .prepare('SELECT setting_key, provider, model FROM workspace_llm_settings WHERE spreadsheet_id = ?')
    .bind(spreadsheetId)
    .all<LlmSettingRow>();

  const out: Partial<LlmSettingsMap> = {};
  for (const row of result.results) {
    const key = row.setting_key as LlmSettingKey;
    if (!(LLM_SETTING_KEYS as readonly string[]).includes(key)) continue;
    const ref = toRef(row);
    if (ref) out[key] = ref;
  }
  return out;
}

export async function setLlmSettingInD1(
  db: D1Database,
  spreadsheetId: string,
  key: LlmSettingKey,
  ref: LlmRef,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO workspace_llm_settings (spreadsheet_id, setting_key, provider, model, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(spreadsheet_id, setting_key) DO UPDATE SET
         provider = excluded.provider,
         model = excluded.model,
         updated_at = excluded.updated_at`,
    )
    .bind(spreadsheetId, key, ref.provider, ref.model)
    .run();
}

/**
 * Returns the full settings map for a workspace, seeding from KV-derived config if any keys
 * are missing. Safe to call on every bootstrap — only writes rows that don't exist yet.
 */
export async function seedLlmSettingsIfEmpty(
  db: D1Database,
  spreadsheetId: string,
  storedConfig: {
    googleModel: string;
    llm?: { primary?: LlmRef };
    contentReview?: { textRef?: LlmRef; visionRef?: LlmRef };
  },
  defaultModel: string,
): Promise<LlmSettingsMap> {
  const existing = await getLlmSettingsFromD1(db, spreadsheetId);

  const allPresent = LLM_SETTING_KEYS.every((k) => existing[k] !== undefined);
  if (allPresent) {
    return existing as LlmSettingsMap;
  }

  const primaryRef: LlmRef = storedConfig.llm?.primary ?? {
    provider: 'gemini',
    model: storedConfig.googleModel || defaultModel,
  };
  const textRef: LlmRef = storedConfig.contentReview?.textRef ?? primaryRef;
  const visionRef: LlmRef = storedConfig.contentReview?.visionRef ?? primaryRef;

  const seeds: LlmSettingsMap = {
    review_generation: existing.review_generation ?? primaryRef,
    generation_worker: existing.generation_worker ?? primaryRef,
    content_review_text: existing.content_review_text ?? textRef,
    content_review_vision: existing.content_review_vision ?? visionRef,
    enrichment_persona: existing.enrichment_persona ?? primaryRef,
    enrichment_emotion: existing.enrichment_emotion ?? primaryRef,
    enrichment_psychology: existing.enrichment_psychology ?? primaryRef,
    enrichment_persuasion: existing.enrichment_persuasion ?? primaryRef,
    enrichment_copywriting: existing.enrichment_copywriting ?? primaryRef,
    enrichment_storytelling: existing.enrichment_storytelling ?? primaryRef,
    enrichment_image_strategy: existing.enrichment_image_strategy ?? primaryRef,
    enrichment_vocabulary: existing.enrichment_vocabulary ?? primaryRef,
    enrichment_trending: existing.enrichment_trending ?? primaryRef,
  };

  const writes: Promise<void>[] = [];
  for (const key of LLM_SETTING_KEYS) {
    if (!existing[key]) {
      writes.push(setLlmSettingInD1(db, spreadsheetId, key, seeds[key]));
    }
  }
  if (writes.length > 0) {
    await Promise.all(writes);
  }

  return seeds;
}
