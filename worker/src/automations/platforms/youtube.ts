import { getYouTubeSchedule, setYouTubeSchedule } from '../kv';
import type { YouTubeSchedule } from '../types';

export async function getChannelSchedule(kv: KVNamespace, channelId: string): Promise<YouTubeSchedule | null> {
  return getYouTubeSchedule(kv, channelId);
}

export async function saveChannelSchedule(
  kv: KVNamespace,
  channelId: string,
  cronExpression: string,
): Promise<void> {
  const existing = await getYouTubeSchedule(kv, channelId);
  await setYouTubeSchedule(kv, channelId, {
    channelId,
    cronExpression,
    lastPolledAt: existing?.lastPolledAt,
  });
}

export async function recordPollTimestamp(kv: KVNamespace, channelId: string): Promise<void> {
  const existing = await getYouTubeSchedule(kv, channelId);
  if (!existing) return;
  await setYouTubeSchedule(kv, channelId, { ...existing, lastPolledAt: new Date().toISOString() });
}
