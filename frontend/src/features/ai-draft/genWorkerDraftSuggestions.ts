import type { ContentPattern } from '@/services/backendApi';
import type { ChannelId } from '@/integrations/channels';

export type DraftMessageKind =
  | 'email'
  | 'visual'
  | 'messaging'
  | 'thread'
  | 'short-form'
  | 'long-form'
  | 'default';

export type DraftSuggestionContext = {
  channel: ChannelId;
  pattern: ContentPattern | null;
};

const BASE_AUDIENCE = [
  'IC peers and hiring managers',
  'Startup founders and operators',
  'Product and engineering leaders',
  'Marketing and growth teams',
  'Students and career switchers',
  'Existing customers',
  'Prospects evaluating solutions',
];

const BASE_TONE = [
  'Clear and direct',
  'Warm and approachable',
  'Authoritative but humble',
  'Conversational',
  'Inspirational',
  'Analytical',
  'Playful (light touch)',
];

const BASE_CTA = [
  'Comment with your take',
  'Save for later',
  'Share if this resonates',
  'Follow for more',
  'DM me to chat',
  'Read the link in comments',
  'Tag someone who needs this',
];

const BASE_CONSTRAINTS = [
  'No emojis',
  'One clear takeaway',
  'Lead with the hook',
  'Include a concrete example',
  'Avoid jargon; explain terms',
  'End with a question',
];

