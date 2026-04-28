<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/features/trending

## Purpose
Trending topic discovery and multi-platform content aggregation. Provides search, platform-specific panels (YouTube, Instagram, LinkedIn, News), a knowledge graph visualization, and recommendation widgets. Used primarily as a library of components and hooks by the `feed` feature.

## Key Files

| File | Description |
|------|-------------|
| `TrendingDashboard.tsx` | Standalone trending dashboard page |
| `index.ts` | Barrel export |
| `types.ts` | Trending-specific types: `GraphNode`, `NewsArticle`, `YouTubeVideo`, `InstagramPost`, `LinkedInPost`, `TrendingWord` |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `components/` | All trending UI panels and widgets |
| `hooks/` | Data fetching hooks for each platform |
| `api/` | API call helpers for trending endpoints |

## components/

| File | Description |
|------|-------------|
| `YouTubePanel.tsx` | YouTube video results panel |
| `InstagramPanel.tsx` | Instagram post results panel |
| `LinkedInPanel.tsx` | LinkedIn post results panel |
| `NewsPanel.tsx` / `NewsCard.tsx` | News article results panel and card |
| `TrendingGraph.tsx` | D3/force-graph knowledge graph visualization |
| `TrendingSearchBar.tsx` | Topic search input |
| `TrendingFilters.tsx` | Region, genre, and time window filter controls |
| `TrendingWordsWidget.tsx` | Trending keyword chips |
| `RecommendationsPanel.tsx` | Recommended topic chips |
| `FeedSection.tsx` | Collapsible platform section wrapper with count badge |
| `TrendingSidebar.tsx` | Sidebar layout for trending content |
| `PlatformPanel.tsx` | Generic platform panel wrapper |
| `PanelToggle.tsx` | Toggle button for panel visibility |

## hooks/

| File | Description |
|------|-------------|
| `useTrending.ts` | Master hook — fetches all platform data for a topic |
| `useTrendingSearch.ts` | Search-specific hook with region/genre/window filters |
| `useYouTubeTrending.ts` | YouTube-specific data fetching |
| `useInstagramTrending.ts` | Instagram-specific data fetching |
| `useLinkedInTrending.ts` | LinkedIn-specific data fetching |
| `useNewsTrending.ts` | News-specific data fetching |

## For AI Agents

### Working In This Directory
- `NewsArticle`, `YouTubeVideo`, `InstagramPost`, `LinkedInPost` from `types.ts` are the canonical data types — import from here, not redefined locally
- `useTrending` is the primary hook; `useTrendingSearch` adds filter parameters
- Platform panels are pure display components — they receive data as props and emit nothing

<!-- MANUAL: -->
