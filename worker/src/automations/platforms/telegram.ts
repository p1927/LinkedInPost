import { getRule, kvKeys } from '../kv';
import { resolveTemplate, shouldFire } from '../engine';
import { verifyTelegramSecretToken } from '../webhook-verify';
import type { Env } from '../../index';

export async function registerTelegramWebhook(
  botToken: string,
  workerUrl: string,
  secretToken: string,
  kv: KVNamespace,
): Promise<void> {
  await kv.put(kvKeys.telegramSecret(), secretToken);
  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `${workerUrl}/webhooks/telegram`,
      secret_token: secretToken,
      allowed_updates: ['message'],
    }),
  });
  if (!res.ok) {
    throw new Error(`Telegram webhook registration failed: ${await res.text()}`);
  }
}

export async function handleTelegramWebhookEvent(
  body: string,
  secretTokenHeader: string,
  env: Env,
): Promise<void> {
  const expectedToken = await env.CONFIG_KV.get(kvKeys.telegramSecret());
  if (!expectedToken || !verifyTelegramSecretToken(secretTokenHeader, expectedToken)) return;

  let payload: any;
  try { payload = JSON.parse(body); } catch { return; }

  const message = payload.message;
  if (!message) return;

  const chatId = String(message.chat?.id || '');
  const senderName = String(message.from?.first_name || 'there');
  const botToken = env.TELEGRAM_BOT_TOKEN || '';

  const rule = await getRule(env.CONFIG_KV, 'telegram', chatId);
  if (!rule || !shouldFire(rule, 'dm')) return;

  const text = resolveTemplate(rule, 'dm', senderName);
  if (!text || !botToken) return;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
