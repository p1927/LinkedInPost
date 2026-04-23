-- worker/migrations/0012_data_retention_30day.sql
-- Add 30-day expires_at column to news_snapshots and llm_usage_log for TTL-based cleanup.

-- news_snapshots: rows expire after 30 days
ALTER TABLE news_snapshots ADD COLUMN expires_at TEXT NOT NULL DEFAULT (datetime('now', '+30 days'));

CREATE INDEX IF NOT EXISTS idx_news_snapshots_expires_at ON news_snapshots(expires_at);

-- llm_usage_log: rows expire after 30 days
ALTER TABLE llm_usage_log ADD COLUMN expires_at TEXT NOT NULL DEFAULT (datetime('now', '+30 days'));

CREATE INDEX IF NOT EXISTS idx_llm_usage_log_expires_at ON llm_usage_log(expires_at);
