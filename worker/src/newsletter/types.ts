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
  preview_channel: string;
  admin_email: string;
  active: number;
  created_at: string;
  updated_at: string;
  // v16 voice & personalization
  author_persona: string;
  writing_style_examples: string;
  topic_include_keywords_json: string;
  topic_exclude_keywords_json: string;
  recurring_sections_json: string;
  newsletter_intro: string;
  newsletter_outro: string;
  primary_channel: string;
  // v16 granular sources
  enabled_rss_feed_ids_json: string;
  enabled_news_api_providers_json: string;
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

export interface RecurringSection {
  name: string;
  prompt: string;
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
  previewChannel: 'email' | 'telegram';
  adminEmail: string;
  // v16 voice & personalization
  authorPersona: string;
  writingStyleExamples: string;
  topicIncludeKeywords: string[];
  topicExcludeKeywords: string[];
  recurringSections: RecurringSection[];
  newsletterIntro: string;
  newsletterOutro: string;
  primaryChannel: string;
  // v16 granular sources
  enabledRssFeedIds: string[];
  enabledNewsApiProviders: string[];
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
