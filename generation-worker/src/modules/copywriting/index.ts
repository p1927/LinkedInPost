import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, CopySignal } from '../_shared/types';
import hooksMd from './knowledge/hooks.md';
import powerWordsMd from './knowledge/power-words.md';
import ctaPatternsMd from './knowledge/cta-patterns.md';

const DEFAULT_SIGNAL: CopySignal = {
  hookType: 'question',
  hookExample: 'What would you do if everything you assumed about this was wrong?',
  powerWords: ['proven', 'simple', 'results'],
  ctaStyle: 'engage',
  ctaPhrase: 'What has your experience been? Drop it in the comments.',
  readabilityTarget: 'grade 8',
  sentenceRhythm: 'short-medium-short',
};

export const copywritingModule: EnrichmentModule<CopySignal> = {
  name: 'copywriting',

  async enrich(ctx: ModuleContext): Promise<CopySignal> {
    if (!hasAnyLlmProvider(ctx.env)) {
      return DEFAULT_SIGNAL;
    }

    const knowledge = buildKnowledgeContext({
      'Hook Types': hooksMd,
      'Power Words': powerWordsMd,
      'CTA Patterns': ctaPatternsMd,
    });

    const prompt = `You are a senior LinkedIn copywriter selecting the optimal hook, power words, and CTA for a post.

${knowledge}

## Content Brief
Topic: ${ctx.topic}
Channel: ${ctx.channel}
Pattern: ${ctx.pattern.id}
Audience: ${ctx.report.audience ?? 'general professional'}

## Task
Choose the copywriting approach that maximizes engagement and readability for this content and audience.

Respond with ONLY valid JSON matching this exact shape:
{
  "hookType": "<one of: question | stat | contrarian | story-open | challenge | list | confession>",
  "hookExample": "<a concrete example hook sentence for this specific topic>",
  "powerWords": ["<word 1>", "<word 2>", "<word 3>"],
  "ctaStyle": "<one of: engage | click | share | follow | none>",
  "ctaPhrase": "<a concrete CTA sentence for this post>",
  "readabilityTarget": "<e.g. grade 8 | grade 10 | conversational>",
  "sentenceRhythm": "<e.g. short-medium-short | long-short | uniform-medium>"
}`;

    try {
      const result = await generateLlmParsedJson<CopySignal>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.7,
        maxOutputTokens: 2000,
      });

      return {
        hookType: result.hookType ?? DEFAULT_SIGNAL.hookType,
        hookExample: result.hookExample ?? DEFAULT_SIGNAL.hookExample,
        powerWords: Array.isArray(result.powerWords) && result.powerWords.length > 0
          ? result.powerWords
          : DEFAULT_SIGNAL.powerWords,
        ctaStyle: result.ctaStyle ?? DEFAULT_SIGNAL.ctaStyle,
        ctaPhrase: result.ctaPhrase ?? DEFAULT_SIGNAL.ctaPhrase,
        readabilityTarget: result.readabilityTarget ?? DEFAULT_SIGNAL.readabilityTarget,
        sentenceRhythm: result.sentenceRhythm ?? DEFAULT_SIGNAL.sentenceRhythm,
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};
