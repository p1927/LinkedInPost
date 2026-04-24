-- Newsletter configurations per workspace
CREATE TABLE IF NOT EXISTS newsletter_configs (
  spreadsheet_id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Sources
  rss_enabled INTEGER NOT NULL DEFAULT 1,
  news_api_enabled INTEGER NOT NULL DEFAULT 0,
  custom_rss_feeds_json TEXT NOT NULL DEFAULT '[]',
  -- Content selection
  item_count INTEGER NOT NULL DEFAULT 5,
  -- Schedule
  schedule_days_json TEXT NOT NULL DEFAULT '[]',
  schedule_times_json TEXT NOT NULL DEFAULT '[]',
  schedule_frequency TEXT NOT NULL DEFAULT 'weekly',
  -- Recipients
  email_recipients_json TEXT NOT NULL DEFAULT '[]',
  subject_template TEXT NOT NULL DEFAULT 'Weekly Newsletter',
  channel_targets_json TEXT NOT NULL DEFAULT '[]',
  -- Processing
  processing_template TEXT NOT NULL DEFAULT '',
  processing_note TEXT NOT NULL DEFAULT '',
  emotion_target TEXT NOT NULL DEFAULT '',
  color_emotion_target TEXT NOT NULL DEFAULT '',
  story_framework TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);

-- Newsletter issues (generated newsletters)
CREATE TABLE IF NOT EXISTS newsletter_issues (
  id TEXT PRIMARY KEY NOT NULL,
  spreadsheet_id TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  -- Content
  articles_json TEXT NOT NULL DEFAULT '[]',
  rendered_content TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  -- Review
  admin_preview_sent_at TEXT,
  admin_preview_message_id TEXT,
  approved_at TEXT,
  -- Delivery
  sent_at TEXT,
  recipients_json TEXT NOT NULL DEFAULT '[]',
  channel_results_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (spreadsheet_id) REFERENCES newsletter_configs(spreadsheet_id)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_issues_sheet_date ON newsletter_issues(spreadsheet_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_issues_status ON newsletter_issues(status);
