-- Per-workspace LLM model selections, keyed by feature setting_key.
-- setting_key values: review_generation, generation_worker,
--                     content_review_text, content_review_vision, github_automation
CREATE TABLE IF NOT EXISTS workspace_llm_settings (
  spreadsheet_id TEXT NOT NULL,
  setting_key    TEXT NOT NULL,
  provider       TEXT NOT NULL,
  model          TEXT NOT NULL,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (spreadsheet_id, setting_key)
);
