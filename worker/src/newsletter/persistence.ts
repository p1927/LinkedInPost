import type { NewsletterConfigRow, NewsletterConfigInput, NewsletterIssueRow } from './types';

export async function getNewsletterConfig(
  db: D1Database,
  spreadsheetId: string,
): Promise<NewsletterConfigRow | null> {
  const row = await db
    .prepare('SELECT * FROM newsletter_configs WHERE spreadsheet_id = ?')
    .bind(spreadsheetId)
    .first<NewsletterConfigRow>();
  return row ?? null;
}

export async function saveNewsletterConfig(
  db: D1Database,
  spreadsheetId: string,
  config: NewsletterConfigInput,
): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO newsletter_configs (
        spreadsheet_id, rss_enabled, news_api_enabled, custom_rss_feeds_json,
        item_count, schedule_days_json, schedule_times_json, schedule_frequency,
        email_recipients_json, subject_template, channel_targets_json,
        processing_template, processing_note, emotion_target, color_emotion_target,
        story_framework, active, updated_at
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, 1, datetime('now')
      )`,
    )
    .bind(
      spreadsheetId,
      config.rssEnabled ? 1 : 0,
      config.newsApiEnabled ? 1 : 0,
      JSON.stringify(config.customRssFeeds),
      config.itemCount,
      JSON.stringify(config.scheduleDays),
      JSON.stringify(config.scheduleTimes),
      config.scheduleFrequency,
      JSON.stringify(config.emailRecipients),
      config.subjectTemplate,
      JSON.stringify(config.channelTargets),
      config.processingTemplate,
      config.processingNote,
      config.emotionTarget,
      config.colorEmotionTarget,
      config.storyFramework,
    )
    .run();
}

export async function listNewsletterIssues(
  db: D1Database,
  spreadsheetId: string,
): Promise<NewsletterIssueRow[]> {
  const res = await db
    .prepare(
      `SELECT * FROM newsletter_issues
       WHERE spreadsheet_id = ? AND status != 'draft'
       ORDER BY issue_date DESC
       LIMIT 50`,
    )
    .bind(spreadsheetId)
    .all<NewsletterIssueRow>();
  return res.results ?? [];
}

export async function createNewsletterIssue(
  db: D1Database,
  spreadsheetId: string,
  data: {
    articles: string;
    renderedContent: string;
    subject: string;
    scheduledFor: string;
  },
): Promise<NewsletterIssueRow> {
  const id = crypto.randomUUID();
  const issueDate = new Date().toISOString().slice(0, 10);
  await db
    .prepare(
      `INSERT INTO newsletter_issues
        (id, spreadsheet_id, issue_date, scheduled_for, articles_json, rendered_content, subject, status)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending_approval')`,
    )
    .bind(id, spreadsheetId, issueDate, data.scheduledFor, data.articles, data.renderedContent, data.subject)
    .run();
  const row = await db
    .prepare('SELECT * FROM newsletter_issues WHERE id = ?')
    .bind(id)
    .first<NewsletterIssueRow>();
  return row!;
}

export async function approveNewsletterIssue(
  db: D1Database,
  issueId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE newsletter_issues
       SET status = 'approved', approved_at = datetime('now')
       WHERE id = ?1`,
    )
    .bind(issueId)
    .run();
}

export async function rejectNewsletterIssue(
  db: D1Database,
  issueId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE newsletter_issues
       SET status = 'draft'
       WHERE id = ?1`,
    )
    .bind(issueId)
    .run();
}

export async function markIssueSent(
  db: D1Database,
  issueId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE newsletter_issues
       SET status = 'sent', sent_at = datetime('now')
       WHERE id = ?1`,
    )
    .bind(issueId)
    .run();
}
