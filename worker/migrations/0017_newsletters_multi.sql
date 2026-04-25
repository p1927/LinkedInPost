-- Named newsletter records (multi-newsletter support)
CREATE TABLE IF NOT EXISTS newsletters (
  id TEXT PRIMARY KEY NOT NULL,
  spreadsheet_id TEXT NOT NULL,
  name TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  auto_approve INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  next_send_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_newsletters_spreadsheet ON newsletters(spreadsheet_id);

-- Link issues to a specific newsletter (nullable for backward compat)
ALTER TABLE newsletter_issues ADD COLUMN newsletter_id TEXT REFERENCES newsletters(id);
CREATE INDEX IF NOT EXISTS idx_newsletter_issues_newsletter_id ON newsletter_issues(newsletter_id);
