# Trending Intelligence v2 — Design Spec

**Date:** 2026-04-24  
**Status:** Approved for implementation

---

## Overview

Upgrade the trending topics system into a niche SEO intelligence tool. Users pick a region, genre, and time window, type a topic sentence, and get a rich multi-source trending feed with images, LLM-extracted keywords, related topics, and a trending words widget.

---

## What Already Exists (DRY audit)

| Existing piece | Reuse plan |
|---|---|
| `searchNewsResearch` worker action | Keep untouched — pipeline use case |
| `useNewsTrending` calls `searchNewsResearch` with `topicId:'trending'` | Replace with call to new `trendingSearch` action |
| `windowStart`/`windowEnd` in search payload | Expose in UI as duration filter (was hardcoded 7 days) |
| `enrichment_trending` LLM setting key in `d1Settings.ts` | Use as-is for keyword extraction |
| `generateForRef` LLM gateway | Call directly in new orchestrator |
| `fetchRssFeed()` + `parseRss2Items()` in `rss.ts` | Reuse for Google Trends RSS (same format) |
| `dedupeArticles()` in `dedupe.ts` | Reuse in new orchestrator |
| `trimArticleSnippet()` in `trim.ts` | Reuse in new orchestrator |
| `mapLimit()` in `search.ts` | Extract to `worker/src/researcher/utils.ts` (shared) |
| `ResearchArticle` type | Add `imageUrl?: string` field — currently missing |

---

## Goals

1. **LLM keyword extraction** — one call via `enrichment_trending` returns `keywords[]` + `relatedTopics[]`
2. **Fan-out using keywords** — search all sources with extracted terms, not raw topic sentence
3. **New free sources** — Google Trends RSS, Hacker News Algolia, Reddit JSON (zero API keys)
4. **Time filter** — duration picker (1d / 7d / 14d / 30d) exposed in UI; maps to `windowStart`/`windowEnd`
5. **Region + Genre** — passed to Google Trends RSS (`geo=IN&cat=5`); stored in localStorage
6. **News card redesign** — thumbnail-left layout; fix `imageUrl` propagation
7. **Trending words widget** — top 10 terms across all returned titles, clickable
8. **Related topics clickable** — currently inert pills; make them trigger new search

---

## Architecture

```
User: topic + region + genre + duration
        │
        ▼
Worker action: trendingSearch  (NEW, in index.ts dispatch)
        │
        ├─ Step 1: LLM call (enrichment_trending model via generateForRef)
        │          Returns: { keywords[], relatedTopics[], searchIntent }
        │          Fallback: split topic into words if LLM unavailable
        │
        ├─ Step 2: Parallel fan-out using keywords[]
        │   ├── Google Trends RSS     (free, region+genre-aware, no key)
        │   ├── Hacker News Algolia   (free, no key)
        │   ├── Reddit JSON API       (free, no key)
        │   ├── NewsAPI               (if NEWSAPI_KEY set)
        │   ├── GNews                 (if GNEWS_API_KEY set)
        │   ├── NewsData.io           (if NEWSDATA_API_KEY set)
        │   ├── SerpApi Google News   (if SERPAPI_API_KEY set)
        │   └── User RSS feeds        (from stored settings)
        │
        └─ Step 3: dedupeArticles → sort by date → extract trendingWords
                   Return: { articles[], relatedTopics[], trendingWords[], keywords[], searchIntent }
```

---

## Part 1: Worker — new `trendingSearch` action

**File:** `worker/src/researcher/trendingSearch.ts` (new)  
**Registered:** `case 'trendingSearch':` in `worker/src/index.ts`

### Request type (added to `worker/src/researcher/types.ts`)

```typescript
interface TrendingSearchRequest {
  topic: string;
  region: string;          // ISO 3166-1 alpha-2, e.g. "IN"
  genre: string;           // "technology" | "business" | "science" | "health" | "entertainment" | "politics" | "all"
  windowDays: number;      // 1 | 7 | 14 | 30
}
```

### Response type (added to `worker/src/researcher/types.ts`)

```typescript
interface TrendingSearchResponse {
  articles: TrendingArticle[];    // up to 40, sorted newest-first
  relatedTopics: string[];        // from LLM (or [] on fallback)
  trendingWords: TrendingWord[];  // top 10 words across all titles
  keywords: string[];             // extracted search terms (shown in UI)
  searchIntent: string;           // from LLM one-liner
  sources: string[];              // which providers returned data
}

interface TrendingArticle {
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

interface TrendingWord {
  word: string;
  count: number;
  tier: 'high' | 'mid' | 'low';  // high≥5, mid≥2, low≥1
}
```

