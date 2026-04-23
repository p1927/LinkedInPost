import type { AutomationPlatform, AutomationRule, GmailWatchState, WebhookRegistration, YouTubeSchedule } from './types';

const P = 'automation';

export const kvKeys = {
  channelRule: (platform: AutomationPlatform, channelId: string) =>
    `${P}:rule:${platform}:${channelId}`,
  topicRule: (platform: AutomationPlatform, channelId: string, topicId: string) =>
    `${P}:rule:${platform}:${channelId}:${topicId}`,
  webhookReg: (platform: AutomationPlatform, channelId: string) =>
    `${P}:webhook:${platform}:${channelId}`,
  gmailWatch: (channelId: string) =>
    `${P}:gmail:watch:${channelId}`,
  youtubeSchedule: (channelId: string) =>
    `${P}:youtube:schedule:${channelId}`,
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
  await kv.put(kvKeys.channelRule(platform, channelId), JSON.stringify({ ...rule, updatedAt: new Date().toISOString() }));
}

export async function setTopicRule(
  kv: KVNamespace,
  platform: AutomationPlatform,
  channelId: string,
  topicId: string,
  rule: Omit<AutomationRule, 'updatedAt'>,
): Promise<void> {
  await kv.put(kvKeys.topicRule(platform, channelId, topicId), JSON.stringify({ ...rule, updatedAt: new Date().toISOString() }));
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
  const listed = await kv.list({ prefix: `${P}:rule:` });
  const results: Array<{ key: string; rule: AutomationRule }> = [];
  for (const { name } of listed.keys) {
    const rule = await kv.get<AutomationRule>(name, 'json');
    if (rule) results.push({ key: name, rule });
  }
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
  await kv.put(kvKeys.youtubeSchedule(channelId), JSON.stringify(schedule));
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
