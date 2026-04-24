import type { Env } from '../index';
import { getNewsletterConfig, saveNewsletterConfig, listNewsletterIssues, approveNewsletterIssue, rejectNewsletterIssue } from './persistence';
import type { NewsletterConfigRow, NewsletterIssueRow } from './types';

export async function handleGetNewsletterConfig(
  db: D1Database,
  spreadsheetId: string,
): Promise<NewsletterConfigRow | null> {
  return getNewsletterConfig(db, spreadsheetId);
}

export async function handleSaveNewsletterConfig(
  db: D1Database,
  spreadsheetId: string,
  config: {
    rssEnabled: boolean;
    newsApiEnabled: boolean;
    customRssFeeds: Array<{ id: string; url: string; label?: string; enabled: boolean }>;
    itemCount: number;
    scheduleDays: string[];
    scheduleTimes: string[];
    scheduleFrequency: 'weekly' | 'biweekly' | 'monthly';
    emailRecipients: string[];
    subjectTemplate: string;
    channelTargets: string[];
    processingTemplate: string;
    processingNote: string;
    emotionTarget: string;
    colorEmotionTarget: string;
    storyFramework: string;
    previewChannel: 'email' | 'telegram';
    adminEmail: string;
  },
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
