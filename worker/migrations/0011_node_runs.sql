-- worker/migrations/0011_node_runs.sql
-- Per-node LLM run log for enrichment pipeline observability.
-- Rows expire after 30 days; cleanup runs on each write batch.

CREATE TABLE IF NOT EXISTS node_runs (
  id          TEXT PRIMARY KEY,
  run_id      TEXT NOT NULL DEFAULT '',
  topic_id    TEXT NOT NULL DEFAULT '',
  user_id     TEXT NOT NULL DEFAULT '',
  node_id     TEXT NOT NULL DEFAULT '',
  input_json  TEXT NOT NULL DEFAULT '{}',
  output_json TEXT NOT NULL DEFAULT '{}',
  model       TEXT NOT NULL DEFAULT '',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'completed',
  error       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL DEFAULT (datetime('now', '+30 days'))
);

CREATE INDEX IF NOT EXISTS idx_node_runs_topic_user
  ON node_runs(user_id, topic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_node_runs_run_id
  ON node_runs(run_id);

CREATE INDEX IF NOT EXISTS idx_node_runs_expires_at
  ON node_runs(expires_at);
