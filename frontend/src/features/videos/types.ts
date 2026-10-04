/**
 * Episode row from the 'Episodes' Google Sheet tab.
 * Written by the local video-pipeline (python run.py sync); the app only reads.
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

export interface ListEpisodesResult {
  episodes: Episode[];
  hint?: string;
}
