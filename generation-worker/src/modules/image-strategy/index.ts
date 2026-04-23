import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, ImageStrategySignal } from '../_shared/types';
import visualStorytelling from './knowledge/visual-storytelling.md';
import compositionRules from './knowledge/composition-rules.md';
import searchStrategy from './knowledge/search-strategy.md';

// ---------------------------------------------------------------------------
// Default Signal
// ---------------------------------------------------------------------------

const DEFAULT_SIGNAL: ImageStrategySignal = {
  visualStyle: 'documentary',
  composition: 'rule-of-thirds',
  subjectMatter: 'professional context',
  searchQueries: [],
  generationPrompt: '',
  textOverlayZone: 'bottom-strip',
};

// ---------------------------------------------------------------------------
// LLM Response Shape
// ---------------------------------------------------------------------------

interface LlmImageStrategyResponse {
  visualStyle: string;
  composition: string;
  subjectMatter: string;
  searchQueries: string[];
  generationPrompt: string;
  textOverlayZone: string;
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const imageStrategyModule: EnrichmentModule<ImageStrategySignal> = {
  name: 'image-strategy',

  async enrich(ctx: ModuleContext): Promise<ImageStrategySignal> {
    if (!hasAnyLlmProvider(ctx.env)) {
      return {
        ...DEFAULT_SIGNAL,
        searchQueries: [ctx.topic],
      };
    }

    const knowledge = buildKnowledgeContext({
      'Visual Storytelling': visualStorytelling,
      'Composition Rules': compositionRules,
      'Search Strategy': searchStrategy,
    });

    const prompt = `You are a visual content strategist for LinkedIn. Given a content brief, define the image strategy.

${knowledge}

CONTENT BRIEF:
- Topic: ${ctx.topic}
- Channel: ${ctx.channel}
- Pattern: ${ctx.pattern.name}
- Content summary: ${ctx.report.contentSummary || 'not specified'}

Return JSON with this exact shape:
{
  "visualStyle": "<one of: documentary, aspirational, conceptual, data-driven, human-centered, transformational>",
  "composition": "<one of: rule-of-thirds, centered-subject, negative-space>",
  "subjectMatter": "<2-3 sentence description of ideal image subject and setting>",
  "searchQueries": ["<query1>", "<query2>", "<query3>"],
  "generationPrompt": "<AI image generation prompt using the template from search strategy>",
  "textOverlayZone": "<one of: top-strip, bottom-strip, left-third, right-third, center-overlay, none>"
}`;

    try {
      const result = await generateLlmParsedJson<LlmImageStrategyResponse>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.6,
        maxOutputTokens: 2000,
      });

      return {
        visualStyle: result.visualStyle ?? DEFAULT_SIGNAL.visualStyle,
        composition: result.composition ?? DEFAULT_SIGNAL.composition,
        subjectMatter: result.subjectMatter ?? DEFAULT_SIGNAL.subjectMatter,
        searchQueries: Array.isArray(result.searchQueries) ? result.searchQueries : [ctx.topic],
        generationPrompt: result.generationPrompt ?? DEFAULT_SIGNAL.generationPrompt,
        textOverlayZone: result.textOverlayZone ?? DEFAULT_SIGNAL.textOverlayZone,
      };
    } catch {
      return {
        ...DEFAULT_SIGNAL,
        searchQueries: [ctx.topic],
      };
    }
  },
};
