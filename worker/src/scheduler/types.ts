export interface ScheduledPublishTask {
  topic: string;
  date: string;
  scheduledTime: string;
  intent?: 'publish' | 'republish';
  channel?: string;
  recipientId?: string;
}
