# Trending Intelligence v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the trending topics system into a niche SEO intelligence tool with LLM keyword extraction, free sources (Google Trends RSS, HN, Reddit), news card redesign with images, region/genre/duration filters, and a trending words widget.

**Architecture:** A new `trendingSearch` worker action orchestrates LLM keyword extraction + parallel fan-out to all sources, returning enriched results. The frontend uses a new `useTrendingSearch` hook and new UI components while leaving the existing pipeline news flow (`searchNewsResearch`) untouched.

**Tech Stack:** TypeScript, Cloudflare Workers, React 18, Tailwind CSS, Lucide icons. No new npm packages.

**Spec:** `docs/superpowers/specs/2026-04-24-trending-intelligence-v2-design.md`

---

## File Map

**New — Worker:**
- `worker/src/researcher/utils.ts` — shared `mapLimit` (moved from `search.ts`)
- `worker/src/researcher/keywords.ts` — LLM keyword extraction + `relatedTopics`
- `worker/src/researcher/providers/googleTrends.ts` — Google Trends RSS fetcher
- `worker/src/researcher/providers/hackerNews.ts` — HN Algolia fetcher
- `worker/src/researcher/providers/reddit.ts` — Reddit JSON fetcher
- `worker/src/researcher/trendingSearch.ts` — main orchestrator

**New — Frontend:**
- `frontend/src/lib/relativeTime.ts` — relative timestamp formatter
- `frontend/src/features/trending/components/NewsCard.tsx` — redesigned news card
- `frontend/src/features/trending/components/TrendingFilters.tsx` — region/genre/duration bar
- `frontend/src/features/trending/components/TrendingWordsWidget.tsx` — clickable word chips
- `frontend/src/features/trending/hooks/useTrendingSearch.ts` — new search hook

**Modified — Worker:**
- `worker/src/researcher/types.ts` — add `imageUrl` to `ResearchArticle`, new provider IDs, new request/response types
- `worker/src/researcher/search.ts` — import `mapLimit` from `utils.ts` (remove inline)
- `worker/src/index.ts` — add `case 'trendingSearch':`

**Modified — Frontend:**
- `frontend/src/features/trending/types.ts` — add frontend search types
- `frontend/src/services/backendApi.ts` — add `trendingSearch()` method
- `frontend/src/features/trending/hooks/useNewsTrending.ts` — fix `imageUrl: undefined` bug
- `frontend/src/features/trending/components/NewsPanel.tsx` — use `<NewsCard>`
- `frontend/src/features/add-topic/TrendingSidebar.tsx` — use `<NewsCard>`, clickable topics
- `frontend/src/features/trending/TrendingDashboard.tsx` — add filters, words widget, `useTrendingSearch`

---

## Task 1: Shared types + mapLimit utility

**Files:**
- Modify: `worker/src/researcher/types.ts`
- Modify: `worker/src/researcher/search.ts`
- Create: `worker/src/researcher/utils.ts`

- [ ] **Step 1: Create `worker/src/researcher/utils.ts`**

```typescript
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const part = await Promise.all(chunk.map(fn));
    out.push(...part);
  }
  return out;
}
```

- [ ] **Step 2: Update `worker/src/researcher/search.ts` — import mapLimit**

Find the inline `mapLimit` function (around line 53) and remove it. Add import at the top:

```typescript
import { mapLimit } from './utils';
```

The rest of the file is unchanged.

- [ ] **Step 3: Extend `worker/src/researcher/types.ts`**

Make these targeted edits:

**a) Add `imageUrl` to `ResearchArticle`** (existing interface, add one field):

```typescript
export interface ResearchArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
  provider: NewsApiProviderId;
  imageUrl?: string;   // ← add this line
}
```

**b) Extend `NewsApiProviderId` union** (replace existing type):

```typescript
export type NewsApiProviderId =
  | 'rss'
  | 'newsapi'
  | 'gnews'
  | 'newsdata'
  | 'serpapi_news'
  | 'google_trends'
  | 'hackernews'
  | 'reddit';
```

**c) Add new interfaces at the end of the file:**

