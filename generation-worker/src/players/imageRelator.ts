import type { LlmRef } from '../llmFromWorker';
import { generateLlmParsedJson, hasAnyLlmProvider } from '../llmFromWorker';
import type { Env, Pattern, RequirementReport, TextVariant } from '../types';

export interface ImageRelatorOutput {
  visualBrief: string;
  styleHints: string[];
  searchKeywords: string[];
  genPrompts: string[];
}

interface LlmImageRelatorResponse {
  visualBrief: string;
  styleHints?: string[];
  searchKeywords: string[];
  genPrompts: string[];
}

export async function relateImages(
  primaryVariant: TextVariant,
  pattern: Pattern,
  report: RequirementReport,
  env: Env,
  llmRef: LlmRef,
): Promise<ImageRelatorOutput> {
  // Merge pattern image hints as defaults
  const hintKeywords = pattern.imageHints?.searchKeywords ?? [];
  const hintMood = pattern.imageHints?.mood ?? '';

  // Context for brief construction
  const variantText = primaryVariant.text;
  const topic = report.topic;
  const tone = report.tone || 'professional';
  const audience = report.audience || 'professionals';

  // Map tone to style hints
  const toneStyleMap: Record<string, string[]> = {
    opinionated: ['bold composition', 'high contrast', 'confident framing'],
    professional: ['clean layout', 'corporate palette', 'crisp edges'],
    casual: ['warm tones', 'relaxed framing', 'approachable feel'],
    inspirational: ['soft lighting', 'elevated perspective', 'aspirational mood'],
    analytical: ['data visual', 'structured layout', 'precise geometry'],
    humorous: ['vibrant color', 'playful elements', 'light-hearted composition'],
  };
  const toneHints = toneStyleMap[tone.toLowerCase()] ?? ['professional', 'clean layout'];
  const mergedStyleHints = [...new Set([...toneHints, ...(hintMood ? [hintMood] : [])])];

  if (!hasAnyLlmProvider(env)) {
    return {
      visualBrief: `${hintMood || toneHints[0]} image for topic: ${report.topic}`,
      styleHints: mergedStyleHints,
      searchKeywords: hintKeywords.length ? hintKeywords : [report.topic],
      genPrompts: [],
    };
  }

  // Grok does not support multimodal/image context; fall back to Gemini when available.
  let effectiveLlmRef = llmRef;
  if (llmRef.provider === 'grok' && env.GEMINI_API_KEY) {
    effectiveLlmRef = { provider: 'gemini', model: 'gemini-2.0-flash' };
  }

  // Build enhanced visual brief with topic context and style guidance
  const briefComponents: string[] = [
    `Topic: ${topic}`,
    `Audience: ${audience}`,
    `Tone: ${tone}`,
    `Style guidance: ${mergedStyleHints.slice(0, 3).join(', ')}`,
  ];

  const prompt = `You are a visual content strategist. Given a LinkedIn post and its pattern, create image search guidance.

POST TEXT (first 400 chars):
${variantText.slice(0, 400)}

PATTERN: ${pattern.name}
${briefComponents.join('\n')}

IMAGE HINTS:
${JSON.stringify(
  {
    mood: hintMood || 'professional',
    searchKeywords: hintKeywords,
  },
  null,
  2,
)}

Return JSON with this exact shape:
{
  "visualBrief": "<2-3 sentence description of the ideal image: mood, style, subject, what to avoid>",
  "styleHints": ["<style hint 1>", "<style hint 2>", "<style hint 3>"],
  "searchKeywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"],
  "genPrompts": ["<image generation prompt 1>", "<image generation prompt 2>"]
}`;

  try {
    const result = await generateLlmParsedJson<LlmImageRelatorResponse>(env, effectiveLlmRef, prompt, {
      temperature: 0.5,
      maxOutputTokens: 2000,
    });

    return {
      visualBrief: result.visualBrief ?? '',
      styleHints: Array.isArray(result.styleHints) ? result.styleHints : mergedStyleHints,
      searchKeywords: Array.isArray(result.searchKeywords) ? result.searchKeywords : hintKeywords,
      genPrompts: Array.isArray(result.genPrompts) ? result.genPrompts : [],
    };
  } catch {
    return {
      visualBrief: `${hintMood} image for: ${report.topic}`,
      styleHints: mergedStyleHints,
      searchKeywords: hintKeywords.length ? hintKeywords : [report.topic],
      genPrompts: [],
    };
  }
}
