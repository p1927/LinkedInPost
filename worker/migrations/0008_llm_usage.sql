-- LLM call usage log for cost tracking (per tenant).
-- One row per LLM API call (or per generation-worker run aggregated).
CREATE TABLE IF NOT EXISTS llm_usage_log (
  id               TEXT PRIMARY KEY,            -- nanoid (16 chars)
  spreadsheet_id   TEXT NOT NULL DEFAULT '',    -- tenant workspace
  user_id          TEXT NOT NULL DEFAULT '',    -- Google email
  provider         TEXT NOT NULL,               -- 'gemini' | 'grok' | 'openrouter'
  model            TEXT NOT NULL,               -- exact model string used
  setting_key      TEXT NOT NULL DEFAULT '',    -- e.g. 'generation_worker', 'content_review_text'
  prompt_tokens    INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,   -- pre-calculated at insert time
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_spreadsheet ON llm_usage_log(spreadsheet_id, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_usage_user ON llm_usage_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_usage_created ON llm_usage_log(created_at);
