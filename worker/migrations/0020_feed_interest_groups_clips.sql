-- worker/migrations/0020_feed_interest_groups_clips.sql
-- Interest groups and clips for the Feed feature

CREATE TABLE IF NOT EXISTS interest_groups (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  name         TEXT NOT NULL,
  topics_json  TEXT NOT NULL DEFAULT '[]',
  domains_json TEXT NOT NULL DEFAULT '[]',
  color        TEXT NOT NULL DEFAULT '#6366f1',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interest_groups_user
  ON interest_groups(user_id);

CREATE TABLE IF NOT EXISTS clips (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  type                  TEXT NOT NULL CHECK(type IN ('article', 'passage')),
  article_title         TEXT NOT NULL,
  article_url           TEXT NOT NULL,
  source                TEXT NOT NULL DEFAULT '',
  published_at          TEXT NOT NULL DEFAULT '',
  thumbnail_url         TEXT NOT NULL DEFAULT '',
  passage_text          TEXT NOT NULL DEFAULT '',
  clipped_at            TEXT NOT NULL,
  versions_json         TEXT NOT NULL DEFAULT '[]',
  assigned_post_ids_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_clips_user_clipped
  ON clips(user_id, clipped_at DESC);
