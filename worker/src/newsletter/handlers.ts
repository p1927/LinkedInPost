import type { Env } from '../index';
import { getNewsletterConfig, saveNewsletterConfig, listNewsletterIssues, approveNewsletterIssue, rejectNewsletterIssue, markIssueSent } from './persistence';
import type { NewsletterConfigRow, NewsletterIssueRow, NewsletterConfigInput } from './types';

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

  // TODO: Newsletter send is currently implemented only in the Python linkedin_bot
  // pipeline. Wire the TypeScript worker sender here when available.
  void env;
  void markIssueSent;
  throw new Error('Newsletter send is not implemented in the worker yet; use the Python pipeline.');
}
