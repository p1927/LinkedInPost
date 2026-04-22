import type { LlmModelOption, WorkerEnvForLlm } from '../types';
import type { GeminiGenerateResponse } from '../../generation/types';

export const STATIC_GEMINI_MODELS: LlmModelOption[] = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite', provider: 'gemini' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'gemini' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'gemini' },
];

interface GeminiModelsListResponse {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
}

export function formatGeminiModelLabel(modelName: string): string {
  return modelName
    .split('-')
    .map((part) => {
      if (!part) return part;
      if (/^\d/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ')
    .replace(/\bLive\b/g, 'Live')
    .replace(/\bTts\b/g, 'TTS');
}

function normalizeListedModels(models: GeminiModelsListResponse['models']): LlmModelOption[] {
  const filtered = (models ?? [])
    .filter((model) => typeof model?.name === 'string')
    .filter((model) => model.name?.startsWith('models/gemini'))
    .filter((model) => Array.isArray(model.supportedGenerationMethods))
    .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
    .map((model) => {
      const value = String(model.name).replace(/^models\//, '');
      return { value, label: formatGeminiModelLabel(value), provider: 'gemini' as const };
    });
  const deduped = Array.from(new Map(filtered.map((m) => [m.value, m])).values());
  return deduped.length > 0 ? deduped : STATIC_GEMINI_MODELS;
}

export async function listGeminiModels(env: WorkerEnvForLlm): Promise<LlmModelOption[]> {
  const apiKey = String(env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return STATIC_GEMINI_MODELS;
  }
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    );
    if (!response.ok) {
      throw new Error(`Gemini model discovery failed with status ${response.status}`);
    }
    const payload = (await response.json()) as GeminiModelsListResponse;
    return normalizeListedModels(payload.models ?? []);
  } catch {
    return STATIC_GEMINI_MODELS;
  }
}

export interface GeminiInlineImagePart {
  mimeType: string;
  /** Base64-encoded bytes of the image. */
  data: string;
}

/**
 * Single multimodal Gemini call: image bytes + text prompt → structured JSON.
 * Uses the same API key and response pattern as generateGeminiJson.
 */
export async function generateGeminiMultimodalJson(
  env: WorkerEnvForLlm,
  model: string,
  image: GeminiInlineImagePart,
  prompt: string,
): Promise<GeminiGenerationResult> {
  const apiKey = String(env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in the Worker environment.');
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: image.mimeType, data: image.data } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini multimodal generation failed with status ${response.status}. ${message.slice(0, 280)}`.trim());
  }
  const payload = (await response.json()) as GeminiGenerateResponse;
  if (payload.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the multimodal generation request: ${payload.promptFeedback.blockReason}.`);
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => String(part.text || '')).join('\n').trim() || '';
  if (!text) {
    throw new Error('Gemini returned an empty multimodal generation response.');
  }
  const usageMeta = payload.candidates?.[0]?.usageMetadata;
  const usage = {
    promptTokens: usageMeta?.promptTokenCount ?? 0,
    completionTokens: usageMeta?.candidatesTokenCount ?? 0,
  };
  return { text, usage };
}

export interface GeminiTextGenerationOptions {
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}

export interface GeminiGenerationResult {
  text: string;
  usage: { promptTokens: number; completionTokens: number };
}

export async function generateGeminiJson(
  env: WorkerEnvForLlm,
  model: string,
  prompt: string,
  opts?: GeminiTextGenerationOptions,
): Promise<GeminiGenerationResult> {
  const apiKey = String(env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in the Worker environment. Add it before using preview generation.');
  }

  const generationConfig: Record<string, unknown> = { responseMimeType: 'application/json' };
  if (opts?.temperature !== undefined) generationConfig.temperature = opts.temperature;
  if (opts?.maxOutputTokens !== undefined) generationConfig.maxOutputTokens = opts.maxOutputTokens;

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  };
  if (opts?.systemInstruction?.trim()) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction.trim() }] };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini generation failed with status ${response.status}. ${message.slice(0, 280)}`.trim());
  }
  const payload = (await response.json()) as GeminiGenerateResponse;
  if (payload.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the generation request: ${payload.promptFeedback.blockReason}.`);
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => String(part.text || '')).join('\n').trim() || '';
  if (!text) {
    throw new Error('Gemini returned an empty generation response.');
  }
  const usageMeta = payload.candidates?.[0]?.usageMetadata;
  const usage = {
    promptTokens: usageMeta?.promptTokenCount ?? 0,
    completionTokens: usageMeta?.candidatesTokenCount ?? 0,
  };
  return { text, usage };
}
