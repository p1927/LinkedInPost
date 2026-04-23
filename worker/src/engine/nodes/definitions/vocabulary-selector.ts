import type { NodeDefinition, VocabularySelection } from '../../types';
import { generateLlmParsedJson } from '../../../llm/structuredJson';
import { JSON_ONLY_INSTRUCTION, topicContextBlock } from '../prompt-utils';

export const vocabularySelectorNode: NodeDefinition = {
  id: 'vocabulary-selector',
  name: 'Vocabulary Selector',
  description: 'Selects power words, words to avoid, industry terms, tone markers, and signature phrases for the author voice.',
  reads: ['psychologyAnalysis'],
  writes: 'vocabularySelection',
  preferredModelTier: 'fast',

  async run(context, nodeEnv) {
    const { channelConstraints, outputs } = context;
    const psych = outputs.psychologyAnalysis;

    const psychSection = psych
      ? `AUDIENCE PSYCHOLOGY:
- Dominant emotion to evoke: ${psych.dominantEmotion}
- Audience awareness level: ${psych.audienceAwarenessLevel}
- Key pain points: ${psych.painPoints.slice(0, 3).join('; ')}
- Key aspirations: ${psych.aspirations.slice(0, 3).join('; ')}
- Active triggers: ${psych.triggers.map((t) => t.type).join(', ')}`
      : 'AUDIENCE PSYCHOLOGY: Not available — use general best practices for this topic and channel.';

    const prompt = `You are a brand voice specialist and direct-response copywriter.

Select the optimal vocabulary for this content brief.

${topicContextBlock(context)}
FORMAT NOTES: ${channelConstraints.formatNotes}

${psychSection}

${JSON_ONLY_INSTRUCTION}
{
  "powerWords": ["8-12 words that emotionally resonate for this topic and audience — action verbs, vivid nouns, sensory adjectives"],
  "avoidWords": ["5-8 corporate, cliché, or generic words that dilute authority for this topic"],
  "industryTerms": ["relevant technical or industry jargon that signals credibility to this audience — use sparingly"],
  "toneMarkers": ["5-7 adjectives describing the author's voice e.g. 'direct', 'warm', 'analytical', 'conversational'"],
  "signaturePhrases": ["3-5 distinctive phrase patterns extracted from the author profile that should be mirrored in the post"]
}

Requirements:
- powerWords: 8-12 single words (not phrases)
- avoidWords: 5-8 words — focus on corporate jargon, buzzwords, and vague qualifiers
- industryTerms: terms the target audience uses themselves, not internal jargon
- toneMarkers: must be consistent with the platform contract "${channelConstraints.platformContract}"
- signaturePhrases: extract genuine patterns from the author profile text above — cadence, punctuation, structural habits`;

    const result = await generateLlmParsedJson<VocabularySelection>(
      nodeEnv.env,
      nodeEnv.llmRef,
      prompt,
    );

    return { vocabularySelection: result };
  },
};

export default vocabularySelectorNode;
