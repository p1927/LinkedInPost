import { getRule } from '../kv';
import { resolveTemplate, shouldFire } from '../engine';
import { verifyInstagramSignature } from '../webhook-verify';
import type { Env } from '../../index';

const GRAPH_VERSION = 'v25.0';
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;

export async function registerInstagramWebhook(
  channelId: string,
  appId: string,
  appSecret: string,
  workerUrl: string,
): Promise<void> {
  const verifyToken = `ig_${channelId}_verify`;
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${appId}/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      object: 'instagram',
      callback_url: `${workerUrl}/webhooks/instagram`,
      verify_token: verifyToken,
      fields: ['comments', 'messages', 'follows'],
      access_token: `${appId}|${appSecret}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Instagram webhook registration failed: ${await res.text()}`);
  }
}

export function handleInstagramChallenge(url: URL, channelId: string): Response | null {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === `ig_${channelId}_verify` && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return null;
}

export async function handleInstagramWebhookEvent(body: string, signature: string, env: Env): Promise<void> {
  if (!env.INSTAGRAM_APP_SECRET || !(await verifyInstagramSignature(body, signature, env.INSTAGRAM_APP_SECRET))) {
    return;
  }

  let payload: any;
  try { payload = JSON.parse(body); } catch { return; }

  const accessToken = env.INSTAGRAM_ACCESS_TOKEN || '';

  for (const entry of (payload.entry || []) as any[]) {
    const channelId = String(entry.id || '');

    for (const change of (entry.changes || []) as any[]) {
      const v = change.value || {};

      if (change.field === 'comments') {
        const commentId = String(v.id || '');
        const senderId = String(v.from?.id || '');
        const senderName = String(v.from?.name || 'there');
        const postId = String(v.media?.id || '') || undefined;

        await fireCommentReply(env.CONFIG_KV, channelId, postId, commentId, senderName, accessToken);
        await fireCommentToDm(env.CONFIG_KV, channelId, postId, senderId, senderName, accessToken);
      }

      if (change.field === 'follows') {
        const senderId = String(v.from?.id || '');
        const senderName = String(v.from?.name || 'there');
        await fireFollowDm(env.CONFIG_KV, channelId, senderId, senderName, accessToken);
      }
    }

    for (const msg of (entry.messaging || []) as any[]) {
      const senderId = String(msg.sender?.id || '');
      const senderName = String(msg.sender?.name || 'there');
      await fireDmReply(env.CONFIG_KV, channelId, senderId, senderName, accessToken);
    }
  }
}

async function fireCommentReply(
  kv: KVNamespace,
  channelId: string,
  topicId: string | undefined,
  commentId: string,
  senderName: string,
  accessToken: string,
): Promise<void> {
  const rule = await getRule(kv, 'instagram', channelId, topicId);
  if (!rule || !shouldFire(rule, 'comment')) return;
  const text = resolveTemplate(rule, 'comment', senderName);
  if (!text || !commentId || !accessToken) return;
  await fetch(`${GRAPH_BASE}/${commentId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, access_token: accessToken }),
  });
}

async function fireCommentToDm(
  kv: KVNamespace,
  channelId: string,
  topicId: string | undefined,
  recipientId: string,
  senderName: string,
  accessToken: string,
): Promise<void> {
  const rule = await getRule(kv, 'instagram', channelId, topicId);
  if (!rule || !shouldFire(rule, 'comment_to_dm')) return;
  const text = resolveTemplate(rule, 'comment_to_dm', senderName);
  if (!text || !recipientId || !accessToken) return;
  await fetch(`${GRAPH_BASE}/me/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      access_token: accessToken,
    }),
  });
}

async function fireDmReply(
  kv: KVNamespace,
  channelId: string,
  recipientId: string,
  senderName: string,
  accessToken: string,
): Promise<void> {
  const rule = await getRule(kv, 'instagram', channelId);
  if (!rule || !shouldFire(rule, 'dm')) return;
  const text = resolveTemplate(rule, 'dm', senderName);
  if (!text || !recipientId || !accessToken) return;
  await fetch(`${GRAPH_BASE}/me/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      access_token: accessToken,
    }),
  });
}

async function fireFollowDm(
  kv: KVNamespace,
  channelId: string,
  recipientId: string,
  senderName: string,
  accessToken: string,
): Promise<void> {
  const rule = await getRule(kv, 'instagram', channelId);
  if (!rule || !shouldFire(rule, 'follow')) return;
  const text = resolveTemplate(rule, 'follow', senderName);
  if (!text || !recipientId || !accessToken) return;
  await fetch(`${GRAPH_BASE}/me/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      access_token: accessToken,
    }),
  });
}
