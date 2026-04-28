import { useState, useEffect, useMemo } from 'react';
import { type ReactNode } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { containerVariants, cardItemVariants, fadeUpVariants, skeletonPulseVariants, spring } from '@/lib/motion';
import { TrendingSearchBar } from '../trending/components/TrendingSearchBar';
import { TrendingFilters, readFilterDefaults } from '../trending/components/TrendingFilters';
import { FeedCuratedPanel } from './components/FeedCuratedPanel';
import { FeedSection } from '../trending/components/FeedSection';
import { YouTubePanel } from '../trending/components/YouTubePanel';
import { InstagramPanel } from '../trending/components/InstagramPanel';
import { LinkedInPanel } from '../trending/components/LinkedInPanel';
import { TrendingGraph } from '../trending/components/TrendingGraph';
import { useTrending, type TrendingCapabilities } from '../trending/hooks/useTrending';
import { useTrendingSearch } from '../trending/hooks/useTrendingSearch';
import { FeedLeftPanel } from './components/FeedLeftPanel';
import { Newspaper, Sparkles, PlugZap, Plus, X } from 'lucide-react';
import type { GraphNode, NewsArticle } from '../trending/types';
import type { BackendApi } from '@/services/backendApi';
import type { NewsProviderKeys } from '@/services/configService';
import type { InterestGroup, CreateInterestGroupPayload, Clip } from './types';
import type { SheetRow } from '../../services/sheets';
import { ClipsDock } from './components/ClipsDock';
import { ArticleDetailView } from './components/ArticleDetailView';
import { DebateModeView } from './components/DebateModeView';
import { DraftContextView } from './components/DraftContextView';

const DEFAULT_ENABLED = ['youtube', 'instagram', 'news'];

const PLATFORM_META: Record<string, { color: string; icon: ReactNode }> = {
  youtube:   { color: '#FF0000', icon: <span style={{ fontWeight: 700, fontSize: 11, color: '#FF0000' }}>YT</span> },
  instagram: { color: '#E1306C', icon: <span style={{ fontWeight: 700, fontSize: 11, color: '#E1306C' }}>IG</span> },
  linkedin:  { color: '#0A66C2', icon: <span style={{ fontWeight: 700, fontSize: 11, color: '#0A66C2' }}>LI</span> },
  news:      { color: '#3B82F6', icon: <Newspaper size={16} /> },
};

