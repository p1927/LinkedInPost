-- Per-topic delivery channel and generation model overrides (optional; empty = workspace default).

ALTER TABLE pipeline_state ADD COLUMN topic_delivery_channel TEXT NOT NULL DEFAULT '';
ALTER TABLE pipeline_state ADD COLUMN topic_generation_model TEXT NOT NULL DEFAULT '';
