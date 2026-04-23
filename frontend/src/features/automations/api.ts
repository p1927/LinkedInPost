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

async function checkedFetch(idToken: string, path: string, options: RequestInit = {}): Promise<Response> {
  const res = await authFetch(idToken, path, options);
  if (!res.ok) {
    let errMsg = `Request failed: ${res.status}`;
    try {
      const body = await res.clone().json() as any;
      if (body?.error) errMsg = body.error;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }
  return res;
}

export async function listRules(idToken: string): Promise<RuleEntry[]> {
  const res = await checkedFetch(idToken, '/automations/rules', { method: 'GET' });
  const body = await res.json() as { data?: RuleEntry[] };
  return body.data ?? [];
}

export async function upsertRule(
  idToken: string,
  platform: AutomationPlatform,
  channelId: string,
  rule: Omit<AutomationRule, 'updatedAt'>,
  topicId?: string,
): Promise<void> {
  await checkedFetch(idToken, '/automations/rules', {
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
  await checkedFetch(idToken, '/automations/rules', {
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
  const res = await checkedFetch(idToken, `/automations/rules/lookup?${params}`, { method: 'GET' });
  const body = await res.json() as { data?: AutomationRule };
  return body.data ?? null;
}

export async function getYouTubeSchedule(idToken: string, channelId: string): Promise<YouTubeSchedule | null> {
  const res = await checkedFetch(idToken, `/automations/youtube/schedule?channelId=${encodeURIComponent(channelId)}`, { method: 'GET' });
  const body = await res.json() as { data?: YouTubeSchedule };
  return body.data ?? null;
}

export async function saveYouTubeSchedule(idToken: string, channelId: string, cronExpression: string): Promise<void> {
  await checkedFetch(idToken, '/automations/youtube/schedule', {
    method: 'PUT',
    body: JSON.stringify({ channelId, cronExpression }),
  });
}

export async function registerWebhooks(idToken: string, platform: AutomationPlatform, channelId: string): Promise<void> {
  await checkedFetch(idToken, '/automations/webhooks/register', {
    method: 'POST',
    body: JSON.stringify({ platform, channelId }),
  });
}

export async function triggerCleanup(idToken: string): Promise<{ removed: number }> {
  const res = await checkedFetch(idToken, '/automations/cleanup', { method: 'POST' });
  const body = await res.json() as { data?: { removed: number } };
  return body.data ?? { removed: 0 };
}
