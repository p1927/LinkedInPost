import type { LlmModelOption, WorkerEnvForLlm } from '../types';

const GROK_API_BASE = 'https://api.x.ai/v1';

export const STATIC_GROK_MODELS: LlmModelOption[] = [
  { value: 'grok-3', label: 'Grok 3' },
  { value: 'grok-3-mini', label: 'Grok 3 Mini' },
  { value: 'grok-2-latest', label: 'Grok 2 Latest' },
];

interface GrokModelsResponse {
  data?: Array<{ id?: string }>;
}

interface GrokChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export async function listGrokModels(env: WorkerEnvForLlm): Promise<LlmModelOption[]> {
  const key = String(env.XAI_API_KEY || '').trim();
  if (!key) {
    return STATIC_GROK_MODELS;
  }
  try {
    const response = await fetch(`${GROK_API_BASE}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      throw new Error(`Grok model discovery failed with status ${response.status}`);
    }
    const payload = (await response.json()) as GrokModelsResponse;
    const rows = (payload.data ?? [])
      .map((m) => String(m.id || '').trim())
      .filter(Boolean)
      .map((id) => ({ value: id, label: id }));
    const deduped = Array.from(new Map(rows.map((m) => [m.value, m])).values());
    return deduped.length > 0 ? deduped : STATIC_GROK_MODELS;
  } catch {
    return STATIC_GROK_MODELS;
  }
}

export async function generateGrokJson(env: WorkerEnvForLlm, model: string, prompt: string): Promise<string> {
  const key = String(env.XAI_API_KEY || '').trim();
  if (!key) {
    throw new Error('Missing XAI_API_KEY in the Worker environment. Add it to use Grok.');
  }
  const response = await fetch(`${GROK_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Grok generation failed with status ${response.status}. ${message.slice(0, 280)}`.trim());
  }
  const payload = (await response.json()) as GrokChatResponse;
  if (payload.error?.message) {
    throw new Error(`Grok error: ${payload.error.message.slice(0, 280)}`);
  }
  const text = String(payload.choices?.[0]?.message?.content || '').trim();
  if (!text) {
    throw new Error('Grok returned an empty generation response.');
  }
  return text;
}