const COLOR_PRESETS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export function FeedPage({
  idToken,
  api,
  newsProviderKeys,
  capabilities,
  rows,
}: {
  idToken: string;
  api: BackendApi;
  newsProviderKeys?: NewsProviderKeys;
  capabilities: TrendingCapabilities;
  rows?: SheetRow[];
}) {
  const [topic, setTopic] = useState('');
  const [searchTopic, setSearchTopic] = useState('');
  const [enabledPanels] = useState<string[]>(DEFAULT_ENABLED);

  const [region, setRegion] = useState(() => readFilterDefaults().region);
  const [genre, setGenre] = useState(() => readFilterDefaults().genre);
  const [windowDays, setWindowDays] = useState(() => readFilterDefaults().windowDays);

  // Interest groups state
  const [interestGroups, setInterestGroups] = useState<InterestGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Create group form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTopics, setNewGroupTopics] = useState('');
  const [newGroupDomains, setNewGroupDomains] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(COLOR_PRESETS[0]);
  const [savingGroup, setSavingGroup] = useState(false);

  // Clips state
  const [clips, setClips] = useState<Clip[]>([]);
  const clippedUrls = useMemo(() => new Set(clips.map(c => c.articleUrl)), [clips]);

  const [openArticle, setOpenArticle] = useState<NewsArticle | null>(null);
  const [openDraft, setOpenDraft] = useState<SheetRow | null>(null);
  const [debateMode, setDebateMode] = useState(false);

  async function handleDeleteClip(clipId: string) {
    try {
      await api.deleteClip(idToken, clipId);
      setClips(prev => prev.filter(c => c.id !== clipId));
    } catch { /* silent */ }
  }

  async function handleAssignClipToPost(clipId: string, postId: string) {
    try {
      const updated = await api.assignClipToPost(idToken, clipId, postId);
      setClips(prev => prev.map(c => c.id === clipId ? updated : c));
    } catch { /* silent */ }
  }

  async function handleUnassignClip(clipId: string, postId: string) {
    try {
      const updated = await api.unassignClipFromPost(idToken, clipId, postId);
      setClips(prev => prev.map(c => c.id === clipId ? updated : c));
    } catch { /* silent */ }
  }

  function handleOpenDraft(row: SheetRow) {
    setOpenDraft(row);
  }

  async function handleClip(article: NewsArticle) {
    try {
      const clip = await api.createClip(idToken, {
        type: 'article',
        articleTitle: article.title,
        articleUrl: article.url,
        source: article.source,
        publishedAt: article.publishedAt,
        thumbnailUrl: article.imageUrl ?? '',
      });
      setClips(prev => [clip, ...prev]);
    } catch {
      // silently ignore — dock will show existing clips
    }
  }

  // Fetch groups on mount
  useEffect(() => {
    api.listInterestGroups(idToken)
      .then(setInterestGroups)
      .catch(() => {}) // silently ignore on error
      .finally(() => setGroupsLoading(false));
  }, [idToken, api]);

  // Load existing clips on mount
  useEffect(() => {
    api.listClips(idToken)
      .then(setClips)
      .catch(() => {});
  }, [idToken, api]);

  const { data, loading, error } = useTrending(searchTopic, idToken, api, capabilities);
  const trendingSearch = useTrendingSearch(searchTopic, region, genre, windowDays, idToken, api);

  const hasNewsApis = Boolean(
    newsProviderKeys?.newsapi || newsProviderKeys?.gnews ||
    newsProviderKeys?.newsdata || newsProviderKeys?.serpapi,
  );

  const handleSearch = () => setSearchTopic(topic);

  const handleSelectGroup = (groupId: string | null) => {
    setActiveGroupId(groupId);
    if (groupId === null) {
      // "All" selected — clear group filter
      setTopic('');
      setSearchTopic('');
    } else {
      const group = interestGroups.find(g => g.id === groupId);
      if (group && group.topics.length > 0) {
        const firstTopic = group.topics[0];
        setTopic(firstTopic);
        setSearchTopic(firstTopic);
      }
    }
  };

  const handleSaveGroup = async () => {
    if (!newGroupName.trim()) return;
    setSavingGroup(true);
    try {
      const payload: CreateInterestGroupPayload = {
        name: newGroupName.trim(),
        topics: newGroupTopics.split(',').map(t => t.trim()).filter(Boolean),
        domains: newGroupDomains.split(',').map(d => d.trim()).filter(Boolean),
        color: newGroupColor,
      };
      const created = await api.createInterestGroup(idToken, payload);
      setInterestGroups(prev => [created, ...prev]);
      setActiveGroupId(created.id);
      if (created.topics.length > 0) {
        setTopic(created.topics[0]);
        setSearchTopic(created.topics[0]);
      }
      // Reset form
      setNewGroupName('');
      setNewGroupTopics('');
      setNewGroupDomains('');
      setNewGroupColor(COLOR_PRESETS[0]);
      setShowCreateGroup(false);
    } catch {
      // silently ignore
    } finally {
      setSavingGroup(false);
    }
  };

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

          {/* Interest group switcher */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {groupsLoading ? (
              // Skeleton pills
              <>
                {[80, 100, 72, 90].map((w, i) => (
                  <motion.div
                    key={i}
                    className="h-7 rounded-full bg-violet-100"
                    style={{ width: w }}
                    variants={skeletonPulseVariants}
                    animate="animate"
                  />
                ))}
              </>
            ) : (
              <>
                {/* "All" pill */}
                <button
                  type="button"
                  onClick={() => handleSelectGroup(null)}
                  className={[
                    'h-7 rounded-full px-3 text-xs font-semibold transition-colors duration-150 border',
                    activeGroupId === null
                      ? 'bg-primary text-primary-fg border-primary shadow-sm'
                      : 'bg-white/40 text-muted border-white/60 hover:bg-white/60 hover:text-ink',
                  ].join(' ')}
                >
                  All
                </button>

                {/* Group pills */}
                {interestGroups.map(group => {
                  const isActive = activeGroupId === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleSelectGroup(group.id)}
                      style={isActive ? { backgroundColor: group.color, borderColor: group.color } : { borderLeftColor: group.color }}
                      className={[
                        'h-7 rounded-full px-3 text-xs font-semibold transition-colors duration-150 border border-l-4',
                        isActive
                          ? 'text-white shadow-sm'
                          : 'bg-white/40 text-muted border-white/60 hover:bg-white/60 hover:text-ink',
                      ].join(' ')}
                    >
                      {group.name}
                    </button>
                  );
                })}

                {/* + New Group button */}
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(v => !v)}
                  className="flex h-7 items-center gap-1 rounded-full border border-dashed border-primary/40 px-3 text-xs font-semibold text-primary/70 transition-colors hover:border-primary hover:text-primary"
                >
                  <Plus size={12} />
                  New Group
                </button>
              </>
            )}
          </div>

          {/* Create group inline form */}
          <AnimatePresence>
            {showCreateGroup && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 overflow-hidden rounded-xl border border-primary/20 bg-white/60 p-3 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-ink">New Interest Group</span>
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="text-muted hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    placeholder="Group name *"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    className="h-7 rounded-lg border border-border/60 bg-white/80 px-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40 min-w-[120px] flex-1"
                  />
                  <input
                    type="text"
                    placeholder="Topics (comma-separated)"
                    value={newGroupTopics}
                    onChange={e => setNewGroupTopics(e.target.value)}
                    className="h-7 rounded-lg border border-border/60 bg-white/80 px-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40 min-w-[160px] flex-1"
                  />
                  <input
                    type="text"
                    placeholder="Domains (optional, comma-separated)"
                    value={newGroupDomains}
                    onChange={e => setNewGroupDomains(e.target.value)}
                    className="h-7 rounded-lg border border-border/60 bg-white/80 px-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40 min-w-[160px] flex-1"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted">Color:</span>
                  <div className="flex gap-1.5">
                    {COLOR_PRESETS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewGroupColor(color)}
                        style={{ backgroundColor: color }}
                        className={[
                          'h-5 w-5 rounded-full transition-transform',
                          newGroupColor === color ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'hover:scale-110',
                        ].join(' ')}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateGroup(false)}
                      className="h-6 rounded-md px-2 text-xs text-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveGroup}
                      disabled={!newGroupName.trim() || savingGroup}
                      className="h-6 rounded-md bg-primary px-2 text-xs font-semibold text-primary-fg disabled:opacity-50 hover:bg-primary/90"
                    >
                      {savingGroup ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

        {/* ── Main layout ──────────────────────────────── */}

        {/* Draft Context View (Mode 3) */}
        {openDraft ? (
          <div className="flex flex-1 min-h-0" style={{ height: 'calc(100vh - 120px)' }}>
            <DraftContextView
              row={openDraft}
              clips={clips}
              idToken={idToken}
              api={api}
              onBack={() => setOpenDraft(null)}
              onUnassignClip={handleUnassignClip}
            />
          </div>
        ) : (

        <div className="flex gap-6 p-6 items-start">

          {/* Article Detail View (Mode 2) */}
          {openArticle && !debateMode && (
            <ArticleDetailView
              article={openArticle}
              idToken={idToken}
              api={api}
              onBack={() => { setOpenArticle(null); setDebateMode(false); }}
              onClip={handleClip}
              isClipped={clippedUrls.has(openArticle.url)}
              rows={rows}
              onOpenDraft={(row) => { setOpenArticle(null); setOpenDraft(row); }}
              onDebate={() => setDebateMode(true)}
            />
          )}
          {openArticle && debateMode && (
            <DebateModeView
              article={openArticle}
              idToken={idToken}
              api={api}
              onBack={() => setDebateMode(false)}
              onClip={handleClip}
              isClipped={clippedUrls.has(openArticle.url)}
            />
          )}
          {!openArticle && (
          <>

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
                  Explore Your Feed
                </motion.h3>
                <motion.p variants={fadeUpVariants} className="text-sm text-muted max-w-xs leading-relaxed">
                  Select an interest group above or enter a topic to discover content across platforms.
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
                    return visiblePanels.includes('news') ? (
                      <motion.div variants={cardItemVariants}>
                        <FeedLeftPanel
                          articles={articles}
                          loading={false}
                          onClip={handleClip}
                          onOpen={(a) => { setDebateMode(false); setOpenArticle(a); }}
                          clippedUrls={clippedUrls}
                        />
                      </motion.div>
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
            <FeedCuratedPanel
              idToken={idToken}
              api={api}
              searchTopic={searchTopic}
              newsProviderKeys={newsProviderKeys}
              capabilities={capabilities}
              trendingData={{
                youtube: data?.youtube ?? [],
                instagram: data?.instagram ?? [],
                linkedin: data?.linkedin ?? [],
                news: (() => {
                  const articles = trendingSearch.data?.articles?.length
                    ? trendingSearch.data.articles : (data?.news ?? []);
                  return articles;
                })(),
              }}
              trendingWords={trendingWords}
              recommendedTopics={recommendedTopics}
              loading={isLoading}
              onClip={handleClip}
              clippedUrls={clippedUrls}
              onOpenArticle={(a) => { setDebateMode(false); setOpenArticle(a); }}
              onSelectWord={(w) => { setTopic(w); setSearchTopic(w); }}
              onSelectTopic={(t) => { setTopic(t); setSearchTopic(t); }}
            />
          </div>

          </>
          )}
        </div>

        )} {/* end openDraft conditional */}

        {/* ClipsDock — added in Task 6 */}
        <ClipsDock
          clips={clips}
          rows={rows ?? []}
          idToken={idToken}
          api={api}
          onDeleteClip={handleDeleteClip}
          onOpenArticle={(clip) => {
            setDebateMode(false);
            setOpenArticle({
              id: clip.id,
              title: clip.articleTitle,
              description: clip.passageText,
              source: clip.source,
              publishedAt: clip.publishedAt,
              url: clip.articleUrl,
              imageUrl: clip.thumbnailUrl || undefined,
              platform: 'news',
            });
          }}
          onOpenDraft={handleOpenDraft}
          onAssignClip={handleAssignClipToPost}
        />
      </div>
    </MotionConfig>
  );
}
