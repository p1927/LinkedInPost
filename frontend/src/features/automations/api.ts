import type { AutomationPlatform, AutomationRule, RuleEntry, YouTubeSchedule } from './types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string;

async function authFetch(idToken: string, path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${WORKER_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...(options.headers || {}),
    },
  });
}

export async function listRules(idToken: string): Promise<RuleEntry[]> {
  const res = await authFetch(idToken, '/automations/rules', { method: 'GET' });
  const body = await res.json();
  return body.data ?? [];
}

export async function upsertRule(
  idToken: string,
  platform: AutomationPlatform,
  channelId: string,
  rule: Omit<AutomationRule, 'updatedAt'>,
  topicId?: string,
): Promise<void> {
  await authFetch(idToken, '/automations/rules', {
    method: 'POST',
    body: JSON.stringify({ platform, channelId, topicId, ...rule }),
  });
}

export async function deleteRule(
  idToken: string,
  platform: AutomationPlatform,
  channelId: string,
  topicId?: string,
): Promise<void> {
  await authFetch(idToken, '/automations/rules', {
    method: 'DELETE',
    body: JSON.stringify({ platform, channelId, topicId }),
  });
}

export async function lookupEffectiveRule(
  idToken: string,
  platform: AutomationPlatform,
  channelId: string,
  topicId?: string,
): Promise<AutomationRule | null> {
  const params = new URLSearchParams({ platform, channelId, ...(topicId ? { topicId } : {}) });
  const res = await authFetch(idToken, `/automations/rules/lookup?${params}`, { method: 'GET' });
  const body = await res.json();
  return body.data ?? null;
}

export async function getYouTubeSchedule(idToken: string, channelId: string): Promise<YouTubeSchedule | null> {
  const res = await authFetch(idToken, `/automations/youtube/schedule?channelId=${encodeURIComponent(channelId)}`, { method: 'GET' });
  const body = await res.json();
  return body.data ?? null;
}

export async function saveYouTubeSchedule(idToken: string, channelId: string, cronExpression: string): Promise<void> {
  await authFetch(idToken, '/automations/youtube/schedule', {
    method: 'PUT',
    body: JSON.stringify({ channelId, cronExpression }),
  });
}

export async function registerWebhooks(idToken: string, platform: AutomationPlatform, channelId: string): Promise<void> {
  await authFetch(idToken, '/automations/webhooks/register', {
    method: 'POST',
    body: JSON.stringify({ platform, channelId }),
  });
}

export async function triggerCleanup(idToken: string): Promise<{ removed: number }> {
  const res = await authFetch(idToken, '/automations/cleanup', { method: 'POST' });
  const body = await res.json();
  return body.data ?? { removed: 0 };
}
