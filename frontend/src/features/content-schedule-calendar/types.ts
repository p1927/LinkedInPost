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

/** Emitted by ContentScheduleCalendar when a drag/resize changes the schedule. */
export interface TopicScheduleChange {
  id: string;
  newDate: string;
  /** Present only for timed events. */
  newStartTime?: string;
}
