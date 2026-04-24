import type { Env } from '../index';
import {
  handleInstagramChallenge,
  handleInstagramWebhookEvent,
  registerInstagramWebhook,
} from './platforms/instagram';
import { handleLinkedInWebhookEvent, registerLinkedInWebhook } from './platforms/linkedin';
import { handleTelegramWebhookEvent, registerTelegramWebhook } from './platforms/telegram';
import { handleGmailPushEvent, registerGmailWatch } from './platforms/gmail';
import { recordPollTimestamp, saveChannelSchedule } from './platforms/youtube';
import {
  deleteRule,
  getRule,
  getYouTubeSchedule,
  listAllRules,
  setChannelRule,
  setTopicRule,
  setWebhookRegistration,
} from './kv';
import { runAutomationCleanup } from './cleanup';
import type { AutomationPlatform, AutomationRule } from './types';

function resolveWorkerUrl(request: Request, env: Env): string {
  return env.OAUTH_REDIRECT_BASE_URL || `https://${new URL(request.url).hostname}`;
}

// ─── Public webhook receivers (no session auth) ─────────────────────────────

export async function handleWebhookRoute(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname === '/webhooks/instagram') {
    if (request.method === 'GET') {
      const channelId = env.INSTAGRAM_USER_ID || url.searchParams.get('channel') || 'default';
      const resp = handleInstagramChallenge(url, channelId);
      return resp ?? new Response('Forbidden', { status: 403 });
    }
    if (request.method === 'POST') {
      const body = await request.text();
      await handleInstagramWebhookEvent(body, request.headers.get('X-Hub-Signature-256') ?? '', env);
      return new Response('OK', { status: 200 });
    }
  }

  if (url.pathname === '/webhooks/linkedin' && request.method === 'POST') {
    const body = await request.text();
    await handleLinkedInWebhookEvent(body, request.headers.get('X-LI-Signature') ?? '', env);
    return new Response('OK', { status: 200 });
  }

  if (url.pathname === '/webhooks/telegram' && request.method === 'POST') {
    const body = await request.text();
    await handleTelegramWebhookEvent(body, request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '', env);
    return new Response('OK', { status: 200 });
  }

  if (url.pathname === '/webhooks/gmail' && request.method === 'POST') {
    const body = await request.text();
    await handleGmailPushEvent(body, env);
    return new Response('OK', { status: 200 });
  }

  return null;
}

// ─── Admin CRUD (requires verified admin session) ───────────────────────────

export async function handleAutomationsAdminRoute(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  if (!url.pathname.startsWith('/automations/')) return null;

  const path = url.pathname;
  const method = request.method;

  // GET /automations/rules — list all rules
  if (path === '/automations/rules' && method === 'GET') {
    const rules = await listAllRules(env.CONFIG_KV);
    return Response.json({ ok: true, data: rules });
  }

  // POST /automations/rules — upsert rule
  if (path === '/automations/rules' && method === 'POST') {
    const body: any = await request.json().catch(() => null);
    if (!body) return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });

    const platform = String(body.platform || '').trim() as AutomationPlatform;
    const channelId = String(body.channelId || '').trim();
    const topicId = String(body.topicId || '').trim() || undefined;

    if (!platform || !channelId) {
      return Response.json({ ok: false, error: 'platform and channelId are required' }, { status: 400 });
    }

    const rule: Omit<AutomationRule, 'updatedAt'> = {
      triggers: Array.isArray(body.triggers) ? body.triggers : [],
      comment_reply_template: body.comment_reply_template || undefined,
      dm_reply_template: body.dm_reply_template || undefined,
      comment_to_dm_template: body.comment_to_dm_template || undefined,
      follow_reply_template: body.follow_reply_template || undefined,
      enabled: body.enabled !== false,
    };

    if (topicId) {
      await setTopicRule(env.CONFIG_KV, platform, channelId, topicId, rule);
    } else {
      await setChannelRule(env.CONFIG_KV, platform, channelId, rule);
    }
    return Response.json({ ok: true });
  }

  // DELETE /automations/rules — remove rule
  if (path === '/automations/rules' && method === 'DELETE') {
    const body: any = await request.json().catch(() => null);
    if (!body) return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    const platform = String(body.platform || '').trim() as AutomationPlatform;
    const channelId = String(body.channelId || '').trim();
    const topicId = String(body.topicId || '').trim() || undefined;
    if (!platform || !channelId) {
      return Response.json({ ok: false, error: 'platform and channelId required' }, { status: 400 });
    }
    await deleteRule(env.CONFIG_KV, platform, channelId, topicId);
    return Response.json({ ok: true });
  }

  // GET /automations/rules/lookup — resolve effective rule for channel+topic
  if (path === '/automations/rules/lookup' && method === 'GET') {
    const platform = url.searchParams.get('platform') as AutomationPlatform;
    const channelId = url.searchParams.get('channelId') ?? '';
    const topicId = url.searchParams.get('topicId') ?? undefined;
    const rule = await getRule(env.CONFIG_KV, platform, channelId, topicId);
    return Response.json({ ok: true, data: rule });
  }

  // GET /automations/youtube/schedule
  if (path === '/automations/youtube/schedule' && method === 'GET') {
    const channelId = url.searchParams.get('channelId') ?? '';
    const schedule = await getYouTubeSchedule(env.CONFIG_KV, channelId);
    return Response.json({ ok: true, data: schedule });
  }

  // PUT /automations/youtube/schedule
  if (path === '/automations/youtube/schedule' && method === 'PUT') {
    const body: any = await request.json().catch(() => null);
    if (!body) return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    const channelId = String(body.channelId || '').trim();
    const cronExpression = String(body.cronExpression || '').trim();
    if (!channelId) return Response.json({ ok: false, error: 'channelId required' }, { status: 400 });
    await saveChannelSchedule(env.CONFIG_KV, channelId, cronExpression);
    return Response.json({ ok: true });
  }

  // POST /automations/youtube/poll — record manual poll timestamp
  if (path === '/automations/youtube/poll' && method === 'POST') {
    const body: any = await request.json().catch(() => null);
    const channelId = String(body?.channelId || '').trim();
    if (!channelId) return Response.json({ ok: false, error: 'channelId required' }, { status: 400 });
    await recordPollTimestamp(env.CONFIG_KV, channelId);
    return Response.json({ ok: true });
  }

  // POST /automations/webhooks/register — register webhooks for a platform+channel
  if (path === '/automations/webhooks/register' && method === 'POST') {
    const body: any = await request.json().catch(() => null);
    if (!body) return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    const platform = String(body.platform || '').trim() as AutomationPlatform;
    const channelId = String(body.channelId || '').trim();
    if (!platform || !channelId) {
      return Response.json({ ok: false, error: 'platform and channelId required' }, { status: 400 });
    }
    const workerUrl = resolveWorkerUrl(request, env);
    try {
      await registerPlatformWebhook(platform, channelId, workerUrl, env);
    } catch (err: any) {
      return Response.json({ ok: false, error: err?.message ?? 'Registration failed.' }, { status: 400 });
    }
    return Response.json({ ok: true });
  }

  // POST /automations/cleanup — manual cleanup trigger
  if (path === '/automations/cleanup' && method === 'POST') {
    const result = await runAutomationCleanup(env.CONFIG_KV);
    return Response.json({ ok: true, data: result });
  }

  return null;
}

