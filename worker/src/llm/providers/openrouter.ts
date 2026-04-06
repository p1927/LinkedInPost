import type { LlmModelOption, WorkerEnvForLlm } from '../types';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';
const OPENROUTER_REFERER = 'https://linkedinpost.app';

export const STATIC_OPENROUTER_MODELS: LlmModelOption[] = [
  { value: 'openai/gpt-4o', label: 'GPT-4o', provider: 'openrouter' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openrouter' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'openrouter' },
  { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku', provider: 'openrouter' },
  { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (OR)', provider: 'openrouter' },
  { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', provider: 'openrouter' },
];

interface OpenrouterModelsResponse {
  data?: Array<{ id?: string; name?: string; architecture?: { modality?: string } }>;
}

interface OpenrouterChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export async function listOpenrouterModels(env: WorkerEnvForLlm): Promise<LlmModelOption[]> {
  const key = String(env.OPENROUTER_API_KEY || '').trim();
  if (!key) {
    return STATIC_OPENROUTER_MODELS;
  }
  try {
    const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      throw new Error(`OpenRouter model discovery failed with status ${response.status}`);
    }
    const payload = (await response.json()) as OpenrouterModelsResponse;
    const rows = (payload.data ?? [])
      .filter((m) => {
        const modality = String(m.architecture?.modality || '');
        return modality.includes('text->text') || modality === 'text';
      })
      .map((m) => ({
        value: String(m.id || '').trim(),
        label: String(m.name || m.id || '').trim(),
        provider: 'openrouter' as const,
      }))
      .filter((m) => m.value);
    const deduped = Array.from(new Map(rows.map((m) => [m.value, m])).values());
    return deduped.length > 0 ? deduped : STATIC_OPENROUTER_MODELS;
  } catch {
    return STATIC_OPENROUTER_MODELS;
  }
}

export async function generateOpenrouterJson(
  env: WorkerEnvForLlm,
  model: string,
  prompt: string,
  opts?: { temperature?: number; maxOutputTokens?: number },
): Promise<string> {
  const key = String(env.OPENROUTER_API_KEY || '').trim();
  if (!key) {
    throw new Error('Missing OPENROUTER_API_KEY in the Worker environment. Add it to use OpenRouter.');
  }
  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': OPENROUTER_REFERER,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      ...(opts?.temperature !== undefined && { temperature: opts.temperature }),
      ...(opts?.maxOutputTokens !== undefined && { max_tokens: opts.maxOutputTokens }),
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenRouter generation failed with status ${response.status}. ${message.slice(0, 280)}`.trim());
  }
  const payload = (await response.json()) as OpenrouterChatResponse;
  if (payload.error?.message) {
    throw new Error(`OpenRouter error: ${payload.error.message.slice(0, 280)}`);
  }
  const text = String(payload.choices?.[0]?.message?.content || '').trim();
  if (!text) {
    throw new Error('OpenRouter returned an empty generation response.');
  }
  return text;
}