```typescript
export interface TrendingSearchRequest {
  topic: string;
  region: string;
  genre: string;
  windowDays: number;
}

export interface TrendingArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  provider: NewsApiProviderId;
  platform: 'news';
}

export interface TrendingWord {
  word: string;
  count: number;
  tier: 'high' | 'mid' | 'low';
}

export interface TrendingSearchResponse {
  articles: TrendingArticle[];
  relatedTopics: string[];
  trendingWords: TrendingWord[];
  keywords: string[];
  searchIntent: string;
  sources: string[];
}
```

- [ ] **Step 4: Add frontend types to `frontend/src/features/trending/types.ts`**

Append at the end of the existing file (don't change existing types):

```typescript
export interface TrendingSearchRequest {
  topic: string;
  region: string;
  genre: string;
  windowDays: number;
}

export interface TrendingWord {
  word: string;
  count: number;
  tier: 'high' | 'mid' | 'low';
}

export interface TrendingSearchResult {
  articles: NewsArticle[];      // reuse existing NewsArticle type
  relatedTopics: string[];
  trendingWords: TrendingWord[];
  keywords: string[];
  searchIntent: string;
  sources: string[];
}
```

Note: `NewsArticle` is already defined in this file and matches the shape — reuse it.

- [ ] **Step 5: Verify types compile**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost
cd worker && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to this task).

- [ ] **Step 6: Commit**

```bash
git add worker/src/researcher/utils.ts worker/src/researcher/types.ts worker/src/researcher/search.ts frontend/src/features/trending/types.ts
git commit -m "feat(trending): shared utils, imageUrl type, new provider IDs and search types"
```

---

## Task 2: `relativeTime` utility

**Files:**
- Create: `frontend/src/lib/relativeTime.ts`

- [ ] **Step 1: Create `frontend/src/lib/relativeTime.ts`**

```typescript
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
```

- [ ] **Step 2: Verify logic manually**

Trace through a few cases in your head:
- `dateStr` from 90 seconds ago → `diffSec=90` → "1m ago" ✓
- `dateStr` from 5 hours ago → `diffSec=18000` → "5h ago" ✓
- `dateStr` from 3 days ago → "3d ago" ✓
- `dateStr` from 10 days ago → locale date string ✓
- `dateStr = "invalid"` → returns "invalid" ✓

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/relativeTime.ts
git commit -m "feat(trending): add relativeTime utility"
```

---

## Task 3: LLM keyword extraction

**Files:**
- Create: `worker/src/researcher/keywords.ts`

- [ ] **Step 1: Create `worker/src/researcher/keywords.ts`**

```typescript
import type { D1Database } from '@cloudflare/workers-types';
import { generateForRef } from '../llm/gateway';
import { getLlmSettingsFromD1 } from '../llm/d1Settings';
import { logLlmUsage } from '../db/llm-usage';
import type { Env } from '../index';

export interface KeywordExtractionResult {
  keywords: string[];
  relatedTopics: string[];
  searchIntent: string;
}

function fallback(topic: string): KeywordExtractionResult {
  return {
    keywords: topic.split(/\s+/).filter(Boolean).slice(0, 5),
    relatedTopics: [],
    searchIntent: '',
  };
}

