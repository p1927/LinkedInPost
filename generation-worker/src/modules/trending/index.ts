import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, TrendingSignal } from '../_shared/types';

// Import knowledge
import evergreenTrends from './knowledge/evergreen-trends.md';
import trendAnalysisFramework from './knowledge/trend-analysis-framework.md';

const DEFAULT_SIGNAL: TrendingSignal = {
  trendingTopics: [],
  buzzwords: [],
  genZSlang: [],
  culturalReferences: [],
  timelySuggestion: '',
  trendConfidence: 0,
};

// Phase 1: Fetch live search results from SerpAPI
async function fetchTrendData(topic: string, audience: string, env: { SERPAPI_API_KEY?: string }): Promise<string> {
  const apiKey = env.SERPAPI_API_KEY;
  if (!apiKey) return '';

  const queries = [
    `trending ${topic} ${new Date().getFullYear()}`,
    `${audience} industry trends current`,
  ];

  const results: string[] = [];
  for (const query of queries) {
    try {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google');
      url.searchParams.set('q', query);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('num', '5');

      const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) continue;
      const data = await resp.json() as { organic_results?: Array<{ title?: string; snippet?: string }> };
      const organic = data.organic_results ?? [];
      for (const r of organic.slice(0, 5)) {
        if (r.title || r.snippet) {
          results.push(`${r.title ?? ''}: ${r.snippet ?? ''}`);
        }
      }
    } catch {
      // SerpAPI unavailable — graceful degradation
    }
  }

  return results.join('\n');
}

export const trendingModule: EnrichmentModule<TrendingSignal> = {
  name: 'trending',
  async enrich(ctx: ModuleContext): Promise<TrendingSignal> {
    if (!hasAnyLlmProvider(ctx.env)) return DEFAULT_SIGNAL;

    // Phase 1: Internet research
    const liveData = await fetchTrendData(ctx.topic, ctx.report.audience || '', ctx.env);

    // Phase 2: LLM analysis of research + knowledge base
    const personaContext = ctx.persona
      ? `Persona: ${ctx.persona.name}. Habits: ${ctx.persona.habits.slice(0, 2).join(', ')}. Language: ${ctx.persona.language}.`
      : '';

    const knowledge = buildKnowledgeContext({
      'Evergreen Trends': evergreenTrends,
      'Trend Analysis Framework': trendAnalysisFramework,
    });

    const liveBlock = liveData
      ? `\nLIVE SEARCH RESULTS (from web search just now):\n${liveData}\n`
      : '\nNo live search data available — rely on knowledge base and general awareness.\n';

    const prompt = `You are a trend analyst for content creation. Identify trending topics, buzzwords, and cultural references relevant to this content.

${knowledge}
${liveBlock}

TOPIC: ${ctx.topic}
CHANNEL: ${ctx.channel}
AUDIENCE: ${ctx.report.audience || 'general professionals'}
${personaContext}

Based on the live search results (if available) AND your knowledge, identify:
- Currently trending topics in this space
- Buzzwords and phrases gaining traction
- GenZ/internet slang that could work (only if audience-appropriate)
- Cultural references that would resonate

Return JSON:
{
  "trendingTopics": ["<topic1>", "<topic2>", "<topic3>"],
  "buzzwords": ["<buzzword1>", "<buzzword2>", "<buzzword3>"],
  "genZSlang": ["<term1>", "<term2>"],
  "culturalReferences": ["<ref1>", "<ref2>"],
  "timelySuggestion": "<one-sentence suggestion for a timely angle on this topic>",
  "trendConfidence": <1-10, higher if live data was available and relevant>
}`;

    try {
      const result = await generateLlmParsedJson<TrendingSignal>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.6,
        maxOutputTokens: 600,
      });
      return {
        trendingTopics: Array.isArray(result.trendingTopics) ? result.trendingTopics : [],
        buzzwords: Array.isArray(result.buzzwords) ? result.buzzwords : [],
        genZSlang: Array.isArray(result.genZSlang) ? result.genZSlang : [],
        culturalReferences: Array.isArray(result.culturalReferences) ? result.culturalReferences : [],
        timelySuggestion: result.timelySuggestion ?? '',
        trendConfidence: typeof result.trendConfidence === 'number' ? result.trendConfidence : (liveData ? 7 : 3),
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};
