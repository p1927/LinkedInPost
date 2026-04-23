import type { CalendarEvent } from '@schedule-x/calendar';
import type { CalendarTopic } from './types';
import { statusToCalendarId } from './statusStyles';

export interface MapTopicsToEventsOptions {
  /** When a topic has no start time, place it in the time grid at this slot (local wall clock) so week/day drag works. */
  fallbackSlotTime?: string;
  /** Topic ids (string) that show a selected outline on the calendar. */
  selectedTopicIds?: ReadonlySet<string>;
}

/** Normalize an optional postTime string (e.g. "9:00", "14:30", "2:30 PM") → "HH:MM" or null. */
function normalizeTime(raw?: string): string | null {
  if (!raw?.trim()) return null;
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
  if (!match) return null;
  let h = parseInt(match[1]!, 10);
  const m = match[2]!;
  const ampm = match[3]?.toLowerCase();
  if (ampm === 'pm' && h !== 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h < 0 || h > 23) return null;
  return `${String(h).padStart(2, '0')}:${m}`;
}

function browserLocalTimeZoneId(): string {
  try {
    return Temporal.Now.zonedDateTimeISO().timeZoneId;
  } catch {
    return 'UTC';
  }
}

/**
 * Convert CalendarTopic[] to Schedule-X CalendarEvent[] using the Temporal API.
 * Date + time are interpreted as the user's local calendar wall clock (same as `isLocalScheduleInPast`),
 * not UTC, so month/week/day cells match Topics sheet values.
 */
export function mapTopicsToEvents(
  topics: CalendarTopic[],
  options?: MapTopicsToEventsOptions,
): CalendarEvent[] {
  const fallback = options?.fallbackSlotTime ?? '09:00';
  const fallbackOk = /^([01]?\d|2[0-3]):[0-5]\d$/.test(fallback) ? fallback : '09:00';
  const selectedTopicIds = options?.selectedTopicIds;

  const tz = browserLocalTimeZoneId();
  const events: CalendarEvent[] = [];
  for (const topic of topics) {
    if (!topic.date?.trim()) continue;
    try {
      const time = normalizeTime(topic.startTime) ?? fallbackOk;
      const start = Temporal.PlainDateTime.from(`${topic.date.trim()}T${time}:00`).toZonedDateTime(tz);
      const end = start.add({ hours: 1 });

      const idStr = String(topic.id);
      const selected = selectedTopicIds?.has(idStr);
      const blocked = (topic.status ?? '').toLowerCase() === 'blocked';
      const eventOptions: { disableDND?: boolean; additionalClasses?: string[] } = {};
      if (blocked) eventOptions.disableDND = true;
      if (selected) eventOptions.additionalClasses = ['csc-event--selected'];
      events.push({
        id: topic.id,
        title: topic.title || '(no title)',
        start,
        end,
        calendarId: statusToCalendarId(topic.status),
        description: topic.channels?.join(', '),
        channels: topic.channels,
        ...(Object.keys(eventOptions).length ? { _options: eventOptions } : {}),
      });
    } catch {
      // Skip events with invalid dates rather than crashing
    }
  }
  return events;
}

/**
 * Extract a plain date string from a Temporal start value returned by Schedule-X callbacks.
 */
export function extractDateFromStart(
  start: Temporal.ZonedDateTime | Temporal.PlainDate | unknown,
): { date: string; time?: string } {
  if (!start || typeof start !== 'object') return { date: String(start) };
  const o = start as Record<string, unknown>;
  if (typeof o.timeZoneId === 'string') {
    const zdt = start as Temporal.ZonedDateTime;
    const t = zdt.toPlainTime();
    return {
      date: zdt.toPlainDate().toString(),
      time: `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`,
    };
  }
  if (
    'year' in start &&
    'month' in start &&
    'day' in start &&
    typeof o.year === 'number' &&
    typeof o.month === 'number' &&
    typeof o.day === 'number'
  ) {
    return { date: (start as Temporal.PlainDate).toString() };
  }
  return { date: String(start) };
}
