import type { NodeDefinition, ResearchFindings } from '../../types';
import { generateLlmParsedJson } from '../../../llm/structuredJson';
import { JSON_ONLY_INSTRUCTION } from '../prompt-utils';

export const researchContextNode: NodeDefinition = {
  id: 'research-context',
  name: 'Research Context',
  description: 'Synthesises research findings from provided articles or from LLM knowledge when no articles are available.',
  reads: [],
  writes: 'researchFindings',
  preferredModelTier: 'balanced',

  async run(context, nodeEnv) {
    const { topic, channel, researchArticles } = context;
    const hasArticles = researchArticles && researchArticles.length > 0;

    const articlesSection = hasArticles
      ? `RESEARCH ARTICLES PROVIDED:\n${researchArticles!
          .map(
            (a, i) =>
              `[${i + 1}] Title: ${a.title}\nSource: ${a.source}${a.publishedAt ? ` (${a.publishedAt})` : ''}\nURL: ${a.url}\nSnippet: ${a.snippet}`,
          )
          .join('\n\n')}`
      : `NO ARTICLES PROVIDED — synthesise findings purely from your knowledge about this topic. Make the facts and statistics as accurate and specific as possible.`;

    const prompt = `You are a research analyst preparing factual grounding for a ${channel} post.

TOPIC: ${topic}
CHANNEL: ${channel}

${articlesSection}

${hasArticles ? 'Extract structured findings from the articles above.' : 'Generate authoritative findings from your knowledge.'}

${JSON_ONLY_INSTRUCTION}
{
  "keyFacts": ["3-5 concrete, specific facts about this topic"],
  "statistics": ["3-5 quantitative data points (numbers, percentages, rates, rankings)"],
  "trends": ["3-5 directional trends or shifts happening in this space"],
  "credibilityHooks": ["3-5 phrases or references that establish authority (named researchers, institutions, published studies, well-known frameworks)"],
  "recencySignals": ["3-5 signals that make this content feel current and timely"]
}

Requirements:
- Each array: exactly 3-5 items
- statistics must include actual numbers — avoid vague claims like "many" or "most"
- credibilityHooks should name-drop credible sources, people, or frameworks
- recencySignals can reference recent events, emerging terminology, or date-anchored facts
- All items must be directly relevant to: "${topic}"`;

    const result = await generateLlmParsedJson<ResearchFindings>(
      nodeEnv.env,
      nodeEnv.llmRef,
      prompt,
    );

    return { researchFindings: result };
  },
};

export default researchContextNode;
