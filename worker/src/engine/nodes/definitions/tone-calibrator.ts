import type { NodeDefinition, DraftVariant } from '../../types';
import { generateLlmParsedJson } from '../../../llm/structuredJson';
import { JSON_ONLY_INSTRUCTION } from '../prompt-utils';

interface ToneCalibratorOutput {
  calibratedVariants: DraftVariant[];
}

export const toneCalibratorNode: NodeDefinition = {
  id: 'tone-calibrator',
  name: 'Tone Calibrator',
  description: 'Refines draft variants to mirror the author voice profile and apply vocabulary selection — minimal adjustments only.',
  reads: ['draftVariants', 'vocabularySelection'],
  writes: 'calibratedVariants',
  preferredModelTier: 'fast',

  async run(context, nodeEnv) {
    const { authorProfile, outputs } = context;
    const draftVariants = outputs.draftVariants;
    const vocab = outputs.vocabularySelection;

    if (!draftVariants) {
      return { calibratedVariants: null };
    }

    const vocabSection = vocab
      ? `VOCABULARY CALIBRATION:
- Power words to weave in naturally: ${vocab.powerWords.join(', ')}
- Words to replace/remove: ${vocab.avoidWords.join(', ')}
- Tone markers (voice adjectives): ${vocab.toneMarkers.join(', ')}
- Signature phrases to mirror: ${vocab.signaturePhrases.map((p) => `"${p}"`).join(', ')}`
      : 'VOCABULARY CALIBRATION: Not available — focus on voice matching from the author profile alone.';

    const variantsJson = JSON.stringify(draftVariants, null, 2);

    const prompt = `You are a voice calibration specialist. Your job is to make MINIMAL refinements to drafts so they sound like the author — not to rewrite them.

AUTHOR PROFILE:
${authorProfile}

${vocabSection}

DRAFTS TO CALIBRATE:
${variantsJson}

For each variant:
1. Replace any avoidWords with stronger alternatives
2. Weave in 2-3 powerWords where they fit naturally (do not force them)
3. Adjust sentence rhythm to match the toneMarkers
4. Where applicable, mirror a signaturePhrase pattern
5. Do NOT change the hook, the CTA, or the overall structure
6. Do NOT increase word count by more than 10%

${JSON_ONLY_INSTRUCTION}
{
  "calibratedVariants": [
    {
      "index": 0,
      "text": "calibrated post text",
      "hookType": "<same as input>",
      "arcType": "<same as input>",
      "wordCount": <updated word count>
    },
    ...
  ]
}

Return all ${draftVariants.length} variants. If a variant already matches the voice perfectly, return it unchanged.`;

    const raw = await generateLlmParsedJson<ToneCalibratorOutput>(
      nodeEnv.env,
      nodeEnv.llmRef,
      prompt,
    );

    return { calibratedVariants: raw.calibratedVariants };
  },
};

export default toneCalibratorNode;
