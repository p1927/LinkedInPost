import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, StorySignal } from '../_shared/types';
import narrativeStructures from './knowledge/narrative-structures.md';
import storyDevices from './knowledge/story-devices.md';

const DEFAULT_SIGNAL: StorySignal = {
  structure: 'before-after',
  protagonist: 'the reader',
  devices: ['specific-detail', 'contrast'],
  tensionPoint: 'the moment the problem becomes unavoidable',
  resolution: 'a practical insight the reader can apply immediately',
};

interface LlmStoryResponse {
  structure: string;
  protagonist: string;
  devices: string[];
  tensionPoint: string;
  resolution: string;
}

export const storytellingModule: EnrichmentModule<StorySignal> = {
  name: 'storytelling',

  async enrich(ctx: ModuleContext): Promise<StorySignal> {
    if (!hasAnyLlmProvider(ctx.env)) {
      return DEFAULT_SIGNAL;
    }

    const knowledge = buildKnowledgeContext({
      'Narrative Structures': narrativeStructures,
      'Story Devices': storyDevices,
    });

    const prompt = `You are a story strategy expert. Select the optimal narrative structure and story devices for the content brief below.

${knowledge}

---
CONTENT BRIEF:
- Topic: ${ctx.topic}
- Channel: ${ctx.channel}
- Audience: ${ctx.report.audience || 'general professionals'}
- Tone: ${ctx.report.tone || 'professional'}
- Pattern: ${ctx.pattern.name}
${ctx.report.jtbd ? `- Job-to-be-done: ${ctx.report.jtbd}` : ''}
${ctx.persona ? `- Persona language style: ${ctx.persona.language}` : ''}

---
INSTRUCTIONS:
Choose the single best narrative structure for this brief. Select 2-3 story devices that will strengthen the post. Be specific about the protagonist (who the story centers on), the tension point (the specific moment of conflict or challenge), and the resolution (what insight or outcome closes the story).

Return JSON with this exact shape:
{
  "structure": "<one of: hero-journey | before-after | problem-agitate-solve | in-medias-res | countdown | parallel>",
  "protagonist": "<who the story is about — be specific>",
  "devices": ["<device1>", "<device2>"],
  "tensionPoint": "<the specific moment of conflict, challenge, or decision>",
  "resolution": "<the concrete insight or outcome that closes the story>"
}`;

    try {
      const result = await generateLlmParsedJson<LlmStoryResponse>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.6,
        maxOutputTokens: 4096,
      });

      return {
        structure: result.structure ?? DEFAULT_SIGNAL.structure,
        protagonist: result.protagonist ?? DEFAULT_SIGNAL.protagonist,
        devices: Array.isArray(result.devices) && result.devices.length > 0
          ? result.devices
          : DEFAULT_SIGNAL.devices,
        tensionPoint: result.tensionPoint ?? DEFAULT_SIGNAL.tensionPoint,
        resolution: result.resolution ?? DEFAULT_SIGNAL.resolution,
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};
