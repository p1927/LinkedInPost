import { executeScheduledLinkedInPublish, type Env } from '../index';
import { buildScheduledPublishTaskName, parseScheduledTimeToTimestamp } from './time';
import type { ScheduledLinkedInPublishTask } from './types';

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
    if (request.method !== 'POST' || url.pathname !== '/arm') {
      return new Response('Not found', { status: 404 });
    }

    const task = await request.json<ScheduledLinkedInPublishTask>();
    const scheduledAt = parseScheduledTimeToTimestamp(task.scheduledTime);
    if (!task.topic?.trim() || !task.date?.trim() || !scheduledAt) {
      return new Response('Invalid scheduled task payload.', { status: 400 });
    }

    await this.state.storage.put(TASK_STORAGE_KEY, {
      topic: task.topic.trim(),
      date: task.date.trim(),
      scheduledTime: task.scheduledTime.trim(),
    } satisfies ScheduledLinkedInPublishTask);
    await this.state.storage.setAlarm(scheduledAt);

    return Response.json({
      success: true,
      taskName: buildScheduledPublishTaskName(task.topic, task.date),
      scheduledTime: task.scheduledTime.trim(),
    });
  }

  async alarm(): Promise<void> {
    const task = await this.state.storage.get<ScheduledLinkedInPublishTask>(TASK_STORAGE_KEY);
    if (!task) {
      return;
    }

    try {
      await executeScheduledLinkedInPublish(this.env, task);
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
