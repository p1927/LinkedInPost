export interface NewsletterConfigInput {
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
}

export interface NewsletterIssueRow {
  id: string;
  spreadsheet_id: string;
  issue_date: string;
  scheduled_for: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'failed';
  articles_json: string;
  rendered_content: string;
  subject: string;
  admin_preview_sent_at: string | null;
  admin_preview_message_id: string | null;
  approved_at: string | null;
  sent_at: string | null;
  recipients_json: string;
  channel_results_json: string;
  created_at: string;
}

export function parseNewsletterConfig(raw: Partial<NewsletterConfigInput>): NewsletterConfigInput {
  return {
    rssEnabled: Boolean(raw.rssEnabled),
    newsApiEnabled: Boolean(raw.newsApiEnabled),
    customRssFeeds: Array.isArray(raw.customRssFeeds) ? raw.customRssFeeds : [],
    itemCount: Math.max(1, Math.min(20, Number(raw.itemCount) || 5)),
    scheduleDays: Array.isArray(raw.scheduleDays) ? raw.scheduleDays : [],
    scheduleTimes: Array.isArray(raw.scheduleTimes) ? raw.scheduleTimes : ['09:00'],
    scheduleFrequency: ['weekly', 'biweekly', 'monthly'].includes(raw.scheduleFrequency as string)
      ? (raw.scheduleFrequency as 'weekly' | 'biweekly' | 'monthly')
      : 'weekly',
    emailRecipients: Array.isArray(raw.emailRecipients) ? raw.emailRecipients : [],
    subjectTemplate: String(raw.subjectTemplate || 'Weekly Newsletter'),
    channelTargets: Array.isArray(raw.channelTargets) ? raw.channelTargets : [],
    processingTemplate: String(raw.processingTemplate || 'curated-digest'),
    processingNote: String(raw.processingNote || ''),
    emotionTarget: String(raw.emotionTarget || ''),
    colorEmotionTarget: String(raw.colorEmotionTarget || ''),
    storyFramework: String(raw.storyFramework || ''),
  };
}
