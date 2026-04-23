import type { ChannelId } from '@/integrations/channels';

export interface PendingScheduledPublish {
  topicId: string;
  topic: string;
  date: string;
  channel: ChannelId;
  scheduledTime: string;
}
