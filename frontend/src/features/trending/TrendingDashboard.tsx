import { useState, useMemo } from 'react';
import { type ReactNode } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { containerVariants, cardItemVariants, fadeUpVariants, skeletonPulseVariants, spring } from '@/lib/motion';
import { TrendingSearchBar } from './components/TrendingSearchBar';
import { TrendingFilters, readFilterDefaults } from './components/TrendingFilters';
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
import { Newspaper, Sparkles, PlugZap, Play, Camera, Briefcase } from 'lucide-react';
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

const PLATFORM_META: Record<string, { color: string; icon: ReactNode }> = {
  youtube:   { color: '#FF0000', icon: <Play size={16} /> },
  instagram: { color: '#E1306C', icon: <Camera size={16} /> },
  linkedin:  { color: '#0A66C2', icon: <Briefcase size={16} /> },
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
    newsProviderKeys?.newsdata || newsProviderKeys?.serpapi,
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

        {/* ── Sticky compact header ──────────────────────────── */}
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

        {/* ── No news APIs banner ────────────────────────────── */}
        {!hasNewsApis && (
          <div className="mx-6 mt-4 rounded-xl border border-amber-200/60 bg-amber-50/60 p-3 flex items-center gap-2.5">
            <PlugZap className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>No news APIs connected.</strong>{' '}
              Go to <strong>Settings → News</strong> to add NewsAPI, GNews, or others.
            </p>
          </div>
        )}

        {/* ── Main 2-col layout ──────────────────────────────── */}
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

            {/* No results */}
            {!data && !isLoading && !hasError && searchTopic && (
              <p className="py-16 text-center text-sm text-muted">
                No trending data found for &quot;<strong>{searchTopic}</strong>&quot;. Try a different topic.
              </p>
            )}

            {/* Error */}
            {hasError && (
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-700">
                {error || trendingSearch.error}
              </div>
            )}

            {/* Skeleton loading */}
            {isLoading && (
              <motion.div
                className="space-y-4"
                variants={containerVariants} initial="hidden" animate="show"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} variants={cardItemVariants} className="glass-panel rounded-2xl overflow-hidden">
                    <div className="h-0.5 w-full bg-violet-100" />
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                      <motion.div className="w-7 h-7 rounded-lg bg-violet-100" variants={skeletonPulseVariants} animate="animate" />
                      <motion.div className="h-3 w-24 rounded bg-violet-100" variants={skeletonPulseVariants} animate="animate" />
                      <motion.div className="ml-auto h-3 w-8 rounded-full bg-violet-50" variants={skeletonPulseVariants} animate="animate" />
                    </div>
                    <div className="p-3 space-y-2">
                      {[0, 1, 2, 3].map((j) => (
                        <motion.div key={j} className="flex gap-3" variants={skeletonPulseVariants} animate="animate">
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
              enabledPlatforms={enabledPlatforms}
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
