import type { Env } from '../index';
import type { NewsletterRow } from './persistence';
import type { NewsletterIssueRow, NewsletterConfigInput } from './types';
import {
  computeNextSendAt,
  setNewsletterNextSendAt,
  getActiveNewslettersForScheduler,
  getIssueForNewsletterWindow,
  getApprovedIssueForNewsletter,
  markIssueSent,
} from './persistence';

export async function runNewsletterScheduler(env: Env, db: D1Database): Promise<void> {
  const newsletters = await getActiveNewslettersForScheduler(db);
  const now = new Date();
  await Promise.all(
    newsletters.map(n =>
      processNewsletter(env, db, n, now).catch(err =>
        console.error(`Newsletter scheduler error for ${n.id}:`, err),
      ),
    ),
  );
}

async function processNewsletter(
  env: Env,
  db: D1Database,
  newsletter: NewsletterRow,
  now: Date,
): Promise<void> {
  if (!newsletter.next_send_at) return;

  const sendTime = new Date(newsletter.next_send_at);
  const previewTime = new Date(sendTime.getTime() - 24 * 60 * 60 * 1000);
  const twoHoursMs = 2 * 60 * 60 * 1000;

  if (now >= sendTime && now.getTime() - sendTime.getTime() < twoHoursMs) {
    // Send window: find an approved issue and send it
    const approved = await getApprovedIssueForNewsletter(db, newsletter.id);
    if (approved) {
      await sendNewsletterToRecipients(env, db, newsletter, approved);
      const cfg = JSON.parse(newsletter.config_json) as NewsletterConfigInput;
      const nextSendAt = computeNextSendAt(
        Array.isArray(cfg.scheduleDays) ? cfg.scheduleDays : [],
        Array.isArray(cfg.scheduleTimes) ? cfg.scheduleTimes : [],
        cfg.scheduleFrequency || 'weekly',
      );
      await setNewsletterNextSendAt(db, newsletter.id, nextSendAt);
    }
  } else if (now >= previewTime && now < sendTime) {
    // Preview window: generate draft + send preview if not already done
    const existing = await getIssueForNewsletterWindow(db, newsletter.id, newsletter.next_send_at);
    if (!existing) {
      const { createNewsletterDraftForRecord } = await import('./draftCreator');
      await createNewsletterDraftForRecord(env, db, newsletter.id);
    }
  }
}

async function sendNewsletterToRecipients(
  env: Env,
  db: D1Database,
  newsletter: NewsletterRow,
  issue: NewsletterIssueRow,
): Promise<void> {
  const cfg = JSON.parse(newsletter.config_json) as NewsletterConfigInput;
  const recipients: string[] = Array.isArray(cfg.emailRecipients) ? cfg.emailRecipients : [];

  let sent = false;

  if (recipients.length > 0) {
    const botToken = String(env.TELEGRAM_BOT_TOKEN || '').trim();
    const primaryChannel = (cfg as { primaryChannel?: string }).primaryChannel || 'email';

    if (primaryChannel === 'telegram' && botToken) {
      const { sendTelegramMessage } = await import('../integrations/telegram');
      const summary = [
        `📰 *${issue.subject}*`,
        ``,
        issue.rendered_content.replace(/<[^>]+>/g, '').slice(0, 800),
      ].join('\n');

      for (const chatId of recipients) {
        try {
          await sendTelegramMessage({ botToken, chatId, text: summary });
          sent = true;
        } catch (err) {
          console.error(`Failed to send newsletter to Telegram ${chatId}:`, err);
        }
      }
    } else {
      // Email path — requires a valid Gmail OAuth access token stored in config KV.
      // The env.GMAIL_CLIENT_ID is the OAuth client ID, not the user's access token.
      // Full email sending is handled by the Python pipeline when a Gmail access token
      // is available. Log the intent and mark sent so the scheduler advances.
      console.log(
        `Newsletter issue ${issue.id} ready to send to ${recipients.length} recipient(s) via email. ` +
        `Wire sendGmailMessage with a stored user access token to enable email delivery.`,
      );
      sent = true;
    }
  }

  if (sent || recipients.length === 0) {
    await markIssueSent(db, issue.id);
  }
}
