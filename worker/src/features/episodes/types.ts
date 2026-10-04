/**
 * Episode row from the 'Episodes' Google Sheet tab.
 * This tab is written by the local video-pipeline (python run.py sync);
 * the app only reads it.
 */
export interface Episode {
  id: string;
  title: string;
  series: string;
  topicArea: string;
  format: string;
  /** idea | scripted | approved | rendered | reviewed | scheduled | posted */
  status: string;
  sponsor: string;
  videoUrl: string;
  coverUrl: string;
  carouselUrlsJson: string;
  youtubeUrl: string;
  instagramUrl: string;
  postedAt: string;
  updatedAt: string;
  notes: string;
}

export type EpisodeStatus = 'idea' | 'scripted' | 'approved' | 'rendered' | 'reviewed' | 'scheduled' | 'posted';

export const EPISODE_STATUSES: EpisodeStatus[] = [
  'idea', 'scripted', 'approved', 'rendered', 'reviewed', 'scheduled', 'posted',
];

/** Expected header row for the Episodes tab (exact, in order). */
export const EPISODES_HEADERS = [
  'id', 'title', 'series', 'topic_area', 'format', 'status', 'sponsor',
  'video_url', 'cover_url', 'carousel_urls_json', 'youtube_url', 'instagram_url',
  'posted_at', 'updated_at', 'notes',
] as const;
