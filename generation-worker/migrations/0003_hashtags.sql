-- Hashtags extracted from generated variants and stored at run level
ALTER TABLE generation_runs ADD COLUMN hashtags_json TEXT;

-- Index for fast hashtag lookups
CREATE INDEX IF NOT EXISTS idx_generation_runs_hashtags
  ON generation_runs (hashtags_json);
