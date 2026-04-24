export type AutomationPlatform = 'instagram' | 'linkedin' | 'telegram' | 'gmail' | 'youtube';
export type AutomationTrigger = 'comment' | 'dm' | 'comment_to_dm' | 'follow';

export interface AutomationRule {
  triggers: AutomationTrigger[];
  comment_reply_template?: string;
  dm_reply_template?: string;
  comment_to_dm_template?: string;
  follow_reply_template?: string;
  enabled: boolean;
  updatedAt: string;
}

export interface RuleEntry {
  key: string;
  rule: AutomationRule;
}

export interface YouTubeSchedule {
  channelId: string;
  cronExpression: string;
  lastPolledAt?: string;
}

export const PLATFORM_LABELS: Record<AutomationPlatform, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  telegram: 'Telegram',
  gmail: 'Gmail',
  youtube: 'YouTube',
};

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  comment: 'Auto-reply to comments',
  dm: 'Auto-reply to DMs / messages',
  comment_to_dm: 'DM commenter to follow',
  follow: 'DM new follower with content',
};

export const PLATFORM_TRIGGER_LABELS: Record<AutomationPlatform, Record<AutomationTrigger, string>> = {
  instagram: {
    comment: 'Auto-reply to comments',
    dm: 'Auto-reply to DMs / messages',
    comment_to_dm: 'DM commenter — ask them to follow for content',
    follow: 'DM new follower with content',
  },
  linkedin: {
    comment: 'Auto-reply to comments',
    dm: 'Auto-reply to DMs / messages',
    comment_to_dm: 'DM commenter — ask them to follow your page',
    follow: 'DM new follower (not available via LinkedIn API)',
  },
  telegram: {
    comment: 'Auto-reply to comments',
    dm: 'Auto-reply to DMs / messages',
    comment_to_dm: 'DM commenter to follow',
    follow: 'DM new follower with content',
  },
  gmail: {
    comment: 'Auto-reply to comments',
    dm: 'Auto-reply to DMs / messages',
    comment_to_dm: 'DM commenter to follow',
    follow: 'DM new follower with content',
  },
  youtube: {
    comment: 'Auto-reply to comments',
    dm: 'Auto-reply to DMs / messages',
    comment_to_dm: 'DM commenter to follow',
    follow: 'DM new follower with content',
  },
};

export function getTriggerLabels(platform: AutomationPlatform): Record<AutomationTrigger, string> {
  return PLATFORM_TRIGGER_LABELS[platform] ?? TRIGGER_LABELS;
}

export const PLATFORM_FOLLOW_SUPPORTED: Record<AutomationPlatform, boolean> = {
  instagram: true,
  linkedin: false,
  telegram: false,
  gmail: false,
  youtube: false,
};
