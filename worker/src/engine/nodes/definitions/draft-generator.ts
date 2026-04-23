import type { NodeDefinition, DraftVariant } from '../../types';
import { generateLlmParsedJson } from '../../../llm/structuredJson';
import { buildGenerationBrief } from '../../brief/GenerationBriefBuilder';
import { JSON_ONLY_INSTRUCTION } from '../prompt-utils';

interface DraftGeneratorOutput {
  variants: DraftVariant[];
}

export const draftGeneratorNode: NodeDefinition = {
  id: 'draft-generator',
  name: 'Draft Generator',
  description: 'Generates 4 full draft variants following the narrative blueprint, each with a different hook.',
  reads: ['psychologyAnalysis', 'researchFindings', 'vocabularySelection', 'hookOptions', 'narrativeBlueprint'],
  writes: 'draftVariants',
  preferredModelTier: 'powerful',

  async run(context, nodeEnv) {
    const { channel, channelConstraints, outputs } = context;
    const blueprint = outputs.narrativeBlueprint;
    const hookOptions = outputs.hookOptions;

    // Build the full weighted brief from accumulated context — this is the
    // primary mechanism that brings all upstream node outputs together.
    const assembledBrief = buildGenerationBrief(context);

    const { min, max } = channelConstraints.targetWordRange;
    const hashtagInstruction = channel === 'instagram'
      ? 'Include 5-10 relevant hashtags at the end of each variant.'
      : 'Do NOT include hashtags.';

    const briefSection = `GENERATION BRIEF:\n${assembledBrief}`;

    const blueprintSection = blueprint
      ? `NARRATIVE BLUEPRINT:
Arc: ${blueprint.arc}
Target word count: ${blueprint.targetWordCount} (range: ${min}-${max})
CTA text: "${blueprint.ctaText}"
Sections:
${blueprint.sections.map((s) => `  [${s.name}] ${s.guidanceForWriter}`).join('\n')}`
      : `NARRATIVE BLUEPRINT: Not available. Use a hook_story_lesson arc targeting ${Math.round((min + max) / 2)} words.`;

    const hooksSection = hookOptions?.hooks.length
      ? `AVAILABLE HOOKS (use a different one for each variant):
${hookOptions.hooks.map((h, i) => `  [${i}] type=${h.type}: "${h.text}"`).join('\n')}
Recommended hook index: ${hookOptions.recommendedIndex}`
      : 'AVAILABLE HOOKS: Not available. Generate 4 different hooks yourself.';

    const prompt = `You are an elite ${channel} content writer who produces posts that drive real engagement.

Generate exactly 4 full draft variants for this content brief. Each variant must use a DIFFERENT hook.

${briefSection}

${blueprintSection}

${hooksSection}

PLATFORM CONTRACT: ${channelConstraints.platformContract}
FORMAT NOTES: ${channelConstraints.formatNotes}
HASHTAGS: ${hashtagInstruction}

Write each variant as a complete, publish-ready post:
- Hook line opens the post
- Follow the narrative arc sections in order
- End with the CTA (exact or variation)
- Stay within ${min}-${max} words
- Match the author's voice from the profile
- No links in body (unless channel is telegram or whatsapp)

${JSON_ONLY_INSTRUCTION}
{
  "variants": [
    {
      "index": 0,
      "text": "complete post text here",
      "hookType": "<hook type used>",
      "arcType": "<arc type used>",
      "wordCount": <integer word count>
    },
    { "index": 1, ... },
    { "index": 2, ... },
    { "index": 3, ... }
  ]
}

CRITICAL: All 4 variants must be fully written — no placeholders, no "[continue here]", no truncation. Each must be independently publish-ready.`;

    const raw = await generateLlmParsedJson<DraftGeneratorOutput>(
      nodeEnv.env,
      nodeEnv.llmRef,
      prompt,
      { maxOutputTokens: 4096 },
    );

    return { draftVariants: raw.variants };
  },
};

export default draftGeneratorNode;
