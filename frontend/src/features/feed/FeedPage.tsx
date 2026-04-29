import { useState, useEffect, useMemo, useRef } from 'react';
import { Tour } from '@/components/Tour';
import { type ReactNode } from 'react';
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from 'framer-motion';
import { containerVariants, cardItemVariants, fadeUpVariants, skeletonPulseVariants, spring } from '@/lib/motion';
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
import { Newspaper, Sparkles, PlugZap, Plus, X, RefreshCw, Settings2, Pencil, Trash2, Bookmark, Layers, ChevronDown, Search, Scissors, SlidersHorizontal } from 'lucide-react';
import { useFeedStore } from '@/stores/feedStore';
import type { GraphNode, NewsArticle } from '../trending/types';
import type { BackendApi } from '@/services/backendApi';
import type { NewsProviderKeys } from '@/services/configService';
import type { InterestGroup, CreateInterestGroupPayload, UpdateInterestGroupPayload, Clip, ArticleFeedbackMap, FeedVote } from './types';
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
  const [feedSort, setFeedSort] = useState<'latest' | 'trending' | 'foryou'>('latest');

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

  // Edit group form state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupTopics, setEditGroupTopics] = useState('');
  const [editGroupDomains, setEditGroupDomains] = useState('');
  const [editGroupColor, setEditGroupColor] = useState(COLOR_PRESETS[0]);
  const [savingEditGroup, setSavingEditGroup] = useState(false);

  // Feed cache state
  const [feedArticles, setFeedArticles] = useState<NewsArticle[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Collapsible left panel
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Zustand feed store — session-aware persistence
  const feedStore = useFeedStore();

  // Search + filter bar state — client-side filter on already-loaded articles
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 'all' = no group filter applied on top of sorted articles
  const [activeFilter, _setActiveFilter] = useState<string>('all');

  // Feedback (thumbs up / down)
  const [feedbackMap, setFeedbackMap] = useState<ArticleFeedbackMap>({});

  // Clips state
  const [clips, setClips] = useState<Clip[]>([]);
  const clippedUrls = useMemo(() => new Set(clips.map(c => c.articleUrl)), [clips]);

  const [openArticle, setOpenArticle] = useState<NewsArticle | null>(null);
  const [openDraft, setOpenDraft] = useState<SheetRow | null>(null);
  const [debateMode, setDebateMode] = useState(false);

  // Platform filter dropdown (sidebar)
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const platformDropdownRef = useRef<HTMLDivElement>(null);

  async function handleDeleteClip(clipId: string) {
    try {
      await api.deleteClip(idToken, clipId);
      setClips(prev => prev.filter(c => c.id !== clipId));
    } catch { /* silent */ }
  }

  async function handleUpdateClip(clipId: string, passageText: string) {
    const updated = await api.updateClip(idToken, { id: clipId, passageText });
    setClips(prev => prev.map(c => c.id === clipId ? updated : c));
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

  async function handleClipPassage(text: string, article: NewsArticle) {
    try {
      const clip = await api.createClip(idToken, {
        type: 'passage',
        articleTitle: article.title,
        articleUrl: article.url,
        source: article.source,
        publishedAt: article.publishedAt,
        thumbnailUrl: article.imageUrl ?? '',
        passageText: text,
      });
      setClips(prev => [clip, ...prev]);
    } catch { /* silent */ }
  }

  async function handleRefresh() {
    const group = activeGroupId ? interestGroups.find(g => g.id === activeGroupId) : null;
    const topic = group?.topics[0] ?? searchTopic;
    if (!topic) return;
    setRefreshing(true);
    try {
      const result = await api.refreshFeedArticles(idToken, { topic, region, genre, windowDays });
      const fresh = (result.articles as NewsArticle[]).filter(Boolean);
      setFeedArticles(fresh);
      feedStore.setArticles(fresh, activeGroupId, new Date().toISOString());
      feedStore.markSessionFetched();
    } catch { /* silent */ } finally {
      setRefreshing(false);
    }
  }

  function applyFeedbackOptimistic(articleUrl: string, vote: FeedVote | null) {
    setFeedbackMap(prev => {
      const next = { ...prev };
      if (vote === null) delete next[articleUrl];
      else next[articleUrl] = vote;
      return next;
    });
  }

  async function handleThumbsUp(article: NewsArticle) {
    const current = feedbackMap[article.url] as FeedVote | undefined;
    const newVote: FeedVote | null = current === 'up' ? null : 'up';
    applyFeedbackOptimistic(article.url, newVote);
    try {
      const result = await api.setArticleFeedback(idToken, article.url, newVote);
      applyFeedbackOptimistic(article.url, result.vote);
    } catch { /* revert is acceptable — server is source of truth on next load */ }
  }

  async function handleThumbsDown(article: NewsArticle) {
    const current = feedbackMap[article.url] as FeedVote | undefined;
    const newVote: FeedVote | null = current === 'down' ? null : 'down';
    applyFeedbackOptimistic(article.url, newVote);
    try {
      const result = await api.setArticleFeedback(idToken, article.url, newVote);
      applyFeedbackOptimistic(article.url, result.vote);
    } catch { /* silent */ }
  }

  async function handleClip(article: NewsArticle) {
    // Deduplicate — don't create a second clip for the same article URL
    if (clippedUrls.has(article.url)) return;
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

  // Load article feedback on mount
  useEffect(() => {
    api.getArticleFeedback(idToken).then(setFeedbackMap).catch(() => {});
  }, [idToken, api]);

  // Auto-select first interest group when groups finish loading
  useEffect(() => {
    if (!groupsLoading && interestGroups.length > 0 && activeGroupId === null) {
      setActiveGroupId(interestGroups[0].id);
    }
  }, [groupsLoading, interestGroups, activeGroupId]);

  // Load feed articles from DB cache whenever the active group changes
  useEffect(() => {
    if (groupsLoading) return;
    const group = activeGroupId ? interestGroups.find(g => g.id === activeGroupId) : null;
    if (!group || group.topics.length === 0) {
      setFeedArticles([]);
      return;
    }

    // If Zustand has fresh data for this group and we already fetched in this session, reuse it.
    if (
      feedStore.isSessionFetched() &&
      feedStore.groupId === activeGroupId &&
      !feedStore.isStale() &&
      feedStore.articles.length > 0
    ) {
      setFeedArticles(feedStore.articles);
      return;
    }

    setFeedLoading(true);
    api.getFeedArticles(idToken, group.topics)
      .then(result => {
        const fresh = (result.articles as NewsArticle[]).filter(Boolean);
        setFeedArticles(fresh);
        feedStore.setArticles(fresh, activeGroupId, result.fetchedAt ?? new Date().toISOString());
        feedStore.markSessionFetched();
        setFeedLoading(false);
        if (result.stale) {
          // Background refresh — update articles silently when done
          api.refreshFeedArticles(idToken, {
            topic: group.topics[0],
            region,
            genre,
            windowDays,
          }).then(refreshed => {
            const refreshedArticles = (refreshed.articles as NewsArticle[]).filter(Boolean);
            setFeedArticles(refreshedArticles);
            feedStore.setArticles(refreshedArticles, activeGroupId, new Date().toISOString());
            feedStore.markSessionFetched();
          }).catch(() => {});
        }
      })
      .catch(() => setFeedLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId, groupsLoading]);

  const { data, loading, error } = useTrending(searchTopic, idToken, api, capabilities);
  const trendingSearch = useTrendingSearch(searchTopic, region, genre, windowDays, idToken, api);

  const hasNewsApis = Boolean(
    newsProviderKeys?.newsapi || newsProviderKeys?.gnews ||
    newsProviderKeys?.newsdata || newsProviderKeys?.serpapi,
  );

  const handleSearch = () => setSearchTopic(topic);

  const handleSelectGroup = (groupId: string | null) => {
    setActiveGroupId(groupId);
    // Clear any manual search when switching groups — DB cache takes over
    setTopic('');
    setSearchTopic('');
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
      setInterestGroups(prev => [...prev, created]);
      setActiveGroupId(created.id);
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

  const handleStartEditGroup = (group: InterestGroup) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupTopics(group.topics.join(', '));
    setEditGroupDomains(group.domains.join(', '));
    setEditGroupColor(group.color);
    setShowCreateGroup(false);
  };

  const handleCancelEditGroup = () => setEditingGroupId(null);

  const handleUpdateGroup = async () => {
    if (!editingGroupId || !editGroupName.trim()) return;
    setSavingEditGroup(true);
    try {
      const payload: UpdateInterestGroupPayload = {
        id: editingGroupId,
        name: editGroupName.trim(),
        topics: editGroupTopics.split(',').map(t => t.trim()).filter(Boolean),
        domains: editGroupDomains.split(',').map(d => d.trim()).filter(Boolean),
        color: editGroupColor,
      };
      const updated = await api.updateInterestGroup(idToken, payload);
      setInterestGroups(prev => prev.map(g => g.id === editingGroupId ? updated : g));
      setEditingGroupId(null);
    } catch { /* silent */ } finally {
      setSavingEditGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Delete this interest group?')) return;
    try {
      await api.deleteInterestGroup(idToken, groupId);
      setInterestGroups(prev => prev.filter(g => g.id !== groupId));
      if (activeGroupId === groupId) setActiveGroupId(null);
    } catch { /* silent */ }
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

  // Which articles to show in the left panel:
  // - explicit search overrides everything
  // - otherwise serve from DB cache (feedArticles)
  // - fall back to useTrending news if neither is available
  const displayArticles = useMemo(() => {
    if (searchTopic) {
      return trendingSearch.data?.articles?.length
        ? trendingSearch.data.articles
        : (data?.news ?? []);
    }
    return feedArticles.length > 0 ? feedArticles : (data?.news ?? []);
  }, [searchTopic, trendingSearch.data, data, feedArticles]);

  const sortedDisplayArticles = useMemo(() => {
    if (feedSort === 'trending') {
      return [...displayArticles].sort((a, b) => {
        const aUp = feedbackMap[a.url] === 'up' ? 1 : 0;
        const bUp = feedbackMap[b.url] === 'up' ? 1 : 0;
        return bUp - aUp;
      });
    }
    if (feedSort === 'foryou') {
      return displayArticles.filter(a => feedbackMap[a.url] !== 'down');
    }
    return displayArticles;
  }, [displayArticles, feedSort, feedbackMap]);

  function handleSearchQueryChange(value: string) {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchQuery(value);
    }, 200);
  }

  // Articles after applying client-side search + group filter on top of sorted feed
  const filteredDisplayArticles = useMemo(() => {
    let result = sortedDisplayArticles;

    // Group filter (activeFilter): only applies when "All" group is loaded (activeGroupId === null)
    // When a specific group is active via activeGroupId, the DB already scopes articles — no client filter needed
    if (activeFilter !== 'all' && activeGroupId === null) {
      const group = interestGroups.find(g => g.id === activeFilter);
      if (group) {
        const topicSet = new Set(group.topics.map(t => t.toLowerCase()));
        result = result.filter(a =>
          topicSet.has(a.source.toLowerCase()) ||
          group.topics.some(t =>
            a.title.toLowerCase().includes(t.toLowerCase()) ||
            (a.description ?? '').toLowerCase().includes(t.toLowerCase()),
          ),
        );
      }
    }

    // Search filter
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q),
      );
    }

    return result;
  }, [sortedDisplayArticles, activeFilter, activeGroupId, interestGroups, debouncedSearchQuery]);

  const leftPanelLoading = searchTopic ? trendingSearch.loading : feedLoading;
  const hasNoGroups = !groupsLoading && interestGroups.length === 0;

  const shouldReduceMotion = useReducedMotion();

  const motionProps = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 }, transition: { duration: 0.2 } };

  return (
    <>
    <Tour
      tourKey="feed"
      steps={[
        { title: 'Your discovery feed', body: 'Articles are pulled from your connected sources and interest groups. Switch between Latest, Trending, and For You at the top.' },
        { title: 'Like, dismiss, or clip', body: 'Use the thumbs up/down buttons to train your feed, or the clip icon to save a passage as a draft idea for a post.' },
        { title: 'Filter by interest group', body: 'Use the interest group tabs in the left sidebar to narrow the stream to topics you care about, or search for a specific subject.' },
      ]}
    />
    <MotionConfig transition={spring.smooth}>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── No news APIs banner ────────────────────────────── */}
        {!hasNewsApis && (
          <div className="shrink-0 mx-6 mt-4 rounded-xl border border-amber-200/60 bg-amber-50/60 p-3 flex items-center gap-2.5">
            <PlugZap className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>No news APIs connected.</strong>{' '}
              Go to <strong>Settings → News</strong> to add NewsAPI, GNews, or others.
            </p>
          </div>
        )}

        {/* ── Main content area ─ flex row: sidebar | feed | right panel ── */}
        <div className="flex-1 min-h-0 overflow-hidden relative flex">

          {/* ── Collapsible left sidebar: interest groups nav ──────────────── */}
          <AnimatePresence initial={false}>
            {isPanelOpen && (
              <motion.aside
                key="left-panel"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 220, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="shrink-0 border-r border-border/40 bg-white/20 dark:bg-white/[0.03] overflow-y-auto overflow-x-hidden flex flex-col gap-1 p-3"
                style={{ minWidth: 0 }}
              >
            <div className="flex items-center justify-between mb-1">
              <p className="px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">Sections</p>
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-muted hover:bg-white/50 hover:text-ink transition-colors"
                title="Collapse panel"
              >
                <X size={13} />
              </button>
            </div>

            {/* Loading skeleton */}
            {groupsLoading && (
              <div className="flex flex-col gap-1 mt-1">
                {[100, 80, 110, 90].map((w, i) => (
                  <motion.div
                    key={i}
                    className="h-7 rounded-lg bg-violet-100"
                    style={{ width: `${w}%` }}
                    variants={skeletonPulseVariants}
                    animate="animate"
                  />
                ))}
              </div>
            )}

            {!groupsLoading && (
              <>
                {/* All button */}
                <button
                  type="button"
                  onClick={() => handleSelectGroup(null)}
                  className={[
                    'flex items-center gap-2 w-full rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors border',
                    activeGroupId === null
                      ? 'bg-primary/10 border-primary/25 text-primary'
                      : 'text-muted hover:bg-white/40 hover:text-ink border-transparent',
                  ].join(' ')}
                >
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  All groups
                </button>

                {/* Group items */}
                {interestGroups.map(group => {
                  const isActive = activeGroupId === group.id;
                  return (
                    <div key={group.id} className="group/item relative">
                      <button
                        type="button"
                        onClick={() => handleSelectGroup(group.id)}
                        style={isActive ? { background: group.color + '22', borderColor: group.color + '55' } : {}}
                        className={[
                          'flex items-center gap-2 w-full rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors border',
                          isActive
                            ? 'text-ink'
                            : 'text-muted hover:bg-white/40 hover:text-ink border-transparent',
                        ].join(' ')}
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: group.color }}
                        />
                        <span className="flex-1 truncate text-left">{group.name}</span>
                      </button>
                      {/* Edit/delete appear on group/item hover */}
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/item:flex gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleStartEditGroup(group); }}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Edit group"
                        >
                          <Pencil size={10} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void handleDeleteGroup(group.id); }}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Delete group"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* New Group button */}
                <button
                  type="button"
                  onClick={() => { setShowCreateGroup(v => !v); setEditingGroupId(null); }}
                  className="flex items-center gap-1.5 w-full rounded-xl px-2 py-1.5 text-xs font-semibold text-primary/70 border border-dashed border-primary/40 hover:border-primary hover:text-primary transition-colors mt-1"
                >
                  <Plus size={12} />
                  New group
                </button>

                {/* Create group form — inside sidebar */}
                <AnimatePresence>
                  {showCreateGroup && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-xl border border-primary/20 bg-white/60 p-2.5 backdrop-blur-sm mt-1"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-ink">New Group</span>
                        <button
                          type="button"
                          onClick={() => setShowCreateGroup(false)}
                          className="text-muted hover:text-ink"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          placeholder="Group name *"
                          value={newGroupName}
                          onChange={e => setNewGroupName(e.target.value)}
                          className="h-7 w-full rounded-lg border border-border/60 bg-white/80 px-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                        <input
                          type="text"
                          placeholder="Topics (comma-sep.)"
                          value={newGroupTopics}
                          onChange={e => setNewGroupTopics(e.target.value)}
                          className="h-7 w-full rounded-lg border border-border/60 bg-white/80 px-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                        <input
                          type="text"
                          placeholder="Domains (optional)"
                          value={newGroupDomains}
                          onChange={e => setNewGroupDomains(e.target.value)}
                          className="h-7 w-full rounded-lg border border-border/60 bg-white/80 px-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <div className="flex gap-1 flex-1">
                          {COLOR_PRESETS.map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setNewGroupColor(color)}
                              style={{ backgroundColor: color }}
                              className={[
                                'h-4 w-4 rounded-full transition-transform',
                                newGroupColor === color ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'hover:scale-110',
                              ].join(' ')}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 flex gap-1.5 justify-end">
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
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Edit group form — inside sidebar */}
                <AnimatePresence>
                  {editingGroupId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-xl border border-amber-200/60 bg-amber-50/60 p-2.5 backdrop-blur-sm mt-1"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-ink">Edit Group</span>
                        <button type="button" onClick={handleCancelEditGroup} className="text-muted hover:text-ink">
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          placeholder="Group name *"
                          value={editGroupName}
                          onChange={e => setEditGroupName(e.target.value)}
                          className="h-7 w-full rounded-lg border border-border/60 bg-white/80 px-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                        <input
                          type="text"
                          placeholder="Topics (comma-sep.)"
                          value={editGroupTopics}
                          onChange={e => setEditGroupTopics(e.target.value)}
                          className="h-7 w-full rounded-lg border border-border/60 bg-white/80 px-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                        <input
                          type="text"
                          placeholder="Domains (optional)"
                          value={editGroupDomains}
                          onChange={e => setEditGroupDomains(e.target.value)}
                          className="h-7 w-full rounded-lg border border-border/60 bg-white/80 px-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <div className="flex gap-1 flex-1">
                          {COLOR_PRESETS.map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditGroupColor(color)}
                              style={{ backgroundColor: color }}
                              className={[
                                'h-4 w-4 rounded-full transition-transform',
                                editGroupColor === color ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'hover:scale-110',
                              ].join(' ')}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 flex gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={handleCancelEditGroup}
                          className="h-6 rounded-md px-2 text-xs text-muted hover:text-ink"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleUpdateGroup()}
                          disabled={!editGroupName.trim() || savingEditGroup}
                          className="h-6 rounded-md bg-primary px-2 text-xs font-semibold text-primary-fg disabled:opacity-50 hover:bg-primary/90"
                        >
                          {savingEditGroup ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* LIBRARY header */}
            <p className="px-2.5 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">
              Library
            </p>
            <button
              type="button"
              className="flex items-center gap-2 w-full rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-white/40 hover:text-ink transition-colors"
            >
              <Bookmark size={13} />
              <span className="flex-1 text-left">Saved</span>
              <span className="text-[11px] text-muted/70 font-medium tabular-nums">
                {Object.values(feedbackMap).filter(v => v === 'up').length}
              </span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 w-full rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-white/40 hover:text-ink transition-colors"
            >
              <Scissors size={13} />
              <span className="flex-1 text-left">Clippings</span>
              <span className="text-[11px] text-muted/70 font-medium tabular-nums">{clips.length}</span>
            </button>

            {/* FILTERS header */}
            <p className="px-2.5 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">
              Filters
            </p>
            <div className="relative" ref={platformDropdownRef}>
              <button
                type="button"
                onClick={() => setPlatformDropdownOpen(v => !v)}
                className="w-full h-[34px] px-3 bg-white/65 border border-border rounded-[9px] text-[12.5px] font-medium text-ink flex items-center gap-1.5 hover:border-primary hover:text-primary transition-colors"
              >
                <Layers size={13} />
                <span className="flex-1 text-left">All platforms</span>
                <ChevronDown size={13} className="text-muted/60" />
              </button>
              {platformDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-border/60 bg-white/95 backdrop-blur-md shadow-xl overflow-hidden">
                  {['All platforms', 'YouTube', 'Instagram', 'LinkedIn'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPlatformDropdownOpen(false)}
                      className="w-full text-left px-3 py-2 text-xs text-ink hover:bg-primary/5 transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Center: scrollable feed column */}
          <div className="flex-1 min-w-0 overflow-y-auto">

            {/* Masthead — only visible in feed mode */}
            {!openDraft && !debateMode && (
              <>
                <header className="px-10 pt-6 pb-3.5">
                  <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-secondary mb-1">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  <h1 className="text-[32px] leading-[1.05] font-bold tracking-[-0.018em] text-ink mt-1">
                    Today&apos;s Briefing
                  </h1>
                  <p className="text-[13px] text-muted mt-1.5 flex items-center gap-1.5">
                    {filteredDisplayArticles.length} stories curated
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={refreshing || feedLoading}
                      className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-[5px] text-muted hover:text-primary transition-colors disabled:opacity-40"
                      title="Refresh now"
                    >
                      <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                  </p>
                  {/* Search + filter pills row */}
                  <div className="flex items-center gap-2.5 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsPanelOpen(v => !v)}
                      className={[
                        'h-[38px] px-3 border rounded-[10px] text-[12.5px] font-medium flex items-center gap-1.5 transition-colors',
                        isPanelOpen
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-white/75 border-border text-muted hover:border-primary hover:text-primary',
                      ].join(' ')}
                      title={isPanelOpen ? 'Hide filters' : 'Show filters'}
                    >
                      <SlidersHorizontal size={13} />
                      Filters
                    </button>
                    <div className="relative flex-1 max-w-[520px]">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery || topic}
                        onChange={e => {
                          const val = e.target.value;
                          setTopic(val);
                          handleSearchQueryChange(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSearch();
                          }
                        }}
                        placeholder="Search by title, source, or topic…"
                        className="w-full h-[38px] pl-9 pr-3 bg-white/75 border border-border rounded-[10px] text-[13.5px] text-ink placeholder:text-muted/60 focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary transition-all"
                      />
                      {(searchQuery || topic) && (
                        <button
                          type="button"
                          onClick={() => { setTopic(''); handleSearchQueryChange(''); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <TrendingFilters
                      region={region} genre={genre} windowDays={windowDays}
                      onRegionChange={setRegion} onGenreChange={setGenre} onWindowChange={setWindowDays}
                    />
                  </div>
                </header>

                {/* Tabs row */}
                <div className="flex items-center gap-[22px] px-10 border-b border-border/55">
                  {(['latest', 'trending', 'foryou'] as const).map(sort => {
                    const labels: Record<string, string> = { latest: 'Latest', trending: 'Trending', foryou: 'For You' };
                    return (
                      <button
                        key={sort}
                        type="button"
                        onClick={() => setFeedSort(sort)}
                        className={[
                          'text-[13px] py-3 border-b-2 transition-colors leading-none font-medium',
                          feedSort === sort
                            ? 'text-primary border-primary font-semibold'
                            : 'text-muted border-transparent hover:text-ink',
                        ].join(' ')}
                      >
                        {labels[sort]}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <AnimatePresence mode="wait">

              {/* Draft mode */}
              {openDraft && (
                <motion.div key="draft" {...motionProps} className="h-full">
                  <DraftContextView
                    row={openDraft}
                    clips={clips}
                    idToken={idToken}
                    api={api}
                    onBack={() => setOpenDraft(null)}
                    onUnassignClip={handleUnassignClip}
                  />
                </motion.div>
              )}

              {/* Debate mode */}
              {!openDraft && openArticle && debateMode && (
                <motion.div key="debate" {...motionProps} className="p-6 pb-16">
                  <DebateModeView
                    article={openArticle}
                    idToken={idToken}
                    api={api}
                    onBack={() => setDebateMode(false)}
                    onClip={handleClip}
                    isClipped={clippedUrls.has(openArticle.url)}
                  />
                </motion.div>
              )}

              {/* Reading feed mode */}
              {!openDraft && !debateMode && (
                <motion.div key="feed" {...motionProps} className="px-10 py-5 pb-20 max-w-[760px]">

                  {/* No interest groups — onboarding */}
                  {hasNoGroups && !searchTopic && (
                    <motion.div
                      className="flex flex-col items-center justify-center py-20 text-center"
                      variants={containerVariants} initial="hidden" animate="show"
                    >
                      <motion.div
                        className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200/60 shadow-glass"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Settings2 className="text-primary" size={32} />
                      </motion.div>
                      <motion.h3 variants={fadeUpVariants} className="text-xl font-semibold text-ink mb-2">
                        Your feed is empty
                      </motion.h3>
                      <motion.p variants={fadeUpVariants} className="text-sm text-muted max-w-xs leading-relaxed mb-5">
                        Add interest groups in the sidebar to start seeing news here.
                      </motion.p>
                      <motion.button
                        variants={fadeUpVariants}
                        type="button"
                        onClick={() => setShowCreateGroup(true)}
                        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-sm hover:bg-primary/90 transition-colors"
                      >
                        <Plus size={15} />
                        Add interest group
                      </motion.button>
                    </motion.div>
                  )}

                  {/* Generic empty state */}
                  {!hasNoGroups && !activeGroupId && !leftPanelLoading && !hasError && !searchTopic && displayArticles.length === 0 && (
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
                        Select an interest group in the sidebar or enter a topic to discover content.
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

                  {/* News article feed */}
                  {(leftPanelLoading || displayArticles.length > 0) && (
                    <motion.div className="mb-4" variants={cardItemVariants} initial="hidden" animate="show">
                      <FeedLeftPanel
                        articles={filteredDisplayArticles}
                        loading={leftPanelLoading}
                        onClip={handleClip}
                        onOpen={(a) => { setDebateMode(false); setOpenArticle(a); }}
                        clippedUrls={clippedUrls}
                        feedbackMap={feedbackMap}
                        onThumbsUp={handleThumbsUp}
                        onThumbsDown={handleThumbsDown}
                      />
                    </motion.div>
                  )}

                  {/* Platform feed sections */}
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
                        {visiblePanels.length > 1 && (
                          <motion.div variants={cardItemVariants}>
                            <TrendingGraph data={data} onNodeClick={handleNodeClick} />
                          </motion.div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  )}

                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Right: full-height curated sidebar */}
          {!openArticle && !openDraft && !debateMode && (
            <div className="w-[300px] shrink-0 border-l border-border/40 hidden lg:flex flex-col overflow-hidden">
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
                  news: trendingSearch.data?.articles?.length
                    ? trendingSearch.data.articles
                    : feedArticles.length > 0
                      ? feedArticles
                      : (data?.news ?? []),
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
          )}

          {/* Article detail side-sheet — slides over from right */}
          <AnimatePresence>
            {!openDraft && openArticle && !debateMode && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/40"
                  onClick={() => { setOpenArticle(null); setDebateMode(false); }}
                />
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="fixed inset-y-0 right-0 z-50 w-full lg:w-[480px] max-w-full overflow-y-auto bg-background border-l border-border/50 shadow-2xl"
                >
                  <div className="p-6 pb-16">
                    <ArticleDetailView
                      article={openArticle}
                      idToken={idToken}
                      api={api}
                      onBack={() => { setOpenArticle(null); setDebateMode(false); }}
                      onClip={handleClip}
                      onClipPassage={(text) => handleClipPassage(text, openArticle)}
                      isClipped={clippedUrls.has(openArticle.url)}
                      rows={rows}
                      onOpenDraft={(row) => { setOpenArticle(null); setDebateMode(false); setOpenDraft(row); }}
                      onDebate={() => setDebateMode(true)}
                      asSheet={true}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* ClipsDock — fixed positioned, outside AnimatePresence */}
        <ClipsDock
          clips={clips}
          rows={rows ?? []}
          idToken={idToken}
          api={api}
          onDeleteClip={handleDeleteClip}
          onUpdateClip={handleUpdateClip}
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
    </>
  );
}
