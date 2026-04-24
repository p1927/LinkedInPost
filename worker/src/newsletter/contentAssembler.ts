import type { Env } from '../index';
import type { ResearchArticle } from './types';
import { fetchRssFeed } from '../researcher/providers/rss';
import {
  fetchGNewsSearch,
  fetchNewsApiEverything,
  fetchNewsDataIo,
  fetchSerpApiGoogleNews,
} from '../researcher/providers/newsApis';

interface ArticleFilter {
  includeKeywords: string[];
  excludeKeywords: string[];
}

export async function collectArticlesFromSources(
  env: Env,
  rssEnabled: boolean,
  newsApiEnabled: boolean,
  customRssFeeds: Array<{ id: string; url: string; label?: string; enabled: boolean }>,
  enabledBuiltInFeedIds: string[],
  enabledNewsApiProviders: string[],
  windowStart: string,
  windowEnd: string,
  filter: ArticleFilter,
): Promise<ResearchArticle[]> {
  const allArticles: ResearchArticle[] = [];

  const enabledCustomFeeds = customRssFeeds.filter((f) => f.enabled);

  const feedFetchPromises = enabledCustomFeeds.map(async (feed) => {
    try {
      const articles = await fetchRssFeed(feed.url, feed.label || feed.id);
      return articles;
    } catch (err) {
      console.error(`Failed to fetch RSS feed ${feed.url}:`, err);
      return [];
    }
  });

  if (rssEnabled && enabledBuiltInFeedIds.length > 0) {
    const { collectEnabledRssUrls, normalizeNewsResearchStored } = await import('../researcher/config');
    const stored = normalizeNewsResearchStored({});
    const allBuiltInUrls = collectEnabledRssUrls(stored, env);
    // Only include feeds whose IDs are in enabledBuiltInFeedIds
    // Match by feed URL or label (stored rssFeeds entries have id + url)
    const storedFeeds = (stored.rssFeeds || []).filter((f: { id: string }) => enabledBuiltInFeedIds.includes(f.id));
    for (const feed of storedFeeds) {
      feedFetchPromises.push(
        fetchRssFeed(feed.url, feed.label || feed.id).catch((err) => {
          console.error(`Failed to fetch built-in RSS ${feed.url}:`, err);
          return [];
        }),
      );
    }
    // Also fetch any env-defined feeds not already covered
    for (const url of allBuiltInUrls) {
      feedFetchPromises.push(
        fetchRssFeed(url, url).catch((err) => {
          console.error(`Failed to fetch RSS ${url}:`, err);
          return [];
        }),
      );
    }
  }

  const feedResults = await Promise.allSettled(feedFetchPromises);
  const feedArticles: ResearchArticle[] = [];
  for (const result of feedResults) {
    if (result.status === 'fulfilled') {
      feedArticles.push(...result.value);
    }
  }

  if (newsApiEnabled && enabledNewsApiProviders.length > 0) {
    const apiPromises: Promise<ResearchArticle[]>[] = [];

    if (enabledNewsApiProviders.includes('newsapi') && String(env.NEWSAPI_KEY || '').trim()) {
      apiPromises.push(fetchNewsApiEverything(env, 'news', windowStart, windowEnd).catch(() => []));
    }
    if (enabledNewsApiProviders.includes('gnews') && String(env.GNEWS_API_KEY || '').trim()) {
      apiPromises.push(fetchGNewsSearch(env, 'news', windowStart, windowEnd).catch(() => []));
    }
    if (enabledNewsApiProviders.includes('newsdata') && String(env.NEWSDATA_API_KEY || '').trim()) {
      apiPromises.push(fetchNewsDataIo(env, 'news', windowStart, windowEnd).catch(() => []));
    }
    if (enabledNewsApiProviders.includes('serpapi') && String(env.SERPAPI_API_KEY || '').trim()) {
      apiPromises.push(fetchSerpApiGoogleNews(env, 'news').catch(() => []));
    }

    const apiResults = await Promise.allSettled(apiPromises);
    for (const result of apiResults) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      }
    }
  }

  allArticles.push(...feedArticles);

  const deduped = deduplicateArticles(allArticles);
  const filtered = filterArticles(deduped, filter);

  return filtered.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

function filterArticles(articles: ResearchArticle[], filter: ArticleFilter): ResearchArticle[] {
  const { includeKeywords, excludeKeywords } = filter;
  if (includeKeywords.length === 0 && excludeKeywords.length === 0) return articles;

  return articles.filter((article) => {
    const text = `${article.title} ${article.snippet} ${article.source}`.toLowerCase();
    const hasExcluded = excludeKeywords.some((kw) => text.includes(kw.toLowerCase()));
    if (hasExcluded) return false;
    if (includeKeywords.length === 0) return true;
    return includeKeywords.some((kw) => text.includes(kw.toLowerCase()));
  });
}

function deduplicateArticles(articles: ResearchArticle[]): ResearchArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = a.url || `${a.title}|${a.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
