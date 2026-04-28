# Trending + Enrichment UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely redesign the Trending page (Feed + Right Sidebar layout) and the Enrichment page (Vercel-style execution trace as default view), replacing the current flat, widget-stacked UX with a modern, information-dense layout.

**Architecture:**
- Trending: split into a scrollable 65% left feed (platform sections with compact cards) and a sticky 35% right sidebar (trending words, recommendations, platform toggles). All existing hooks/data stay unchanged.
- Enrichment: sidebar run panel collapses into a compact header dropdown; the main area becomes a Vercel-deploy-style execution trace (nodes as rows with inline expand). DAG view remains accessible via a toggle button.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (custom tokens: `glass-panel`, `glass-panel-strong`, `text-ink`, `text-muted`, `border-border`, `primary`), Framer Motion v12, Lucide React.

---

## File Map

### Trending

| File | Action | Responsibility |
|---|---|---|
| `src/features/trending/TrendingDashboard.tsx` | **Rewrite** | 2-col layout shell: sticky header, feed column, sidebar column |
| `src/features/trending/components/TrendingFilters.tsx` | **Modify** | Inline compact row (no wrapper div needed from parent) |
| `src/features/trending/components/TrendingSidebar.tsx` | **Create** | Right sticky sidebar: trending words + recommendations + platform toggles + API status |
| `src/features/trending/components/FeedSection.tsx` | **Create** | Reusable platform section wrapper: colored header badge + children |
| `src/features/trending/components/YouTubePanel.tsx` | **Rewrite** | Compact list (thumbnail-left card, not 2-col grid) |
| `src/features/trending/components/InstagramPanel.tsx` | **Rewrite** | Compact list (thumb-left card) |
| `src/features/trending/components/NewsPanel.tsx` | **Rewrite** | Compact list with image-left NewsCard |
| `src/features/trending/components/LinkedInPanel.tsx` | **Keep / minor** | Already list-like — apply FeedSection wrapper only |
| `src/features/trending/components/TrendingWordsWidget.tsx` | **Keep** | Used inside TrendingSidebar |
| `src/features/trending/components/RecommendationsPanel.tsx` | **Keep** | Used inside TrendingSidebar |
| `src/features/trending/components/PanelToggle.tsx` | **Keep** | Used inside TrendingSidebar |

### Enrichment

| File | Action | Responsibility |
|---|---|---|
| `src/pages/EnrichmentFlowPage.tsx` | **Major rewrite** | New layout: compact header with dropdowns, ExecutionTrace as default, DAG toggle |

All hooks, data types, and API calls are preserved exactly — only the rendering layer changes.

---

## Task 1: `FeedSection` — Platform section wrapper

**Files:**
- Create: `frontend/src/features/trending/components/FeedSection.tsx`

- [ ] **Create the file:**

```tsx
import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cardItemVariants } from '@/lib/motion';

interface FeedSectionProps {
  title: string;
  count: number;
  color: string;        // hex e.g. '#FF0000'
  icon: ReactNode;
  children: ReactNode;
}

export function FeedSection({ title, count, color, icon, children }: FeedSectionProps) {
  return (
    <motion.section
      variants={cardItemVariants}
      className="glass-panel rounded-2xl overflow-hidden"
    >
      {/* Colored top accent */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}60)` }} />
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}18` }}>
          <div style={{ color }}>{icon}</div>
        </div>
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="ml-auto text-xs font-medium text-muted bg-border/40 rounded-full px-2 py-0.5">
          {count}
        </span>
      </div>
      {/* Content */}
      <div className="p-3">{children}</div>
    </motion.section>
  );
}
```

- [ ] **TypeScript check:**
```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: no errors.

---

## Task 2: Rewrite `YouTubePanel` — compact list cards

**Files:**
- Modify: `frontend/src/features/trending/components/YouTubePanel.tsx`

- [ ] **Replace entire file content:**

```tsx
import { Play, Eye, Clock } from 'lucide-react';
import type { YouTubeVideo } from '../types';

interface Props { videos: YouTubeVideo[]; }

