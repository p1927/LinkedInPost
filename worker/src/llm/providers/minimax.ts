import type { LlmModelOption, WorkerEnvForLlm } from '../types';

const MINIMAX_API_BASE = 'https://api.minimax.io/v1';

export const STATIC_MINIMAX_MODELS: LlmModelOption[] = [
  { value: 'MiniMax-M2.7', label: 'MiniMax M2.7', provider: 'minimax' },
  { value: 'MiniMax-M2.7-highspeed', label: 'MiniMax M2.7 Highspeed', provider: 'minimax' },
  { value: 'MiniMax-M2.5', label: 'MiniMax M2.5', provider: 'minimax' },
  { value: 'MiniMax-M2.5-highspeed', label: 'MiniMax M2.5 Highspeed', provider: 'minimax' },
  { value: 'MiniMax-M2.1', label: 'MiniMax M2.1', provider: 'minimax' },
  { value: 'MiniMax-M2.1-lightning', label: 'MiniMax M2.1 Lightning', provider: 'minimax' },
  { value: 'MiniMax-M2', label: 'MiniMax M2', provider: 'minimax' },
  { value: 'MiniMax-Text-01', label: 'MiniMax Text-01', provider: 'minimax' },
];

interface MinimaxChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export function listMinimaxModels(env: WorkerEnvForLlm): LlmModelOption[] {
  const key = String(env.MINIMAX_API_KEY || '').trim();
  if (!key) {
    return STATIC_MINIMAX_MODELS;
  }
  return STATIC_MINIMAX_MODELS;
}

export async function generateMinimaxJson(
  env: WorkerEnvForLlm,
  model: string,
  prompt: string,
  opts?: { temperature?: number; maxOutputTokens?: number },
): Promise<string> {
  const key = String(env.MINIMAX_API_KEY || '').trim();
  if (!key) {
    throw new Error('Missing MINIMAX_API_KEY in the Worker environment. Add it to use MiniMax.');
  }
  const response = await fetch(`${MINIMAX_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      ...(opts?.temperature !== undefined && { temperature: opts.temperature }),
      ...(opts?.maxOutputTokens !== undefined && { max_completion_tokens: opts.maxOutputTokens }),
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`MiniMax generation failed with status ${response.status}. ${message.slice(0, 280)}`.trim());
  }
  const payload = (await response.json()) as MinimaxChatResponse;
  if (payload.error?.message) {
    throw new Error(`MiniMax error: ${payload.error.message.slice(0, 280)}`);
  }
  const text = String(payload.choices?.[0]?.message?.content || '').trim();
  if (!text) {
    throw new Error('MiniMax returned an empty generation response.');
  }
  return text;
}
