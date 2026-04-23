import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, EmotionSignal } from '../_shared/types';
import taxonomyMd from './knowledge/emotion-taxonomy.md';
import arcsMd from './knowledge/emotional-arcs.md';

const DEFAULT_SIGNAL: EmotionSignal = {
  primaryEmotion: 'curiosity',
  secondaryEmotion: 'hope',
  intensity: 5,
  arc: 'curiosity-to-insight',
  emotionalHook: 'Open with an intriguing question or counterintuitive claim that draws the reader in.',
};

interface LlmEmotionResponse {
  primaryEmotion: string;
  secondaryEmotion: string;
  intensity: number;
  arc: string;
  emotionalHook: string;
}

export const emotionModule: EnrichmentModule<EmotionSignal> = {
  name: 'emotion',

  async enrich(ctx: ModuleContext): Promise<EmotionSignal> {
    if (!hasAnyLlmProvider(ctx.env)) {
      return DEFAULT_SIGNAL;
    }

    const knowledgeContext = buildKnowledgeContext({
      'Emotion Taxonomy': taxonomyMd,
      'Emotional Arcs': arcsMd,
    });

    const personaContext = ctx.persona
      ? `Persona: ${ctx.persona.name}
Concerns: ${ctx.persona.concerns.join(', ')}
Ambitions: ${ctx.persona.ambitions.join(', ')}
Current Focus: ${ctx.persona.currentFocus}
Pain Points: ${ctx.persona.painPoints.join(', ')}
Decision Drivers: ${ctx.persona.decisionDrivers.join(', ')}`
      : 'Persona: not specified';

    const prompt = `You are an expert content strategist specializing in emotional resonance. Using the knowledge below, select the optimal emotion strategy for the given content.

${knowledgeContext}

---

CONTENT PARAMETERS:
Topic: ${ctx.topic}
Channel: ${ctx.channel}
${personaContext}

Based on the emotion taxonomy and emotional arcs knowledge above, return a JSON object with this exact shape:
{
  "primaryEmotion": "<one emotion name from the taxonomy>",
  "secondaryEmotion": "<one emotion name from the taxonomy>",
  "intensity": <integer 1-10>,
  "arc": "<one arc name from the emotional arcs knowledge>",
  "emotionalHook": "<a 1-2 sentence emotionally-charged opening hook for this topic, channel, and persona>"
}

Select emotions and arc that are:
- Appropriate for the channel (use channel-emotion fit guidance)
- Matched to the persona's concerns and ambitions
- Suited to the topic's natural emotional register
- Realistic in intensity (avoid 9-10 unless fully justified)`;

    try {
      const result = await generateLlmParsedJson<LlmEmotionResponse>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.6,
        maxOutputTokens: 2000,
      });

      return {
        primaryEmotion: typeof result.primaryEmotion === 'string' && result.primaryEmotion.trim()
          ? result.primaryEmotion.trim()
          : DEFAULT_SIGNAL.primaryEmotion,
        secondaryEmotion: typeof result.secondaryEmotion === 'string' && result.secondaryEmotion.trim()
          ? result.secondaryEmotion.trim()
          : DEFAULT_SIGNAL.secondaryEmotion,
        intensity: typeof result.intensity === 'number' && result.intensity >= 1 && result.intensity <= 10
          ? Math.round(result.intensity)
          : DEFAULT_SIGNAL.intensity,
        arc: typeof result.arc === 'string' && result.arc.trim()
          ? result.arc.trim()
          : DEFAULT_SIGNAL.arc,
        emotionalHook: typeof result.emotionalHook === 'string' && result.emotionalHook.trim()
          ? result.emotionalHook.trim()
          : DEFAULT_SIGNAL.emotionalHook,
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};
