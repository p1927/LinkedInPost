import { buildScheduledPublishTaskName } from './time';
import type { CancelScheduledPublishPayload, ScheduledPublishTask } from './types';

/** Minimal env for DO scheduling — avoids importing the full worker `Env` from `index.ts`. */
export interface ScheduledPublishSchedulerEnv {
  SCHEDULED_LINKEDIN_PUBLISH: DurableObjectNamespace;
}

export async function armScheduledPublish(
  env: ScheduledPublishSchedulerEnv,
  task: ScheduledPublishTask,
): Promise<Response> {
  const durableObjectId = env.SCHEDULED_LINKEDIN_PUBLISH.idFromName(
    buildScheduledPublishTaskName(task.topicId, task.channel),
  );
  const durableObjectStub = env.SCHEDULED_LINKEDIN_PUBLISH.get(durableObjectId);
  return durableObjectStub.fetch('https://scheduled-publish-do/arm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });
}

export async function cancelScheduledPublish(
  env: ScheduledPublishSchedulerEnv,
  payload: CancelScheduledPublishPayload,
): Promise<Response> {
  const durableObjectId = env.SCHEDULED_LINKEDIN_PUBLISH.idFromName(
    buildScheduledPublishTaskName(payload.topicId, payload.channel),
  );
  const durableObjectStub = env.SCHEDULED_LINKEDIN_PUBLISH.get(durableObjectId);
  return durableObjectStub.fetch('https://scheduled-publish-do/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
