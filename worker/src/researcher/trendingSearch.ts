import type { D1Database } from '@cloudflare/workers-types';
import type { Env } from '../index';
import { extractTrendingKeywords } from './keywords';
import { fetchGoogleTrendsRss } from './providers/googleTrends';
import { fetchHackerNews } from './providers/hackerNews';
import { fetchReddit } from './providers/reddit';
import { fetchRssFeed } from './providers/rss';
import {
  fetchGNewsSearch,
  fetchNewsApiEverything,
  fetchNewsDataIo,
  fetchSerpApiGoogleNews,
} from './providers/newsApis';
import { dedupeArticles } from './dedupe';
import { collectEnabledRssUrls, normalizeNewsResearchStored } from './config';
import { mapLimit } from './utils';
import type {
  NewsResearchStored,
  ResearchArticle,
  TrendingArticle,
  TrendingSearchRequest,
  TrendingSearchResponse,
  TrendingWord,
} from './types';

const STOPWORDS = new Set([
  'the','a','an','is','in','of','and','to','for','on','at','by','from','with',
  'are','has','have','its','was','this','that','but','or','as','it','be','been',
  'will','how','what','who','when','why','more','also','after','new','says','over',
  'about','into','their','they','which','were','just','than','then','here','there',
]);

function extractTrendingWords(articles: ResearchArticle[]): TrendingWord[] {
  const freq = new Map<string, number>();
  for (const a of articles) {
    for (const raw of a.title.split(/\W+/)) {
      const word = raw.toLowerCase().trim();
      if (word.length < 4 || STOPWORDS.has(word)) continue;
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      tier: count >= 5 ? 'high' : count >= 2 ? 'mid' : ('low' as const),
    }));
}

export async function trendingSearch(
  env: Env,
  db: D1Database,
  stored: NewsResearchStored,
  spreadsheetId: string,
  userId: string,
  req: TrendingSearchRequest,
): Promise<TrendingSearchResponse> {
  const cfg = normalizeNewsResearchStored(stored);

  // Step 1: LLM keyword extraction (falls back gracefully if no model)
  const { keywords, relatedTopics, searchIntent } = await extractTrendingKeywords(
    env,
    db,
    spreadsheetId,
    userId,
    req.topic,
    req.region,
    req.genre,
  );

  // Step 2: Compute time window
  const windowEndMs = Date.now();
  const windowStartMs = windowEndMs - req.windowDays * 24 * 60 * 60 * 1000;
  const windowStartDate = new Date(windowStartMs).toISOString().slice(0, 10);
  const windowEndDate = new Date(windowEndMs).toISOString().slice(0, 10);

  function inWindow(a: ResearchArticle): boolean {
    const t = Date.parse(a.publishedAt);
    if (isNaN(t)) return true;
    return t >= windowStartMs && t <= windowEndMs;
  }

  const raw: ResearchArticle[] = [];
  const sources = new Set<string>();

  // Google Trends RSS — once, region+genre aware
  try {
    const items = await fetchGoogleTrendsRss(req.region, req.genre);
    raw.push(...items.filter(inWindow));
    if (items.length > 0) sources.add('google_trends');
  } catch { /* skip */ }

  // HN — up to first 3 keywords
  await mapLimit(keywords.slice(0, 3), 3, async (kw) => {
    try {
      const items = await fetchHackerNews(kw);
      raw.push(...items.filter(inWindow));
      if (items.length > 0) sources.add('hackernews');
    } catch { /* skip */ }
  });

  // Reddit — first keyword + genre subreddit
  try {
    const items = await fetchReddit(keywords[0] ?? req.topic, req.genre);
    raw.push(...items.filter(inWindow));
    if (items.length > 0) sources.add('reddit');
  } catch { /* skip */ }

  // User RSS feeds
  const rssUrls = collectEnabledRssUrls(cfg, env);
  if (rssUrls.length > 0) {
    await mapLimit(rssUrls, 4, async (url) => {
      try {
        const items = await fetchRssFeed(url, url);
        raw.push(...items.filter(inWindow));
        if (items.length > 0) sources.add('rss');
      } catch { /* skip */ }
    });
  }

  // Paid APIs — only if keys are present
  const query = keywords.join(' ');

  if (cfg.apis.newsapi && String(env.NEWSAPI_KEY || '').trim()) {
    try {
      const items = await fetchNewsApiEverything(env, query, windowStartDate, windowEndDate);
      raw.push(...items);
      sources.add('newsapi');
    } catch { /* skip */ }
  }

  if (cfg.apis.gnews && String(env.GNEWS_API_KEY || '').trim()) {
    try {
      const items = await fetchGNewsSearch(env, query, windowStartDate, windowEndDate);
      raw.push(...items);
      sources.add('gnews');
    } catch { /* skip */ }
  }

  if (cfg.apis.newsdata && String(env.NEWSDATA_API_KEY || '').trim()) {
    try {
      const items = await fetchNewsDataIo(env, query, windowStartDate, windowEndDate);
      raw.push(...items);
      sources.add('newsdata');
    } catch { /* skip */ }
  }

  if (cfg.apis.serpapiNews && String(env.SERPAPI_API_KEY || '').trim()) {
    try {
      const items = (await fetchSerpApiGoogleNews(env, query)).filter(inWindow);
      raw.push(...items);
      sources.add('serpapi_news');
    } catch { /* skip */ }
  }

  // Aggregate
  const { articles: deduped } = dedupeArticles(raw);
  deduped.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const trendingWords = extractTrendingWords(deduped);

  const articles: TrendingArticle[] = deduped.slice(0, 40).map((a, i) => ({
    id: a.url || String(i),
    title: a.title,
    description: a.snippet,
    source: a.source,
    publishedAt: a.publishedAt,
    url: a.url,
    imageUrl: a.imageUrl,
    provider: a.provider,
    platform: 'news',
  }));

  return {
    articles,
    relatedTopics,
    trendingWords,
    keywords,
    searchIntent,
    sources: [...sources],
  };
}
