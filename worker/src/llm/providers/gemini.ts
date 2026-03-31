import type { LlmModelOption, WorkerEnvForLlm } from '../types';
import type { GeminiGenerateResponse } from '../../generation/types';

export const STATIC_GEMINI_MODELS: LlmModelOption[] = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
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
      return { value, label: formatGeminiModelLabel(value) };
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
): Promise<string> {
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
  return text;
}

export async function generateGeminiJson(env: WorkerEnvForLlm, model: string, prompt: string): Promise<string> {
  const apiKey = String(env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in the Worker environment. Add it before using preview generation.');
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
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
  return text;
}
