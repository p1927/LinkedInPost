-- Content review results stored per pipeline row.
ALTER TABLE pipeline_state ADD COLUMN content_review_fingerprint TEXT NOT NULL DEFAULT '';
ALTER TABLE pipeline_state ADD COLUMN content_review_at TEXT;
ALTER TABLE pipeline_state ADD COLUMN content_review_json TEXT NOT NULL DEFAULT '';
