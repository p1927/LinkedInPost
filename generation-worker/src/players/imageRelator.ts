import { callGeminiJson } from '../gemini';
import type { Pattern, RequirementReport, TextVariant } from '../types';

export interface ImageRelatorOutput {
  visualBrief: string;
  searchKeywords: string[];
  genPrompts: string[];
}

interface LlmImageRelatorResponse {
  visualBrief: string;
  searchKeywords: string[];
  genPrompts: string[];
}

export async function relateImages(
  primaryVariant: TextVariant,
  pattern: Pattern,
  report: RequirementReport,
  env: { GEMINI_API_KEY?: string },
): Promise<ImageRelatorOutput> {
  // Merge pattern image hints as default
  const hintKeywords = pattern.imageHints?.searchKeywords ?? [];
  const hintMood = pattern.imageHints?.mood ?? '';

  const apiKey = String(env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) {
    return {
      visualBrief: `${hintMood} image for topic: ${report.topic}`,
      searchKeywords: hintKeywords.length ? hintKeywords : [report.topic],
      genPrompts: [],
    };
  }

  const prompt = `You are a visual content strategist. Given a LinkedIn post and its pattern, create image search guidance.

POST TEXT (first 400 chars):
${primaryVariant.text.slice(0, 400)}

PATTERN: ${pattern.name}
Pattern mood hint: ${hintMood || 'professional'}
Topic: ${report.topic}
Channel: ${report.channel}

Return JSON with this exact shape:
{
  "visualBrief": "<2-3 sentence description of the ideal image: mood, style, subject, what to avoid>",
  "searchKeywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"],
  "genPrompts": ["<image generation prompt 1>", "<image generation prompt 2>"]
}`;

  try {
    const result = await callGeminiJson<LlmImageRelatorResponse>(apiKey, prompt, {
      temperature: 0.5,
      maxOutputTokens: 512,
    });

    return {
      visualBrief: result.visualBrief ?? '',
      searchKeywords: Array.isArray(result.searchKeywords) ? result.searchKeywords : hintKeywords,
      genPrompts: Array.isArray(result.genPrompts) ? result.genPrompts : [],
    };
  } catch {
    return {
      visualBrief: `${hintMood} image for: ${report.topic}`,
      searchKeywords: hintKeywords.length ? hintKeywords : [report.topic],
      genPrompts: [],
    };
  }
}
