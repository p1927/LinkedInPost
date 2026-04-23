import type { ChannelFormattedOutput, TypographySignal } from '../_shared/types';
import type { TextVariant } from '../../types';

// ---------------------------------------------------------------------------
// Channel Limits
// ---------------------------------------------------------------------------

const CHANNEL_LIMITS: Record<string, number> = {
  linkedin: 3000,
  instagram: 2200,
  email: 10000,
  whatsapp: 1000,
  telegram: 4096,
};

const CHANNEL_HASHTAG_COUNTS: Record<string, number> = {
  linkedin: 5,
  instagram: 15,
  email: 0,
  whatsapp: 0,
  telegram: 3,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractHashtags(text: string, maxCount: number): { cleaned: string; hashtags: string[] } {
  if (maxCount === 0) {
    // Strip all hashtags from text
    const cleaned = text.replace(/#\w+/g, '').replace(/\s{2,}/g, ' ').trim();
    return { cleaned, hashtags: [] };
  }

  const matches = text.match(/#\w+/g) ?? [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const tag of matches) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(tag);
    }
  }

  const hashtags = unique.slice(0, maxCount);
  // Remove all hashtags from body text; they will be reappended separately
  const cleaned = text.replace(/#\w+/g, '').replace(/\s{2,}/g, ' ').trim();
  return { cleaned, hashtags };
}

function applyTypography(text: string, typography: TypographySignal): string {
  let result = text;

  // Apply line break strategy
  if (typography.lineBreakStrategy === 'aggressive') {
    // Break after every sentence
    result = result.replace(/([.!?])\s+/g, '$1\n\n');
  } else if (typography.lineBreakStrategy === 'moderate') {
    // Ensure paragraph breaks after double line breaks are preserved
    result = result.replace(/([.!?])\s{2,}/g, '$1\n\n');
  }

  // Enforce max line length by inserting line breaks at word boundaries
  if (typography.maxLineLength > 0) {
    const lines = result.split('\n');
    const wrapped = lines.map((line) => {
      if (line.length <= typography.maxLineLength) return line;
      const words = line.split(' ');
      const wrappedLines: string[] = [];
      let current = '';
      for (const word of words) {
        if ((current + (current ? ' ' : '') + word).length > typography.maxLineLength) {
          if (current) wrappedLines.push(current);
          current = word;
        } else {
          current = current ? `${current} ${word}` : word;
        }
      }
      if (current) wrappedLines.push(current);
      return wrappedLines.join('\n');
    });
    result = wrapped.join('\n');
  }

  // Apply emoji usage: if 'none', strip all emojis
  if (typography.emojiUsage === 'none') {
    // Remove emoji characters via Unicode range
    result = result.replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      '',
    ).replace(/\s{2,}/g, ' ').trim();
  }

  return result;
}

function buildPlatformNotes(channel: string, truncated: boolean, hashtagCount: number): string[] {
  const notes: string[] = [];
  const normalized = channel.toLowerCase();

  if (truncated) {
    notes.push(`Content was truncated to fit ${CHANNEL_LIMITS[normalized] ?? 'channel'} character limit.`);
  }

  if (normalized === 'linkedin') {
    notes.push('Place any external URLs in the first comment to preserve reach.');
    if (hashtagCount > 0) notes.push(`${hashtagCount} hashtag(s) appended. Recommended: 3–5 for LinkedIn.`);
  } else if (normalized === 'instagram') {
    notes.push('Links in captions are not clickable — direct audience to link in bio.');
    if (hashtagCount > 0) notes.push(`${hashtagCount} hashtag(s) appended. Recommended: 5–15 for Instagram.`);
  } else if (normalized === 'email') {
    notes.push('Hashtags removed — not applicable in email.');
    notes.push('Ensure subject line is 40–60 characters for optimal mobile display.');
  } else if (normalized === 'whatsapp') {
    notes.push('Hashtags removed — not functional in WhatsApp.');
    notes.push('Keep message under 1,000 characters for optimal forward rates.');
  } else if (normalized === 'telegram') {
    if (hashtagCount > 0) notes.push(`${hashtagCount} hashtag(s) appended. Recommended: 1–3 for Telegram.`);
    notes.push('Telegram supports MarkdownV2 / HTML formatting — apply as needed in final delivery.');
  }

  return notes;
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export function formatForChannel(
  variant: TextVariant,
  typography: TypographySignal,
  channel: string,
): ChannelFormattedOutput {
  const normalized = channel.toLowerCase();
  const limit = CHANNEL_LIMITS[normalized] ?? 3000;
  const maxHashtags = CHANNEL_HASHTAG_COUNTS[normalized] ?? 0;

  // Step 1: Apply typography directives
  let text = applyTypography(variant.text, typography);

  // Step 2: Extract and separate hashtags
  const { cleaned, hashtags } = extractHashtags(text, maxHashtags);
  text = cleaned;

  // Step 3: Reappend hashtags at the end (if any)
  let formattedText = text;
  if (hashtags.length > 0) {
    formattedText = `${text}\n\n${hashtags.join(' ')}`;
  }

  // Step 4: Truncate if needed
  let truncationApplied = false;
  if (formattedText.length > limit) {
    // Truncate at the last word boundary before the limit
    const truncated = formattedText.slice(0, limit - 1);
    const lastSpace = truncated.lastIndexOf(' ');
    formattedText = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
    truncationApplied = true;
  }

  const characterCount = formattedText.length;
  const platformNotes = buildPlatformNotes(normalized, truncationApplied, hashtags.length);

  return {
    formattedText,
    hashtags,
    characterCount,
    truncationApplied,
    platformNotes,
  };
}
