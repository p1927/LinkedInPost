import { getRule } from '../kv';
import { resolveTemplate, shouldFire } from '../engine';
import { verifyLinkedInSignature } from '../webhook-verify';
import type { Env } from '../../index';

const LI_VERSION = '202502';

export async function registerLinkedInWebhook(
  accessToken: string,
  organizationUrn: string,
  workerUrl: string,
): Promise<void> {
  const res = await fetch('https://api.linkedin.com/v2/webhookSubscriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'Linkedin-Version': LI_VERSION,
    },
    body: JSON.stringify({
      applicationId: organizationUrn,
      callbackUrl: `${workerUrl}/webhooks/linkedin`,
      eventTypes: ['ORGANIZATION_SOCIAL_ACTION_COMMENT', 'MESSAGE_RECEIVED'],
    }),
  });
  if (!res.ok) {
    throw new Error(`LinkedIn webhook registration failed: ${await res.text()}`);
  }
}


async function resolveLinkedInName(actorUrn: string, accessToken: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(actorUrn);
    const res = await fetch(
      `https://api.linkedin.com/v2/people/${encoded}?projection=(firstName,lastName)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Linkedin-Version': LI_VERSION,
        },
      },
    );
    if (!res.ok) return 'there';
    const data: any = await res.json();
    const first = (data.firstName?.localized?.en_US ?? '') as string;
    const last = (data.lastName?.localized?.en_US ?? '') as string;
    return (first + ' ' + last).trim() || 'there';
  } catch {
    return 'there';
  }
}

export async function handleLinkedInWebhookEvent(body: string, signature: string, env: Env): Promise<void> {
  if (!env.LINKEDIN_CLIENT_SECRET || !(await verifyLinkedInSignature(body, signature, env.LINKEDIN_CLIENT_SECRET))) {
    return;
  }

  let payload: any;
  try { payload = JSON.parse(body); } catch { return; }

  const accessToken = env.LINKEDIN_ACCESS_TOKEN || '';
  const channelId = String(payload.organizationUrn || payload.actor || '');
  const eventType = String(payload.eventType || '');

  if (eventType === 'ORGANIZATION_SOCIAL_ACTION_COMMENT') {
    const commentUrn = String(payload.comment || '');
    const actorUrn = String(payload.actor || '');
    const postUrn = String(payload.object || '') || undefined;

    const senderName = actorUrn && accessToken
      ? await resolveLinkedInName(actorUrn, accessToken)
      : 'there';

    const rule = await getRule(env.CONFIG_KV, 'linkedin', channelId, postUrn);
    if (rule && shouldFire(rule, 'comment') && postUrn) {
      const text = resolveTemplate(rule, 'comment', senderName);
      if (text && accessToken) {
        await fetch(`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/comments`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'Linkedin-Version': LI_VERSION,
          },
          body: JSON.stringify({
            actor: env.LINKEDIN_PERSON_URN,
            message: { text },
            parentComment: commentUrn,
          }),
        });
      }
    }

    if (rule && shouldFire(rule, 'comment_to_dm') && actorUrn) {
      const dmText = resolveTemplate(rule, 'comment_to_dm', senderName);
      if (dmText && accessToken) await sendLinkedInDm(actorUrn, dmText, accessToken);
    }
  }

  if (eventType === 'MESSAGE_RECEIVED') {
    const senderUrn = String(payload.sender || '');
    const dmSenderName = senderUrn && accessToken
      ? await resolveLinkedInName(senderUrn, accessToken)
      : 'there';
    const rule = await getRule(env.CONFIG_KV, 'linkedin', channelId);
    if (!rule || !shouldFire(rule, 'dm')) return;
    const text = resolveTemplate(rule, 'dm', dmSenderName);
    if (text && senderUrn && accessToken) await sendLinkedInDm(senderUrn, text, accessToken);
  }
}

async function sendLinkedInDm(recipientUrn: string, text: string, accessToken: string): Promise<void> {
  await fetch('https://api.linkedin.com/v2/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      recipients: [recipientUrn],
      body: text,
      messageType: 'MEMBER_TO_MEMBER',
    }),
  });
}
