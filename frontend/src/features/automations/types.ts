export type AutomationPlatform = 'instagram' | 'linkedin' | 'telegram' | 'gmail' | 'youtube';
export type AutomationTrigger = 'comment' | 'dm' | 'comment_to_dm';

export interface AutomationRule {
  triggers: AutomationTrigger[];
  comment_reply_template?: string;
  dm_reply_template?: string;
  comment_to_dm_template?: string;
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
};
