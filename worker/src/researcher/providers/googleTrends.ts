import { fetchRssFeed } from './rss';
import type { ResearchArticle } from '../types';

const GENRE_CAT_ID: Record<string, string> = {
  all: '0',
  technology: '5',
  business: '12',
  science: '8',
  health: '14',
  entertainment: '3',
  politics: '396',
};

export async function fetchGoogleTrendsRss(
  region: string,
  genre: string,
): Promise<ResearchArticle[]> {
  const catId = GENRE_CAT_ID[genre.toLowerCase()] ?? '0';
  const url = `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${region.toUpperCase()}&cat=${catId}`;

  const items = await fetchRssFeed(url, 'google_trends');
  return items.map((item) => ({ ...item, provider: 'google_trends' as const, source: 'Google Trends' }));
}
