import type { Env, StoredConfig } from '../index';
import { coerceSheetRow } from '../index';
import { buildQuickChangePrompt, buildVariantsPrompt } from './prompts';
import { resolveEffectiveGenerationRules } from './rules';
import {
  applyReplacement,
  coerceSelectionRange,
  normalizePlainTextValue,
  normalizeVariantList,
  resolveGenerationTarget,
  tryParseJson,
} from './normalize';
import type {
  GeminiGenerateResponse,
  GenerationRequestPayload,
  QuickChangePreviewResult,
  VariantsPreviewResponse,
} from './types';

const GOOGLE_MODEL_DEFAULT = 'gemini-2.5-flash';

function requireGeminiApiKey(env: Env): string {
  const apiKey = String(env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in the Worker environment. Add it before using preview generation.');
  }

  return apiKey;
}

export async function callGeminiText(env: Env, model: string, prompt: string): Promise<string> {
  const apiKey = requireGeminiApiKey(env);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
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

export async function generateQuickChangePreview(
  env: Env,
  storedConfig: StoredConfig,
  payload: Record<string, unknown>,
): Promise<QuickChangePreviewResult> {
  const request = payload as unknown as GenerationRequestPayload;
  const row = coerceSheetRow(request.row);
  const editorText = String(request.editorText || '');
  if (!editorText.trim()) {
    throw new Error('Draft text is required before running Quick Change.');
  }

  const instruction = String(request.instruction || '').trim();
  if (!instruction) {
    throw new Error('Quick Change needs a per-run instruction.');
  }

  const { scope, selection } = resolveGenerationTarget(editorText, request.scope, coerceSelectionRange(request.selection));
  const model = String(request.googleModel || storedConfig.googleModel || GOOGLE_MODEL_DEFAULT).trim() || GOOGLE_MODEL_DEFAULT;
  const effectiveRules = resolveEffectiveGenerationRules(row.topicGenerationRules, storedConfig.generationRules || '');
  const prompt = buildQuickChangePrompt(row, editorText, scope, selection, instruction, effectiveRules);
  const replacementText = normalizePlainTextValue(tryParseJson(await callGeminiText(env, model, prompt)));

  if (!replacementText) {
    throw new Error('Quick Change returned empty preview text.');
  }

  return {
    scope,
    model,
    selection,
    replacementText,
    fullText: applyReplacement(editorText, scope, selection, replacementText),
  };
}

export async function generateVariantsPreview(
  env: Env,
  storedConfig: StoredConfig,
  payload: Record<string, unknown>,
): Promise<VariantsPreviewResponse> {
  const request = payload as unknown as GenerationRequestPayload;
  const row = coerceSheetRow(request.row);
  const editorText = String(request.editorText || '');
  if (!editorText.trim()) {
    throw new Error('Draft text is required before generating preview variants.');
  }

  const { scope, selection } = resolveGenerationTarget(editorText, request.scope, coerceSelectionRange(request.selection));
  const model = String(request.googleModel || storedConfig.googleModel || GOOGLE_MODEL_DEFAULT).trim() || GOOGLE_MODEL_DEFAULT;
  const effectiveRules = resolveEffectiveGenerationRules(row.topicGenerationRules, storedConfig.generationRules || '');
  const prompt = buildVariantsPrompt(
    row,
    editorText,
    scope,
    selection,
    String(request.instruction || '').trim(),
    effectiveRules,
  );
  const variants = normalizeVariantList(tryParseJson(await callGeminiText(env, model, prompt)));

  if (variants.length !== 4) {
    throw new Error('Gemini did not return four valid preview variants.');
  }

  return {
    scope,
    model,
    selection,
    variants: variants.map((replacementText, index) => ({
      id: `preview-${index + 1}`,
      label: `Preview ${index + 1}`,
      replacementText,
      fullText: applyReplacement(editorText, scope, selection, replacementText),
    })),
  };
}
