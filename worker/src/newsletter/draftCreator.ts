import type { Env } from '../index';
import type { ResearchArticle } from './types';
import { getNewsletterConfig, createNewsletterIssue } from './persistence';
import { collectArticlesFromSources } from './contentAssembler';
import { renderNewsletterEmail } from './emailRenderer';

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
    JSON.parse(config.enabled_rss_feed_ids_json || '[]'),
    JSON.parse(config.enabled_news_api_providers_json || '[]'),
    windowStart.toISOString(),
    windowEnd.toISOString(),
    {
      includeKeywords: JSON.parse(config.topic_include_keywords_json || '[]'),
      excludeKeywords: JSON.parse(config.topic_exclude_keywords_json || '[]'),
    },
  );

  const itemCount = config.item_count || 5;
  const selectedArticles = articles.slice(0, itemCount);

  const template = config.processing_template || 'personal-story';
  const subjectTemplate = config.subject_template || 'Weekly Newsletter';

  const renderedContent = await renderNewsletterEmail(
    env,
    selectedArticles,
    template,
    {
      processingNote: config.processing_note,
      emotionTarget: config.emotion_target,
      colorEmotionTarget: config.color_emotion_target,
      storyFramework: config.story_framework,
      authorPersona: config.author_persona || '',
      writingStyleExamples: config.writing_style_examples || '',
      newsletterIntro: config.newsletter_intro || '',
      newsletterOutro: config.newsletter_outro || '',
      recurringSections: JSON.parse(config.recurring_sections_json || '[]'),
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

  if (config.preview_channel && config.admin_email) {
    await sendAdminPreview(env, issue.id, subject, selectedArticles, config.preview_channel as 'email' | 'telegram', config.admin_email);
  }

  return { id: issue.id, subject, status: issue.status };
}

function determineNextSendTime(
  days: string[],
  times: string[],
  _frequency: string,
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

export async function createNewsletterDraftForRecord(
  env: Env,
  db: D1Database,
  newsletterId: string,
): Promise<{ id: string; subject: string; status: string }> {
  const row = await db
    .prepare('SELECT * FROM newsletters WHERE id = ?')
    .bind(newsletterId)
    .first<import('./persistence').NewsletterRow>();
  if (!row) throw new Error('Newsletter not found.');

  const cfg = JSON.parse(row.config_json) as import('./types').NewsletterConfigInput;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 7);
  const windowEnd = new Date();

  const articles = await collectArticlesFromSources(
    env,
    Boolean(cfg.rssEnabled),
    Boolean(cfg.newsApiEnabled),
    Array.isArray(cfg.customRssFeeds) ? cfg.customRssFeeds : [],
    Array.isArray(cfg.enabledRssFeedIds) ? cfg.enabledRssFeedIds : [],
    Array.isArray(cfg.enabledNewsApiProviders) ? cfg.enabledNewsApiProviders : [],
    windowStart.toISOString(),
    windowEnd.toISOString(),
    {
      includeKeywords: Array.isArray(cfg.topicIncludeKeywords) ? cfg.topicIncludeKeywords : [],
      excludeKeywords: Array.isArray(cfg.topicExcludeKeywords) ? cfg.topicExcludeKeywords : [],
    },
  );

  const itemCount = cfg.itemCount || 5;
  const selectedArticles = articles.slice(0, itemCount);
  const template = cfg.processingTemplate || 'personal-story';
  const subjectTemplate = cfg.subjectTemplate || 'Weekly Newsletter';

  const renderedContent = await renderNewsletterEmail(env, selectedArticles, template, {
    processingNote: cfg.processingNote,
    emotionTarget: cfg.emotionTarget,
    colorEmotionTarget: cfg.colorEmotionTarget,
    storyFramework: cfg.storyFramework,
    authorPersona: cfg.authorPersona || '',
    writingStyleExamples: cfg.writingStyleExamples || '',
    newsletterIntro: cfg.newsletterIntro || '',
    newsletterOutro: cfg.newsletterOutro || '',
    recurringSections: Array.isArray(cfg.recurringSections) ? cfg.recurringSections : [],
  });

  const scheduledFor = determineNextSendTime(
    Array.isArray(cfg.scheduleDays) ? cfg.scheduleDays : [],
    Array.isArray(cfg.scheduleTimes) ? cfg.scheduleTimes : [],
    cfg.scheduleFrequency || 'weekly',
  );

  const subject = interpolateSubject(subjectTemplate, selectedArticles);

  // newsletter_issues.spreadsheet_id has a FK to newsletter_configs; ensure a
  // placeholder row exists so the constraint is satisfied when using the
  // multi-newsletter flow (which stores config in newsletters.config_json).
  await db
    .prepare(
      `INSERT OR IGNORE INTO newsletter_configs (spreadsheet_id) VALUES (?)`,
    )
    .bind(row.spreadsheet_id)
    .run();

  const issue = await createNewsletterIssue(db, row.spreadsheet_id, {
    articles: JSON.stringify(selectedArticles),
    renderedContent,
    subject,
    scheduledFor,
    newsletterId,
  });

  return { id: issue.id, subject, status: issue.status };
}

async function sendAdminPreview(
  env: Env,
  issueId: string,
  subject: string,
  articles: ResearchArticle[],
  previewChannel: 'email' | 'telegram',
  adminEmail: string,
): Promise<void> {
  const previewText = [
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

  if (previewChannel === 'telegram') {
    const { sendTelegramMessage } = await import('../integrations/telegram');
    const botToken = String(env.TELEGRAM_BOT_TOKEN || '').trim();
    if (!botToken || !adminEmail) return;
    try {
      await sendTelegramMessage({
        botToken,
        chatId: adminEmail,
        text: previewText,
      });
    } catch (err) {
      console.error(`Failed to send Telegram preview to ${adminEmail}:`, err);
    }
  } else {
    // email preview — send via Gmail
    const { sendGmailMessage } = await import('../integrations/gmail');
    const accessToken = String(env.GMAIL_CLIENT_ID || '').trim();
    if (!accessToken || !adminEmail) return;
    try {
      await sendGmailMessage({
        accessToken,
        to: adminEmail,
        subject: `Newsletter Preview: ${subject}`,
        body: previewText,
      });
    } catch (err) {
      console.error(`Failed to send email preview to ${adminEmail}:`, err);
    }
  }
}