export function YouTubePanel({ videos }: Props) {
  if (videos.length === 0) {
    return <p className="py-4 text-center text-xs text-muted">No videos found</p>;
  }

  return (
    <div className="space-y-1.5">
      {videos.slice(0, 8).map((video) => (
        <a
          key={video.id}
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-red-50/60 hover:border-red-100 border border-transparent transition-all cursor-pointer"
        >
          {/* Thumbnail */}
          <div className="relative shrink-0 w-20 h-12 rounded-lg overflow-hidden bg-red-50">
            {video.thumbnailUrl ? (
              <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Play className="text-red-400" size={18} />
              </div>
            )}
          </div>
          {/* Meta */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink line-clamp-2 group-hover:text-red-700 leading-snug">
              {video.title}
            </p>
            <p className="mt-1 text-[11px] text-muted truncate">{video.channelTitle}</p>
            <div className="mt-1 flex items-center gap-2.5 text-[11px] text-muted">
              {video.viewCount && (
                <span className="flex items-center gap-1">
                  <Eye size={10} />
                  {video.viewCount}
                </span>
              )}
              {video.publishedAt && (
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {video.publishedAt}
                </span>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
```

- [ ] **TypeScript check** (same command as Task 1).

---

## Task 3: Rewrite `InstagramPanel` — compact list cards

**Files:**
- Modify: `frontend/src/features/trending/components/InstagramPanel.tsx`

- [ ] **Replace entire file content:**

```tsx
import { Image, Heart, MessageCircle } from 'lucide-react';
import type { InstagramPost } from '../types';

interface Props { posts: InstagramPost[]; }

export function InstagramPanel({ posts }: Props) {
  if (posts.length === 0) {
    return <p className="py-4 text-center text-xs text-muted">No posts found</p>;
  }

  return (
    <div className="space-y-1.5">
      {posts.slice(0, 8).map((post) => (
        <a
          key={post.id}
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-pink-50/60 border border-transparent hover:border-pink-100 transition-all cursor-pointer"
        >
          {/* Thumbnail */}
          <div className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-pink-50">
            {post.mediaUrl ? (
              <img src={post.mediaUrl} alt={post.caption.slice(0, 30)} className="w-full h-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Image className="text-pink-400" size={16} />
              </div>
            )}
          </div>
          {/* Meta */}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink line-clamp-2 leading-snug">{post.caption.slice(0, 100)}</p>
            {post.hashtags.length > 0 && (
              <p className="mt-1 text-[11px] text-pink-600 truncate">
                {post.hashtags.slice(0, 4).join(' ')}
              </p>
            )}
            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1"><Heart size={10} /> {post.likeCount ?? 0}</span>
              {post.commentsCount && (
                <span className="flex items-center gap-1"><MessageCircle size={10} /> {post.commentsCount}</span>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
```

- [ ] **TypeScript check.**

---

## Task 4: Rewrite `NewsPanel` — compact list

**Files:**
- Modify: `frontend/src/features/trending/components/NewsPanel.tsx`

- [ ] **Replace entire file content:**

```tsx
import { Newspaper, ExternalLink } from 'lucide-react';
import type { NewsArticle } from '../types';

interface Props { articles: NewsArticle[]; }

export function NewsPanel({ articles }: Props) {
  if (articles.length === 0) {
    return <p className="py-4 text-center text-xs text-muted">No articles found</p>;
  }

  return (
    <div className="space-y-1.5">
      {articles.slice(0, 10).map((article) => (
        <a
          key={article.id}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-blue-50/40 border border-transparent hover:border-blue-100 transition-all cursor-pointer"
        >
          {/* Image or icon */}
          <div className="shrink-0 w-14 h-10 rounded-lg overflow-hidden bg-blue-50 flex items-center justify-center">
            {article.imageUrl ? (
              <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
            ) : (
              <Newspaper size={14} className="text-blue-300" />
            )}
          </div>
          {/* Meta */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-ink line-clamp-2 leading-snug group-hover:text-blue-800">
              {article.title}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
              <span className="font-medium">{article.source}</span>
              {article.publishedAt && <><span>·</span><span>{article.publishedAt}</span></>}
              <ExternalLink size={9} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
```

- [ ] **TypeScript check.**

---

## Task 5: Create `TrendingSidebar` — right sticky sidebar

**Files:**
- Create: `frontend/src/features/trending/components/TrendingSidebar.tsx`

- [ ] **Create the file:**

```tsx
import { motion } from 'framer-motion';
import { containerVariants } from '@/lib/motion';
import { TrendingWordsWidget } from './TrendingWordsWidget';
import { RecommendationsPanel } from './RecommendationsPanel';
import { PanelToggle, type PanelConfig } from './PanelToggle';
import type { TrendingCapabilities } from '../hooks/useTrending';

interface TrendingSidebarProps {
  trendingWords: Array<{ word: string; tier: 'high' | 'mid' | 'low' }>;
  recommendedTopics: string[];
  panels: PanelConfig[];
  enabledPanels: string[];
  enabledPlatforms: TrendingCapabilities extends undefined ? never : Record<string, boolean>;
  onSelectWord: (word: string) => void;
  onSelectTopic: (topic: string) => void;
  onTogglePanel: (id: string, enabled: boolean) => void;
}

export function TrendingSidebar({
  trendingWords,
  recommendedTopics,
  panels,
  enabledPanels,
  onSelectWord,
  onSelectTopic,
  onTogglePanel,
}: TrendingSidebarProps) {
  return (
    <motion.aside
      className="flex flex-col gap-4 w-72 xl:w-80 shrink-0"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Trending Words */}
      {trendingWords.length > 0 && (
        <TrendingWordsWidget words={trendingWords} onSelectWord={onSelectWord} />
      )}

      {/* Recommended Topics */}
      {recommendedTopics.length > 0 && (
        <RecommendationsPanel topics={recommendedTopics} onSelectTopic={onSelectTopic} />
      )}

      {/* Platform Toggles */}
      <div className="glass-panel rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Platforms</p>
        <PanelToggle panels={panels} enabled={enabledPanels} onToggle={onTogglePanel} />
      </div>
    </motion.aside>
  );
}
```

- [ ] **TypeScript check.**

---

## Task 6: Rewrite `TrendingDashboard` — 2-column layout

**Files:**
- Modify: `frontend/src/features/trending/TrendingDashboard.tsx`

This is the main layout change. Replace the vertical stack with a two-column layout.

- [ ] **Rewrite the file completely:**

```tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { containerVariants, cardItemVariants, fadeUpVariants, skeletonPulseVariants, spring } from '@/lib/motion';
import { TrendingSearchBar } from './components/TrendingSearchBar';
import { TrendingFilters } from './components/TrendingFilters';
import { TrendingSidebar } from './components/TrendingSidebar';
import { FeedSection } from './components/FeedSection';
import { YouTubePanel } from './components/YouTubePanel';
import { InstagramPanel } from './components/InstagramPanel';
import { NewsPanel } from './components/NewsPanel';
import { LinkedInPanel } from './components/LinkedInPanel';
import { TrendingGraph } from './components/TrendingGraph';
import { type PanelConfig } from './components/PanelToggle';
import { useTrending, type TrendingCapabilities } from './hooks/useTrending';
import { useTrendingSearch } from './hooks/useTrendingSearch';
import { readFilterDefaults } from './components/TrendingFilters';
import { Youtube, Instagram, Linkedin, Newspaper, Sparkles, PlugZap } from 'lucide-react';
import type { GraphNode } from './types';
import type { BackendApi } from '@/services/backendApi';
import type { NewsProviderKeys } from '@/services/configService';

const ALL_PANELS: PanelConfig[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'news', label: 'News' },
];

const DEFAULT_ENABLED = ['youtube', 'instagram', 'news'];

const PLATFORM_META = {
  youtube:   { color: '#FF0000', icon: <Youtube size={16} /> },
  instagram: { color: '#E1306C', icon: <Instagram size={16} /> },
  linkedin:  { color: '#0A66C2', icon: <Linkedin size={16} /> },
  news:      { color: '#3B82F6', icon: <Newspaper size={16} /> },
};

export function TrendingDashboard({
  idToken,
  api,
  newsProviderKeys,
  capabilities,
}: {
  idToken?: string;
  api?: BackendApi;
  newsProviderKeys?: NewsProviderKeys | null;
  capabilities?: TrendingCapabilities;
} = {}) {
  const [topic, setTopic] = useState('');
  const [searchTopic, setSearchTopic] = useState('');
  const [enabledPanels, setEnabledPanels] = useState<string[]>(DEFAULT_ENABLED);

  const [region, setRegion] = useState(() => readFilterDefaults().region);
  const [genre, setGenre] = useState(() => readFilterDefaults().genre);
  const [windowDays, setWindowDays] = useState(() => readFilterDefaults().windowDays);

  const { data, loading, error, enabledPlatforms } = useTrending(searchTopic, idToken, api, capabilities);
  const trendingSearch = useTrendingSearch(searchTopic, region, genre, windowDays, idToken, api);

  const hasNewsApis = Boolean(
    newsProviderKeys?.newsapi || newsProviderKeys?.gnews ||
    newsProviderKeys?.newsdata || newsProviderKeys?.serpapi
  );

  const handleSearch = () => setSearchTopic(topic);

  const handleNodeClick = (node: GraphNode) => {
    let newTopic = '';
    if (node.type === 'youtube') {
      newTopic = (node.data as { title: string }).title.split(' ').slice(0, 3).join(' ');
    } else if (node.type === 'news') {
      newTopic = (node.data as { title: string }).title.split(' ').slice(0, 3).join(' ');
    } else if (node.type === 'instagram') {
      const m = (node.data as { caption: string }).caption.match(/#[a-zA-Z]+/);
      if (m) newTopic = m[0].slice(1);
    }
    if (newTopic) { setTopic(newTopic); setSearchTopic(newTopic); }
  };

  const handleTogglePanel = (id: string, enabled: boolean) =>
    setEnabledPanels(prev => enabled ? [...prev, id] : prev.filter(p => p !== id));

  const visiblePanels = useMemo(() => {
    if (!data) return [];
    return enabledPanels.filter(id => {
      if (id === 'youtube') return data.youtube.length > 0;
      if (id === 'instagram') return data.instagram.length > 0;
      if (id === 'linkedin') return data.linkedin && data.linkedin.length > 0;
      if (id === 'news') {
        const articles = trendingSearch.data?.articles?.length ? trendingSearch.data.articles : data.news;
        return articles.length > 0;
      }
      return false;
    });
  }, [data, enabledPanels, trendingSearch.data]);

  const recommendedTopics = useMemo(() => {
    if (!data) return [];
    return [...new Set([
      ...(trendingSearch.data?.relatedTopics ?? []),
      ...data.recommendedTopics,
      ...data.relatedNewsTopics,
    ])].slice(0, 10);
  }, [data, trendingSearch.data]);

  const trendingWords = trendingSearch.data?.trendingWords ?? [];
  const isLoading = loading || trendingSearch.loading;
  const hasError = error || trendingSearch.error;

  return (
    <MotionConfig transition={spring.smooth}>
      <div className="h-full overflow-auto">
        {/* ── Sticky header ────────────────────────────────────── */}
        <div className="sticky top-0 z-10 glass-header border-b border-border/50 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <TrendingSearchBar value={topic} onChange={setTopic} onSearch={handleSearch} />
            </div>
            <TrendingFilters
              region={region} genre={genre} windowDays={windowDays}
              onRegionChange={setRegion} onGenreChange={setGenre} onWindowChange={setWindowDays}
            />
          </div>
        </div>

        {/* ── No news APIs banner ───────────────────────────────── */}
        {!hasNewsApis && (
          <div className="mx-6 mt-4 rounded-xl border border-amber-200/60 bg-amber-50/60 p-3 flex items-center gap-2.5">
            <PlugZap className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>No news APIs connected.</strong>{' '}
              Go to <strong>Settings → News</strong> to add NewsAPI, GNews, or others.
            </p>
          </div>
        )}

        {/* ── Main 2-col layout ─────────────────────────────────── */}
        <div className="flex gap-6 p-6 items-start">

          {/* Left: platform feed */}
          <div className="flex-1 min-w-0">

            {/* Empty state */}
            {!data && !isLoading && !hasError && !searchTopic && (
              <motion.div
                className="flex flex-col items-center justify-center py-24 text-center"
                variants={containerVariants} initial="hidden" animate="show"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200/60 shadow-glass"
                >
                  <Sparkles className="text-primary" size={36} />
                </motion.div>
                <motion.h3 variants={fadeUpVariants} className="text-xl font-semibold text-ink mb-2">
                  Explore Trending Content
                </motion.h3>
                <motion.p variants={fadeUpVariants} className="text-sm text-muted max-w-xs leading-relaxed">
                  Enter a topic above to discover viral videos, posts, and news across multiple platforms.
                </motion.p>
              </motion.div>
            )}

            {/* No results state */}
            {!data && !isLoading && !hasError && searchTopic && (
              <p className="py-16 text-center text-sm text-muted">
                No trending data found for "<strong>{searchTopic}</strong>". Try a different topic.
              </p>
            )}

            {/* Error state */}
            {hasError && (
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-700">
                {error || trendingSearch.error}
              </div>
            )}

            {/* Loading: skeleton feed */}
            {isLoading && (
              <motion.div
                className="space-y-4"
                variants={containerVariants} initial="hidden" animate="show"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} variants={cardItemVariants} className="glass-panel rounded-2xl overflow-hidden">
                    <div className="h-0.5 w-full bg-violet-100" />
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                      <motion.div
                        className="w-7 h-7 rounded-lg bg-violet-100"
                        variants={skeletonPulseVariants} animate="animate"
                      />
                      <motion.div
                        className="h-3 w-24 rounded bg-violet-100"
                        variants={skeletonPulseVariants} animate="animate"
                      />
                      <motion.div
                        className="ml-auto h-3 w-8 rounded-full bg-violet-50"
                        variants={skeletonPulseVariants} animate="animate"
                      />
                    </div>
                    <div className="p-3 space-y-2">
                      {[0, 1, 2, 3].map((j) => (
                        <motion.div
                          key={j}
                          className="flex gap-3"
                          variants={skeletonPulseVariants} animate="animate"
                        >
                          <div className="shrink-0 w-16 h-10 rounded-lg bg-violet-50" />
                          <div className="flex-1 space-y-1.5 pt-0.5">
                            <div className="h-2.5 rounded bg-violet-50 w-full" />
                            <div className="h-2 rounded bg-violet-50/60 w-3/4" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Platform feed */}
            {data && !isLoading && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={visiblePanels.join('-')}
                  className="space-y-4"
                  variants={containerVariants} initial="hidden" animate="show"
                >
                  {visiblePanels.includes('youtube') && data.youtube.length > 0 && (
                    <FeedSection
                      title="YouTube" count={data.youtube.length}
                      color={PLATFORM_META.youtube.color} icon={PLATFORM_META.youtube.icon}
                    >
                      <YouTubePanel videos={data.youtube} />
                    </FeedSection>
                  )}
                  {visiblePanels.includes('instagram') && data.instagram.length > 0 && (
                    <FeedSection
                      title="Instagram" count={data.instagram.length}
                      color={PLATFORM_META.instagram.color} icon={PLATFORM_META.instagram.icon}
                    >
                      <InstagramPanel posts={data.instagram} />
                    </FeedSection>
                  )}
                  {visiblePanels.includes('linkedin') && data.linkedin && data.linkedin.length > 0 && (
                    <FeedSection
                      title="LinkedIn" count={data.linkedin.length}
                      color={PLATFORM_META.linkedin.color} icon={PLATFORM_META.linkedin.icon}
                    >
                      <LinkedInPanel posts={data.linkedin} />
                    </FeedSection>
                  )}
                  {(() => {
                    const articles = trendingSearch.data?.articles?.length
                      ? trendingSearch.data.articles : data.news;
                    return visiblePanels.includes('news') && articles.length > 0 ? (
                      <FeedSection
                        title="News" count={articles.length}
                        color={PLATFORM_META.news.color} icon={PLATFORM_META.news.icon}
                      >
                        <NewsPanel articles={articles} />
                      </FeedSection>
                    ) : null;
                  })()}
                  {visiblePanels.length > 1 && (
                    <motion.div variants={cardItemVariants}>
                      <TrendingGraph data={data} onNodeClick={handleNodeClick} />
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Right: sticky sidebar */}
          <div className="sticky top-20 hidden lg:block">
            <TrendingSidebar
              trendingWords={trendingWords}
              recommendedTopics={recommendedTopics}
              panels={ALL_PANELS}
              enabledPanels={enabledPanels}
              enabledPlatforms={enabledPlatforms as Record<string, boolean>}
              onSelectWord={(w) => { setTopic(w); setSearchTopic(w); }}
              onSelectTopic={(t) => { setTopic(t); setSearchTopic(t); }}
              onTogglePanel={handleTogglePanel}
            />
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
```

- [ ] **TypeScript check.**

---

## Task 7: Redesign `EnrichmentFlowPage` — Vercel-style execution trace

This is the most significant change. The layout changes from 3-panel (sidebar + canvas + detail) to:
- Top bar: title + topic/run dropdowns + DAG toggle
- Main area: vertical execution trace (default) OR DAG canvas (toggle)

**Files:**
- Modify: `frontend/src/pages/EnrichmentFlowPage.tsx`

### 7a — Add imports

- [ ] **Add these imports at the top of the file** (after existing imports, around line 18):
```tsx
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { containerVariants, cardItemVariants, fadeUpVariants, slideInFromRight, spring } from '@/lib/motion';
```

### 7b — Replace `RunsPanel` with compact header dropdowns

The old `RunsPanel` sidebar component is no longer the primary navigation. Instead, topic and run selection moves to the top header as two `<select>` elements.

- [ ] **Delete the entire `RunsPanel` function** (lines 445–581) and replace with this compact selector component:

```tsx
function RunSelector({
  topicGroups,
  selectedRunId,
  onSelectRun,
}: {
  topicGroups: TopicGroup[];
  selectedRunId: string | null;
  onSelectRun: (run: TopicRun) => void;
}) {
  const allRuns = topicGroups.flatMap(g => g.runs);
  const selectedRun = allRuns.find(r => r.id === selectedRunId) ?? null;

  // Selected topic id (derived from selected run)
  const selectedTopicId = selectedRun?.topicId ?? topicGroups[0]?.topicId ?? '';

  const handleTopicChange = (topicId: string) => {
    const group = topicGroups.find(g => g.topicId === topicId);
    if (group?.runs[0]) onSelectRun(group.runs[0]);
  };

  const handleRunChange = (runId: string) => {
    const run = allRuns.find(r => r.id === runId);
    if (run) onSelectRun(run);
  };

  if (topicGroups.length === 0) return null;

  const runsForTopic = topicGroups.find(g => g.topicId === selectedTopicId)?.runs ?? [];

  const selectClass = 'rounded-lg border border-white/40 bg-white/50 px-2.5 py-1.5 text-xs font-medium text-ink backdrop-blur-sm hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer max-w-[200px] truncate';

  return (
    <div className="flex items-center gap-2 shrink-0">
      <select
        className={selectClass}
        value={selectedTopicId}
        onChange={e => handleTopicChange(e.target.value)}
        title="Select topic"
      >
        {topicGroups.map(g => (
          <option key={g.topicId} value={g.topicId}>
            {g.topic.length > 40 ? g.topic.slice(0, 40) + '…' : g.topic}
          </option>
        ))}
      </select>
      {runsForTopic.length > 1 && (
        <select
          className={selectClass}
          value={selectedRunId ?? ''}
          onChange={e => handleRunChange(e.target.value)}
          title="Select run"
        >
          {runsForTopic.map(r => (
            <option key={r.id} value={r.id}>{formatDate(r.runAt)}</option>
          ))}
        </select>
      )}
    </div>
  );
}
```

### 7c — Replace `NodeDetailPanel` with inline `NodeInlineDetail`

The right-side panel becomes an inline expanded section within the trace row. Delete the old `NodeDetailPanel` component (lines 583–780) and replace with:

```tsx
function NodeInlineDetail({
  node,
  nodeRun,
  isLoadingRuns,
  session,
}: {
  node: FlowNode;
  nodeRun: NodeRun | null;
  isLoadingRuns: boolean;
  session: AppSession;
}) {
  const [activeTab, setActiveTab] = useState<'summary' | 'raw'>('summary');
  const [showTemplate, setShowTemplate] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={spring.smooth}
      className="overflow-hidden"
    >
      <div className="mx-4 mb-3 rounded-xl border border-border bg-canvas/80 p-4 space-y-3">
        <p className="text-xs leading-relaxed text-muted">{node.description}</p>

        {node.settingKey && (
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-muted uppercase tracking-widest text-[10px]">LLM</span>
            <span className="text-ink font-medium">
              {nodeRun ? nodeRun.model : getLlmLabel(node.settingKey, session)}
            </span>
            {nodeRun && nodeRun.durationMs > 0 && (
              <span className="text-muted">
                {nodeRun.durationMs < 1000
                  ? `${nodeRun.durationMs}ms`
                  : `${(nodeRun.durationMs / 1000).toFixed(1)}s`}
              </span>
            )}
          </div>
        )}

        {isLoadingRuns && (
          <div className="flex items-center gap-2 text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Loading run data…</span>
          </div>
        )}

        {nodeRun?.status === 'failed' && (
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-mono">{nodeRun.error}</p>
          </div>
        )}

        {nodeRun && nodeRun.status === 'completed' && (
          <>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">Input</p>
              <pre className="max-h-32 overflow-y-auto rounded-lg border border-border bg-canvas p-2.5 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
                {nodeRun.input}
              </pre>
            </div>
            <div>
              <div className="flex gap-1 border-b border-border mb-2">
                {(['summary', 'raw'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
                      activeTab === tab ? 'text-ink border-b-2 border-primary' : 'text-muted hover:text-ink',
                    )}
                  >{tab}</button>
                ))}
              </div>
              {activeTab === 'raw' ? (
                <pre className="max-h-48 overflow-y-auto rounded-lg border border-border bg-canvas p-2.5 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
                  {nodeRun.output}
                </pre>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-ink/80 space-y-1">
                  {Object.entries((() => { try { return JSON.parse(nodeRun.output) as Record<string, unknown>; } catch { return {}; } })())
                    .filter(([, v]) => typeof v === 'string' || (Array.isArray(v) && (v as unknown[]).length > 0))
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <p key={k}>
                        <span className="font-semibold">{k}:</span>{' '}
                        {Array.isArray(v) ? (v as string[]).slice(0, 3).join(', ') : String(v).slice(0, 120)}
                      </p>
                    ))}
                </div>
              )}
            </div>
          </>
        )}

        {!nodeRun && !isLoadingRuns && (
          <div>
            <button
              type="button"
              onClick={() => setShowTemplate(p => !p)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors"
            >
              <ChevronRight className={cn('h-3 w-3 transition-transform', showTemplate && 'rotate-90')} />
              Prompt Template
            </button>
            {showTemplate && (
              <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-canvas p-2.5 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
                {node.promptTemplate}
              </pre>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

### 7d — Add `ExecutionTrace` component

Add this new component right before `EnrichmentFlowPage`:

```tsx
function TraceRow({
  node,
  nodeRun,
  isSelected,
  isLoadingRuns,
  hasRunSelected,
  maxDuration,
  session,
  onClick,
}: {
  node: FlowNode;
  nodeRun: NodeRun | null;
  isSelected: boolean;
  isLoadingRuns: boolean;
  hasRunSelected: boolean;
  maxDuration: number;
  session: AppSession;
  onClick: () => void;
}) {
  const hasOutput = nodeRun?.status === 'completed';
  const hasFailed = nodeRun?.status === 'failed';
  const notLogged = hasRunSelected && !nodeRun && !isLoadingRuns && node.type === 'llm';
  const barWidth = nodeRun?.durationMs ? Math.max(4, (nodeRun.durationMs / Math.max(maxDuration, 1)) * 100) : 0;

  const StatusIcon = () => {
    if (isLoadingRuns && node.type === 'llm') return <Loader2 className="h-3.5 w-3.5 text-muted animate-spin" />;
    if (hasFailed) return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
    if (hasOutput) return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
    if (notLogged) return <Clock className="h-3.5 w-3.5 text-amber-400" />;
    if (node.type === 'trigger') return <div className="h-3.5 w-3.5 rounded-full bg-violet-400 border-2 border-white shadow-sm" />;
    if (node.type === 'output') return <div className="h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />;
    return <div className="h-3.5 w-3.5 rounded-full border-2 border-border bg-white" />;
  };

  const typeColor = node.group === 'enrichment'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : node.type === 'trigger'
      ? 'bg-violet-50 text-violet-700 border-violet-200'
      : node.type === 'output'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <div className="group">
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ backgroundColor: 'rgba(124,58,237,0.04)' }}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors rounded-lg cursor-pointer',
          isSelected && 'bg-primary/5 ring-1 ring-primary/20',
        )}
      >
        <StatusIcon />
        <span className="flex-1 text-sm font-medium text-ink truncate">{node.label}</span>
        {node.type === 'llm' && nodeRun?.model && (
          <span className="hidden sm:block text-[11px] text-muted truncate max-w-[120px]">{nodeRun.model}</span>
        )}
        <span className={cn('shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border', typeColor)}>
          {node.group === 'enrichment' ? 'enrich' : node.type}
        </span>
        {barWidth > 0 ? (
          <div className="hidden sm:flex items-center gap-2 shrink-0 w-32">
            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', hasFailed ? 'bg-red-400' : 'bg-primary/60')}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ width: `${barWidth}%`, transformOrigin: 'left' }}
              />
            </div>
            <span className="text-[11px] text-muted text-right w-10 shrink-0">
              {nodeRun!.durationMs < 1000
                ? `${nodeRun!.durationMs}ms`
                : `${(nodeRun!.durationMs / 1000).toFixed(1)}s`}
            </span>
          </div>
        ) : notLogged ? (
          <span className="hidden sm:block text-[10px] text-amber-500 italic shrink-0">not logged</span>
        ) : (
          <div className="hidden sm:block w-[9.5rem]" />
        )}
        <ChevronRight
          className={cn('h-3.5 w-3.5 text-muted transition-transform shrink-0', isSelected && 'rotate-90')}
        />
      </motion.button>

      <AnimatePresence>
        {isSelected && (
          <NodeInlineDetail
            node={node}
            nodeRun={nodeRun}
            isLoadingRuns={isLoadingRuns}
            session={session}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExecutionTrace({
  nodes,
  enrichmentNodes,
  getNodeRun,
  selectedNode,
  isLoadingRuns,
  hasRunSelected,
  loadedNodeRuns,
  session,
  onNodeClick,
}: {
  nodes: { trigger: FlowNode; enrichment: FlowNode[]; reviewGen: FlowNode; genWorker: FlowNode; textReview: FlowNode; visionReview: FlowNode; output: FlowNode };
  enrichmentNodes: FlowNode[];
  getNodeRun: (id: string) => NodeRun | null;
  selectedNode: FlowNode | null;
  isLoadingRuns: boolean;
  hasRunSelected: boolean;
  loadedNodeRuns: NodeRun[] | undefined;
  session: AppSession;
  onNodeClick: (node: FlowNode) => void;
}) {
  const maxDuration = Math.max(...(loadedNodeRuns?.map(r => r.durationMs ?? 0) ?? [0]), 1);
  const rowProps = (node: FlowNode) => ({
    node,
    nodeRun: getNodeRun(node.id),
    isSelected: selectedNode?.id === node.id,
    isLoadingRuns,
    hasRunSelected,
    maxDuration,
    session,
    onClick: () => onNodeClick(node),
  });

  const sequentialNodes = [
    nodes.trigger,
    ...enrichmentNodes,
    nodes.reviewGen,
    nodes.genWorker,
    nodes.textReview,
    nodes.visionReview,
    nodes.output,
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="py-2"
    >
      {/* Trigger */}
      <motion.div variants={cardItemVariants}>
        <TraceRow {...rowProps(nodes.trigger)} />
      </motion.div>

      {/* Enrichment group */}
      <motion.div variants={cardItemVariants} className="my-1">
        <div className="mx-4 rounded-xl border border-dashed border-blue-200 bg-blue-50/30">
          <div className="px-4 py-2 border-b border-blue-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              Enrichment Phase · {enrichmentNodes.length} modules
            </span>
          </div>
          <div className="py-1">
            {enrichmentNodes.map(node => (
              <TraceRow key={node.id} {...rowProps(node)} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Remaining nodes */}
      {[nodes.reviewGen, nodes.genWorker, nodes.textReview, nodes.visionReview, nodes.output].map(node => (
        <motion.div key={node.id} variants={cardItemVariants}>
          <TraceRow {...rowProps(node)} />
        </motion.div>
      ))}
    </motion.div>
  );
}
```

### 7e — Rewrite `EnrichmentFlowPage` main return

Replace only the `return (...)` block inside `EnrichmentFlowPage` (starting at line ~909):

```tsx
return (
  <MotionConfig transition={spring.smooth}>
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-canvas shrink-0 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-heading text-base font-bold text-ink">Enrichment Flow</h1>
          <p className="text-[11px] text-muted">
            {selectedRun
              ? selectedRun.topic.length > 50 ? selectedRun.topic.slice(0, 50) + '…' : selectedRun.topic
              : 'Select a topic to inspect its pipeline run'}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0 flex-wrap">
          <RunSelector
            topicGroups={enrichedGroups}
            selectedRunId={selectedRunId}
            onSelectRun={handleSelectRun}
          />
          <button
            type="button"
            onClick={() => setShowTimeline(p => !p)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-border/30 hover:text-ink transition-colors"
          >
            {showTimeline ? '⬡ DAG view' : '⚡ Trace view'}
          </button>
          <button
            type="button"
            onClick={() => setCanvasResetKey(k => k + 1)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-border/30 hover:text-ink transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      {/* ── Run stats bar (when a run is selected) ──────────── */}
      {selectedRun && loadedNodeRuns && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-6 px-4 py-2 border-b border-border bg-canvas/60 shrink-0 flex-wrap overflow-hidden"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Nodes ran</p>
            <p className="text-sm font-semibold text-ink">{loadedNodeRuns.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Total time</p>
            <p className="text-sm font-semibold text-ink">
              {(() => {
                const total = loadedNodeRuns.reduce((s, r) => s + (r.durationMs ?? 0), 0);
                return total < 1000 ? `${total}ms` : `${(total / 1000).toFixed(1)}s`;
              })()}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Run date</p>
            <p className="text-sm font-semibold text-ink">{formatDate(selectedRun.runAt)}</p>
          </div>
        </motion.div>
      )}

      {/* ── Empty state (no topics) ──────────────────────────── */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-8">
          <Activity className="h-10 w-10 text-muted/30" />
          <p className="text-sm font-medium text-muted">No topics yet</p>
          <p className="text-xs text-muted/70 max-w-xs">Add topics to your Google Sheet to start generating posts and viewing enrichment runs.</p>
        </div>
      )}

      {/* ── Pending-only state ───────────────────────────────── */}
      {hasPendingOnly && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-8">
          <Clock className="h-10 w-10 text-muted/30" />
          <p className="text-sm font-medium text-muted">No completed runs yet</p>
          <p className="text-xs text-muted/70 max-w-xs">Topics exist but none have been generated yet. Run the generation pipeline to see trace data.</p>
        </div>
      )}

      {/* ── Main content area ────────────────────────────────── */}
      {!isEmpty && !hasPendingOnly && (
        <div className="flex-1 overflow-y-auto">
          {!showTimeline ? (
            /* Execution Trace (default) */
            selectedRun ? (
              <ExecutionTrace
                nodes={{ trigger: triggerNode, enrichment: ENRICHMENT_NODESToRender, reviewGen: reviewGenNode, genWorker: genWorkerNode, textReview: textReviewNode, visionReview: visionReviewNode, output: outputNode }}
                enrichmentNodes={ENRICHMENT_NODESToRender}
                getNodeRun={getNodeRun}
                selectedNode={selectedNode}
                isLoadingRuns={isLoadingRuns}
                hasRunSelected={!!selectedRun}
                loadedNodeRuns={loadedNodeRuns}
                session={session}
                onNodeClick={handleNodeClick}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
                <Activity className="h-8 w-8 text-muted/30" />
                <p className="text-sm text-muted">Select a topic and run above to inspect its pipeline.</p>
              </div>
            )
          ) : (
            /* DAG Canvas */
            <div className="flex h-full p-3 gap-3">
              <DraggableCanvas resetKey={canvasResetKey}>
                <motion.div
                  className="flex flex-col items-center gap-0 p-8"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  <NodeCard {...cardProps(triggerNode)} />
                  <Arrow />
                  <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4">
                    <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-blue-400">
                      {executedEnrichmentNodeIds && executedEnrichmentNodeIds.length > 0
                        ? 'Enrichment Modules (execution order)' : 'Enrichment Modules (parallel)'}
                    </p>
                    <motion.div className="flex flex-wrap justify-center gap-3" variants={containerVariants}>
                      {ENRICHMENT_NODESToRender.map(node => (
                        <motion.div key={node.id} variants={cardItemVariants}>
                          <NodeCard {...cardProps(node)} />
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                  <Arrow />
                  <NodeCard {...cardProps(reviewGenNode)} />
                  <Arrow />
                  <NodeCard {...cardProps(genWorkerNode)} />
                  <Arrow />
                  <div className="flex items-center gap-0">
                    <NodeCard {...cardProps(textReviewNode)} />
                    <Arrow horizontal />
                    <NodeCard {...cardProps(visionReviewNode)} />
                  </div>
                  <Arrow />
                  <NodeCard {...cardProps(outputNode)} />
                </motion.div>
              </DraggableCanvas>
            </div>
          )}
        </div>
      )}
    </div>
  </MotionConfig>
);
```

- [ ] **TypeScript check:**
```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -50
```
Fix any errors. Common issues:
- `ExecutionTrace` `nodes` prop shape must match exactly
- `RunSelector` needs `enrichedGroups` not `topicGroups` (use enriched groups that have `nodeRuns` populated)
- Remove unused imports from the old `RunsPanel` / `NodeDetailPanel` if any (`X`, `ChevronLeft` may be unused now)
- `handleNodeClick` now toggles `selectedNode` on/off (deselect if same node) — keep this logic from original

---

## Task 8: Final TypeScript check + dev server verification

- [ ] **Full compile check:**
```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit --skipLibCheck 2>&1
```
Expected: no output (zero errors).

- [ ] **Start dev server and verify `/trending`:**
  - Header: search + filters on one compact row
  - Left feed: platform sections stack vertically, each with colored accent
  - Right sidebar visible on large screens: trending words, recommendations, platform toggles
  - Empty state: floating Sparkles icon + text
  - Loading: skeleton feed cards (not spinner)

- [ ] **Verify `/enrichment`:**
  - Header: topic + run dropdowns (no left sidebar panel)
  - Default view is the Execution Trace (not DAG)
  - Each node is a row with status icon, type badge, duration bar
  - "Not logged" shows as amber text chip, not a big card
  - Clicking a node expands inline detail (input/output tabs)
  - Empty state is small + centered
  - DAG toggle still works
