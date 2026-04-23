import type { NodeDefinition, NarrativeBlueprint } from '../../types';
import { generateLlmParsedJson } from '../../../llm/structuredJson';
import { JSON_ONLY_INSTRUCTION, topicContextBlock } from '../prompt-utils';

export const narrativeArcNode: NodeDefinition = {
  id: 'narrative-arc',
  name: 'Narrative Arc',
  description: 'Selects a narrative arc, designs 3-4 sections, and specifies a substantive CTA based on the recommended hook and audience.',
  reads: ['hookOptions', 'psychologyAnalysis'],
  writes: 'narrativeBlueprint',
  preferredModelTier: 'balanced',

  async run(context, nodeEnv) {
    const { channelConstraints, outputs } = context;
    const hookOptions = outputs.hookOptions;
    const psych = outputs.psychologyAnalysis;

    const selectedHook = hookOptions
      ? hookOptions.hooks[hookOptions.recommendedIndex] ?? hookOptions.hooks[0]
      : null;

    const hookSection = selectedHook
      ? `SELECTED HOOK (recommended by hook-designer):
Type: ${selectedHook.type}
Text: "${selectedHook.text}"
Rationale: ${selectedHook.rationale}`
      : `SELECTED HOOK: Not available — design an arc suitable for a bold_claim hook on this topic.`;

    const psychSection = psych
      ? `AUDIENCE CONTEXT:
- Awareness level: ${psych.audienceAwarenessLevel}
- Dominant emotion to sustain: ${psych.dominantEmotion}
- Core aspiration: ${psych.aspirations[0] ?? 'Not specified'}`
      : 'AUDIENCE CONTEXT: Not available.';

    const { min, max } = channelConstraints.targetWordRange;
    const targetWordCount = Math.round((min + max) / 2);

    const prompt = `You are a narrative strategist who designs high-performing ${context.channel} posts.

Design a narrative arc for this content.

${topicContextBlock(context)}
FORMAT NOTES: ${channelConstraints.formatNotes}
TARGET WORD RANGE: ${min}-${max} words

${hookSection}

${psychSection}

Arc types: hook_story_lesson | problem_agitate_solve | before_after | step_by_step | contrarian_case

${JSON_ONLY_INSTRUCTION}
{
  "selectedHook": ${selectedHook ? JSON.stringify(selectedHook) : '{"type":"bold_claim","text":"","rationale":"","estimatedStopRate":"medium"}'},
  "arc": "<chosen arc type>",
  "sections": [
    {
      "name": "section name",
      "purpose": "what this section accomplishes for the reader",
      "guidanceForWriter": "specific instructions: what to include, what tone, what not to do"
    }
  ],
  "ctaType": "<question | call_to_action | reflection | share_prompt>",
  "ctaText": "the exact CTA text — must invite a 10+ word comment response, not a generic like",
  "targetWordCount": ${targetWordCount}
}

Requirements:
- Choose the arc type that best matches the hook type and audience awareness level
- 3-4 sections only (not counting the hook itself)
- guidanceForWriter must be actionable and specific to the topic — not generic writing advice
- CTA must invite substantive engagement: ask a specific question, request a story, or prompt a debate
- CTA must NOT say "like this post", "share if you agree", or similarly generic phrases
- targetWordCount must be within ${min}-${max}`;

    const result = await generateLlmParsedJson<NarrativeBlueprint>(
      nodeEnv.env,
      nodeEnv.llmRef,
      prompt,
    );

    return { narrativeBlueprint: result };
  },
};

export default narrativeArcNode;
