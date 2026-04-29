import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { skeletonPulseVariants } from '@/lib/motion';
import { TrendingWordsWidget } from '../../trending/components/TrendingWordsWidget';
import { RecommendationsPanel } from '../../trending/components/RecommendationsPanel';
import { formatRelativeTime } from '@/lib/relativeTime';
import type { NewsArticle, YouTubeVideo, InstagramPost, LinkedInPost, TrendingWord } from '../../trending/types';
import type { TrendingCapabilities } from '../../trending/hooks/useTrending';
import type { BackendApi } from '@/services/backendApi';
import type { NewsProviderKeys } from '@/services/configService';

const SOURCE_HEX = ['#3b82f6','#22c55e','#8b5cf6','#f97316','#f43f5e','#14b8a6','#6366f1','#f59e0b'];
function sourceHexFn(source: string): string {
  let n = 0;
  for (const c of source) n += c.charCodeAt(0);
  return SOURCE_HEX[n % SOURCE_HEX.length];
}

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

export function FeedCuratedPanel({
  trendingData,
  trendingWords = [],
  recommendedTopics = [],
  loading,
  onOpenArticle,
  onSelectWord,
  onSelectTopic,
}: FeedCuratedPanelProps) {
  const allArticles = trendingData.news ?? [];

  const top4Articles = [...allArticles]
    .sort((a, b) => {
      try { return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(); }
      catch { return 0; }
    })
    .slice(0, 4);

  const quoteArticle = allArticles.find(a => (a.description?.length ?? 0) > 120) ?? null;

  const sourceCounts = allArticles.reduce<Record<string, number>>((acc, a) => {
    acc[a.source] = (acc[a.source] ?? 0) + 1;
    return acc;
  }, {});
  const topSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Panel header — date + refresh */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border/40">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">{todayLabel}</span>
        <RefreshCw size={12} className="text-muted/60" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-16 min-h-0">

        {/* Most Discussed */}
        <div className="mb-7">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-secondary mb-3 pb-2 border-b border-border">
            Most discussed
          </div>
          {loading ? (
            <ArticleSkeleton count={4} />
          ) : top4Articles.length === 0 ? (
            <p className="py-3 text-xs text-muted">No articles yet.</p>
          ) : (
            top4Articles.map((article, i) => (
              <div
                key={article.id}
                className="grid grid-cols-[18px_1fr] gap-2.5 py-1.5 cursor-pointer group"
                onClick={() => onOpenArticle(article)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onOpenArticle(article)}
              >
                <span className="text-muted/60 text-[13px] font-semibold pt-0.5">{i + 1}</span>
                <div>
                  <div className="text-ink font-semibold text-[13px] leading-snug group-hover:text-primary transition-colors">{article.title}</div>
                  <div className="text-muted text-[11.5px] mt-0.5">
                    {article.source} · {formatRelativeTime(article.publishedAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quote of the Day */}
        {quoteArticle && (
          <div className="mb-7">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-secondary mb-3 pb-2 border-b border-border">
              Quote of the day
            </div>
            <div className="relative px-4 py-5 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/15 overflow-hidden">
              <span
                className="absolute top-[-8px] left-3 font-bold text-[72px] leading-none text-primary/15 pointer-events-none select-none"
                style={{ fontFamily: 'Poppins, serif' }}
              >
                &ldquo;
              </span>
              <p className="relative text-[14px] leading-relaxed text-ink italic font-medium mb-3">
                {quoteArticle.description?.slice(0, 160)}…
              </p>
              <div className="border-t border-primary/15 pt-2.5">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-primary">
                  {quoteArticle.source}
                </div>
                <div className="text-[11.5px] text-muted italic mt-0.5">
                  {quoteArticle.title?.slice(0, 60)}…
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trending Words */}
        {trendingWords.length > 0 && onSelectWord && (
          <div className="mb-7">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-secondary mb-3 pb-2 border-b border-border">
              Trending words
            </div>
            <TrendingWordsWidget words={trendingWords} onSelectWord={onSelectWord} />
          </div>
        )}

        {/* Suggested Topics */}
        {recommendedTopics.length > 0 && onSelectTopic && (
          <div className="mb-7">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-secondary mb-3 pb-2 border-b border-border">
              Suggested topics
            </div>
            <RecommendationsPanel topics={recommendedTopics} onSelectTopic={onSelectTopic} />
          </div>
        )}

        {/* Top Sources · 7d */}
        {topSources.length > 0 && (
          <div className="mb-7">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-secondary mb-3 pb-2 border-b border-border">
              Top sources · 7d
            </div>
            {topSources.map(([source, count]) => (
              <div
                key={source}
                className="flex items-center gap-2.5 py-1.5 text-[13px] text-ink cursor-pointer hover:text-primary transition-colors"
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-[3px] flex-shrink-0"
                  style={{ background: sourceHexFn(source) }}
                />
                <span className="flex-1">{source}</span>
                <span className="text-muted/60 text-[12px] tabular-nums font-medium">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
