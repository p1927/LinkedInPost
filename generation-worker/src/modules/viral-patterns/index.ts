import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, ViralPatternSignal } from '../_shared/types';

import viralStructures from './knowledge/viral-structures.md';
import engagementTriggers from './knowledge/engagement-triggers.md';
import platformAlgorithms from './knowledge/platform-algorithms.md';

export { viralStructures, engagementTriggers, platformAlgorithms };

const DEFAULT_SIGNAL: ViralPatternSignal = {
  matchedPatterns: [],
  engagementPredictors: [],
  shareabilityScore: 5,
  commentBaitScore: 5,
  platformAlgoFit: 5,
};

export const viralPatternsModule: EnrichmentModule<ViralPatternSignal> = {
  name: 'viral-patterns',

  async enrich(ctx: ModuleContext): Promise<ViralPatternSignal> {
    if (!hasAnyLlmProvider(ctx.env)) {
      return DEFAULT_SIGNAL;
    }

    const knowledge = buildKnowledgeContext({
      'Viral Structures': viralStructures,
      'Engagement Triggers': engagementTriggers,
      'Platform Algorithms': platformAlgorithms,
    });

    const prompt = `You are a viral content analyst. Analyze the content brief and return a JSON object identifying viral patterns.

${knowledge}

--- Content Brief ---
Topic: ${ctx.topic}
Channel: ${ctx.channel}
Pattern: ${ctx.pattern.name}
Pattern Outline: ${ctx.pattern.outline}
Audience: ${ctx.report.audience || 'general'}
Tone: ${ctx.report.tone || 'professional'}
JTBD: ${ctx.report.jtbd || 'not specified'}

Return ONLY a JSON object with these exact fields:
- matchedPatterns: string[] — names of viral structures this content could use (e.g. "Contrarian Take", "Relatable Struggle")
- engagementPredictors: string[] — 2-4 specific engagement triggers most applicable to this content
- shareabilityScore: number 1-10 — how shareable is this content type on ${ctx.channel}
- commentBaitScore: number 1-10 — how likely is this content to generate comments
- platformAlgoFit: number 1-10 — how well does this content fit ${ctx.channel}'s algorithm signals`;

    const result = await generateLlmParsedJson<ViralPatternSignal>(
      ctx.env,
      ctx.llmRef,
      prompt,
      {
        temperature: 0.5,
        maxOutputTokens: 400,
      },
    );

    if (!result) return DEFAULT_SIGNAL;

    return {
      matchedPatterns: Array.isArray(result.matchedPatterns) ? result.matchedPatterns : DEFAULT_SIGNAL.matchedPatterns,
      engagementPredictors: Array.isArray(result.engagementPredictors) ? result.engagementPredictors : DEFAULT_SIGNAL.engagementPredictors,
      shareabilityScore: typeof result.shareabilityScore === 'number' ? result.shareabilityScore : DEFAULT_SIGNAL.shareabilityScore,
      commentBaitScore: typeof result.commentBaitScore === 'number' ? result.commentBaitScore : DEFAULT_SIGNAL.commentBaitScore,
      platformAlgoFit: typeof result.platformAlgoFit === 'number' ? result.platformAlgoFit : DEFAULT_SIGNAL.platformAlgoFit,
    };
  },
};
