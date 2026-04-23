import type { AutomationPlatform, AutomationRule, GmailWatchState, WebhookRegistration, YouTubeSchedule } from './types';

const P = 'automation';

// Exported so cleanup.ts can list rules without duplicating the prefix.
export const RULE_KEY_PREFIX = `${P}:rule:`;

export const kvKeys = {
  // channelId and topicId are URL-encoded so that values containing ":" (e.g. LinkedIn URNs)
  // do not corrupt the colon-delimited key scheme.
  channelRule: (platform: AutomationPlatform, channelId: string) =>
    `${P}:rule:${platform}:${encodeURIComponent(channelId)}`,
  topicRule: (platform: AutomationPlatform, channelId: string, topicId: string) =>
    `${P}:rule:${platform}:${encodeURIComponent(channelId)}:${encodeURIComponent(topicId)}`,
  webhookReg: (platform: AutomationPlatform, channelId: string) =>
    `${P}:webhook:${platform}:${encodeURIComponent(channelId)}`,
  gmailWatch: (channelId: string) =>
    `${P}:gmail:watch:${encodeURIComponent(channelId)}`,
  youtubeSchedule: (channelId: string) =>
    `${P}:youtube:schedule:${encodeURIComponent(channelId)}`,
  telegramSecret: () =>
    `${P}:telegram:secret`,
};

export async function getRule(
  kv: KVNamespace,
  platform: AutomationPlatform,
  channelId: string,
  topicId?: string,
): Promise<AutomationRule | null> {
  if (topicId) {
    const override = await kv.get<AutomationRule>(kvKeys.topicRule(platform, channelId, topicId), 'json');
    if (override) return override;
  }
  return kv.get<AutomationRule>(kvKeys.channelRule(platform, channelId), 'json');
}

export async function setChannelRule(
  kv: KVNamespace,
  platform: AutomationPlatform,
  channelId: string,
  rule: Omit<AutomationRule, 'updatedAt'>,
): Promise<void> {
  // 30-day TTL: rules expire if not refreshed within 30 days
  await kv.put(kvKeys.channelRule(platform, channelId), JSON.stringify({ ...rule, updatedAt: new Date().toISOString() }), {
    expirationTtl: 30 * 24 * 60 * 60,
  });
}

export async function setTopicRule(
  kv: KVNamespace,
  platform: AutomationPlatform,
  channelId: string,
  topicId: string,
  rule: Omit<AutomationRule, 'updatedAt'>,
): Promise<void> {
  // 30-day TTL: rules expire if not refreshed within 30 days
  await kv.put(kvKeys.topicRule(platform, channelId, topicId), JSON.stringify({ ...rule, updatedAt: new Date().toISOString() }), {
    expirationTtl: 30 * 24 * 60 * 60,
  });
}

export async function deleteRule(
  kv: KVNamespace,
  platform: AutomationPlatform,
  channelId: string,
  topicId?: string,
): Promise<void> {
  const key = topicId
    ? kvKeys.topicRule(platform, channelId, topicId)
    : kvKeys.channelRule(platform, channelId);
  await kv.delete(key);
}

export async function listAllRules(
  kv: KVNamespace,
): Promise<Array<{ key: string; rule: AutomationRule }>> {
  const results: Array<{ key: string; rule: AutomationRule }> = [];
  let cursor: string | undefined;
  do {
    const listed: KVNamespaceListResult<unknown, string> = cursor
      ? await kv.list({ prefix: RULE_KEY_PREFIX, cursor })
      : await kv.list({ prefix: RULE_KEY_PREFIX });
    for (const { name } of listed.keys) {
      const rule = await kv.get<AutomationRule>(name, 'json');
      if (rule) results.push({ key: name, rule });
    }
    cursor = listed.list_complete ? undefined : listed.cursor;
  } while (cursor);
  return results;
}

export async function getGmailWatch(kv: KVNamespace, channelId: string): Promise<GmailWatchState | null> {
  return kv.get<GmailWatchState>(kvKeys.gmailWatch(channelId), 'json');
}

export async function setGmailWatch(kv: KVNamespace, channelId: string, state: GmailWatchState): Promise<void> {
  await kv.put(kvKeys.gmailWatch(channelId), JSON.stringify(state));
}

export async function getYouTubeSchedule(kv: KVNamespace, channelId: string): Promise<YouTubeSchedule | null> {
  return kv.get<YouTubeSchedule>(kvKeys.youtubeSchedule(channelId), 'json');
}

export async function setYouTubeSchedule(kv: KVNamespace, channelId: string, schedule: YouTubeSchedule): Promise<void> {
  // 30-day TTL: schedules expire if not refreshed within 30 days
  await kv.put(kvKeys.youtubeSchedule(channelId), JSON.stringify(schedule), {
    expirationTtl: 30 * 24 * 60 * 60,
  });
}

export async function getWebhookRegistration(
  kv: KVNamespace,
  platform: AutomationPlatform,
  channelId: string,
): Promise<WebhookRegistration | null> {
  return kv.get<WebhookRegistration>(kvKeys.webhookReg(platform, channelId), 'json');
}

export async function setWebhookRegistration(
  kv: KVNamespace,
  platform: AutomationPlatform,
  channelId: string,
  reg: WebhookRegistration,
): Promise<void> {
  await kv.put(kvKeys.webhookReg(platform, channelId), JSON.stringify(reg));
}
