import type { D1Database } from '@cloudflare/workers-types';
import { generateForRef } from '../llm/gateway';
import { getLlmSettingsFromD1 } from '../llm/d1Settings';
import { logLlmUsage } from '../db/llm-usage';
import type { Env } from '../index';

export interface KeywordExtractionResult {
  keywords: string[];
  relatedTopics: string[];
  searchIntent: string;
}

function fallback(topic: string): KeywordExtractionResult {
  return {
    keywords: topic.split(/\s+/).filter(Boolean).slice(0, 5),
    relatedTopics: [],
    searchIntent: '',
  };
}

export async function extractTrendingKeywords(
  env: Env,
  db: D1Database,
  spreadsheetId: string,
  userId: string,
  topic: string,
  region: string,
  genre: string,
): Promise<KeywordExtractionResult> {
  if (!topic.trim()) return fallback(topic);

  try {
    const settings = await getLlmSettingsFromD1(db, spreadsheetId);
    const ref = settings.enrichment_trending;
    if (!ref) return fallback(topic);

    const prompt = `Extract search keywords for trending news research.
Topic: "${topic}"
Region: "${region}"
Genre: "${genre}"

Return JSON only — no markdown, no explanation:
{
  "keywords": ["4-6 search terms optimised for news and social media APIs"],
  "relatedTopics": ["8-10 related topics the user might explore next"],
  "searchIntent": "one sentence describing what the user is looking for"
}`;

    const { text, usage } = await generateForRef(env, ref, prompt, {
      maxOutputTokens: 512,
      temperature: 0.3,
    });

    void logLlmUsage(db, {
      spreadsheetId,
      userId,
      provider: ref.provider,
      model: ref.model,
      settingKey: 'enrichment_trending',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback(topic);

    const parsed = JSON.parse(jsonMatch[0]) as Partial<KeywordExtractionResult>;
    return {
      keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0
        ? (parsed.keywords as string[]).slice(0, 6)
        : fallback(topic).keywords,
      relatedTopics: Array.isArray(parsed.relatedTopics)
        ? (parsed.relatedTopics as string[]).slice(0, 10)
        : [],
      searchIntent: typeof parsed.searchIntent === 'string' ? parsed.searchIntent : '',
    };
  } catch {
    return fallback(topic);
  }
}
