-- Pipeline state and news snapshots (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS workspaces (
  spreadsheet_id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipeline_state (
  spreadsheet_id TEXT NOT NULL,
  topic_key TEXT NOT NULL,
  topic TEXT NOT NULL,
  date TEXT NOT NULL,
  topic_id TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  variant1 TEXT NOT NULL DEFAULT '',
  variant2 TEXT NOT NULL DEFAULT '',
  variant3 TEXT NOT NULL DEFAULT '',
  variant4 TEXT NOT NULL DEFAULT '',
  image_link1 TEXT NOT NULL DEFAULT '',
  image_link2 TEXT NOT NULL DEFAULT '',
  image_link3 TEXT NOT NULL DEFAULT '',
  image_link4 TEXT NOT NULL DEFAULT '',
  selected_text TEXT NOT NULL DEFAULT '',
  selected_image_id TEXT NOT NULL DEFAULT '',
  selected_image_urls_json TEXT NOT NULL DEFAULT '',
  post_time TEXT NOT NULL DEFAULT '',
  email_to TEXT NOT NULL DEFAULT '',
  email_cc TEXT NOT NULL DEFAULT '',
  email_bcc TEXT NOT NULL DEFAULT '',
  email_subject TEXT NOT NULL DEFAULT '',
  topic_generation_rules TEXT NOT NULL DEFAULT '',
  generation_template_id TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (spreadsheet_id, topic_key)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_spreadsheet ON pipeline_state(spreadsheet_id);

CREATE TABLE IF NOT EXISTS news_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  spreadsheet_id TEXT NOT NULL,
  topic_key TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  custom_query TEXT NOT NULL DEFAULT '',
  providers_summary TEXT NOT NULL DEFAULT '',
  articles TEXT NOT NULL,
  dedupe_removed TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_news_snap_sheet_topic_fetched ON news_snapshots(spreadsheet_id, topic_key, fetched_at DESC);