export async function extractTrendingKeywords(
  env: Env,
  db: D1Database,
  spreadsheetId: string,
  userId: string,
  topic: string,
  region: string,
  genre: string,
): Promise<KeywordExtractionResult> {
  if (!topic.trim()) return fallback(topic);

  try {
    const settings = await getLlmSettingsFromD1(db, spreadsheetId);
    const ref = settings.enrichment_trending;
    if (!ref) return fallback(topic);

    const prompt = `Extract search keywords for trending news research.
Topic: "${topic}"
Region: "${region}"
Genre: "${genre}"

Return JSON only — no markdown, no explanation:
{
  "keywords": ["4-6 search terms optimised for news and social media APIs"],
  "relatedTopics": ["8-10 related topics the user might explore next"],
  "searchIntent": "one sentence describing what the user is looking for"
}`;

    const { text, usage } = await generateForRef(env, ref, prompt, {
      maxOutputTokens: 512,
      temperature: 0.3,
    });

    void logLlmUsage(db, {
      spreadsheetId,
      userId,
      provider: ref.provider,
      model: ref.model,
      settingKey: 'enrichment_trending',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback(topic);

    const parsed = JSON.parse(jsonMatch[0]) as Partial<KeywordExtractionResult>;
    return {
      keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0
        ? (parsed.keywords as string[]).slice(0, 6)
        : fallback(topic).keywords,
      relatedTopics: Array.isArray(parsed.relatedTopics)
        ? (parsed.relatedTopics as string[]).slice(0, 10)
        : [],
      searchIntent: typeof parsed.searchIntent === 'string' ? parsed.searchIntent : '',
    };
  } catch {
    return fallback(topic);
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/worker && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add worker/src/researcher/keywords.ts
git commit -m "feat(trending): LLM keyword extraction using enrichment_trending model"
```

---

## Task 4: Google Trends RSS provider

**Files:**
- Create: `worker/src/researcher/providers/googleTrends.ts`

- [ ] **Step 1: Create `worker/src/researcher/providers/googleTrends.ts`**

```typescript
import { fetchRssFeed } from './rss';
import type { ResearchArticle } from '../types';

const GENRE_CAT_ID: Record<string, string> = {
  all: '0',
  technology: '5',
  business: '12',
  science: '8',
  health: '14',
  entertainment: '3',
  politics: '396',
};

export async function fetchGoogleTrendsRss(
  region: string,
  genre: string,
): Promise<ResearchArticle[]> {
  const catId = GENRE_CAT_ID[genre.toLowerCase()] ?? '0';
  const url = `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${region.toUpperCase()}&cat=${catId}`;

  const items = await fetchRssFeed(url, 'google_trends');
  return items.map((item) => ({ ...item, provider: 'google_trends' as const, source: 'Google Trends' }));
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/worker && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/researcher/providers/googleTrends.ts
git commit -m "feat(trending): Google Trends RSS provider (region + genre aware, no API key)"
```

---

## Task 5: Hacker News provider

**Files:**
- Create: `worker/src/researcher/providers/hackerNews.ts`

- [ ] **Step 1: Create `worker/src/researcher/providers/hackerNews.ts`**

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/worker && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/researcher/providers/hackerNews.ts
git commit -m "feat(trending): Hacker News Algolia provider (free, no API key)"
```

---

## Task 6: Reddit provider

**Files:**
- Create: `worker/src/researcher/providers/reddit.ts`

- [ ] **Step 1: Create `worker/src/researcher/providers/reddit.ts`**

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/worker && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/researcher/providers/reddit.ts
git commit -m "feat(trending): Reddit provider (hot posts by keyword + genre subreddit)"
```

---

## Task 7: `trendingSearch` orchestrator

**Files:**
- Create: `worker/src/researcher/trendingSearch.ts`

- [ ] **Step 1: Create `worker/src/researcher/trendingSearch.ts`**

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/worker && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/researcher/trendingSearch.ts
git commit -m "feat(trending): trendingSearch orchestrator with LLM keywords + free sources"
```

---

## Task 8: Register worker action + `backendApi` method + fix imageUrl

**Files:**
- Modify: `worker/src/index.ts`
- Modify: `frontend/src/services/backendApi.ts`
- Modify: `frontend/src/features/trending/hooks/useNewsTrending.ts`

- [ ] **Step 1: Register `trendingSearch` in `worker/src/index.ts`**

Find the `case 'searchNewsResearch':` block (around line 1610). Add the new case immediately after it:

```typescript
    case 'trendingSearch': {
      const { trendingSearch } = await import('./researcher/trendingSearch');
      return trendingSearch(
        env,
        env.PIPELINE_DB,
        normalizeNewsResearchStored(storedConfig.newsResearch),
        storedConfig.spreadsheetId,
        session.userId,
        payload as import('./researcher/types').TrendingSearchRequest,
      );
    }
```

Note: using a dynamic `import()` here avoids a circular dependency risk since `index.ts` is already large. If the codebase uses top-level imports for all other actions, match that pattern instead — add `import { trendingSearch } from './researcher/trendingSearch'` at the top of the file with other researcher imports, and simplify the case to:

```typescript
    case 'trendingSearch': {
      return trendingSearch(
        env,
        env.PIPELINE_DB,
        normalizeNewsResearchStored(storedConfig.newsResearch),
        storedConfig.spreadsheetId,
        session.userId,
        payload as TrendingSearchRequest,
      );
    }
```

If using top-level import, also add these imports at the top of `worker/src/index.ts`:
```typescript
import { trendingSearch } from './researcher/trendingSearch';
import type { TrendingSearchRequest } from './researcher/types';
```

- [ ] **Step 2: Add `trendingSearch` to `frontend/src/services/backendApi.ts`**

Find `searchNewsResearch` method (around line 575). Add the new method right after it:

```typescript
  async trendingSearch(
    idToken: string,
    req: import('../features/trending/types').TrendingSearchRequest,
  ): Promise<import('../features/trending/types').TrendingSearchResult> {
    return this.post<import('../features/trending/types').TrendingSearchResult>(
      'trendingSearch',
      idToken,
      req,
    );
  }
```

Or add named imports at the top of `backendApi.ts` and use them:
```typescript
import type { TrendingSearchRequest, TrendingSearchResult } from '../features/trending/types';
```

Then the method body:
```typescript
  async trendingSearch(idToken: string, req: TrendingSearchRequest): Promise<TrendingSearchResult> {
    return this.post<TrendingSearchResult>('trendingSearch', idToken, req);
  }
```

- [ ] **Step 3: Fix `imageUrl` bug in `frontend/src/features/trending/hooks/useNewsTrending.ts`**

Around line 65, change:
```typescript
imageUrl: undefined,
```
to:
```typescript
imageUrl: a.imageUrl,
```

- [ ] **Step 4: Type-check both projects**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost
cd worker && npx tsc --noEmit 2>&1 | head -20
cd ../frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add worker/src/index.ts frontend/src/services/backendApi.ts frontend/src/features/trending/hooks/useNewsTrending.ts
git commit -m "feat(trending): register trendingSearch action, add backendApi method, fix imageUrl"
```

---

## Task 9: `useTrendingSearch` hook

**Files:**
- Create: `frontend/src/features/trending/hooks/useTrendingSearch.ts`

- [ ] **Step 1: Create `frontend/src/features/trending/hooks/useTrendingSearch.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { BackendApi } from '@/services/backendApi';
import type { TrendingSearchResult } from '../types';

interface UseTrendingSearchResult {
  data: TrendingSearchResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTrendingSearch(
  topic: string,
  region: string,
  genre: string,
  windowDays: number,
  idToken?: string,
  api?: BackendApi,
): UseTrendingSearchResult {
  const [data, setData] = useState<TrendingSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!topic.trim() || !api || !idToken) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function run() {
      try {
        const result = await api!.trendingSearch(idToken!, {
          topic,
          region,
          genre,
          windowDays,
        });
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch trending data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [topic, region, genre, windowDays, tick, api, idToken]);

  return { data, loading, error, refetch };
}
```

- [ ] **Step 2: Type-check frontend**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/trending/hooks/useTrendingSearch.ts
git commit -m "feat(trending): useTrendingSearch hook with region, genre, windowDays"
```

---

## Task 10: `NewsCard` component + update `NewsPanel` + `TrendingSidebar`

**Files:**
- Create: `frontend/src/features/trending/components/NewsCard.tsx`
- Modify: `frontend/src/features/trending/components/NewsPanel.tsx`
- Modify: `frontend/src/features/add-topic/TrendingSidebar.tsx`

- [ ] **Step 1: Create `frontend/src/features/trending/components/NewsCard.tsx`**

```typescript
import { ExternalLink } from 'lucide-react';
import { formatRelativeTime } from '@/lib/relativeTime';

const PROVIDER_LABEL: Record<string, string> = {
  hackernews: 'HN',
  reddit: 'Reddit',
  google_trends: 'Trends',
};

const SOURCE_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-amber-500',
];

function sourceColor(source: string): string {
  let n = 0;
  for (const c of source) n += c.charCodeAt(0);
  return SOURCE_COLORS[n % SOURCE_COLORS.length];
}

interface NewsCardProps {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  provider?: string;
  description?: string;
}

export function NewsCard({ title, source, publishedAt, url, imageUrl, provider, description }: NewsCardProps) {
  const providerLabel = provider ? PROVIDER_LABEL[provider] : undefined;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 rounded-xl border border-white/40 bg-white/30 p-3 no-underline backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-white/50 hover:ring-2 hover:ring-primary/10"
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              (e.currentTarget.parentElement as HTMLElement).classList.add(
                sourceColor(source), 'flex', 'items-center', 'justify-center',
              );
              (e.currentTarget.parentElement as HTMLElement).innerHTML =
                `<span class="text-white text-lg font-bold">${source[0]?.toUpperCase() ?? '?'}</span>`;
            }}
          />
        ) : (
          <div className={`w-full h-full ${sourceColor(source)} flex items-center justify-center`}>
            <span className="text-white text-lg font-bold">{source[0]?.toUpperCase() ?? '?'}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-snug text-ink group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </p>
        {description && (
          <p className="text-[10px] text-muted mt-0.5 line-clamp-1">{description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted">
          <span className="truncate text-primary/80">{source}</span>
          <span>·</span>
          <span className="shrink-0">{formatRelativeTime(publishedAt)}</span>
          {providerLabel && (
            <>
              <span>·</span>
              <span className="shrink-0 rounded bg-secondary px-1 py-px font-medium">{providerLabel}</span>
            </>
          )}
          <ExternalLink className="ml-auto h-2.5 w-2.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
        </div>
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Update `frontend/src/features/trending/components/NewsPanel.tsx`**

Replace the entire file:

```typescript
import { NewsCard } from './NewsCard';
import type { NewsArticle } from '../types';

interface Props {
  articles: NewsArticle[];
}

export function NewsPanel({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <div className="text-center text-muted py-8">
        No news articles found for this topic
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {articles.slice(0, 12).map((article) => (
        <NewsCard
          key={article.id}
          title={article.title}
          source={article.source}
          publishedAt={article.publishedAt}
          url={article.url}
          imageUrl={article.imageUrl}
          description={article.description}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Update `TrendingSidebar.tsx` — replace news card markup with `<NewsCard>`**

In `frontend/src/features/add-topic/TrendingSidebar.tsx`, find the news section (around lines 103–131). Replace the `<li>` block with:

```typescript
{news.slice(0, 8).map((article) => (
  <li key={article.id}>
    <NewsCard
      title={article.title}
      source={article.source}
      publishedAt={article.publishedAt}
      url={article.url}
      imageUrl={article.imageUrl}
    />
  </li>
))}
```

Add import at the top of `TrendingSidebar.tsx`:
```typescript
import { NewsCard } from '../trending/components/NewsCard';
```

Remove the `ExternalLink` import if it's no longer used elsewhere in the file (check first).

- [ ] **Step 4: Type-check**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/trending/components/NewsCard.tsx frontend/src/features/trending/components/NewsPanel.tsx frontend/src/features/add-topic/TrendingSidebar.tsx
git commit -m "feat(trending): NewsCard component with thumbnail, relative time, provider badge"
```

---

## Task 11: `TrendingFilters` component

**Files:**
- Create: `frontend/src/features/trending/components/TrendingFilters.tsx`

- [ ] **Step 1: Create `frontend/src/features/trending/components/TrendingFilters.tsx`**

```typescript
import { Globe, Tag, Clock } from 'lucide-react';

const REGIONS = [
  { code: 'US', label: 'United States' },
  { code: 'IN', label: 'India' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
  { code: 'SG', label: 'Singapore' },
  { code: 'AE', label: 'UAE' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'JP', label: 'Japan' },
  { code: 'BR', label: 'Brazil' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'PK', label: 'Pakistan' },
  { code: 'BD', label: 'Bangladesh' },
];

const GENRES = [
  { value: 'technology', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'science', label: 'Science' },
  { value: 'health', label: 'Health' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'politics', label: 'Politics' },
  { value: 'all', label: 'All Topics' },
];

const WINDOWS = [
  { value: 1, label: '24h' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
];

const REGION_KEY = 'trending_region';
const GENRE_KEY = 'trending_genre';
const WINDOW_KEY = 'trending_window_days';

function readLocal(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function writeLocal(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

interface TrendingFiltersProps {
  region: string;
  genre: string;
  windowDays: number;
  onRegionChange: (region: string) => void;
  onGenreChange: (genre: string) => void;
  onWindowChange: (days: number) => void;
}

export function TrendingFilters({
  region, genre, windowDays,
  onRegionChange, onGenreChange, onWindowChange,
}: TrendingFiltersProps) {
  const selectClass =
    'rounded-lg border border-white/40 bg-white/30 px-2 py-1.5 text-xs font-medium text-ink backdrop-blur-sm transition-colors hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Globe className="h-3 w-3" />
        <select
          className={selectClass}
          value={region}
          onChange={(e) => {
            writeLocal(REGION_KEY, e.target.value);
            onRegionChange(e.target.value);
          }}
        >
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Tag className="h-3 w-3" />
        <select
          className={selectClass}
          value={genre}
          onChange={(e) => {
            writeLocal(GENRE_KEY, e.target.value);
            onGenreChange(e.target.value);
          }}
        >
          {GENRES.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Clock className="h-3 w-3" />
        <select
          className={selectClass}
          value={windowDays}
          onChange={(e) => {
            writeLocal(WINDOW_KEY, e.target.value);
            onWindowChange(Number(e.target.value));
          }}
        >
          {WINDOWS.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Convenience initializer — reads from localStorage for initial state
export function readFilterDefaults(): { region: string; genre: string; windowDays: number } {
  return {
    region: readLocal(REGION_KEY, 'US'),
    genre: readLocal(GENRE_KEY, 'technology'),
    windowDays: Number(readLocal(WINDOW_KEY, '7')),
  };
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/trending/components/TrendingFilters.tsx
git commit -m "feat(trending): TrendingFilters component (region, genre, duration)"
```

---

## Task 12: `TrendingWordsWidget` component

**Files:**
- Create: `frontend/src/features/trending/components/TrendingWordsWidget.tsx`

- [ ] **Step 1: Create `frontend/src/features/trending/components/TrendingWordsWidget.tsx`**

```typescript
import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import type { TrendingWord } from '../types';

interface TrendingWordsWidgetProps {
  words: TrendingWord[];
  onSelectWord: (word: string) => void;
}

export function TrendingWordsWidget({ words, onSelectWord }: TrendingWordsWidgetProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (words.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm p-3">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setCollapsed((c) => !c)}
      >
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted/60">
          Trending Words
        </span>
        {collapsed
          ? <ChevronDown className="h-3.5 w-3.5 text-muted" />
          : <ChevronUp className="h-3.5 w-3.5 text-muted" />
        }
      </button>

      {!collapsed && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {words.map(({ word, tier }) => (
            <button
              key={word}
              type="button"
              onClick={() => onSelectWord(word)}
              className={[
                'rounded-full border border-white/50 bg-white/40 px-2.5 py-1 capitalize backdrop-blur-sm transition-colors hover:bg-primary/10 hover:border-primary/40 hover:text-primary',
                tier === 'high' ? 'text-sm font-semibold text-ink' :
                tier === 'mid'  ? 'text-xs font-medium text-ink/80' :
                                  'text-xs text-muted',
              ].join(' ')}
            >
              {word}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/trending/components/TrendingWordsWidget.tsx
git commit -m "feat(trending): TrendingWordsWidget with collapsible tier-sized word chips"
```

---

## Task 13: Wire `TrendingDashboard`

**Files:**
- Modify: `frontend/src/features/trending/TrendingDashboard.tsx`

- [ ] **Step 1: Add filter state + imports to `TrendingDashboard.tsx`**

At the top of the file, add these imports:

```typescript
import { TrendingFilters, readFilterDefaults } from './components/TrendingFilters';
import { TrendingWordsWidget } from './components/TrendingWordsWidget';
import { useTrendingSearch } from './hooks/useTrendingSearch';
import { NewsCard } from './components/NewsCard';
```

- [ ] **Step 2: Add filter state inside the component**

Inside `TrendingDashboard`, after the existing `useState` calls, add:

```typescript
const filterDefaults = readFilterDefaults();
const [region, setRegion] = useState(filterDefaults.region);
const [genre, setGenre] = useState(filterDefaults.genre);
const [windowDays, setWindowDays] = useState(filterDefaults.windowDays);
```

- [ ] **Step 3: Add `useTrendingSearch` call**

After the existing `useTrending(...)` call, add:

```typescript
const trendingSearch = useTrendingSearch(searchTopic, region, genre, windowDays, idToken, api);
```

- [ ] **Step 4: Replace News panel source + add words widget + filters**

In the JSX, find where `<TrendingSearchBar>` is rendered. Add `<TrendingFilters>` immediately below it:

```tsx
<TrendingFilters
  region={region}
  genre={genre}
  windowDays={windowDays}
  onRegionChange={setRegion}
  onGenreChange={setGenre}
  onWindowChange={setWindowDays}
/>
```

Below the search bar / filters, add the words widget (before the panels):

```tsx
<TrendingWordsWidget
  words={trendingSearch.data?.trendingWords ?? []}
  onSelectWord={(word) => { setTopic(word); setSearchTopic(word); }}
/>
```

Find the `news` panel rendering (where `data.news` is mapped). Replace the data source for news with `trendingSearch.data?.articles ?? []`, so the News panel shows LLM-enhanced results. Example — find the panel where `id === 'news'` is rendered and replace its data prop:

```tsx
{/* was: articles={data.news} */}
<NewsPanel articles={(trendingSearch.data?.articles ?? data?.news ?? []) as NewsArticle[]} />
```

Replace the recommendations source to include LLM-extracted related topics:

```tsx
<RecommendationsPanel
  topics={trendingSearch.data?.relatedTopics ?? data?.recommendedTopics ?? []}
  onSelectTopic={(t) => { setTopic(t); setSearchTopic(t); }}
/>
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors. The `NewsPanel` accepts `NewsArticle[]`; `TrendingSearchResult.articles` is `NewsArticle[]` by the type definition in `types.ts` — no cast needed.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/trending/TrendingDashboard.tsx
git commit -m "feat(trending): wire TrendingDashboard with filters, words widget, useTrendingSearch"
```

---

## Task 14: Clickable related topics in `TrendingSidebar`

**Files:**
- Modify: `frontend/src/features/add-topic/TrendingSidebar.tsx`

- [ ] **Step 1: Add `onTopicClick` prop**

At the top of `TrendingSidebar.tsx`, update the props interface:

```typescript
export function TrendingSidebar({ topic, idToken, onRefresh, api, capabilities, onTopicClick }: {
  topic: string;
  idToken?: string;
  onRefresh?: () => void;
  api?: BackendApi;
  capabilities?: TrendingCapabilities;
  onTopicClick?: (topic: string) => void;
}) {
```

- [ ] **Step 2: Make related topics clickable**

Find the related topics section (around line 230). Replace the `<span>` with a `<button>`:

```tsx
{recommended.slice(0, 10).map((t, i) => (
  <button
    key={i}
    type="button"
    onClick={() => onTopicClick?.(t)}
    className="rounded-full border border-white/50 bg-white/40 px-2.5 py-1 text-xs font-medium text-ink backdrop-blur-sm transition-colors hover:bg-primary/10 hover:border-primary/40 hover:text-primary cursor-pointer disabled:cursor-default"
    disabled={!onTopicClick}
  >
    {t}
  </button>
))}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/add-topic/TrendingSidebar.tsx
git commit -m "feat(trending): make related topics clickable in TrendingSidebar"
```

---

## Task 15: Final compile check + smoke test

- [ ] **Step 1: Full compile check**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost
cd worker && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit
```

Expected: zero errors in both. Fix any that appear.

- [ ] **Step 2: Start dev server and open the Trending page**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npm run dev
```

Open the app → navigate to the Trending page. Verify:
- Region / Genre / Duration dropdowns render with no errors
- Trending Words widget area renders (empty until search fires)
- News panel shows cards with thumbnails (or colored fallback)
- Timestamps show as relative ("Xh ago" etc.)

- [ ] **Step 3: Test a search**

Type a topic (e.g. "artificial intelligence") → click Search. Verify:
- Related topics appear as clickable buttons (not inert spans)
- News cards show thumbnail-left layout
- Trending words widget shows word chips
- Clicking a trending word triggers a new search

- [ ] **Step 4: Test filter changes**

Change region to "IN" (India) → search again. Verify Google Trends data changes.  
Change duration to "30 days" → search again. Verify results expand.

- [ ] **Step 5: Test sidebar**

Navigate to Add Topic page → type a topic → open sidebar. Verify:
- News cards use new layout
- Related topics are buttons (click one — it should call `onTopicClick` if wired)

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -p   # stage only changed files
git commit -m "fix(trending): post-integration type and runtime fixes"
```
