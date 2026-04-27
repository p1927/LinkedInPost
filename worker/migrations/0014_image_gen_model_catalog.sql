-- worker/migrations/0013_image_gen_model_catalog.sql
-- image_gen_model_catalog: stores provider model lists, synced weekly

CREATE TABLE IF NOT EXISTS image_gen_model_catalog (
  provider TEXT NOT NULL,
  model_value TEXT NOT NULL,
  model_label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (provider, model_value)
);
