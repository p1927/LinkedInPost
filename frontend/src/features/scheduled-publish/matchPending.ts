import type { ChannelId } from '@/integrations/channels';
import type { SheetRow } from '@/services/sheets';
import type { PendingScheduledPublish } from './types';

/** Normalize sheet `YYYY-MM-DD HH:mm` and datetime-local `YYYY-MM-DDTHH:mm` for equality checks. */
export function normalizeScheduledTimeForCompare(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const t = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (t) {
    return `${t[1]} ${t[2]}:${t[3]}`;
  }
  const sp = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})/);
  if (sp) {
    return `${sp[1]} ${sp[2]}:${sp[3]}`;
  }
  return s;
}

/** True when this row is the one currently queued for the selected channel at the same scheduled time. */
export function rowMatchesPendingScheduledPublish(
  row: Pick<SheetRow, 'topic' | 'date' | 'postTime'>,
  pending: PendingScheduledPublish | null | undefined,
  selectedChannel: ChannelId,
): boolean {
  if (!pending) return false;
  if (pending.channel !== selectedChannel) return false;
  if (pending.topic.trim() !== row.topic.trim()) return false;
  if (pending.date.trim() !== row.date.trim()) return false;
  return (
    normalizeScheduledTimeForCompare(String(row.postTime ?? '')) ===
    normalizeScheduledTimeForCompare(pending.scheduledTime)
  );
}
