import type { Env } from '../../index';
import type { ResearchArticle } from '../types';

function inWindow(iso: string, startMs: number, endMs: number): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return true;
  return t >= startMs && t <= endMs;
}

export async function fetchNewsApiEverything(
  env: Env,
  query: string,
  windowStart: string,
  windowEnd: string,
): Promise<ResearchArticle[]> {
  const key = String(env.NEWSAPI_KEY || '').trim();
  if (!key) return [];
  const from = windowStart.slice(0, 10);
  const to = windowEnd.slice(0, 10);
  const params = new URLSearchParams({
    apiKey: key,
    q: query || 'news',
    language: 'en',
    sortBy: 'publishedAt',
    from,
    to,
    pageSize: '20',
  });
  const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
    headers: { 'User-Agent': 'LinkedInPostBot/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`NewsAPI ${res.status}: ${t.slice(0, 120)}`);
  }
  const data = (await res.json()) as { articles?: Array<{ title?: string; url?: string; description?: string; publishedAt?: string; source?: { name?: string } }> };
  const startMs = Date.parse(windowStart);
  const endMs = Date.parse(windowEnd);
  const articles = data.articles || [];
  const out: ResearchArticle[] = [];
  for (const a of articles) {
    const title = String(a.title || '').trim();
    const url = String(a.url || '').trim();
    if (!title || !url) continue;
    const publishedAt = String(a.publishedAt || new Date().toISOString());
    const row: ResearchArticle = {
      title,
      url,
      source: String(a.source?.name || 'NewsAPI'),
      publishedAt,
      snippet: String(a.description || '').trim(),
      provider: 'newsapi',
    };
    if (inWindow(row.publishedAt, startMs, endMs)) {
      out.push(row);
    }
  }
  return out;
}

export async function fetchGNewsSearch(
  env: Env,
  query: string,
  windowStart: string,
  windowEnd: string,
): Promise<ResearchArticle[]> {
  const token = String(env.GNEWS_API_KEY || '').trim();
  if (!token) return [];
  const from = windowStart.slice(0, 10);
  const to = windowEnd.slice(0, 10);
  const params = new URLSearchParams({
    token,
    q: query || 'news',
    lang: 'en',
    max: '20',
    from,
    to,
    in: 'title,description,content',
  });
  const res = await fetch(`https://gnews.io/api/v4/search?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GNews ${res.status}: ${t.slice(0, 120)}`);
  }
  const data = (await res.json()) as { articles?: Array<{ title?: string; url?: string; description?: string; publishedAt?: string; source?: { name?: string } }> };
  const startMs = Date.parse(windowStart);
  const endMs = Date.parse(windowEnd);
  const articles = data.articles || [];
  const out: ResearchArticle[] = [];
  for (const a of articles) {
    const title = String(a.title || '').trim();
    const url = String(a.url || '').trim();
    if (!title || !url) continue;
    const publishedAt = String(a.publishedAt || new Date().toISOString());
    const row: ResearchArticle = {
      title,
      url,
      source: String(a.source?.name || 'GNews'),
      publishedAt,
      snippet: String(a.description || '').trim(),
      provider: 'gnews',
    };
    if (inWindow(row.publishedAt, startMs, endMs)) {
      out.push(row);
    }
  }
  return out;
}

export async function fetchNewsDataIo(
  env: Env,
  query: string,
  windowStart: string,
  windowEnd: string,
): Promise<ResearchArticle[]> {
  const apikey = String(env.NEWSDATA_API_KEY || '').trim();
  if (!apikey) return [];
  const from = windowStart.slice(0, 10);
  const to = windowEnd.slice(0, 10);
  const params = new URLSearchParams({
    apikey,
    q: query || 'news',
    language: 'en',
    from_date: from,
    to_date: to,
  });
  const res = await fetch(`https://newsdata.io/api/1/news?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`NewsData.io ${res.status}: ${t.slice(0, 120)}`);
  }
  const data = (await res.json()) as { results?: Array<{ title?: string; link?: string; description?: string; pubDate?: string; source_id?: string }> };
  const startMs = Date.parse(windowStart);
  const endMs = Date.parse(windowEnd);
  const results = data.results || [];
  const out: ResearchArticle[] = [];
  for (const a of results) {
    const title = String(a.title || '').trim();
    const url = String(a.link || '').trim();
    if (!title || !url) continue;
    const publishedAt = String(a.pubDate || new Date().toISOString());
    const row: ResearchArticle = {
      title,
      url,
      source: String(a.source_id || 'NewsData.io'),
      publishedAt,
      snippet: String(a.description || '').trim(),
      provider: 'newsdata',
    };
    if (inWindow(row.publishedAt, startMs, endMs)) {
      out.push(row);
    }
  }
  return out;
}

interface SerpNewsResult {
  title?: string;
  link?: string;
  snippet?: string;
  source?: string;
  date?: string;
}

export async function fetchSerpApiGoogleNews(env: Env, query: string): Promise<ResearchArticle[]> {
  const apiKey = String(env.SERPAPI_API_KEY || '').trim();
  if (!apiKey) return [];
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google_news',
    q: query || 'news',
    hl: 'en',
    gl: 'us',
    num: '15',
  });
  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`SerpApi News ${res.status}: ${t.slice(0, 120)}`);
  }
  const data = (await res.json()) as { news_results?: SerpNewsResult[]; error?: string };
  if (data.error) {
    throw new Error(`SerpApi: ${data.error}`);
  }
  const news = data.news_results || [];
  const out: ResearchArticle[] = [];
  for (const n of news) {
    const title = String(n.title || '').trim();
    const url = String(n.link || '').trim();
    if (!title || !url) continue;
    const publishedAtRaw = String(n.date || new Date().toISOString());
    const parsed = Date.parse(publishedAtRaw);
    const iso = Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
    out.push({
      title,
      url,
      source: String(n.source || 'Google News'),
      publishedAt: iso,
      snippet: String(n.snippet || '').trim(),
      provider: 'serpapi_news',
    });
  }
  return out;
}
