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
        story_framework, preview_channel, admin_email, active, updated_at,
        author_persona, writing_style_examples,
        topic_include_keywords_json, topic_exclude_keywords_json,
        recurring_sections_json, newsletter_intro, newsletter_outro,
        primary_channel, enabled_rss_feed_ids_json, enabled_news_api_providers_json
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, 1, datetime('now'),
        ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28
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
      config.previewChannel,
      config.adminEmail,
      config.authorPersona || '',
      config.writingStyleExamples || '',
      JSON.stringify(config.topicIncludeKeywords || []),
      JSON.stringify(config.topicExcludeKeywords || []),
      JSON.stringify(config.recurringSections || []),
      config.newsletterIntro || '',
      config.newsletterOutro || '',
      config.primaryChannel || 'email',
      JSON.stringify(config.enabledRssFeedIds || []),
      JSON.stringify(config.enabledNewsApiProviders || []),
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
    newsletterId?: string;
  },
): Promise<NewsletterIssueRow> {
  const id = crypto.randomUUID();
  const issueDate = new Date().toISOString().slice(0, 10);
  await db
    .prepare(
      `INSERT INTO newsletter_issues
        (id, spreadsheet_id, newsletter_id, issue_date, scheduled_for, articles_json, rendered_content, subject, status)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending_approval')`,
    )
    .bind(id, spreadsheetId, data.newsletterId ?? null, issueDate, data.scheduledFor, data.articles, data.renderedContent, data.subject)
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

export interface NewsletterRow {
  id: string;
  spreadsheet_id: string;
  name: string;
  config_json: string;
  auto_approve: number;
  active: number;
  next_send_at: string | null;
  created_at: string;
}

export async function createNewsletterRecord(
  db: D1Database,
  spreadsheetId: string,
  name: string,
  config: object,
  autoApprove: boolean,
): Promise<NewsletterRow> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO newsletters (id, spreadsheet_id, name, config_json, auto_approve)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(id, spreadsheetId, name, JSON.stringify(config), autoApprove ? 1 : 0)
    .run();
  const row = await db
    .prepare('SELECT * FROM newsletters WHERE id = ?')
    .bind(id)
    .first<NewsletterRow>();
  return row!;
}

export async function listNewsletterRecords(
  db: D1Database,
  spreadsheetId: string,
): Promise<NewsletterRow[]> {
  const res = await db
    .prepare('SELECT * FROM newsletters WHERE spreadsheet_id = ? AND active = 1 ORDER BY created_at ASC')
    .bind(spreadsheetId)
    .all<NewsletterRow>();
  return res.results ?? [];
}

export async function updateNewsletterRecord(
  db: D1Database,
  id: string,
  patch: { name?: string; config?: object; autoApprove?: boolean },
): Promise<void> {
  const parts: string[] = [];
  const binds: unknown[] = [];

  if (patch.name !== undefined) {
    parts.push(`name = ?${parts.length + 1}`);
    binds.push(patch.name);
  }
  if (patch.config !== undefined) {
    parts.push(`config_json = ?${parts.length + 1}`);
    binds.push(JSON.stringify(patch.config));
  }
  if (patch.autoApprove !== undefined) {
    parts.push(`auto_approve = ?${parts.length + 1}`);
    binds.push(patch.autoApprove ? 1 : 0);
  }
  if (parts.length === 0) return;

  binds.push(id);
  await db
    .prepare(`UPDATE newsletters SET ${parts.join(', ')} WHERE id = ?${binds.length}`)
    .bind(...binds)
    .run();
}

export async function deleteNewsletterRecord(
  db: D1Database,
  id: string,
): Promise<void> {
  await db.prepare('DELETE FROM newsletters WHERE id = ?').bind(id).run();
}

export async function listIssuesByNewsletter(
  db: D1Database,
  newsletterId: string,
): Promise<NewsletterIssueRow[]> {
  const res = await db
    .prepare(
      `SELECT * FROM newsletter_issues WHERE newsletter_id = ? ORDER BY issue_date DESC LIMIT 50`,
    )
    .bind(newsletterId)
    .all<NewsletterIssueRow>();
  return res.results ?? [];
}
