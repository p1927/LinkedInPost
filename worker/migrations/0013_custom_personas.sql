CREATE TABLE IF NOT EXISTS custom_personas (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  concerns TEXT NOT NULL DEFAULT '[]',
  ambitions TEXT NOT NULL DEFAULT '[]',
  current_focus TEXT NOT NULL DEFAULT '',
  habits TEXT NOT NULL DEFAULT '[]',
  language TEXT NOT NULL DEFAULT '',
  decision_drivers TEXT NOT NULL DEFAULT '[]',
  pain_points TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_custom_personas_user ON custom_personas(user_id);
