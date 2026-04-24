-- Newsletter voice & personalization + granular source controls
ALTER TABLE newsletter_configs ADD COLUMN author_persona TEXT NOT NULL DEFAULT '';
ALTER TABLE newsletter_configs ADD COLUMN writing_style_examples TEXT NOT NULL DEFAULT '';
ALTER TABLE newsletter_configs ADD COLUMN topic_include_keywords_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE newsletter_configs ADD COLUMN topic_exclude_keywords_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE newsletter_configs ADD COLUMN recurring_sections_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE newsletter_configs ADD COLUMN newsletter_intro TEXT NOT NULL DEFAULT '';
ALTER TABLE newsletter_configs ADD COLUMN newsletter_outro TEXT NOT NULL DEFAULT '';
ALTER TABLE newsletter_configs ADD COLUMN primary_channel TEXT NOT NULL DEFAULT 'email';
-- Granular source control: which built-in RSS feeds are enabled (list of feed IDs)
ALTER TABLE newsletter_configs ADD COLUMN enabled_rss_feed_ids_json TEXT NOT NULL DEFAULT '[]';
-- Granular source control: which news APIs are enabled (list of provider names)
ALTER TABLE newsletter_configs ADD COLUMN enabled_news_api_providers_json TEXT NOT NULL DEFAULT '[]';
