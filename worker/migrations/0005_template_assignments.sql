-- Pattern metadata columns on pipeline_state.
ALTER TABLE pipeline_state ADD COLUMN generation_run_id TEXT NOT NULL DEFAULT '';
ALTER TABLE pipeline_state ADD COLUMN pattern_id TEXT NOT NULL DEFAULT '';
ALTER TABLE pipeline_state ADD COLUMN pattern_name TEXT NOT NULL DEFAULT '';
ALTER TABLE pipeline_state ADD COLUMN pattern_rationale TEXT NOT NULL DEFAULT '';

-- Template assignments table for A/B test tracking.
CREATE TABLE IF NOT EXISTS template_assignments (
  spreadsheet_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  generation_run_id TEXT NOT NULL DEFAULT '',
  pattern_id TEXT NOT NULL DEFAULT '',
  pattern_name TEXT NOT NULL DEFAULT '',
  pattern_rationale TEXT NOT NULL DEFAULT '',
  test_group TEXT NOT NULL DEFAULT '',
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (spreadsheet_id, topic_id)
);
