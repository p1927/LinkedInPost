import type { Env } from '../index';
import type { SheetsGateway } from '../persistence/drafts';
import { buildTopicKey } from '../persistence/drafts';
import { collectEnabledRssUrls, normalizeNewsResearchStored } from './config';
import { dedupeArticles } from './dedupe';
import { trimArticleSnippet } from './trim';
import type {
  NewsApiProviderId,
  NewsResearchSearchPayload,
  NewsResearchSearchResult,
  NewsResearchStored,
  ResearchArticle,
} from './types';
import { fetchRssFeed } from './providers/rss';
import {
  fetchGNewsSearch,
  fetchNewsApiEverything,
  fetchNewsDataIo,
  fetchSerpApiGoogleNews,
} from './providers/newsApis';

function parsePayload(payload: Record<string, unknown>): NewsResearchSearchPayload {
  const topic = String(payload.topic || '').trim();
  const date = String(payload.date || '').trim();
  const windowStart = String(payload.windowStart || '').trim();
  const windowEnd = String(payload.windowEnd || '').trim();
  const customQuery = String(payload.customQuery || '').trim();
  if (!topic || !date) {
    throw new Error('Topic and date are required for news research.');
  }
  if (!windowStart || !windowEnd) {
    throw new Error('News window start and end are required.');
  }
  if (Number.isNaN(Date.parse(windowStart)) || Number.isNaN(Date.parse(windowEnd))) {
    throw new Error('Invalid news window dates.');
  }
  return { topic, date, windowStart, windowEnd, customQuery: customQuery || undefined };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const part = await Promise.all(chunk.map(fn));
    out.push(...part);
  }
  return out;
}

export async function searchNewsResearch(
  env: Env,
  stored: NewsResearchStored,
  payload: Record<string, unknown>,
  sheets: SheetsGateway,
  spreadsheetId: string,
): Promise<NewsResearchSearchResult> {
  const p = parsePayload(payload);
  const cfg = normalizeNewsResearchStored(stored);
  if (!cfg.enabled) {
    throw new Error('News research is disabled in Settings → News.');
  }

  const query = [p.customQuery, p.topic].filter(Boolean).join(' ').trim() || 'news';
  const rssUrls = collectEnabledRssUrls(cfg, env);
  const warnings: string[] = [];
  const providersUsed = new Set<NewsApiProviderId>();
  const raw: ResearchArticle[] = [];

  const startMs = Date.parse(p.windowStart);
  const endMs = Date.parse(p.windowEnd);

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
        warnings.push(`RSS ${url.slice(0, 48)}…: ${e instanceof Error ? e.message : 'failed'}`);
        return [];
      }
    });
    for (const batch of rssResults) {
      raw.push(...batch);
    }
  }

  if (cfg.apis.newsapi && String(env.NEWSAPI_KEY || '').trim()) {
    try {
      const items = await fetchNewsApiEverything(env, query, p.windowStart, p.windowEnd);
      raw.push(...items);
      providersUsed.add('newsapi');
    } catch (e) {
      warnings.push(`NewsAPI: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }

  if (cfg.apis.gnews && String(env.GNEWS_API_KEY || '').trim()) {
    try {
      const items = await fetchGNewsSearch(env, query, p.windowStart, p.windowEnd);
      raw.push(...items);
      providersUsed.add('gnews');
    } catch (e) {
      warnings.push(`GNews: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }

  if (cfg.apis.newsdata && String(env.NEWSDATA_API_KEY || '').trim()) {
    try {
      const items = await fetchNewsDataIo(env, query, p.windowStart, p.windowEnd);
      raw.push(...items);
      providersUsed.add('newsdata');
    } catch (e) {
      warnings.push(`NewsData.io: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }

  if (cfg.apis.serpapiNews && String(env.SERPAPI_API_KEY || '').trim()) {
    try {
      const items = (await fetchSerpApiGoogleNews(env, query)).filter(inWindow);
      raw.push(...items);
      providersUsed.add('serpapi_news');
    } catch (e) {
      warnings.push(`SerpApi News: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }

  const trimmed = raw.map(trimArticleSnippet);
  const { articles: deduped, removed } = dedupeArticles(trimmed);
  deduped.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  if (deduped.length === 0 && providersUsed.size === 0) {
    throw new Error(
      'No news sources are available. Enable APIs (with Worker secrets) or add RSS feeds in Settings → News.',
    );
  }

  const topicKey = buildTopicKey(p.topic, p.date);
  try {
    await sheets.appendNewsResearchSnapshot(spreadsheetId, {
      topicKey,
      fetchedAt: new Date().toISOString(),
      windowStart: p.windowStart,
      windowEnd: p.windowEnd,
      customQuery: p.customQuery || '',
      providersSummary: [...providersUsed].join(','),
      articlesJson: JSON.stringify(deduped.slice(0, 40)),
      dedupeRemoved: String(removed),
    });
  } catch (e) {
    warnings.push(`Sheet log: ${e instanceof Error ? e.message : 'failed'}`);
  }

  return {
    articles: deduped.slice(0, 60),
    dedupedCount: removed,
    providersUsed: [...providersUsed],
    warnings,
  };
}
