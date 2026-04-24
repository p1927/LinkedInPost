import type { DimensionName, DimensionWeights, EngineEnv, EngineUsageCtx } from './types';
import { dimensionValueToImportance } from './types';
import type { LlmRef } from '@repo/llm-core';
import { generateLlmParsedJson } from '../llm/structuredJson';

export interface DimensionGap {
  dimension: DimensionName;
  score: number;       // 0–10 how well the draft already serves this dimension
  gaps: string[];      // 1–3 specific, actionable gaps (e.g. "CTA is generic, doesn't invite a specific response")
}

export interface GapReport {
  draftText: string;
  dimensionGaps: DimensionGap[];
  /** Combined prose summary of all gaps, ready to inject into an enhancement prompt. */
  summaryForPrompt: string;
}

const DIMENSION_PROMPTS: Record<DimensionName, string> = {
  emotions: 'emotional resonance, vulnerability, human connection, and authentic feeling',
  psychology: 'audience psychology, pain points, aspirations, and persuasion triggers',
  persuasion: 'persuasion techniques, social proof, authority signals, and calls to action',
  copywriting: 'copywriting quality, sentence variety, rhythm, and punchy phrasing',
  storytelling: 'narrative arc, story structure, tension, and resolution',
  typography: 'visual formatting, short paragraphs, white space, and mobile readability',
  vocabulary: 'word choice, power words, avoiding weak filler phrases, and precise language',
};

/**
 * Runs gap-scoring LLM calls in parallel for each active dimension.
 * Only dimensions with importance > 'off' (i.e. value > 10) are scored.
 */
export async function scoreGaps(
  draftText: string,
  topic: string,
  dimensionWeights: DimensionWeights,
  env: EngineEnv,
  llmRef: LlmRef,
  usageCtx?: EngineUsageCtx,
): Promise<GapReport> {
  const activeDimensions = (Object.entries(dimensionWeights) as [DimensionName, number][])
    .filter(([, value]) => value !== undefined && dimensionValueToImportance(value) !== 'off')
    .map(([dim]) => dim);

  if (activeDimensions.length === 0) {
    return { draftText, dimensionGaps: [], summaryForPrompt: '' };
  }

  // Run all dimension scoring calls in parallel
  const results = await Promise.allSettled(
    activeDimensions.map(async (dimension) => {
      const focus = DIMENSION_PROMPTS[dimension];
      const prompt = `You are a ${focus} expert reviewing a social media post draft.

Topic: ${topic}

Draft:
${draftText}

Score this draft's ${focus} from 0-10, then identify 1-3 specific, actionable gaps.
Be concrete — not "improve the hook" but "the hook is a generic question; use a specific data point instead".

Return ONLY valid JSON:
{"score": <0-10 integer>, "gaps": ["<gap 1>", "<gap 2>"]}`;

      const result = await generateLlmParsedJson<{ score: number; gaps: string[] }>(
        env,
        llmRef,
        prompt,
        { maxOutputTokens: 512 },
        usageCtx ? { ...usageCtx, settingKey: 'engine_gap_scorer' } : undefined,
      );
      return { dimension, score: result.score ?? 5, gaps: result.gaps ?? [] };
    }),
  );

  const dimensionGaps: DimensionGap[] = results
    .map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return { dimension: activeDimensions[i], score: 5, gaps: [] };
    });

  const summaryParts = dimensionGaps
    .filter((g) => g.gaps.length > 0)
    .map((g) => `${g.dimension.toUpperCase()} (score ${g.score}/10): ${g.gaps.join('; ')}`);

  const summaryForPrompt = summaryParts.length > 0
    ? `Gap analysis:\n${summaryParts.map((p) => `- ${p}`).join('\n')}`
    : '';

  return { draftText, dimensionGaps, summaryForPrompt };
}
