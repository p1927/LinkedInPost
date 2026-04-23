import { getRule, getGmailWatch, setGmailWatch } from '../kv';
import { resolveTemplate, shouldFire } from '../engine';
import { sendGmailMessage } from '../../integrations/gmail';
import type { Env } from '../../index';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const RENEWAL_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export async function registerGmailWatch(
  accessToken: string,
  pubsubTopic: string,
  channelId: string,
  kv: KVNamespace,
): Promise<void> {
  const res = await fetch(`${GMAIL_API}/watch`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topicName: pubsubTopic, labelIds: ['INBOX'] }),
  });
  if (!res.ok) {
    throw new Error(`Gmail watch registration failed: ${await res.text()}`);
  }
  const data: any = await res.json();
  const expiration = Number(data.expiration);
  if (!expiration || expiration <= 0) {
    throw new Error('Gmail watch registration returned an invalid expiration timestamp.');
  }
  await setGmailWatch(kv, channelId, {
    historyId: String(data.historyId || ''),
    expiration,
    channelId,
  });
}

export async function handleGmailPushEvent(body: string, env: Env): Promise<void> {
  let payload: any;
  try { payload = JSON.parse(body); } catch { return; }

  const messageData = payload.message?.data;
  if (!messageData) return;

  let notification: any;
  try { notification = JSON.parse(atob(messageData)); } catch { return; }

  const channelId = String(notification.emailAddress || '');
  const historyId = String(notification.historyId || '');
  if (!channelId || !historyId) return;

  const accessToken = await resolveGmailAccessToken(channelId, env);
  if (!accessToken) return;

  const watchState = await getGmailWatch(env.CONFIG_KV, channelId);
  if (watchState && watchState.expiration > 0 && watchState.expiration - Date.now() < RENEWAL_THRESHOLD_MS) {
    const topic = await env.CONFIG_KV.get('automation:gmail:pubsub_topic') ?? '';
    if (topic) {
      await registerGmailWatch(accessToken, topic, channelId, env.CONFIG_KV).catch(() => undefined);
    }
  }

  const histRes = await fetch(
    `${GMAIL_API}/history?startHistoryId=${encodeURIComponent(historyId)}&historyTypes=messageAdded&labelId=INBOX`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!histRes.ok) return;

  const histData: any = await histRes.json();
  const addedMessages: any[] = (histData.history || []).flatMap((h: any) => h.messagesAdded || []);

  const rule = await getRule(env.CONFIG_KV, 'gmail', channelId);
  if (!rule || !shouldFire(rule, 'dm')) return;

  for (const { message } of addedMessages) {
    const msgId = String(message?.id || '');
    if (!msgId) continue;

    const msgRes = await fetch(
      `${GMAIL_API}/messages/${msgId}?format=metadata&metadataHeaders=From,Subject,To`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!msgRes.ok) continue;

    const msgData: any = await msgRes.json();
    const headers: Array<{ name: string; value: string }> = msgData.payload?.headers || [];
    const from = headers.find((h) => h.name === 'From')?.value || '';
    const subject = headers.find((h) => h.name === 'Subject')?.value || '';

    // Skip if message is from ourselves (avoid loop)
    if (from.includes(channelId)) continue;

    const senderName = from.replace(/<[^>]+>/, '').trim() || 'there';
    const text = resolveTemplate(rule, 'dm', senderName);
    if (!text) continue;

    await sendGmailMessage({
      accessToken,
      to: from,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      body: text,
    });
  }

  // Use the historyId returned by the history API as the continuation cursor,
  // not the one from the push notification (which may be older).
  const nextHistoryId = String(histData.historyId || historyId);
  if (watchState) {
    await setGmailWatch(env.CONFIG_KV, channelId, { ...watchState, historyId: nextHistoryId });
  }
}

async function resolveGmailAccessToken(channelId: string, env: Env): Promise<string | null> {
  const stored = await env.CONFIG_KV.get<{ accessToken?: string }>(`oauth:gmail:${channelId}`, 'json');
  return stored?.accessToken ?? null;
}
