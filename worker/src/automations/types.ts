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

export interface AutomationEvent {
  platform: AutomationPlatform;
  channelId: string;
  topicId?: string;
  trigger: AutomationTrigger;
  senderId: string;
  senderName: string;
  commentId?: string;
  messageId?: string;
  text: string;
}

export interface WebhookRegistration {
  platform: AutomationPlatform;
  channelId: string;
  registeredAt: string;
  webhookId?: string;
}

export interface GmailWatchState {
  historyId: string;
  expiration: number;
  channelId: string;
}

export interface YouTubeSchedule {
  channelId: string;
  cronExpression: string;
  lastPolledAt?: string;
}
