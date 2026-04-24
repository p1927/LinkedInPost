export interface NewsletterConfigRow {
  spreadsheet_id: string;
  rss_enabled: number;
  news_api_enabled: number;
  custom_rss_feeds_json: string;
  item_count: number;
  schedule_days_json: string;
  schedule_times_json: string;
  schedule_frequency: string;
  email_recipients_json: string;
  subject_template: string;
  channel_targets_json: string;
  processing_template: string;
  processing_note: string;
  emotion_target: string;
  color_emotion_target: string;
  story_framework: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface NewsletterIssueRow {
  id: string;
  spreadsheet_id: string;
  issue_date: string;
  scheduled_for: string;
  status: string;
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

export interface NewsletterIssue {
  id: string;
  issueDate: string;
  scheduledFor: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'failed';
  articles: ResearchArticle[];
  renderedContent: string;
  subject: string;
  createdAt: string;
}

export interface ResearchArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
  provider: string;
}
