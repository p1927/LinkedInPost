import type { Env } from '../index';

export interface ModelOption {
  value: string;
  label: string;
}

const ALL_PROVIDERS = ['flux-kontext', 'ideogram', 'dall-e', 'stability', 'gemini', 'seedance', 'pixazo'] as const;

export const CURATED_MODELS: Record<string, ModelOption[]> = {
  'flux-kontext': [
    { value: 'fal-ai/flux-kontext-pro', label: 'FLUX Kontext Pro' },
    { value: 'fal-ai/flux-kontext-max', label: 'FLUX Kontext Max' },
  ],
  'ideogram': [
    { value: 'fal-ai/ideogram/v3', label: 'Ideogram v3' },
    { value: 'fal-ai/ideogram/v2', label: 'Ideogram v2' },
  ],
  'dall-e': [
    { value: 'gpt-image-1', label: 'GPT Image 1' },
    { value: 'dall-e-3', label: 'DALL-E 3' },
  ],
  'stability': [
    { value: 'sd3.5-large', label: 'SD 3.5 Large' },
    { value: 'sd3.5-large-turbo', label: 'SD 3.5 Large Turbo' },
    { value: 'sd3.5-medium', label: 'SD 3.5 Medium' },
  ],
  'gemini': [
    { value: 'gemini-2.0-flash-preview-image-generation', label: 'Gemini 2.0 Flash (Image)' },
    { value: 'imagen-3.0-generate-001', label: 'Imagen 3' },
  ],
  'seedance': [
    { value: 'seedance-1-lite', label: 'Seedance 1 Lite' },
    { value: 'seedance-1', label: 'Seedance 1' },
  ],
  'pixazo': [],
};

function formatModelLabel(id: string): string {
  return id
    .split(/[-_/]/)
    .filter(Boolean)
    .map((part) => {
      // Keep numeric/version strings as-is, capitalize first letter of words
      if (/^\d/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

export async function fetchModelsFromProvider(provider: string, env: Env): Promise<ModelOption[] | null> {
  if (provider === 'dall-e') {
    const apiKey = String(env.OPENAI_API_KEY || '').trim();
    if (!apiKey) return null;
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return null;
      const data = await res.json() as { data?: Array<{ id: string }> };
      const models = (data.data ?? [])
        .filter((m) => m.id.includes('dall-e') || m.id.includes('gpt-image'))
        .map((m, i) => ({ value: m.id, label: formatModelLabel(m.id), _sort: i }));
      if (models.length === 0) return null;
      return models.map(({ value, label }) => ({ value, label }));
    } catch {
      return null;
    }
  }

  if (provider === 'gemini') {
    const apiKey = String(env.GEMINI_API_KEY || '').trim();
    if (!apiKey) return null;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      if (!res.ok) return null;
      const data = await res.json() as {
        models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
      };
      const models = (data.models ?? [])
        .filter(
          (m) =>
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes('generateContent') &&
            (m.name.includes('imagen') || m.name.includes('flash-preview-image')),
        )
        .map((m) => {
          const modelId = m.name.replace(/^models\//, '');
          return { value: modelId, label: formatModelLabel(modelId) };
        });
      if (models.length === 0) return null;
      return models;
    } catch {
      return null;
    }
  }

  if (provider === 'flux-kontext' || provider === 'ideogram') {
    // FAL Platform API: GET https://api.fal.ai/v1/models?category=text-to-image
    // Auth is optional but reduces rate limits; filter by model family name.
    const apiKey = String(env.FAL_API_KEY || '').trim();
    const searchTerm = provider === 'flux-kontext' ? 'flux-kontext' : 'ideogram';
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Key ${apiKey}`;
      const res = await fetch(
        `https://api.fal.ai/v1/models?q=${encodeURIComponent(searchTerm)}&category=text-to-image&status=active&limit=20`,
        { headers },
      );
      if (!res.ok) return null;
      const data = await res.json() as {
        models?: Array<{ endpoint_id: string; metadata?: { display_name?: string } }>;
      };
      const models = (data.models ?? [])
        .filter((m) => m.endpoint_id.includes(searchTerm))
        .map((m) => ({
          value: m.endpoint_id,
          label: m.metadata?.display_name || formatModelLabel(m.endpoint_id),
        }));
      if (models.length === 0) return null;
      return models;
    } catch {
      return null;
    }
  }

  // stability, seedance, pixazo: no reliable model listing API — use curated list
  return null;
}

export async function syncImageGenCatalog(db: D1Database, env: Env): Promise<void> {
  for (const provider of ALL_PROVIDERS) {
    let models = await fetchModelsFromProvider(provider, env);
    if (!models) {
      models = CURATED_MODELS[provider] ?? [];
    }

    if (models.length > 0) {
      const placeholders = models.map(() => '(?, ?, ?, ?, datetime(\'now\'))').join(', ');
      const values: (string | number)[] = [];
      models.forEach((m, i) => {
        values.push(provider, m.value, m.label, i);
      });
      await db
        .prepare(
          `INSERT OR REPLACE INTO image_gen_model_catalog (provider, model_value, model_label, sort_order, synced_at) VALUES ${placeholders}`,
        )
        .bind(...values)
        .run();
    }

    // Remove stale models for this provider that aren't in the new list
    if (models.length > 0) {
      const keepValues = models.map(() => '?').join(', ');
      await db
        .prepare(
          `DELETE FROM image_gen_model_catalog WHERE provider = ? AND model_value NOT IN (${keepValues})`,
        )
        .bind(provider, ...models.map((m) => m.value))
        .run();
    } else {
      // No models — clear all for this provider
      await db
        .prepare('DELETE FROM image_gen_model_catalog WHERE provider = ?')
        .bind(provider)
        .run();
    }
  }
}

export async function getImageGenCatalog(
  db: D1Database,
): Promise<Record<string, ModelOption[]>> {
  const rows = await db
    .prepare(
      'SELECT provider, model_value, model_label FROM image_gen_model_catalog ORDER BY provider, sort_order',
    )
    .all<{ provider: string; model_value: string; model_label: string }>();

  if (!rows.results || rows.results.length === 0) {
    return CURATED_MODELS;
  }

  const result: Record<string, ModelOption[]> = {};
  for (const row of rows.results) {
    if (!result[row.provider]) result[row.provider] = [];
    result[row.provider].push({ value: row.model_value, label: row.model_label });
  }
  return result;
}

export async function seedImageGenCatalogIfEmpty(db: D1Database): Promise<void> {
  const row = await db
    .prepare('SELECT COUNT(*) as cnt FROM image_gen_model_catalog')
    .first<{ cnt: number }>();

  if ((row?.cnt ?? 0) > 0) return;

  for (const provider of ALL_PROVIDERS) {
    const models = CURATED_MODELS[provider] ?? [];
    if (models.length === 0) continue;
    const placeholders = models.map(() => '(?, ?, ?, ?, datetime(\'now\'))').join(', ');
    const values: (string | number)[] = [];
    models.forEach((m, i) => {
      values.push(provider, m.value, m.label, i);
    });
    await db
      .prepare(
        `INSERT OR IGNORE INTO image_gen_model_catalog (provider, model_value, model_label, sort_order, synced_at) VALUES ${placeholders}`,
      )
      .bind(...values)
      .run();
  }
}
