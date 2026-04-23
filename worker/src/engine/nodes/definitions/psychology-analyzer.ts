import type { NodeDefinition, PsychologyAnalysis } from '../../types';
import { generateLlmParsedJson } from '../../../llm/structuredJson';
import { JSON_ONLY_INSTRUCTION, topicContextBlock } from '../prompt-utils';

export const psychologyAnalyzerNode: NodeDefinition = {
  id: 'psychology-analyzer',
  name: 'Psychology Analyzer',
  description: 'Analyses audience psychology for the topic and channel to surface pain points, aspirations, and persuasion triggers.',
  reads: [],
  writes: 'psychologyAnalysis',
  preferredModelTier: 'balanced',

  async run(context, nodeEnv) {
    const { channelConstraints } = context;

    const prompt = `You are an expert audience psychologist and conversion copywriter.

Analyse the audience psychology for the following content brief and return a JSON object.

${topicContextBlock(context)}

${JSON_ONLY_INSTRUCTION}
{
  "audienceDescription": "2-3 sentence portrait of who reads this content and why",
  "audienceAwarenessLevel": "<problem_unaware | problem_aware | solution_aware | product_aware>",
  "painPoints": ["3 to 5 specific pain points this audience feels about the topic"],
  "aspirations": ["3 to 5 concrete aspirations or desired outcomes"],
  "triggers": [
    {
      "type": "<fomo | authority | social_proof | reciprocity | curiosity | identity | urgency | validation | aspiration>",
      "rationale": "why this trigger resonates with this specific audience",
      "applicationHint": "concrete way to embed this trigger in the copy"
    }
  ],
  "dominantEmotion": "the single strongest emotion the post should evoke (e.g. 'inspired', 'validated', 'curious')"
}

Requirements:
- painPoints: exactly 3-5 items
- aspirations: exactly 3-5 items
- triggers: exactly 2-4 items, each with a different type
- audienceAwarenessLevel must reflect where this audience sits on the awareness ladder for THIS topic
- dominantEmotion must align with the platform contract: "${channelConstraints.platformContract}"
- Be specific to the topic — avoid generic marketing language`;

    const result = await generateLlmParsedJson<PsychologyAnalysis>(
      nodeEnv.env,
      nodeEnv.llmRef,
      prompt,
    );

    return { psychologyAnalysis: result };
  },
};

export default psychologyAnalyzerNode;
