import type { NewsletterConfigRow, NewsletterConfigInput, NewsletterIssueRow } from './types';

export function computeNextSendAt(
  scheduleDays: string[],
  scheduleTimes: string[],
  _frequency: string,
): string {
  if (scheduleDays.length === 0 || scheduleTimes.length === 0) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }

  const dayMap: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };
  const targetDays = scheduleDays
    .map(d => dayMap[d.toLowerCase()] ?? -1)
    .filter(d => d >= 0);
  if (targetDays.length === 0) targetDays.push(1);

  const timeStr = scheduleTimes[0] || '09:00';
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr || '9', 10);
  const minutes = parseInt(minutesStr || '0', 10);

  const now = new Date();
  const currentDay = now.getDay();

  for (let i = 0; i <= 7; i++) {
    const dayOfWeek = (currentDay + i) % 7;
    if (!targetDays.includes(dayOfWeek)) continue;
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + i);
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate > now) return candidate.toISOString();
  }

  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 7);
  fallback.setHours(hours, minutes, 0, 0);
  return fallback.toISOString();
}

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

export async function updateNewsletterIssue(
  db: D1Database,
  issueId: string,
  patch: { subject?: string; rendered_content?: string },
): Promise<void> {
  const parts: string[] = [];
  const bindings: unknown[] = [];
  if (patch.subject !== undefined) { parts.push(`subject = ?${parts.length + 1}`); bindings.push(patch.subject); }
  if (patch.rendered_content !== undefined) { parts.push(`rendered_content = ?${parts.length + 1}`); bindings.push(patch.rendered_content); }
  if (parts.length === 0) return;
  bindings.push(issueId);
  await db.prepare(`UPDATE newsletter_issues SET ${parts.join(', ')} WHERE id = ?${bindings.length}`).bind(...bindings).run();
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
  const cfg = config as { scheduleDays?: string[]; scheduleTimes?: string[]; scheduleFrequency?: string };
  const nextSendAt = computeNextSendAt(
    Array.isArray(cfg.scheduleDays) ? cfg.scheduleDays : [],
    Array.isArray(cfg.scheduleTimes) ? cfg.scheduleTimes : [],
    cfg.scheduleFrequency || 'weekly',
  );
  await db
    .prepare(
      `INSERT INTO newsletters (id, spreadsheet_id, name, config_json, auto_approve, next_send_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(id, spreadsheetId, name, JSON.stringify(config), autoApprove ? 1 : 0, nextSendAt)
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
  patch: { name?: string; config?: object; autoApprove?: boolean; active?: boolean },
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
    const cfg = patch.config as { scheduleDays?: string[]; scheduleTimes?: string[]; scheduleFrequency?: string };
    const nextSendAt = computeNextSendAt(
      Array.isArray(cfg.scheduleDays) ? cfg.scheduleDays : [],
      Array.isArray(cfg.scheduleTimes) ? cfg.scheduleTimes : [],
      cfg.scheduleFrequency || 'weekly',
    );
    parts.push(`next_send_at = ?${parts.length + 1}`);
    binds.push(nextSendAt);
  }
  if (patch.autoApprove !== undefined) {
    parts.push(`auto_approve = ?${parts.length + 1}`);
    binds.push(patch.autoApprove ? 1 : 0);
  }
  if (patch.active !== undefined) {
    parts.push(`active = ?${parts.length + 1}`);
    binds.push(patch.active ? 1 : 0);
  }
  if (parts.length === 0) return;

  binds.push(id);
  await db
    .prepare(`UPDATE newsletters SET ${parts.join(', ')} WHERE id = ?${binds.length}`)
    .bind(...binds)
    .run();
}

export async function setNewsletterNextSendAt(db: D1Database, id: string, nextSendAt: string): Promise<void> {
  await db
    .prepare(`UPDATE newsletters SET next_send_at = ? WHERE id = ?`)
    .bind(nextSendAt, id)
    .run();
}

export async function getActiveNewslettersForScheduler(db: D1Database): Promise<NewsletterRow[]> {
  const res = await db
    .prepare(`SELECT * FROM newsletters WHERE active = 1 AND next_send_at IS NOT NULL`)
    .all<NewsletterRow>();
  return res.results ?? [];
}

export async function getIssueForNewsletterWindow(
  db: D1Database,
  newsletterId: string,
  nextSendAt: string,
): Promise<NewsletterIssueRow | null> {
  const windowStart = new Date(new Date(nextSendAt).getTime() - 2 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(new Date(nextSendAt).getTime() + 2 * 60 * 60 * 1000).toISOString();
  return db
    .prepare(
      `SELECT * FROM newsletter_issues
       WHERE newsletter_id = ? AND scheduled_for >= ? AND scheduled_for <= ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(newsletterId, windowStart, windowEnd)
    .first<NewsletterIssueRow>();
}

export async function getApprovedIssueForNewsletter(
  db: D1Database,
  newsletterId: string,
): Promise<NewsletterIssueRow | null> {
  return db
    .prepare(
      `SELECT * FROM newsletter_issues
       WHERE newsletter_id = ? AND status = 'approved'
       ORDER BY scheduled_for ASC LIMIT 1`,
    )
    .bind(newsletterId)
    .first<NewsletterIssueRow>();
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
