-- worker/migrations/0010_pipeline_user_primary.sql
-- Rebuild pipeline_state with user_id as part of the primary key.
-- This allows tenants without a Google Sheet to store rows keyed by user_id + topic_id.

CREATE TABLE IF NOT EXISTS pipeline_state_new (
  user_id TEXT NOT NULL DEFAULT '',
  spreadsheet_id TEXT NOT NULL DEFAULT '',
  topic_id TEXT NOT NULL DEFAULT '',
  topic_key TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
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
  topic_delivery_channel TEXT NOT NULL DEFAULT '',
  topic_generation_model TEXT NOT NULL DEFAULT '',
  content_review_fingerprint TEXT NOT NULL DEFAULT '',
  content_review_at TEXT,
  content_review_json TEXT NOT NULL DEFAULT '',
  generation_run_id TEXT NOT NULL DEFAULT '',
  pattern_id TEXT NOT NULL DEFAULT '',
  pattern_name TEXT NOT NULL DEFAULT '',
  pattern_rationale TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, topic_id)
);

-- Copy existing rows; backfill user_id from users table via spreadsheet_id.
-- Rows where user_id cannot be resolved are kept with user_id = spreadsheet_id (fallback).
INSERT OR IGNORE INTO pipeline_state_new
SELECT
  COALESCE(
    (SELECT id FROM users WHERE users.spreadsheet_id = pipeline_state.spreadsheet_id AND users.spreadsheet_id != '' LIMIT 1),
    pipeline_state.spreadsheet_id
  ) AS user_id,
  pipeline_state.spreadsheet_id,
  pipeline_state.topic_id,
  pipeline_state.topic_id AS topic_key,
  pipeline_state.topic,
  pipeline_state.date,
  pipeline_state.status,
  pipeline_state.variant1,
  pipeline_state.variant2,
  pipeline_state.variant3,
  pipeline_state.variant4,
  pipeline_state.image_link1,
  pipeline_state.image_link2,
  pipeline_state.image_link3,
  pipeline_state.image_link4,
  pipeline_state.selected_text,
  pipeline_state.selected_image_id,
  COALESCE(pipeline_state.selected_image_urls_json, '') AS selected_image_urls_json,
  pipeline_state.post_time,
  pipeline_state.email_to,
  pipeline_state.email_cc,
  pipeline_state.email_bcc,
  pipeline_state.email_subject,
  pipeline_state.topic_generation_rules,
  pipeline_state.generation_template_id,
  pipeline_state.published_at,
  COALESCE(pipeline_state.topic_delivery_channel, '') AS topic_delivery_channel,
  COALESCE(pipeline_state.topic_generation_model, '') AS topic_generation_model,
  COALESCE(pipeline_state.content_review_fingerprint, '') AS content_review_fingerprint,
  pipeline_state.content_review_at,
  COALESCE(pipeline_state.content_review_json, '') AS content_review_json,
  COALESCE(pipeline_state.generation_run_id, '') AS generation_run_id,
  COALESCE(pipeline_state.pattern_id, '') AS pattern_id,
  COALESCE(pipeline_state.pattern_name, '') AS pattern_name,
  COALESCE(pipeline_state.pattern_rationale, '') AS pattern_rationale,
  pipeline_state.created_at,
  pipeline_state.updated_at
FROM pipeline_state;

DROP TABLE pipeline_state;
ALTER TABLE pipeline_state_new RENAME TO pipeline_state;

CREATE INDEX IF NOT EXISTS idx_pipeline_user ON pipeline_state(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_spreadsheet ON pipeline_state(spreadsheet_id) WHERE spreadsheet_id != '';
CREATE INDEX IF NOT EXISTS idx_pipeline_topic_id ON pipeline_state(topic_id);
