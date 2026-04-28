import { useState } from 'react';
import { Scissors, Newspaper, Sparkles, BookOpen, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { skeletonPulseVariants } from '@/lib/motion';
import { TrendingWordsWidget } from '../../trending/components/TrendingWordsWidget';
import { RecommendationsPanel } from '../../trending/components/RecommendationsPanel';
import { YouTubePanel } from '../../trending/components/YouTubePanel';
import { InstagramPanel } from '../../trending/components/InstagramPanel';
import { LinkedInPanel } from '../../trending/components/LinkedInPanel';
import type { NewsArticle, YouTubeVideo, InstagramPost, LinkedInPost, TrendingWord } from '../../trending/types';
import type { TrendingCapabilities } from '../../trending/hooks/useTrending';
import type { BackendApi } from '@/services/backendApi';
import type { NewsProviderKeys } from '@/services/configService';

type PlatformFilter = 'all' | 'youtube' | 'instagram' | 'linkedin';

const PLATFORM_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: 'All Platforms' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
];

interface FeedCuratedPanelProps {
  idToken: string;
  api: BackendApi;
  searchTopic: string;
  newsProviderKeys?: NewsProviderKeys;
  capabilities: TrendingCapabilities;
  trendingData: {
    youtube: YouTubeVideo[];
    instagram: InstagramPost[];
    linkedin: LinkedInPost[];
    news: NewsArticle[];
  };
  trendingWords?: TrendingWord[];
  recommendedTopics?: string[];
  loading: boolean;
  onClip: (article: NewsArticle) => void;
  clippedUrls: Set<string>;
  onOpenArticle: (article: NewsArticle) => void;
  onSelectWord?: (word: string) => void;
  onSelectTopic?: (topic: string) => void;
}

// ── Compact article card ──────────────────────────────────────────────────────

interface CompactArticleCardProps {
  article: NewsArticle;
  onClip: (article: NewsArticle) => void;
  onOpen: (article: NewsArticle) => void;
  isClipped: boolean;
}

