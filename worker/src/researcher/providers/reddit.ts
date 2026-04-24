import type { ResearchArticle } from '../types';

const GENRE_SUBREDDIT: Record<string, string> = {
  technology: 'technology',
  business: 'business',
  science: 'science',
  health: 'health',
  entertainment: 'entertainment',
  politics: 'worldnews',
  all: 'news',
};

interface RedditPost {
  title: string;
  url: string;
  selftext?: string;
  subreddit: string;
  created_utc: number;
  score: number;
}

interface RedditListing {
  data: { children: Array<{ data: RedditPost }> };
}

function mapPost(post: RedditPost): ResearchArticle {
  return {
    title: post.title,
    url: post.url.startsWith('/r/')
      ? `https://www.reddit.com${post.url}`
      : post.url,
    source: `Reddit r/${post.subreddit}`,
    publishedAt: new Date(post.created_utc * 1000).toISOString(),
    snippet: post.selftext?.slice(0, 200) || `${post.score} upvotes`,
    provider: 'reddit' as const,
  };
}

export async function fetchReddit(keyword: string, genre: string): Promise<ResearchArticle[]> {
  const subreddit = GENRE_SUBREDDIT[genre.toLowerCase()] ?? 'news';
  const headers = { 'User-Agent': 'TrendingResearch/1.0' };

  const [searchRes, hotRes] = await Promise.allSettled([
    fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=hot&limit=10&t=week`,
      { headers, signal: AbortSignal.timeout(8000) },
    ),
    fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=5`,
      { headers, signal: AbortSignal.timeout(8000) },
    ),
  ]);

  const articles: ResearchArticle[] = [];

  if (searchRes.status === 'fulfilled' && searchRes.value.ok) {
    const data = (await searchRes.value.json()) as RedditListing;
    for (const { data: post } of data.data?.children ?? []) {
      if (post.title && post.url) articles.push(mapPost(post));
    }
  }

  if (hotRes.status === 'fulfilled' && hotRes.value.ok) {
    const data = (await hotRes.value.json()) as RedditListing;
    for (const { data: post } of data.data?.children ?? []) {
      if (post.title && post.url) articles.push(mapPost(post));
    }
  }

  return articles;
}
