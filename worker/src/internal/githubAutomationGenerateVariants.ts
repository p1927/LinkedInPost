import { isLlmProviderConfigured } from '../llm/catalog';
import { seedLlmSettingsIfEmpty } from '../llm/d1Settings';
import { generateForRef } from '../llm/gateway';
import type { LlmRef, WorkerEnvForLlm } from '../llm/types';

export type StoredSliceForLlmSeed = {
  googleModel: string;
  llm?: {
    primary?: LlmRef;
    fallback?: LlmRef;
    allowedGrokModels?: string[];
  };
  contentReview?: { textRef?: LlmRef; visionRef?: LlmRef };
};

function escapeForPrompt(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildGithubAutomationDraftPrompt(input: {
  topic: string;
  webResearch: string;
  recipeContent: string;
  baseText: string;
  refinementInstructions: string;
  wordLimitWords: number | null;
  imageSearchQueryMaxChars: number;
}): string {
  const topic = escapeForPrompt(input.topic);
  const webResearch = input.webResearch || '';
  const recipeContent = input.recipeContent || '';
  const maxChars = Math.max(40, Math.min(500, input.imageSearchQueryMaxChars || 120));

  let refinementContext = '';
  if (input.baseText.trim()) {
    refinementContext += `\nUse this draft as the starting point and preserve its strongest ideas:\n"""${input.baseText}"""\n`;
  }
  if (input.refinementInstructions.trim()) {
    refinementContext += `\nApply these improvement notes while generating the new variants:\n${input.refinementInstructions}\n`;
  }

  let wordLimitInstruction = '';
  if (input.wordLimitWords != null && input.wordLimitWords > 0) {
    wordLimitInstruction = `Each variant must be ${input.wordLimitWords} words or fewer.`;
  }

  return `
    Act as an expert LinkedIn ghostwriter. Write 4 distinct, engaging variants for a LinkedIn post about the topic: "${topic}".
    
    Here is some web research on the topic to include in your post:
    ${webResearch}
    
    Follow this recipe/guideline for writing the post:
    ${recipeContent}

    ${refinementContext}

    Make each variant distinct in tone (e.g., 1. Storytelling, 2. Analytical/Data-driven, 3. Short & Punchy, 4. Question/Engagement focused).
    If a draft and refinement notes are provided, treat them as instructions to improve the post instead of starting from scratch.
    ${wordLimitInstruction}
    Do NOT include hashtags in the text block itself, but keep them at the end.
    Every variant value must be a plain JSON string. Do not return nested JSON objects, arrays, or metadata for any variant.

    Also provide exactly three English image-search QUERY STRINGS for Google Images
    (imageSearchQuery1, imageSearchQuery2, imageSearchQuery3). Each string must be SEARCH TERMS AND KEYWORDS ONLY—not
    a sentence, not a caption, not a metaphor explained in prose. Use 2–6 concrete tokens separated by a single space
    (nouns, objects, settings, roles, simple adjectives that stock photos use: e.g. "software developer laptop office",
    "team meeting whiteboard", "cloud security diagram"). Do not start with filler like "image of", "photo of", or
    "showing"; no hashtags; no commas or semicolons—spaces only between words. Each string must be at most
    ${maxChars} characters and must differ from the others (e.g. literal subject vs workplace/people
    vs object/detail angle).
    
    Output JSON format ONLY:
    {
        "variant1": "...",
        "variant2": "...",
        "variant3": "...",
        "variant4": "...",
        "imageSearchQuery1": "...",
        "imageSearchQuery2": "...",
        "imageSearchQuery3": "..."
    }
    `;
}

function stripJsonCodeFences(text: string): string {
  let s = text.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  }
  return s.trim();
}

function parseVariantsObject(raw: string): Record<string, unknown> {
  const text = stripJsonCodeFences(raw);
  if (!text) {
    throw new Error('Empty LLM response when parsing variants JSON.');
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid variants JSON from LLM.');
  }
}

const VARIANT_KEYS = [
  'variant1',
  'variant2',
  'variant3',
  'variant4',
  'imageSearchQuery1',
  'imageSearchQuery2',
  'imageSearchQuery3',
] as const;

export type GithubAutomationVariantsPayload = Record<(typeof VARIANT_KEYS)[number], string>;

function assertVariantsShape(o: Record<string, unknown>): GithubAutomationVariantsPayload {
  for (const k of VARIANT_KEYS) {
    if (typeof o[k] !== 'string') {
      throw new Error(`LLM response missing or invalid string field: ${k}`);
    }
  }
  return o as GithubAutomationVariantsPayload;
}

const REPAIR_SUFFIX =
  '\n\nYour previous output was not valid JSON. Respond again with ONLY a single JSON object ' +
  'with keys variant1, variant2, variant3, variant4, imageSearchQuery1, imageSearchQuery2, ' +
  'imageSearchQuery3. variant1–4 are full post strings; imageSearchQuery1–3 are keyword-only image search ' +
  'lines—2–6 space-separated terms each, no sentences. Escape every double-quote and line break ' +
  'inside strings using JSON rules. No markdown, no code fences.';

function tryParseAndAssert(raw: string): GithubAutomationVariantsPayload {
  const o = parseVariantsObject(raw);
  return assertVariantsShape(o);
}

export async function runGithubAutomationGenerateVariants(
  env: WorkerEnvForLlm & { PIPELINE_DB: D1Database },
  spreadsheetId: string,
  stored: StoredSliceForLlmSeed,
  body: unknown,
  googleModelDefault: string,
): Promise<GithubAutomationVariantsPayload> {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object.');
  }
  const b = body as Record<string, unknown>;
  const topic = String(b.topic || '').trim();
  if (!topic) {
    throw new Error('Missing topic.');
  }

  const webResearch = String(b.webResearch ?? '');
  const recipeContent = String(b.recipeContent ?? '');
  const baseText = String(b.baseText ?? '');
  const refinementInstructions = String(b.refinementInstructions ?? '');
  const rawWordLimit = b.wordLimitWords;
  const wordLimitWords =
    typeof rawWordLimit === 'number' && Number.isFinite(rawWordLimit) && rawWordLimit > 0
      ? Math.floor(rawWordLimit)
      : null;
  const imageSearchQueryMaxChars =
    typeof b.imageSearchQueryMaxChars === 'number' && Number.isFinite(b.imageSearchQueryMaxChars)
      ? b.imageSearchQueryMaxChars
      : 120;

  const llmSettings = await seedLlmSettingsIfEmpty(env.PIPELINE_DB, spreadsheetId, stored, googleModelDefault);
  const ref = llmSettings.github_automation;
  if (!isLlmProviderConfigured(env, ref.provider)) {
    throw new Error(`GitHub automation provider "${ref.provider}" is not configured on this Worker.`);
  }

  const prompt = buildGithubAutomationDraftPrompt({
    topic,
    webResearch,
    recipeContent,
    baseText,
    refinementInstructions,
    wordLimitWords,
    imageSearchQueryMaxChars,
  });

  let rawText = await generateForRef(env, ref, prompt);
  try {
    return tryParseAndAssert(rawText);
  } catch {
    rawText = await generateForRef(env, ref, prompt + REPAIR_SUFFIX);
    return tryParseAndAssert(rawText);
  }
}
