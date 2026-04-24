import type { Env } from '../index';
import type { ResearchArticle } from './types';
import { fetchRssFeed } from '../researcher/providers/rss';
import {
  fetchGNewsSearch,
  fetchNewsApiEverything,
  fetchNewsDataIo,
  fetchSerpApiGoogleNews,
} from '../researcher/providers/newsApis';

export async function collectArticlesFromSources(
  env: Env,
  rssEnabled: boolean,
  newsApiEnabled: boolean,
  customRssFeeds: Array<{ id: string; url: string; label?: string; enabled: boolean }>,
  windowStart: string,
  windowEnd: string,
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

  if (rssEnabled) {
    const { collectEnabledRssUrls, normalizeNewsResearchStored } = await import('../researcher/config');
    const stored = normalizeNewsResearchStored({});
    const rssUrls = collectEnabledRssUrls(stored, env);
    for (const url of rssUrls) {
      feedFetchPromises.push(
        fetchRssFeed(url, url).then((articles) => {
          return articles;
        }).catch((err) => {
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

  if (newsApiEnabled) {
    const apiPromises: Promise<ResearchArticle[]>[] = [];

    if (String(env.NEWSAPI_KEY || '').trim()) {
      apiPromises.push(
        fetchNewsApiEverything(env, 'news', windowStart, windowEnd).catch(() => []),
      );
    }
    if (String(env.GNEWS_API_KEY || '').trim()) {
      apiPromises.push(
        fetchGNewsSearch(env, 'news', windowStart, windowEnd).catch(() => []),
      );
    }
    if (String(env.NEWSDATA_API_KEY || '').trim()) {
      apiPromises.push(
        fetchNewsDataIo(env, 'news', windowStart, windowEnd).catch(() => []),
      );
    }
    if (String(env.SERPAPI_API_KEY || '').trim()) {
      apiPromises.push(
        fetchSerpApiGoogleNews(env, 'news').catch(() => []),
      );
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

  return deduped.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
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
