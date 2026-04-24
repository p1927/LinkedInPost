import type { Env } from '../index';
import type { ResearchArticle } from './types';
import { getNewsletterConfig } from './persistence';
import { collectArticlesFromSources } from './contentAssembler';
import { renderNewsletterEmail } from './emailRenderer';
import { createNewsletterIssue } from './persistence';

export async function createNewsletterDraft(
  env: Env,
  db: D1Database,
  spreadsheetId: string,
): Promise<{ id: string; subject: string; status: string }> {
  const config = await getNewsletterConfig(db, spreadsheetId);
  if (!config) {
    throw new Error('No newsletter config found for this workspace.');
  }

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 7);
  const windowEnd = new Date();

  const articles = await collectArticlesFromSources(
    env,
    config.rss_enabled === 1,
    config.news_api_enabled === 1,
    JSON.parse(config.custom_rss_feeds_json || '[]'),
    windowStart.toISOString(),
    windowEnd.toISOString(),
  );

  const itemCount = config.item_count || 5;
  const selectedArticles = articles.slice(0, itemCount);

  const template = config.processing_template || 'personal-story';
  const subjectTemplate = config.subject_template || 'Weekly Newsletter';

  const renderedContent = await renderNewsletterEmail(
    selectedArticles,
    template,
    {
      processingNote: config.processing_note,
      emotionTarget: config.emotion_target,
      colorEmotionTarget: config.color_emotion_target,
      storyFramework: config.story_framework,
    },
  );

  const scheduledFor = determineNextSendTime(
    JSON.parse(config.schedule_days_json || '[]'),
    JSON.parse(config.schedule_times_json || '[]'),
    config.schedule_frequency,
  );

  const subject = interpolateSubject(subjectTemplate, selectedArticles);

  const issue = await createNewsletterIssue(db, spreadsheetId, {
    articles: JSON.stringify(selectedArticles),
    renderedContent,
    subject,
    scheduledFor,
  });

  const adminEmails = (env.ADMIN_EMAILS || '').split(/[,\n]/).filter(Boolean);
  if (adminEmails.length > 0) {
    await sendAdminPreview(env, issue.id, subject, selectedArticles, adminEmails);
  }

  return { id: issue.id, subject, status: issue.status };
}

function determineNextSendTime(
  days: string[],
  times: string[],
  frequency: string,
): string {
  if (days.length === 0 || times.length === 0) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }

  const now = new Date();
  const dayMap: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };

  const targetDays = days.map((d) => dayMap[d.toLowerCase()] ?? -1).filter((d) => d >= 0);
  if (targetDays.length === 0) {
    targetDays.push(1);
  }

  const currentDay = now.getDay();
  let daysUntilNext = -1;
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    if (targetDays.includes(nextDay)) {
      daysUntilNext = i;
      break;
    }
  }

  if (daysUntilNext === -1) {
    daysUntilNext = 1;
  }

  const sendDate = new Date(now);
  sendDate.setDate(sendDate.getDate() + daysUntilNext);

  const timeStr = times[0] || '09:00';
  const [hours, minutes] = timeStr.split(':').map(Number);
  sendDate.setHours(hours || 9, minutes || 0, 0, 0);

  return sendDate.toISOString();
}

function interpolateSubject(template: string, articles: ResearchArticle[]): string {
  const firstArticle = articles[0];
  const title = firstArticle?.title || 'Newsletter';
  return template.replace('{title}', title).replace('{date}', new Date().toLocaleDateString());
}

async function sendAdminPreview(
  env: Env,
  issueId: string,
  subject: string,
  articles: ResearchArticle[],
  adminEmails: string[],
): Promise<void> {
  const { sendTelegramMessage } = await import('../integrations/telegram');

  const preview = [
    `*Newsletter Preview*`,
    ``,
    `Subject: ${subject}`,
    ``,
    `Top ${Math.min(3, articles.length)} items:`,
    ...articles.slice(0, 3).map((a, i) => `${i + 1}. ${a.title} (${a.source})`),
    ``,
    `Issue ID: ${issueId}`,
    ``,
    `Reply with /newsletter approve ${issueId} or /newsletter reject ${issueId}`,
  ].join('\n');

  const botToken = String(env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!botToken) return;

  for (const chatId of adminEmails) {
    if (chatId.includes('@')) continue;
    try {
      await sendTelegramMessage({
        botToken,
        chatId,
        text: preview,
      });
    } catch (err) {
      console.error(`Failed to send Telegram preview to ${chatId}:`, err);
    }
  }
}
