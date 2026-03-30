export interface ScheduledPublishTask {
  topic: string;
  date: string;
  scheduledTime: string;
  intent?: 'publish' | 'republish';
  channel?: string;
  recipientId?: string;
}

/** Client + DO `/cancel` body — `scheduledTime` must match the armed task to avoid clearing a newer schedule. */
export interface CancelScheduledPublishPayload {
  topic: string;
  date: string;
  scheduledTime: string;
  channel?: string;
}
