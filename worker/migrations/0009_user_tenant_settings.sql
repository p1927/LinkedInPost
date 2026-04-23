-- Per-user generation rules and "who am I" author profile.
-- Users can set their own values; these override the global workspace defaults in generation.
-- Admin can read all rows via adminListTenantSettings.
ALTER TABLE users ADD COLUMN user_rules TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN user_who_am_i TEXT NOT NULL DEFAULT '';
