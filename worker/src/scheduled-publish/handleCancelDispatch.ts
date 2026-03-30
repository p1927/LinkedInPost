import { cancelScheduledPublish } from './durablePublishScheduler';
import type { ScheduledPublishSchedulerEnv } from './durablePublishScheduler';

export async function handleCancelScheduledPublishDispatch(
  env: ScheduledPublishSchedulerEnv,
  payload: Record<string, unknown>,
): Promise<{ success: true; cancelled: boolean }> {
  const topic = String(payload.topic || '').trim();
  const date = String(payload.date || '').trim();
  const scheduledTime = String(payload.scheduledTime || '').trim();
  const channelRaw = payload.channel;
  const channel = typeof channelRaw === 'string' && channelRaw.trim() ? channelRaw.trim() : undefined;
  if (!topic || !date || !scheduledTime) {
    throw new Error('Missing topic, date, or scheduledTime to cancel scheduled publish.');
  }
  const response = await cancelScheduledPublish(env, { topic, date, scheduledTime, channel });
  const body = (await response.json()) as { success?: boolean; cancelled?: boolean; error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Could not cancel scheduled publish (${response.status}).`);
  }
  if (!body.success) {
    throw new Error(body.error || 'Could not cancel scheduled publish.');
  }
  return { success: true, cancelled: Boolean(body.cancelled) };
}
