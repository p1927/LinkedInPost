export interface ScheduledPublishTask {
  /** Stable row identity (Topics column C / D1 topic_id). */
  topicId: string;
  topic: string;
  date: string;
  scheduledTime: string;
  intent?: 'publish' | 'republish';
  channel?: string;
  recipientId?: string;
  /** The user who scheduled the post — used to resolve per-user social tokens at execution time. */
  userId?: string;
}

/** Client + DO `/cancel` body — `scheduledTime` must match the armed task to avoid clearing a newer schedule. */
export interface CancelScheduledPublishPayload {
  topicId: string;
  scheduledTime: string;
  channel?: string;
}
