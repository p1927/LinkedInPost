import type { NodeDefinition, HookOptions } from '../../types';
import { generateLlmParsedJson } from '../../../llm/structuredJson';
import { JSON_ONLY_INSTRUCTION, topicContextBlock } from '../prompt-utils';

export const hookDesignerNode: NodeDefinition = {
  id: 'hook-designer',
  name: 'Hook Designer',
  description: 'Generates 3 hooks of different types, grounded in psychology triggers and research statistics.',
  reads: ['psychologyAnalysis', 'researchFindings'],
  writes: 'hookOptions',
  preferredModelTier: 'balanced',

  async run(context, nodeEnv) {
    const { channel, outputs } = context;
    const psych = outputs.psychologyAnalysis;
    const research = outputs.researchFindings;

    const psychSection = psych
      ? `PSYCHOLOGY TRIGGERS (use these to ground the hooks):
${psych.triggers.map((t) => `- ${t.type}: ${t.applicationHint}`).join('\n')}
Dominant emotion to evoke: ${psych.dominantEmotion}`
      : 'PSYCHOLOGY TRIGGERS: Not available.';

    const statsSection = research?.statistics.length
      ? `RESEARCH STATISTICS (use in data_point hook):
${research.statistics.slice(0, 3).map((s) => `- ${s}`).join('\n')}`
      : 'RESEARCH STATISTICS: Not available — invent a plausible statistic for the data_point hook.';

    const prompt = `You are a scroll-stopping copywriter who specialises in ${channel} hooks.

Generate exactly 3 hooks of DIFFERENT types for this topic.

${topicContextBlock(context)}

${psychSection}

${statsSection}

Hook types available: contrarian | data_point | personal_story | bold_question | bold_claim
Each hook must be a different type. Choose the 3 types that best fit this topic and audience.

${JSON_ONLY_INSTRUCTION}
{
  "hooks": [
    {
      "type": "<hook type>",
      "text": "the complete hook line — first sentence of the post, must stop the scroll",
      "rationale": "why this hook works for this topic and channel",
      "estimatedStopRate": "<low | medium | high>"
    },
    { ... },
    { ... }
  ],
  "recommendedIndex": <0, 1, or 2>
}

Requirements:
- Exactly 3 hooks, each a different type
- Hook text: punchy, specific, under 20 words for linkedin/instagram; up to 30 words for telegram/gmail
- contrarian hook must challenge a commonly-held belief in the field
- data_point hook must open with a specific number or percentage
- personal_story hook must start with "I" and feel authentic
- bold_question hook must create a knowledge gap the reader MUST close
- bold_claim hook must be assertive but defensible
- recommendedIndex: choose the hook with the highest estimated stop rate for this topic + channel combo
- estimatedStopRate reflects scroll-stopping power for this specific platform audience`;

    const result = await generateLlmParsedJson<HookOptions>(
      nodeEnv.env,
      nodeEnv.llmRef,
      prompt,
    );

    return { hookOptions: result };
  },
};

export default hookDesignerNode;