// ─── Internal scheduler routes (WORKER_SCHEDULER_SECRET auth, not session auth) ─
// Called by the YouTube poller Python script and other machine callers.
export async function handleAutomationsSchedulerRoute(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const path = url.pathname;
  const method = request.method;

  // GET /automations/internal/rules/lookup — resolve effective rule (used by YouTube poller)
  if (path === '/automations/internal/rules/lookup' && method === 'GET') {
    const platform = url.searchParams.get('platform') as AutomationPlatform;
    const channelId = url.searchParams.get('channelId') ?? '';
    const topicId = url.searchParams.get('topicId') ?? undefined;
    const rule = await getRule(env.CONFIG_KV, platform, channelId, topicId);
    return Response.json({ ok: true, data: rule });
  }

  // POST /automations/internal/youtube/poll — record poll timestamp (used by YouTube poller)
  if (path === '/automations/internal/youtube/poll' && method === 'POST') {
    const body: any = await request.json().catch(() => null);
    const channelId = String(body?.channelId || '').trim();
    if (!channelId) return Response.json({ ok: false, error: 'channelId required' }, { status: 400 });
    await recordPollTimestamp(env.CONFIG_KV, channelId);
    return Response.json({ ok: true });
  }

  return null;
}

export async function registerPlatformWebhook(
  platform: AutomationPlatform,
  channelId: string,
  workerUrl: string,
  env: Env,
): Promise<void> {
  const reg = { platform, channelId, registeredAt: new Date().toISOString() };

  switch (platform) {
    case 'instagram': {
      const appId = env.INSTAGRAM_APP_ID ?? '';
      const appSecret = env.INSTAGRAM_APP_SECRET ?? '';
      if (!appId || !appSecret) throw new Error('INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET are required.');
      await registerInstagramWebhook(channelId, appId, appSecret, workerUrl);
      await setWebhookRegistration(env.CONFIG_KV, platform, channelId, reg);
      break;
    }
    case 'telegram': {
      const botToken = env.TELEGRAM_BOT_TOKEN ?? '';
      if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is required.');
      const secretToken = crypto.randomUUID().replace(/-/g, '');
      await registerTelegramWebhook(botToken, workerUrl, secretToken, env.CONFIG_KV);
      await setWebhookRegistration(env.CONFIG_KV, platform, channelId, reg);
      break;
    }
    case 'linkedin': {
      // channelId is the organization URN (e.g. urn:li:organization:12345)
      const accessToken = env.LINKEDIN_ACCESS_TOKEN ?? '';
      if (!accessToken) throw new Error('LinkedIn access token is not configured. Complete the LinkedIn OAuth flow in Settings first.');
      await registerLinkedInWebhook(accessToken, channelId, workerUrl);
      await setWebhookRegistration(env.CONFIG_KV, platform, channelId, reg);
      break;
    }
    case 'gmail': {
      // channelId is the Gmail address (e.g. user@example.com)
      const storedOAuth = await env.CONFIG_KV.get<{ accessToken?: string }>(
        `oauth:gmail:${channelId}`, 'json'
      );
      const accessToken = storedOAuth?.accessToken ?? '';
      if (!accessToken) throw new Error('Gmail access token not found. Complete the Gmail OAuth flow in Settings first.');
      const pubsubTopic = (env as any).GMAIL_PUBSUB_TOPIC ?? '';
      if (!pubsubTopic) throw new Error('GMAIL_PUBSUB_TOPIC is not configured.');
      await registerGmailWatch(accessToken, pubsubTopic, channelId, env.CONFIG_KV);
      await setWebhookRegistration(env.CONFIG_KV, platform, channelId, reg);
      break;
    }
    case 'youtube':
      // YouTube has no push webhooks — uses polling via youtube_poller.py.
      throw new Error('YouTube does not support push webhooks. Use the YouTube poller script instead.');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
