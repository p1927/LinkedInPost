import type { ChannelId } from '@/integrations/channels';

/** Canonical shape consumed by ContentScheduleCalendar. */
export interface CalendarTopic {
  /** Stable unique id (used as Schedule-X event id). */
  id: string;
  /** Display title shown on the event tile. */
  title: string;
  /** ISO date string: YYYY-MM-DD */
  date: string;
  /** 24-h time string: HH:MM (optional — omit for all-day treatment). */
  startTime?: string;
  /** Lifecycle status string, e.g. "pending" | "drafted" | "approved" | "published". */
  status?: string;
  /** Channel hints for display. */
  channels?: string[];
  /**
   * Opaque original payload. Adapters store the source record here so hosts
   * can reconstruct it after an edit or schedule change.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
}

/** When set on the calendar, the event detail modal uses queue actions instead of post preview. */
export interface TopicEventPublishControl {
  visible: boolean;
  mode: 'publish' | 'republish';
  disabled: boolean;
  busy: boolean;
  disabledReason?: string;
}

export interface TopicEventModalActions {
  workspaceChannel: ChannelId;
  onSetChannel: (topic: CalendarTopic, channel: ChannelId) => Promise<void>;
  onOpenEdit: (topic: CalendarTopic) => void;
  onPublish: (topic: CalendarTopic) => Promise<void>;
  getPublishControl: (topic: CalendarTopic) => TopicEventPublishControl;
  /** Open the AI Draft dialog for a pending topic. Only present when the generation worker is configured. */
  onDraft?: (topic: CalendarTopic) => void;
}

/** Emitted by ContentScheduleCalendar when a drag/resize changes the schedule. */
export interface TopicScheduleChange {
  id: string;
  newDate: string;
  /** Present only for timed events. */
  newStartTime?: string;
}

/** Confirmed batch reschedule from the Topics calendar dialog (after drag/resize). */
export interface TopicRescheduleCommitPayload {
  topicIds: string[];
  date: string;
  time: string;
}