function CompactArticleCard({ article, onClip, onOpen, isClipped }: CompactArticleCardProps) {
  const relativeTime = (() => {
    try {
      const d = new Date(article.publishedAt);
      const diff = Date.now() - d.getTime();
      const h = Math.floor(diff / 3_600_000);
      if (h < 1) return 'just now';
      if (h < 24) return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    } catch {
      return article.publishedAt;
    }
  })();

  return (
    <div
      className="group relative flex gap-2.5 rounded-lg p-2 hover:bg-white/50 cursor-pointer transition-all"
      onClick={() => onOpen(article)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(article)}
    >
      <div className="shrink-0 w-9 h-9 rounded-md overflow-hidden bg-violet-50">
        {article.imageUrl ? (
          <img src={article.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Newspaper className="text-violet-300" size={14} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 pr-5">
        <p className="text-xs font-medium text-ink line-clamp-2 leading-snug">{article.title}</p>
        <p className="mt-0.5 text-[10px] text-muted truncate">{article.source} · {relativeTime}</p>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClip(article); }}
        title={isClipped ? 'Already clipped' : 'Clip article'}
        className={[
          'absolute top-1.5 right-1.5 rounded p-0.5 transition-all',
          'opacity-0 group-hover:opacity-100',
          isClipped ? 'text-primary' : 'text-muted hover:text-primary',
        ].join(' ')}
      >
        <Scissors size={11} />
      </button>
    </div>
  );
}

// ── Section skeleton ──────────────────────────────────────────────────────────

function ArticleSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} className="flex gap-2.5 rounded-lg p-2" variants={skeletonPulseVariants} animate="animate">
          <div className="shrink-0 w-9 h-9 rounded-md bg-violet-100" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-2.5 rounded bg-violet-100 w-full" />
            <div className="h-2 rounded bg-violet-50 w-1/2" />
          </div>
        </motion.div>
      ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FeedCuratedPanel({
  trendingData,
  trendingWords = [],
  recommendedTopics = [],
  loading,
  onClip,
  clippedUrls,
  onOpenArticle,
  onSelectWord,
  onSelectTopic,
}: FeedCuratedPanelProps) {
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const top10Articles = [...trendingData.news]
    .sort((a, b) => {
      try { return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(); }
      catch { return 0; }
    })
    .slice(0, 10);

  const evergreenArticles = [...trendingData.news]
    .sort((a, b) => (b.description?.length ?? 0) - (a.description?.length ?? 0))
    .slice(0, 8);

  const activeLabel = PLATFORM_OPTIONS.find(o => o.value === platformFilter)?.label ?? 'All Platforms';

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Panel header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/40">
        <span className="text-sm font-semibold text-ink">Curated</span>

        {/* Platform filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen(v => !v)}
            className="flex items-center gap-1 h-7 rounded-lg border border-border/50 bg-white/60 px-2.5 text-xs font-medium text-muted hover:text-ink hover:bg-white/80 transition-colors"
          >
            {activeLabel}
            <ChevronDown size={11} className={filterOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>

          {filterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-xl border border-border/50 bg-white/95 backdrop-blur-md shadow-xl overflow-hidden">
                {PLATFORM_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setPlatformFilter(opt.value); setFilterOpen(false); }}
                    className={[
                      'w-full text-left px-3 py-2 text-xs transition-colors',
                      platformFilter === opt.value
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-ink hover:bg-white/60',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-16 min-h-0">

        {/* All platforms view */}
        {platformFilter === 'all' && (
          <div className="space-y-0">

            {/* Top 10 Today */}
            <div className="px-4 pt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={12} className="text-violet-500 shrink-0" />
                <span className="text-xs font-semibold text-ink">Top 10 Today</span>
                <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 shrink-0">
                  Hourly
                </span>
              </div>
              <div className="space-y-0.5">
                {loading ? (
                  <ArticleSkeleton count={5} />
                ) : top10Articles.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted leading-relaxed px-2">
                    Select an interest group or search a topic to see today's top articles.
                  </p>
                ) : (
                  top10Articles.map((article) => (
                    <CompactArticleCard
                      key={article.id}
                      article={article}
                      onClip={onClip}
                      onOpen={onOpenArticle}
                      isClipped={clippedUrls.has(article.url)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/30 mx-4 my-4" />

            {/* Evergreen Reads */}
            <div className="px-4">
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen size={12} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold text-ink">Evergreen Reads</span>
                <span className="ml-auto rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-medium text-emerald-700 shrink-0">
                  Timeless
                </span>
              </div>
              <p className="text-[10px] text-muted leading-relaxed mb-2">
                Deeper, more substantive background reading.
              </p>
              <div className="space-y-0.5">
                {loading ? (
                  <ArticleSkeleton count={3} />
                ) : evergreenArticles.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted leading-relaxed px-2">
                    Search a topic or select an interest group to see background articles.
                  </p>
                ) : (
                  evergreenArticles.map((article) => (
                    <CompactArticleCard
                      key={article.id}
                      article={article}
                      onClip={onClip}
                      onOpen={onOpenArticle}
                      isClipped={clippedUrls.has(article.url)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Trending Words */}
            {trendingWords.length > 0 && onSelectWord && (
              <>
                <div className="border-t border-border/30 mx-4 my-4" />
                <div className="px-4">
                  <TrendingWordsWidget words={trendingWords} onSelectWord={onSelectWord} />
                </div>
              </>
            )}

            {/* Recommended Topics */}
            {recommendedTopics.length > 0 && onSelectTopic && (
              <>
                <div className="border-t border-border/30 mx-4 my-4" />
                <div className="px-4 pb-4">
                  <RecommendationsPanel topics={recommendedTopics} onSelectTopic={onSelectTopic} />
                </div>
              </>
            )}
          </div>
        )}

        {/* YouTube filter */}
        {platformFilter === 'youtube' && (
          <div className="p-4">
            {trendingData.youtube.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted">No YouTube content for this topic yet.</p>
            ) : (
              <YouTubePanel videos={trendingData.youtube} />
            )}
          </div>
        )}

        {/* Instagram filter */}
        {platformFilter === 'instagram' && (
          <div className="p-4">
            {trendingData.instagram.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted">No Instagram content for this topic yet.</p>
            ) : (
              <InstagramPanel posts={trendingData.instagram} />
            )}
          </div>
        )}

        {/* LinkedIn filter */}
        {platformFilter === 'linkedin' && (
          <div className="p-4">
            {trendingData.linkedin.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted">No LinkedIn content for this topic yet.</p>
            ) : (
              <LinkedInPanel posts={trendingData.linkedin} loading={loading} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
