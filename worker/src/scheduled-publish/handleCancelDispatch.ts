import { cancelScheduledPublish } from './durablePublishScheduler';
import type { ScheduledPublishSchedulerEnv } from './durablePublishScheduler';

export async function handleCancelScheduledPublishDispatch(
  env: ScheduledPublishSchedulerEnv,
  payload: Record<string, unknown>,
): Promise<{ success: true; cancelled: boolean }> {
  const topicId = String(payload.topicId || '').trim();
  const scheduledTime = String(payload.scheduledTime || '').trim();
  const channelRaw = payload.channel;
  const channel = typeof channelRaw === 'string' && channelRaw.trim() ? channelRaw.trim() : undefined;
  if (!topicId || !scheduledTime) {
    throw new Error('Missing topicId or scheduledTime to cancel scheduled publish.');
  }
  const response = await cancelScheduledPublish(env, { topicId, scheduledTime, channel });
  const body = (await response.json()) as { success?: boolean; cancelled?: boolean; error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Could not cancel scheduled publish (${response.status}).`);
  }
  if (!body.success) {
    throw new Error(body.error || 'Could not cancel scheduled publish.');
  }
  return { success: true, cancelled: Boolean(body.cancelled) };
}