### `imageUrl` fix

Add `imageUrl?: string` to `ResearchArticle` in `worker/src/researcher/types.ts`.  
Ensure `fetchRssFeed` and news API parsers populate it where available.  
In `useNewsTrending.ts` line 65 — change `imageUrl: undefined` → `imageUrl: a.imageUrl`.

### New provider IDs (extend `NewsApiProviderId` union)

```typescript
export type NewsApiProviderId =
  | 'rss' | 'newsapi' | 'gnews' | 'newsdata' | 'serpapi_news'
  | 'google_trends' | 'hackernews' | 'reddit';
```

### `mapLimit` extraction

Move `mapLimit()` from `search.ts` into new `worker/src/researcher/utils.ts`. Import it in both `search.ts` and `trendingSearch.ts`.

---

## Part 2: LLM Keyword Extraction

**File:** `worker/src/researcher/keywords.ts` (new)

Uses `enrichment_trending` setting key (already in `d1Settings.ts`). Single JSON-mode call via `generateForRef`.

**Prompt:**
```
Extract search keywords for trending news research.
Topic: "<user input>"
Region: "<country name>"
Genre: "<genre>"

Return JSON only:
{
  "keywords": ["4-6 search terms optimised for news APIs"],
  "relatedTopics": ["8-10 related topics the user might explore next"],
  "searchIntent": "one sentence describing what the user is looking for"
}
```

**Fallback:** If LLM unavailable or parse fails — `keywords = topic.split(' ').slice(0, 5)`, `relatedTopics = []`, `searchIntent = ''`.

**Usage tracking:** `logLlmUsage` with `settingKey: 'enrichment_trending'`.

---

## Part 3: New Free Sources

### 3a. Google Trends RSS

**File:** `worker/src/researcher/providers/googleTrends.ts`

Endpoint: `https://trends.google.com/trends/trendingsearches/daily/rss?geo={GEO}&cat={CAT_ID}`

Returns daily trending searches in the region (not keyword-specific). Parse with existing `parseRss2Items()` — same RSS 2.0 format.

Genre → category ID mapping:
| Genre | Cat ID |
|-------|--------|
| all | 0 |
| technology | 5 |
| business | 12 |
| science | 8 |
| health | 14 |
| entertainment | 3 |
| politics | 396 |

Fetched once per `trendingSearch` call (not per keyword). Provider ID: `'google_trends'`.

### 3b. Hacker News

**File:** `worker/src/researcher/providers/hackerNews.ts`

Endpoint: `https://hn.algolia.com/api/v1/search?query={keyword}&tags=story&hitsPerPage=10`

Run for up to 3 keywords (to avoid over-fetching). Map `hits[].{ title, url, points, created_at }` → `ResearchArticle`. Provider ID: `'hackernews'`, source: `'Hacker News'`.

### 3c. Reddit

**File:** `worker/src/researcher/providers/reddit.ts`

Endpoint: `https://www.reddit.com/search.json?q={keyword}&sort=hot&limit=10&t=week`

Also query genre subreddit: `https://www.reddit.com/r/{subreddit}/hot.json?limit=5`

Genre → subreddit: `technology→r/technology`, `business→r/business`, `science→r/science`, `health→r/health`, `entertainment→r/entertainment`, `politics→r/worldnews`, `all→r/news`.

Requires `User-Agent: 'TrendingResearch/1.0'` header. Provider ID: `'reddit'`.

---

## Part 4: Time Filter (Duration)

The existing `windowStart`/`windowEnd` in `searchNewsResearch` already handles time ranges — it's hardcoded to 7 days in `useNewsTrending`. Expose as a UI picker.

**Options:** `1d` / `7d` (default) / `14d` / `30d`

Stored in `localStorage` key `trending_window_days`. The `TrendingFilters` component reads/writes it. Passed as `windowDays` in `TrendingSearchRequest`.

---

## Part 5: Region + Genre Settings

Stored in `localStorage`:
- `trending_region` — ISO country code (default: `US`)
- `trending_genre` — genre string (default: `technology`)

**Regions available in UI:** US, IN, GB, AU, CA, SG, AE, DE, FR, JP, BR, NG, ZA, PK, BD (15 options covering major markets).

---

## Part 6: Frontend

### New component: `TrendingFilters.tsx`

Compact filter bar (one row) with three dropdowns: Region | Genre | Duration.  
Reads/writes the three localStorage keys above.  
Placed above the search bar in `TrendingDashboard` and `TrendingSidebar`.

### New component: `NewsCard.tsx`

Replaces the inline `<a>` card pattern used in both `NewsPanel.tsx` and `TrendingSidebar.tsx`.

