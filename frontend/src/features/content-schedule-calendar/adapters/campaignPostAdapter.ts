import type { CampaignPostV1 } from '@/features/campaign/schema/types';
import type { CalendarTopic } from '../types';

/**
 * Map CampaignPostV1[] → CalendarTopic[].
 * Uses array index as id fallback since CampaignPostV1 has no stable id field.
 */
export function campaignPostsToCalendarTopics(posts: CampaignPostV1[]): CalendarTopic[] {
  return posts.map((post, index) => ({
    id: String(index),
    title: post.topic || `Post ${index + 1}`,
    date: post.date?.trim() ?? '',
    startTime: normalizePostTime(post.postTime),
    status: post.status?.toLowerCase() ?? 'pending',
    channels: post.channels,
    payload: post,
  }));
}

/** Apply a CalendarTopic patch back to the original CampaignPostV1. */
export function applyCalendarPatchToPost(
  post: CampaignPostV1,
  patch: Partial<CalendarTopic>,
): CampaignPostV1 {
  const updated = { ...post };
  if (patch.date !== undefined) updated.date = patch.date;
  if (patch.startTime !== undefined) updated.postTime = patch.startTime;
  if (patch.title !== undefined) updated.topic = patch.title;
  return updated;
}

/** Normalize postTime strings like "9:00 AM", "14:30", "9:00" → "HH:MM" or undefined. */
function normalizePostTime(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
  if (!match) return undefined;
  let h = parseInt(match[1]!, 10);
  const m = match[2]!;
  const ampm = match[3]?.toLowerCase();
  if (ampm === 'pm' && h !== 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h < 0 || h > 23) return undefined;
  return `${String(h).padStart(2, '0')}:${m}`;
}
