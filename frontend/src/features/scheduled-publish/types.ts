import type { ChannelId } from '@/integrations/channels';

export interface PendingScheduledPublish {
  topic: string;
  date: string;
  channel: ChannelId;
  scheduledTime: string;
}
