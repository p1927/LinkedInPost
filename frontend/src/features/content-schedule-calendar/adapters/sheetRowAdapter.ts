import type { SheetRow } from '@/services/sheets';
import type { CalendarTopic } from '../types';
import { normalizePostTime } from './campaignPostAdapter';

/**
 * Prefer Topics column B; if empty, use the date embedded in `postTime` (e.g. `YYYY-MM-DD HH:mm`).
 */
export function deriveCalendarFieldsFromSheetRow(row: SheetRow): { date: string; startTime?: string } {
  const dateCol = (row.date || '').trim();
  const pt = (row.postTime || '').trim();

  const ymdTime = pt.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2})?/);
  if (ymdTime) {
    const iso = ymdTime[1]!;
    const h = parseInt(ymdTime[2]!, 10);
    const min = ymdTime[3]!;
    const startTime = `${String(h).padStart(2, '0')}:${min}`;
    return { date: dateCol || iso, startTime };
  }

  if (dateCol) {
    return { date: dateCol, startTime: normalizePostTime(pt) };
  }

  const isoOnly = pt.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (isoOnly) return { date: isoOnly[1]!, startTime: undefined };

  return { date: '' };
}

export function sheetRowToCalendarTopic(
  row: SheetRow,
  channelLabel?: string,
): CalendarTopic {
  const { date, startTime } = deriveCalendarFieldsFromSheetRow(row);
  const ch = (row.topicDeliveryChannel || '').trim();
  const channels = ch ? [ch] : channelLabel ? [channelLabel] : undefined;
  return {
    id: String(row.topicId).trim(),
    title: row.topic?.trim() || '(no title)',
    date,
    startTime,
    status: (row.status || 'pending').trim().toLowerCase(),
    channels,
    payload: row,
  };
}

export function sheetRowsToCalendarTopics(
  rows: SheetRow[],
  options?: { channelLabelForRow?: (row: SheetRow) => string | undefined },
): CalendarTopic[] {
  return rows.map((row) => sheetRowToCalendarTopic(row, options?.channelLabelForRow?.(row)));
}
