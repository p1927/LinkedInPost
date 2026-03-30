export interface ScheduledPublishTask {
  /** Stable row identity (Topics column C / D1 topic_id). */
  topicId: string;
  topic: string;
  date: string;
  scheduledTime: string;
  intent?: 'publish' | 'republish';
  channel?: string;
  recipientId?: string;
}

/** Client + DO `/cancel` body — `scheduledTime` must match the armed task to avoid clearing a newer schedule. */
export interface CancelScheduledPublishPayload {
  topicId: string;
  scheduledTime: string;
  channel?: string;
}
