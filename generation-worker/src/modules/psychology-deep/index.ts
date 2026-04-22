import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, PsychologySignal } from '../_shared/types';

import maslowsHierarchy from './knowledge/maslows-hierarchy.md';
import cognitiveBiases from './knowledge/cognitive-biases.md';
import behavioralTriggers from './knowledge/behavioral-triggers.md';
import motivationTheory from './knowledge/motivation-theory.md';

const DEFAULT_SIGNAL: PsychologySignal = {
  maslowLevel: 'esteem',
  primaryBias: 'social-proof',
  secondaryBias: 'authority',
  motivationType: 'extrinsic-identified',
  behavioralTrigger: 'curiosity-gap',
  psychologicalFrame: 'achievement',
};

export const psychologyDeepModule: EnrichmentModule<PsychologySignal> = {
  name: 'psychology-deep',

  async enrich(ctx: ModuleContext): Promise<PsychologySignal> {
    if (!hasAnyLlmProvider(ctx.env)) {
      return DEFAULT_SIGNAL;
    }

    const knowledge = buildKnowledgeContext({
      "Maslow's Hierarchy": maslowsHierarchy,
      'Cognitive Biases': cognitiveBiases,
      'Behavioral Triggers': behavioralTriggers,
      'Motivation Theory': motivationTheory,
    });

    const personaContext = ctx.persona
      ? `Persona: ${ctx.persona.name}
Concerns: ${ctx.persona.concerns.join(', ')}
Ambitions: ${ctx.persona.ambitions.join(', ')}
Current Focus: ${ctx.persona.currentFocus}
Pain Points: ${ctx.persona.painPoints.join(', ')}
Decision Drivers: ${ctx.persona.decisionDrivers.join(', ')}`
      : 'Persona: general professional audience';

    const prompt = `You are a content psychology strategist. Using the psychology knowledge below, select the most effective psychological framing for a LinkedIn post.

${knowledge}

---

POST CONTEXT:
Topic: ${ctx.topic}
Channel: ${ctx.channel}
Pattern: ${ctx.pattern.name}
${personaContext}

Select the optimal psychology signals for this post. Return JSON with this exact shape:
{
  "maslowLevel": "<one of: physiological | safety | belonging | esteem | self-actualization>",
  "primaryBias": "<name of the primary cognitive bias to apply, e.g. loss-aversion>",
  "secondaryBias": "<name of a supporting cognitive bias, e.g. social-proof>",
  "motivationType": "<one of: intrinsic | extrinsic-identified | extrinsic-introjected | extrinsic-external | autonomy | competence | relatedness>",
  "behavioralTrigger": "<name of the primary behavioral trigger, e.g. curiosity-gap>",
  "psychologicalFrame": "<1 sentence describing how to frame the post using these signals>"
}`;

    try {
      const result = await generateLlmParsedJson<PsychologySignal>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.5,
        maxOutputTokens: 2000,
      });

      return {
        maslowLevel: result.maslowLevel || DEFAULT_SIGNAL.maslowLevel,
        primaryBias: result.primaryBias || DEFAULT_SIGNAL.primaryBias,
        secondaryBias: result.secondaryBias || DEFAULT_SIGNAL.secondaryBias,
        motivationType: result.motivationType || DEFAULT_SIGNAL.motivationType,
        behavioralTrigger: result.behavioralTrigger || DEFAULT_SIGNAL.behavioralTrigger,
        psychologicalFrame: result.psychologicalFrame || DEFAULT_SIGNAL.psychologicalFrame,
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};
