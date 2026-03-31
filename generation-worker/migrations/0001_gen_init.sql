-- Generation runs: one row per /v1/generate call
CREATE TABLE IF NOT EXISTS generation_runs (
  run_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  spreadsheet_id TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT '',
  pattern_id TEXT NOT NULL DEFAULT '',
  pattern_runner_up TEXT NOT NULL DEFAULT '',
  pattern_rationale TEXT NOT NULL DEFAULT '',
  requirement_report_json TEXT NOT NULL DEFAULT '',
  variants_json TEXT NOT NULL DEFAULT '',
  image_candidates_json TEXT NOT NULL DEFAULT '',
  review_json TEXT NOT NULL DEFAULT '',
  trace_json TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed'
);

-- Human feedback on a generation run
CREATE TABLE IF NOT EXISTS generation_feedback (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES generation_runs(run_id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  selected_variant_index INTEGER,
  final_text TEXT NOT NULL DEFAULT '',
  selected_image_id TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  pattern_id TEXT NOT NULL DEFAULT ''
);
