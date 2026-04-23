import { collectEnabledRssUrls, normalizeNewsResearchStored } from './config';
import { dedupeArticles } from './dedupe';
import { trimArticleSnippet, trimForPrompt } from './trim';
import { fetchRssFeed } from './providers/rss';
import {
  fetchGNewsSearch,
  fetchNewsApiEverything,
  fetchNewsDataIo,
  fetchSerpApiGoogleNews,
} from './providers/newsApis';
import type { ResearcherEnv } from './env';
import type {
  NewsApiProviderId,
  NewsResearchSearchPayload,
  NewsResearchSearchResult,
  NewsResearchStored,
  ResearchArticle,
  ResearchArticleRef,
} from './types';

export type { ResearcherEnv };

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const part = await Promise.all(chunk.map(fn));
    out.push(...part);
  }
  return out;
}

/**
 * Run a news research search and return articles + metadata.
 * Does NOT persist to D1 — caller is responsible for storage.
 */
export async function runNewsResearch(
  env: ResearcherEnv,
  stored: NewsResearchStored,
  payload: NewsResearchSearchPayload,
): Promise<NewsResearchSearchResult> {
  const cfg = normalizeNewsResearchStored(stored);

  const query = [(payload as unknown as Record<string, unknown>).customQuery as string | undefined, payload.topic]
    .filter(Boolean)
    .join(' ')
    .trim() || 'news';
  const rssUrls = collectEnabledRssUrls(cfg, env);
  const warnings: string[] = [];
  const providersUsed = new Set<NewsApiProviderId>();
  const raw: ResearchArticle[] = [];

  const startMs = Date.parse(payload.windowStart);
  const endMs = Date.parse(payload.windowEnd);

  function inWindow(a: ResearchArticle): boolean {
    const t = Date.parse(a.publishedAt);
    if (Number.isNaN(t)) return true;
    return t >= startMs && t <= endMs;
  }

  if (rssUrls.length > 0) {
    const rssResults = await mapLimit(rssUrls, 4, async (url) => {
      try {
        const items = await fetchRssFeed(url, url);
        providersUsed.add('rss');
        return items.filter(inWindow);
      } catch (e) {
        warnings.push(`RSS ${url.slice(0, 48)}\u2026: ${e instanceof Error ? e.message : 'failed'}`);
        return [];
      }
    });
    for (const batch of rssResults) raw.push(...batch);
  }

  if (cfg.apis.newsapi && String(env.NEWSAPI_KEY || '').trim()) {
    try {
      raw.push(...await fetchNewsApiEverything(env, query, payload.windowStart, payload.windowEnd));
      providersUsed.add('newsapi');
    } catch (e) { warnings.push(`NewsAPI: ${e instanceof Error ? e.message : 'failed'}`); }
  }

  if (cfg.apis.gnews && String(env.GNEWS_API_KEY || '').trim()) {
    try {
      raw.push(...await fetchGNewsSearch(env, query, payload.windowStart, payload.windowEnd));
      providersUsed.add('gnews');
    } catch (e) { warnings.push(`GNews: ${e instanceof Error ? e.message : 'failed'}`); }
  }

  if (cfg.apis.newsdata && String(env.NEWSDATA_API_KEY || '').trim()) {
    try {
      raw.push(...await fetchNewsDataIo(env, query, payload.windowStart, payload.windowEnd));
      providersUsed.add('newsdata');
    } catch (e) { warnings.push(`NewsData: ${e instanceof Error ? e.message : 'failed'}`); }
  }

  if (cfg.apis.serpapiNews && String(env.SERPAPI_API_KEY || '').trim()) {
    try {
      const items = (await fetchSerpApiGoogleNews(env, query)).filter(inWindow);
      raw.push(...items);
      providersUsed.add('serpapi_news');
    } catch (e) { warnings.push(`SerpApi: ${e instanceof Error ? e.message : 'failed'}`); }
  }

  const trimmed = raw.map(trimArticleSnippet);
  const { articles: deduped, removed } = dedupeArticles(trimmed);
  deduped.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  return {
    articles: deduped.slice(0, 60),
    dedupedCount: removed,
    providersUsed: [...providersUsed],
    warnings,
  };
}

export { trimForPrompt };
export type { NewsResearchSearchPayload, NewsResearchSearchResult, NewsResearchStored, ResearchArticleRef };
