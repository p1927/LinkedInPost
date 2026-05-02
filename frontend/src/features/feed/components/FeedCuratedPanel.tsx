import { useState } from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { skeletonPulseVariants } from '@/lib/motion';
import { TrendingWordsWidget } from '../../trending/components/TrendingWordsWidget';
import { RecommendationsPanel } from '../../trending/components/RecommendationsPanel';
import { formatRelativeTime } from '@/lib/relativeTime';
import { YouTubePanel } from '../../trending/components/YouTubePanel';
import { InstagramPanel } from '../../trending/components/InstagramPanel';
import { LinkedInPanel } from '../../trending/components/LinkedInPanel';
import type {
  NewsArticle, YouTubeVideo, InstagramPost, LinkedInPost, TrendingWord,
} from '../../trending/types';
import type { TrendingCapabilities } from '../../trending/hooks/useTrending';
import type { BackendApi } from '@/services/backendApi';
import type { NewsProviderKeys } from '@/services/configService';
import type { InterestGroup } from '../types';

const SOURCE_HEX = ['#3b82f6','#22c55e','#8b5cf6','#f97316','#f43f5e','#14b8a6','#6366f1','#f59e0b'];
function sourceHexFn(source: string): string {
  let n = 0;
  for (const c of source) n += c.charCodeAt(0);
  return SOURCE_HEX[n % SOURCE_HEX.length];
}

type TabId = 'top10' | 'evergreen' | 'youtube' | 'instagram' | 'linkedin';

const TABS: { id: TabId; label: string }[] = [
  { id: 'top10', label: 'Top 10' },
  { id: 'evergreen', label: 'Evergreen' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
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
  /** Active interest group — used to filter Top 10 */
  activeGroup: InterestGroup | null;
  /** All interest groups — for group-topic lookups */
  interestGroups: InterestGroup[];
}

function ArticleSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} className="grid grid-cols-[18px_1fr] gap-2.5 py-1.5" variants={skeletonPulseVariants} animate="animate">
          <div className="h-3 rounded bg-violet-100" />
          <div className="space-y-1.5">
            <div className="h-3 rounded bg-violet-100 w-full" />
            <div className="h-2 rounded bg-violet-50 w-1/2" />
          </div>
        </motion.div>
      ))}
    </>
  );
}

