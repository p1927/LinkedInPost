import { executeScheduledPublish, type Env } from '../index';
import { buildScheduledPublishTaskName, parseScheduledTimeToTimestamp } from './time';
import type { CancelScheduledPublishPayload, ScheduledPublishTask } from './types';

const TASK_STORAGE_KEY = 'scheduled-linkedin-task';

export class ScheduledPublishAlarm {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'POST') {
      return new Response('Not found', { status: 404 });
    }
    if (url.pathname === '/arm') {
      return this.handleArm(request);
    }
    if (url.pathname === '/cancel') {
      return this.handleCancel(request);
    }
    return new Response('Not found', { status: 404 });
  }

  private async handleArm(request: Request): Promise<Response> {
    const task = await request.json<ScheduledPublishTask>();
    const scheduledAt = parseScheduledTimeToTimestamp(task.scheduledTime);
    if (!task.topicId?.trim() || !scheduledAt) {
      return new Response('Invalid scheduled task payload.', { status: 400 });
    }

    await this.state.storage.put(TASK_STORAGE_KEY, {
      topicId: task.topicId.trim(),
      topic: String(task.topic || '').trim(),
      date: String(task.date || '').trim(),
      scheduledTime: task.scheduledTime.trim(),
      intent: task.intent || 'publish',
      channel: task.channel,
      recipientId: task.recipientId,
    } satisfies ScheduledPublishTask);
    await this.state.storage.setAlarm(scheduledAt);

    return Response.json({
      success: true,
      taskName: buildScheduledPublishTaskName(task.topicId, task.channel),
      scheduledTime: task.scheduledTime.trim(),
    });
  }

  private async handleCancel(request: Request): Promise<Response> {
    const body = await request.json<CancelScheduledPublishPayload>();
    const topicId = String(body.topicId || '').trim();
    const scheduledTime = String(body.scheduledTime || '').trim();
    if (!topicId || !scheduledTime) {
      return Response.json({ success: false, error: 'Missing topicId or scheduledTime.' }, { status: 400 });
    }

    const stored = await this.state.storage.get<ScheduledPublishTask>(TASK_STORAGE_KEY);
    if (!stored) {
      await this.state.storage.deleteAlarm();
      return Response.json({ success: true, cancelled: false });
    }

    if (stored.scheduledTime.trim() !== scheduledTime) {
      return Response.json(
        { success: false, error: 'Scheduled time does not match the armed task. Refresh and try again.' },
        { status: 409 },
      );
    }

    if (stored.topicId.trim() !== topicId) {
      return Response.json({ success: false, error: 'Row identity does not match the armed task.' }, { status: 409 });
    }

    await this.state.storage.delete(TASK_STORAGE_KEY);
    await this.state.storage.deleteAlarm();
    return Response.json({ success: true, cancelled: true });
  }

  async alarm(): Promise<void> {
    const task = await this.state.storage.get<ScheduledPublishTask>(TASK_STORAGE_KEY);
    if (!task) {
      return;
    }

    try {
      await executeScheduledPublish(this.env, task);
      await this.state.storage.delete(TASK_STORAGE_KEY);
    } catch (error) {
      console.error('Scheduled LinkedIn publish alarm failed', {
        task,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