**Layout:**
```
┌────────────────────────────────────────────────────┐
│  [56×56 img]  Title of article (2 lines max)       │
│               ● SourceName  ·  2h ago  [HN]   ↗  │
└────────────────────────────────────────────────────┘
```

- Image: 56×56 `rounded-lg object-cover`. Fallback: colored square with source initial.
- Provider badge: tiny pill (`HN`, `Reddit`, `Trends`, or omit for standard news)
- Timestamp: relative via `formatRelativeTime()`

### New utility: `frontend/src/lib/relativeTime.ts`

`formatRelativeTime(dateStr: string): string`  
<60s → "just now" | <60m → "Xm ago" | <24h → "Xh ago" | <7d → "Xd ago" | else → locale date string. No external dependency.

### New component: `TrendingWordsWidget.tsx`

Top 10 words from article titles, computed client-side after results arrive. Each is a clickable chip that triggers a new search. Font size by tier: `high=text-sm font-semibold`, `mid=text-xs font-medium`, `low=text-xs text-muted`. Collapsible via chevron toggle.

**Stopwords to strip:** the, a, an, is, in, of, and, to, for, on, at, by, from, with, are, has, have, its, was, this, that, but, or, as, it, be, been, will, how, what, who, when, why, more, also, after, new, says.

**Placement:** Between search bar and news list in `TrendingDashboard`.

### New hook: `useTrendingSearch.ts`

Replaces the `useNewsTrending` call for the interactive trending use case. Reads `region`/`genre`/`windowDays` from localStorage. Calls `api.trendingSearch()`. Returns `{ articles, relatedTopics, trendingWords, keywords, searchIntent, loading, error, refetch }`.

### Related topics: make clickable

`TrendingSidebar.tsx` line ~230: change `<span>` → `<button onClick={() => props.onTopicClick?.(t)}>`.  
Add optional prop `onTopicClick?: (topic: string) => void` to `TrendingSidebar`.

---

## File Summary

**New files:**
- `worker/src/researcher/utils.ts` — `mapLimit` (extracted from `search.ts`)
- `worker/src/researcher/keywords.ts` — LLM keyword extraction
- `worker/src/researcher/providers/googleTrends.ts` — Google Trends RSS
- `worker/src/researcher/providers/hackerNews.ts` — HN Algolia
- `worker/src/researcher/providers/reddit.ts` — Reddit JSON
- `worker/src/researcher/trendingSearch.ts` — orchestrator for `trendingSearch` action
- `frontend/src/lib/relativeTime.ts` — relative timestamp utility
- `frontend/src/features/trending/components/NewsCard.tsx` — redesigned news card
- `frontend/src/features/trending/components/TrendingWordsWidget.tsx` — trending words
- `frontend/src/features/trending/components/TrendingFilters.tsx` — region/genre/duration bar
- `frontend/src/features/trending/hooks/useTrendingSearch.ts` — new interactive search hook

**Modified files:**
- `worker/src/researcher/types.ts` — add `imageUrl` to `ResearchArticle`; add `TrendingSearchRequest`, `TrendingSearchResponse`, `TrendingArticle`, `TrendingWord`; extend `NewsApiProviderId`
- `worker/src/researcher/search.ts` — import `mapLimit` from `utils.ts` (remove inline)
- `worker/src/index.ts` — add `case 'trendingSearch':` dispatch
- `frontend/src/services/backendApi.ts` — add `trendingSearch(req): Promise<TrendingSearchResponse>`
- `frontend/src/features/trending/hooks/useNewsTrending.ts` — fix `imageUrl: undefined` → `a.imageUrl`; keep for pipeline/sidebar use
- `frontend/src/features/trending/components/NewsPanel.tsx` — use `<NewsCard>`
- `frontend/src/features/add-topic/TrendingSidebar.tsx` — use `<NewsCard>`; add `onTopicClick` prop; make related topics clickable
- `frontend/src/features/trending/TrendingDashboard.tsx` — add `<TrendingFilters>` + `<TrendingWordsWidget>`; switch to `useTrendingSearch`

**Untouched:**
- `worker/src/researcher/search.ts` logic (only `mapLimit` moves out)
- `worker/src/researcher/providers/rss.ts` — reused as-is
- `worker/src/researcher/dedupe.ts`, `trim.ts` — reused as-is
- `useTrending.ts` — untouched (YouTube/Instagram/LinkedIn coordination)
- `TrendingGraph.tsx`, `PanelToggle.tsx` — untouched

---

## Out of Scope

- Product Hunt API (OAuth required)
- Twitter/X trending (paid API)
- Caching trending results (add later)
- Saving trending search history
