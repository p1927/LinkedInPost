import type { Env } from '../index';
import { insertNewsSnapshotAndPrune } from '../persistence/pipeline-db/news';
import { buildServices } from '../services';
import { collectEnabledRssUrls, normalizeNewsResearchStored } from './config';
import { dedupeArticles } from './dedupe';
import { trimArticleSnippet } from './trim';
import { mapLimit } from './utils';
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

function newsSnapshotMaxPerTopic(env: Env): number {
  const raw = String(env.NEWS_SNAPSHOT_MAX_PER_TOPIC ?? '').trim();
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1) {
    return Math.min(500, Math.floor(n));
  }
  return 10;
}

function parsePayload(payload: Record<string, unknown>): NewsResearchSearchPayload {
  const topicId = String(payload.topicId || '').trim();
  const topic = String(payload.topic || '').trim();
  const date = String(payload.date || '').trim();
  const windowStart = String(payload.windowStart || '').trim();
  const windowEnd = String(payload.windowEnd || '').trim();
  const customQuery = String(payload.customQuery || '').trim();
  if (!topicId) {
    throw new Error('topicId is required for news research.');
  }
  if (!topic || !date) {
    throw new Error('Topic and date are required for news research.');
  }
  if (!windowStart || !windowEnd) {
    throw new Error('News window start and end are required.');
  }
  if (Number.isNaN(Date.parse(windowStart)) || Number.isNaN(Date.parse(windowEnd))) {
    throw new Error('Invalid news window dates.');
  }
  return { topicId, topic, date, windowStart, windowEnd, customQuery: customQuery || undefined };
}


export async function searchNewsResearch(
  env: Env,
  stored: NewsResearchStored,
  payload: Record<string, unknown>,
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

  try {
    const { pipeline } = buildServices(env);
    await pipeline.ensureWorkspace(spreadsheetId);
    await insertNewsSnapshotAndPrune(env.PIPELINE_DB, {
      spreadsheetId,
      topicId: p.topicId,
      fetchedAt: new Date().toISOString(),
      windowStart: p.windowStart,
      windowEnd: p.windowEnd,
      customQuery: p.customQuery || '',
      providersSummary: [...providersUsed].join(','),
      articlesJson: JSON.stringify(deduped.slice(0, 60)),
      dedupeRemoved: String(removed),
      maxPerTopic: newsSnapshotMaxPerTopic(env),
    });
  } catch (e) {
    warnings.push(`News snapshot: ${e instanceof Error ? e.message : 'failed'}`);
  }

  return {
    articles: deduped.slice(0, 60),
    dedupedCount: removed,
    providersUsed: [...providersUsed],
    warnings,
  };
}
