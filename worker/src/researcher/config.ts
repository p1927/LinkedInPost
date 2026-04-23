import type { Env } from '../index';
import type { NewsResearchFeedEntry, NewsResearchStored } from './types';
import { DEFAULT_NEWS_RESEARCH, MAX_RSS_FEEDS, MAX_URL_LEN } from './types';

export function normalizeNewsResearchStored(raw: unknown): NewsResearchStored {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_NEWS_RESEARCH, rssFeeds: [] };
  }
  const o = raw as Record<string, unknown>;
  const apisRaw = o.apis as Record<string, unknown> | undefined;
  const apis = {
    newsapi: Boolean(apisRaw?.newsapi),
    gnews: Boolean(apisRaw?.gnews),
    newsdata: Boolean(apisRaw?.newsdata),
    serpapiNews: Boolean(apisRaw?.serpapiNews),
  };
  const feedsIn = Array.isArray(o.rssFeeds) ? o.rssFeeds : [];
  const rssFeeds: NewsResearchFeedEntry[] = [];
  for (const entry of feedsIn) {
    if (rssFeeds.length >= MAX_RSS_FEEDS) break;
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const id = String(e.id || '').trim();
    const url = String(e.url || '').trim();
    if (!id || !url || url.length > MAX_URL_LEN) continue;
    rssFeeds.push({
      id,
      url,
      label: String(e.label || '').trim() || undefined,
      enabled: e.enabled !== false,
    });
  }
  return {
    enabled: o.enabled === true,
    apis,
    rssFeeds,
  };
}

export interface NewsProviderKeyStatus {
  newsapi: boolean;
  gnews: boolean;
  newsdata: boolean;
  serpapi: boolean;
}

export function getNewsProviderKeyStatus(env: Env): NewsProviderKeyStatus {
  return {
    newsapi: Boolean(String(env.NEWSAPI_KEY || '').trim()),
    gnews: Boolean(String(env.GNEWS_API_KEY || '').trim()),
    newsdata: Boolean(String(env.NEWSDATA_API_KEY || '').trim()),
    serpapi: Boolean(String(env.SERPAPI_API_KEY || '').trim()),
  };
}

function parseEnvRssFeeds(raw: string): string[] {
  const s = String(raw || '').trim();
  if (!s) return [];
  try {
    const j = JSON.parse(s) as unknown;
    if (Array.isArray(j)) {
      return j.map((x) => String(x || '').trim()).filter(Boolean);
    }
  } catch {
    /* fall through */
  }
  return s.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
}

export function collectEnabledRssUrls(stored: NewsResearchStored, env: Env): string[] {
  const fromConfig = stored.rssFeeds.filter((f: NewsResearchFeedEntry) => f.enabled).map((f: NewsResearchFeedEntry) => f.url.trim()).filter(Boolean);
  const fromEnv = parseEnvRssFeeds(String(env.RESEARCHER_RSS_FEEDS || ''));
  return [...new Set([...fromConfig, ...fromEnv])];
}