/** Ranked Top 10 articles — AI-priority sorted, limited to 10. */
function Top10Tab({
  articles, loading, onOpenArticle,
}: {
  articles: NewsArticle[];
  loading: boolean;
  onOpenArticle: (a: NewsArticle) => void;
}) {
  const top10 = [...articles]
    .sort((a, b) => {
      // Score by: recency + description length (proxy for substance)
      const scoreA = (a.description?.length ?? 0) * 1 + (a.publishedAt ? new Date(a.publishedAt).getTime() : 0);
      const scoreB = (b.description?.length ?? 0) * 1 + (b.publishedAt ? new Date(b.publishedAt).getTime() : 0);
      return scoreB - scoreA;
    })
    .slice(0, 10);

  return (
    <div className="space-y-4">
      {loading ? (
        <ArticleSkeleton count={5} />
      ) : top10.length === 0 ? (
        <p className="text-xs text-muted py-4 text-center">No articles available.</p>
      ) : (
        top10.map((article, i) => (
          <div
            key={article.id ?? i}
            className="grid grid-cols-[20px_1fr] gap-2.5 cursor-pointer group"
            onClick={() => onOpenArticle(article)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onOpenArticle(article)}
          >
            <span className="text-primary/60 text-[13px] font-bold pt-0.5">{i + 1}</span>
            <div>
              <div className="text-ink font-semibold text-[12.5px] leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {article.title}
              </div>
              <div className="text-muted text-[11px] mt-0.5 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-[2px]" style={{ background: sourceHexFn(article.source) }} />
                <span className="font-medium">{article.source}</span>
                <span>·</span>
                <span>{formatRelativeTime(article.publishedAt)}</span>
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-auto text-muted/40 hover:text-primary"
                    aria-label="Open article"
                  >
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/** Evergreen — articles with longer descriptions (timeless background reading). */
function EvergreenTab({
  articles, loading, onOpenArticle,
}: {
  articles: NewsArticle[];
  loading: boolean;
  onOpenArticle: (a: NewsArticle) => void;
}) {
  const evergreen = [...articles]
    .filter(a => (a.description?.length ?? 0) > 100)
    .sort((a, b) => (b.description?.length ?? 0) - (a.description?.length ?? 0))
    .slice(0, 8);

  return (
    <div className="space-y-4">
      {loading ? (
        <ArticleSkeleton count={4} />
      ) : evergreen.length === 0 ? (
        <p className="text-xs text-muted py-4 text-center">No evergreen content available.</p>
      ) : (
        evergreen.map((article, i) => (
          <div key={article.id ?? i} className="cursor-pointer group" onClick={() => onOpenArticle(article)}>
            <div className="text-ink font-medium text-[12.5px] leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1">
              {article.title}
            </div>
            {article.description && (
              <p className="text-[11.5px] text-muted leading-relaxed line-clamp-2 italic">
                {article.description.slice(0, 120)}…
              </p>
            )}
            <div className="text-[10.5px] text-muted/60 mt-1 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-[2px]" style={{ background: sourceHexFn(article.source) }} />
              <span className="font-medium">{article.source}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function FeedCuratedPanel({
  trendingData,
  trendingWords = [],
  recommendedTopics = [],
  loading,
  onOpenArticle,
  onSelectWord,
  onSelectTopic,
  activeGroup,
}: FeedCuratedPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('top10');

  const allNews = trendingData.news ?? [];

  // Filter articles by active interest group topics when in Top 10 or Evergreen
  const groupFilteredNews = activeGroup
    ? allNews.filter(a => {
        const title = a.title.toLowerCase();
        const desc = (a.description ?? '').toLowerCase();
        return activeGroup.topics.some(
          t => title.includes(t.toLowerCase()) || desc.includes(t.toLowerCase()),
        );
      })
    : allNews;

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Panel header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/40">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">{todayLabel}</span>
        <RefreshCw size={12} className="text-muted/60" />
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-border/40 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'shrink-0 px-3 py-2 text-[11px] font-semibold border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-muted border-transparent hover:text-ink',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-16 min-h-0">
        {activeTab === 'top10' && (
          <Top10Tab articles={groupFilteredNews} loading={loading} onOpenArticle={onOpenArticle} />
        )}
        {activeTab === 'evergreen' && (
          <EvergreenTab articles={groupFilteredNews} loading={loading} onOpenArticle={onOpenArticle} />
        )}
        {activeTab === 'youtube' && (
          trendingData.youtube.length > 0
            ? <YouTubePanel videos={trendingData.youtube} />
            : <p className="text-xs text-muted text-center py-6">No YouTube videos available.</p>
        )}
        {activeTab === 'instagram' && (
          trendingData.instagram.length > 0
            ? <InstagramPanel posts={trendingData.instagram} />
            : <p className="text-xs text-muted text-center py-6">No Instagram posts available.</p>
        )}
        {activeTab === 'linkedin' && (
          trendingData.linkedin.length > 0
            ? <LinkedInPanel posts={trendingData.linkedin} />
            : <p className="text-xs text-muted text-center py-6">No LinkedIn posts available.</p>
        )}
      </div>

      {/* Trending Words + Suggested Topics — shown below all tab content */}
      <div className="shrink-0 border-t border-border/40 px-4 py-3 space-y-4">
        {trendingWords.length > 0 && onSelectWord && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-secondary mb-2">Trending words</div>
            <TrendingWordsWidget words={trendingWords} onSelectWord={onSelectWord} />
          </div>
        )}
        {recommendedTopics.length > 0 && onSelectTopic && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-secondary mb-2">Suggested topics</div>
            <RecommendationsPanel topics={recommendedTopics} onSelectTopic={onSelectTopic} />
          </div>
        )}
      </div>
    </div>
  );
}