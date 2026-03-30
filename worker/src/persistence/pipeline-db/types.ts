/** Raw row from `pipeline_state` (D1). */
export interface PipelineStateDbRow {
  spreadsheet_id: string;
  topic_id: string;
  topic: string;
  date: string;
  status: string;
  variant1: string;
  variant2: string;
  variant3: string;
  variant4: string;
  image_link1: string;
  image_link2: string;
  image_link3: string;
  image_link4: string;
  selected_text: string;
  selected_image_id: string;
  selected_image_urls_json: string;
  post_time: string;
  email_to: string;
  email_cc: string;
  email_bcc: string;
  email_subject: string;
  topic_generation_rules: string;
  generation_template_id: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsSnapshotDbRow {
  id: string;
  spreadsheet_id: string;
  topic_id: string;
  fetched_at: string;
  window_start: string;
  window_end: string;
  custom_query: string;
  providers_summary: string;
  articles: string;
  dedupe_removed: string;
}

export interface NewsSnapshotListItem {
  id: string;
  topicId: string;
  fetchedAt: string;
  windowStart: string;
  windowEnd: string;
  customQuery: string;
  providersSummary: string;
  articleCount: number;
  dedupeRemoved: string;
}
