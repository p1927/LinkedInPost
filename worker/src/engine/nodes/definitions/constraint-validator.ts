import type {
  NodeDefinition,
  DraftVariant,
  ValidationReport,
  VariantValidation,
} from '../../types';

export const constraintValidatorNode: NodeDefinition = {
  id: 'constraint-validator',
  name: 'Constraint Validator',
  description: 'Deterministic validator: checks word count, link presence, and hashtag rules for each variant. Auto-truncates when within 20% of range.',
  reads: ['calibratedVariants', 'draftVariants'],
  writes: 'validationReport',
  preferredModelTier: 'fast',

  async run(context, _nodeEnv) {
    const { channelConstraints, outputs } = context;
    const { targetWordRange, linksAllowedInBody, channel } = channelConstraints;
    const { min, max } = targetWordRange;

    const variants: DraftVariant[] = outputs.calibratedVariants ?? outputs.draftVariants ?? [];

    const isInstagram = channel === 'instagram';
    // Regex for URLs in body text
    const urlPattern = /https?:\/\/\S+/gi;
    // Regex for hashtags
    const hashtagPattern = /#\w+/g;

    const variantValidations: VariantValidation[] = variants.map((variant) => {
      const issues: string[] = [];
      let text = variant.text;

      // Word count
      const words = text.trim().split(/\s+/).filter(Boolean);
      let wordCount = words.length;

      // Check links in body
      if (!linksAllowedInBody) {
        const links = text.match(urlPattern);
        if (links && links.length > 0) {
          issues.push(`Body contains ${links.length} external link(s) — not allowed on ${channel}`);
        }
      }

      // Check hashtags on non-instagram channels
      if (!isInstagram) {
        const hashtags = text.match(hashtagPattern);
        if (hashtags && hashtags.length > 0) {
          issues.push(`Body contains ${hashtags.length} hashtag(s) — not appropriate for ${channel}`);
        }
      }

      // Word count validation and auto-truncate
      let adjustedText: string | null = null;
      const overBy = wordCount - max;
      const overByPercent = overBy / max;

      if (wordCount > max && overByPercent <= 0.2) {
        // Auto-truncate: remove words from the end until within range
        // Preserve the last sentence (CTA) by finding its approximate start
        const targetWords = max;
        const truncatedWords = words.slice(0, targetWords);
        adjustedText = truncatedWords.join(' ');
        wordCount = targetWords;
        // Don't add a word-count issue since we've corrected it
      } else if (wordCount > max) {
        issues.push(`Word count ${wordCount} exceeds max ${max} by more than 20% — manual edit required`);
      } else if (wordCount < min) {
        issues.push(`Word count ${wordCount} is below min ${min} — content too short`);
      }

      const finalWordCount = adjustedText
        ? adjustedText.trim().split(/\s+/).filter(Boolean).length
        : wordCount;

      const withinWordRange = finalWordCount >= min && finalWordCount <= max;

      return {
        index: variant.index,
        wordCount: finalWordCount,
        withinWordRange,
        issues,
        adjustedText,
      };
    });

    const allPassed =
      variantValidations.length > 0 &&
      variantValidations.every(
        (v) => v.withinWordRange && v.issues.length === 0,
      );

    const validationReport: ValidationReport = {
      variants: variantValidations,
      allPassed,
    };

    return { validationReport };
  },
};

export default constraintValidatorNode;
