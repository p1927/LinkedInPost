import type { ResearchArticle } from '../types';

interface HNHit {
  objectID: string;
  title: string;
  url?: string;
  story_url?: string;
  points: number;
  created_at: string;
  author: string;
}

export async function fetchHackerNews(keyword: string): Promise<ResearchArticle[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=10`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HN API error: ${res.status}`);

  const data = (await res.json()) as { hits?: HNHit[] };

  return (data.hits ?? [])
    .filter((h) => h.url || h.story_url)
    .map((h) => ({
      title: h.title,
      url: h.url ?? h.story_url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      source: 'Hacker News',
      publishedAt: h.created_at,
      snippet: `${h.points} points · by ${h.author}`,
      provider: 'hackernews' as const,
    }));
}
