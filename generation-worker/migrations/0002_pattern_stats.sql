-- Pattern performance stats: one row per pattern_id
CREATE TABLE IF NOT EXISTS pattern_stats (
  pattern_id TEXT PRIMARY KEY,
  pass_count INTEGER NOT NULL DEFAULT 0,
  flag_count INTEGER NOT NULL DEFAULT 0,
  block_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for fast pass-rate lookups
CREATE INDEX IF NOT EXISTS idx_pattern_stats_pass_rate
  ON pattern_stats (pass_count, flag_count, block_count);
