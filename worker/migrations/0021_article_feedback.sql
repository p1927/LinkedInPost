-- worker/migrations/0021_article_feedback.sql
-- Per-user article feedback (thumbs up / down) for the feed

CREATE TABLE IF NOT EXISTS article_feedback (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  article_url TEXT NOT NULL,
  vote        TEXT NOT NULL CHECK(vote IN ('up', 'down')),
  created_at  TEXT NOT NULL,
  UNIQUE(user_id, article_url)
);

CREATE INDEX IF NOT EXISTS idx_article_feedback_user
  ON article_feedback(user_id);
