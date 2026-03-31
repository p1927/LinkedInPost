import type { CalendarEvent } from '@schedule-x/calendar';
import type { CalendarTopic } from './types';
import { statusToCalendarId } from './statusStyles';

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

/**
 * Convert CalendarTopic[] to Schedule-X CalendarEvent[] using the Temporal API.
 * Timed events use ZonedDateTime (UTC); all-day events use PlainDate.
 */
export function mapTopicsToEvents(topics: CalendarTopic[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const topic of topics) {
    if (!topic.date?.trim()) continue;
    try {
      const time = normalizeTime(topic.startTime);
      let start: Temporal.ZonedDateTime | Temporal.PlainDate;
      let end: Temporal.ZonedDateTime | Temporal.PlainDate;

      if (time) {
        start = Temporal.ZonedDateTime.from(`${topic.date}T${time}:00[UTC]`);
        end = start.add({ hours: 1 });
      } else {
        start = Temporal.PlainDate.from(topic.date);
        end = start;
      }

      events.push({
        id: topic.id,
        title: topic.title || '(no title)',
        start,
        end,
        calendarId: statusToCalendarId(topic.status),
        description: topic.channels?.join(', '),
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
  const s = start as Temporal.ZonedDateTime | Temporal.PlainDate;
  if ('hour' in s) {
    const zdt = s as Temporal.ZonedDateTime;
    const t = zdt.toPlainTime();
    return {
      date: zdt.toPlainDate().toString(),
      time: `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`,
    };
  }
  return { date: s.toString() };
}