function uniq(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of items) {
    const t = s.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function inferMessageKind(channel: ChannelId, pattern: ContentPattern | null): DraftMessageKind {
  const tags = (pattern?.tags ?? []).map((t) => t.toLowerCase());
  const name = (pattern?.name ?? '').toLowerCase();
  const blob = [...tags, name].join(' ');

  if (channel === 'gmail' || blob.includes('email') || blob.includes('newsletter')) return 'email';
  if (channel === 'instagram' || blob.includes('carousel') || blob.includes('visual') || blob.includes('reel'))
    return 'visual';
  if (blob.includes('thread') || blob.includes('series')) return 'thread';
  if (blob.includes('short') || blob.includes('snack')) return 'short-form';
  if (blob.includes('long') || blob.includes('deep') || blob.includes('essay')) return 'long-form';
  if (channel === 'telegram' || channel === 'whatsapp') return 'messaging';
  return 'default';
}

function channelAudience(channel: ChannelId): string[] {
  switch (channel) {
    case 'linkedin':
      return [
        'LinkedIn professionals in your niche',
        'Hiring managers skimming feeds',
        'Peers you want referrals from',
      ];
    case 'instagram':
      return ['Instagram followers', 'Visual-first scrollers', 'Community around your brand'];
    case 'telegram':
    case 'whatsapp':
      return ['Subscribers who opted in', 'Small group / inner circle', 'Customers on your list'];
    case 'gmail':
      return ['Email list subscribers', 'Busy execs (scan-friendly)', 'Warm leads'];
    default:
      return [];
  }
}

function channelTone(channel: ChannelId): string[] {
  switch (channel) {
    case 'linkedin':
      return ['Professional with personality', 'Story-led', 'Opinionated (respectfully)'];
    case 'instagram':
      return ['Authentic voice', 'Minimal caption fluff', 'Community-focused'];
    case 'telegram':
    case 'whatsapp':
      return ['Friendly and timely', 'Brief updates', 'Personal sign-off'];
    case 'gmail':
      return ['Respectful of inbox', 'Scannable sections', 'Single primary ask'];
    default:
      return [];
  }
}

function channelCta(channel: ChannelId): string[] {
  switch (channel) {
    case 'linkedin':
      return ['Republish with your angle', 'Connect and say hi', 'Book a call (soft ask)'];
    case 'instagram':
      return ['Tap link in bio', 'Drop a emoji reaction', 'Turn on post notifications'];
    case 'telegram':
    case 'whatsapp':
      return ['Reply with feedback', 'Forward to a friend', 'Mute if too frequent'];
    case 'gmail':
      return ['Hit reply with one question', 'Click through to read more', 'Unsubscribe if not relevant'];
    default:
      return [];
  }
}

function channelConstraints(channel: ChannelId): string[] {
  switch (channel) {
    case 'linkedin':
      return [
        'Under ~200 words unless long-form',
        'Strong first line (above the fold)',
        '1–3 hashtags max if any',
      ];
    case 'instagram':
      return ['Caption complements the image', 'Line breaks for readability', 'Alt text friendly description'];
    case 'telegram':
    case 'whatsapp':
      return ['Short paragraphs', 'No walls of text', 'Clear next step if needed'];
    case 'gmail':
      return ['Subject line matches body promise', 'One main CTA', 'Plain language, no hype'];
    default:
      return [];
  }
}

function kindAudience(kind: DraftMessageKind): string[] {
  switch (kind) {
    case 'email':
      return ['Readers who skim on mobile', 'People who subscribed for this topic'];
    case 'visual':
      return ['Scrollers stopping on the image', 'Fans of your aesthetic'];
    case 'messaging':
      return ['People who want quick updates', 'High-trust channel'];
    case 'thread':
      return ['Readers following a sequence', 'People who save threads'];
    case 'short-form':
      return ['Busy readers', 'Feed skimmers'];
    case 'long-form':
      return ['Readers who want depth', 'Practitioners implementing advice'];
    default:
      return [];
  }
}

function kindTone(kind: DraftMessageKind): string[] {
  switch (kind) {
    case 'email':
      return ['Helpful editor voice', 'Warm greeting, clear close'];
    case 'visual':
      return ['Caption supports the visual', 'Less is more'];
    case 'messaging':
      return ['Human, not corporate broadcast'];
    case 'thread':
      return ['Numbered clarity', 'Each post stands alone'];
    case 'short-form':
      return ['Punchy sentences', 'No filler'];
    case 'long-form':
      return ['Structured sections', 'Teach, don’t perform'];
    default:
      return [];
  }
}

function kindCta(kind: DraftMessageKind): string[] {
  switch (kind) {
    case 'email':
      return ['Click the primary link', 'Reply yes/no to this question'];
    case 'visual':
      return ['Save this post', 'Share to stories'];
    case 'messaging':
      return ['React with 👍 if useful'];
    case 'thread':
      return ['Read part 2 (link)', 'Bookmark the full thread'];
    case 'short-form':
      return ['One-line takeaway in comments'];
    case 'long-form':
      return ['Tell me what I missed'];
    default:
      return [];
  }
}

function kindConstraints(kind: DraftMessageKind): string[] {
  switch (kind) {
    case 'email':
      return ['Preview text matches opening', 'Unsubscribe mention if promo'];
    case 'visual':
      return ['Don’t bury the hook in hashtags'];
    case 'messaging':
      return ['Assume partial attention'];
    case 'thread':
      return ['Mark thread 1/N if multi-part'];
    case 'short-form':
      return ['Tight word budget'];
    case 'long-form':
      return ['Subheads every few paragraphs'];
    default:
      return [];
  }
}

function patternHints(pattern: ContentPattern | null): {
  audience: string[];
  tone: string[];
  cta: string[];
  constraints: string[];
} {
  if (!pattern) {
    return { audience: [], tone: [], cta: [], constraints: [] };
  }
  const tags = pattern.tags ?? [];
  const name = pattern.name.trim();
  const out = { audience: [] as string[], tone: [] as string[], cta: [] as string[], constraints: [] as string[] };

  const tagStr = tags.join(' ').toLowerCase();
  const nameLower = name.toLowerCase();

  if (tagStr.includes('thought') || nameLower.includes('thought')) {
    out.tone.push('Opinion + reasoning');
    out.constraints.push('State your thesis early');
  }
  if (tagStr.includes('story') || nameLower.includes('story')) {
    out.tone.push('Narrative arc');
    out.constraints.push('Concrete scene or moment');
  }
  if (tagStr.includes('data') || nameLower.includes('data')) {
    out.tone.push('Evidence-forward');
    out.constraints.push('Cite or qualify statistics');
  }
  if (tagStr.includes('how-to') || tagStr.includes('how to') || nameLower.includes('how')) {
    out.cta.push('Try step 1 today');
    out.constraints.push('Numbered steps where possible');
  }
  if (tagStr.includes('announcement') || nameLower.includes('launch')) {
    out.cta.push('Join the waitlist / beta');
    out.constraints.push('Clear what’s new and why it matters');
  }

  if (pattern.whenToUse?.trim()) {
    const w = pattern.whenToUse.trim();
    out.constraints.push(w.length <= 72 ? `Fit: ${w}` : `Fit: ${w.slice(0, 69)}…`);
  }

  return out;
}

function buildContext(ctx: DraftSuggestionContext): { channel: ChannelId; kind: DraftMessageKind; pattern: ContentPattern | null } {
  return {
    channel: ctx.channel,
    kind: inferMessageKind(ctx.channel, ctx.pattern),
    pattern: ctx.pattern,
  };
}

export function getAudienceSuggestions(ctx: DraftSuggestionContext): string[] {
  const { channel, kind, pattern } = buildContext(ctx);
  const hints = patternHints(pattern);
  return uniq([
    ...BASE_AUDIENCE,
    ...channelAudience(channel),
    ...kindAudience(kind),
    ...hints.audience,
  ]);
}

export function getToneSuggestions(ctx: DraftSuggestionContext): string[] {
  const { channel, kind, pattern } = buildContext(ctx);
  const hints = patternHints(pattern);
  return uniq([...BASE_TONE, ...channelTone(channel), ...kindTone(kind), ...hints.tone]);
}

export function getCtaSuggestions(ctx: DraftSuggestionContext): string[] {
  const { channel, kind, pattern } = buildContext(ctx);
  const hints = patternHints(pattern);
  return uniq([...BASE_CTA, ...channelCta(channel), ...kindCta(kind), ...hints.cta]);
}

export function getConstraintsSuggestions(ctx: DraftSuggestionContext): string[] {
  const { channel, kind, pattern } = buildContext(ctx);
  const hints = patternHints(pattern);
  return uniq([
    ...BASE_CONSTRAINTS,
    ...channelConstraints(channel),
    ...kindConstraints(kind),
    ...hints.constraints,
  ]);
}

export function mergeCommaParts(chips: string[], freeText: string): string {
  return uniq([...chips, ...(freeText.trim() ? [freeText.trim()] : [])]).join(', ');
}

/** Constraints: chips and free text as separate sentences/lines. */
export function mergeConstraintParts(chips: string[], freeText: string): string {
  const parts = uniq([...chips.map((c) => c.trim()).filter(Boolean), ...(freeText.trim() ? [freeText.trim()] : [])]);
  return parts.join('\n');
}
