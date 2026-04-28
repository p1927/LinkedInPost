import type { Env } from '../index';
import { getNewsletterConfig, saveNewsletterConfig, listNewsletterIssues, approveNewsletterIssue, rejectNewsletterIssue, markIssueSent, getIssueForNewsletterWindow } from './persistence';
import type { NewsletterConfigRow, NewsletterIssueRow, NewsletterConfigInput } from './types';
import type { NewsletterRow } from './persistence';

function toRecord(row: NewsletterRow) {
  return {
    id: row.id,
    name: row.name,
    config: JSON.parse(row.config_json) as object,
    active: row.active === 1,
    autoApprove: row.auto_approve === 1,
    createdAt: row.created_at,
    nextSendAt: row.next_send_at ?? null,
  };
}

export async function handleGetNewsletterConfig(
  db: D1Database,
  spreadsheetId: string,
): Promise<NewsletterConfigRow | null> {
  return getNewsletterConfig(db, spreadsheetId);
}

export async function handleSaveNewsletterConfig(
  db: D1Database,
  spreadsheetId: string,
  config: NewsletterConfigInput,
): Promise<void> {
  await saveNewsletterConfig(db, spreadsheetId, config);
}

export async function handleListNewsletterIssues(
  db: D1Database,
  spreadsheetId: string,
): Promise<NewsletterIssueRow[]> {
  return listNewsletterIssues(db, spreadsheetId);
}

export async function handleApproveNewsletterIssue(
  db: D1Database,
  issueId: string,
): Promise<void> {
  await approveNewsletterIssue(db, issueId);
}

export async function handleRejectNewsletterIssue(
  db: D1Database,
  issueId: string,
): Promise<void> {
  await rejectNewsletterIssue(db, issueId);
}

export async function handleCreateNewsletterDraftNow(
  env: Env,
  db: D1Database,
  spreadsheetId: string,
): Promise<{ id: string; subject: string; status: string }> {
  const { createNewsletterDraft } = await import('./draftCreator');
  return createNewsletterDraft(env, db, spreadsheetId);
}

export async function handleSendApprovedNewsletterIssue(
  env: Env,
  db: D1Database,
  issueId: string,
): Promise<void> {
  const row = await db
    .prepare('SELECT * FROM newsletter_issues WHERE id = ?')
    .bind(issueId)
    .first<NewsletterIssueRow>();
  if (!row) throw new Error('Issue not found');
  if (row.status !== 'approved') throw new Error(`Cannot send issue with status '${row.status}' — must be approved first`);

  if (!row.newsletter_id) {
    // Legacy single-newsletter issue with no parent record. Mark as sent so the
    // UI advances; actual delivery for legacy mode is handled by the Python pipeline.
    await markIssueSent(db, issueId);
    return;
  }

  const newsletter = await db
    .prepare('SELECT * FROM newsletters WHERE id = ?')
    .bind(row.newsletter_id)
    .first<NewsletterRow>();
  if (!newsletter) throw new Error('Parent newsletter not found');

  const { sendNewsletterToRecipients } = await import('./scheduler');
  await sendNewsletterToRecipients(env, db, newsletter, row);
}

export async function handleListNewsletters(db: D1Database, spreadsheetId: string) {
  const { listNewsletterRecords } = await import('./persistence');
  const rows = await listNewsletterRecords(db, spreadsheetId);
  return rows.map(toRecord);
}

export async function handleCreateNewsletter(
  env: Env,
  db: D1Database,
  spreadsheetId: string,
  name: string,
  config: object,
  autoApprove: boolean,
) {
  const { createNewsletterRecord } = await import('./persistence');
  const row = await createNewsletterRecord(db, spreadsheetId, name, config, autoApprove);
  // If publish time is within 24h, preview window has already started — generate immediately
  if (row.next_send_at) {
    const sendTime = new Date(row.next_send_at);
    const hoursUntilSend = (sendTime.getTime() - Date.now()) / (60 * 60 * 1000);
    if (hoursUntilSend <= 24) {
      const existing = await getIssueForNewsletterWindow(db, row.id, row.next_send_at);
      if (!existing) {
        const { createNewsletterDraftForRecord } = await import('./draftCreator');
        createNewsletterDraftForRecord(env, db, row.id).catch(err =>
          console.error('Immediate preview generation failed:', err),
        );
      }
    }
  }
  return toRecord(row);
}

export async function handleUpdateNewsletter(
  env: Env,
  db: D1Database,
  newsletterId: string,
  patch: { name?: string; config?: object; autoApprove?: boolean; active?: boolean },
) {
  const { updateNewsletterRecord } = await import('./persistence');
  await updateNewsletterRecord(db, newsletterId, patch);
  // When schedule changes, check if the new next_send_at is within 24h
  if (patch.config) {
    const row = await db
      .prepare('SELECT * FROM newsletters WHERE id = ?')
      .bind(newsletterId)
      .first<NewsletterRow>();
    if (row?.next_send_at) {
      const sendTime = new Date(row.next_send_at);
      const hoursUntilSend = (sendTime.getTime() - Date.now()) / (60 * 60 * 1000);
      if (hoursUntilSend <= 24) {
        const existing = await getIssueForNewsletterWindow(db, row.id, row.next_send_at);
        if (!existing) {
          const { createNewsletterDraftForRecord } = await import('./draftCreator');
          createNewsletterDraftForRecord(env, db, row.id).catch(err =>
            console.error('Immediate preview generation failed:', err),
          );
        }
      }
    }
  }
}

export async function handleDeleteNewsletter(db: D1Database, newsletterId: string) {
  const { deleteNewsletterRecord } = await import('./persistence');
  await deleteNewsletterRecord(db, newsletterId);
}

export async function handleUpdateNewsletterIssue(
  db: D1Database,
  issueId: string,
  patch: { subject?: string; rendered_content?: string },
): Promise<void> {
  const { updateNewsletterIssue } = await import('./persistence');
  await updateNewsletterIssue(db, issueId, patch);
}

export async function handleListIssuesByNewsletter(db: D1Database, newsletterId: string) {
  const { listIssuesByNewsletter } = await import('./persistence');
  return listIssuesByNewsletter(db, newsletterId);
}

export async function handleCreateDraftByNewsletter(
  env: Env,
  db: D1Database,
  newsletterId: string,
): Promise<{ id: string; subject: string; status: string }> {
  const { createNewsletterDraftForRecord } = await import('./draftCreator');
  return createNewsletterDraftForRecord(env, db, newsletterId);
}

export async function handleRegenerateNewsletterIssue(
  env: Env,
  db: D1Database,
  issueId: string,
): Promise<NewsletterIssueRow> {
  const row = await db
    .prepare('SELECT * FROM newsletter_issues WHERE id = ?')
    .bind(issueId)
    .first<NewsletterIssueRow>();
  if (!row) throw new Error('Issue not found');
  if (!row.newsletter_id) throw new Error('Cannot regenerate legacy issue — create a new draft instead.');
  if (row.status === 'sent') throw new Error('Cannot regenerate an issue that has already been sent.');

  const { regenerateIssueContent } = await import('./draftCreator');
  return regenerateIssueContent(env, db, row);
}
