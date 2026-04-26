-- worker/migrations/0011_custom_workflows.sql
-- Custom user-defined workflow profiles

CREATE TABLE IF NOT EXISTS custom_workflows (
  id                     TEXT PRIMARY KEY,
  user_id                TEXT NOT NULL,
  name                   TEXT NOT NULL,
  description            TEXT NOT NULL,
  optimization_target    TEXT NOT NULL,
  generation_instruction TEXT NOT NULL,
  extends_workflow_id    TEXT NOT NULL DEFAULT 'base',
  node_configs_json      TEXT NOT NULL DEFAULT '[]',
  is_deleted             INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_workflows_user
  ON custom_workflows(user_id, is_deleted);
