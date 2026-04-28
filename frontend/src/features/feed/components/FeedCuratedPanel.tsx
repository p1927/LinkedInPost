import { useState } from 'react';
import { Scissors, Newspaper } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerVariants, cardItemVariants, skeletonPulseVariants } from '@/lib/motion';
import { TrendingWordsWidget } from '../../trending/components/TrendingWordsWidget';
import { RecommendationsPanel } from '../../trending/components/RecommendationsPanel';
import { YouTubePanel } from '../../trending/components/YouTubePanel';
import { InstagramPanel } from '../../trending/components/InstagramPanel';
import { LinkedInPanel } from '../../trending/components/LinkedInPanel';
import type { NewsArticle, YouTubeVideo, InstagramPost, LinkedInPost, TrendingWord } from '../../trending/types';
import type { TrendingCapabilities } from '../../trending/hooks/useTrending';
import type { BackendApi } from '@/services/backendApi';
import type { NewsProviderKeys } from '@/services/configService';

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
      className="group relative flex gap-2.5 rounded-lg p-2 hover:bg-white/40 cursor-pointer transition-all"
      onClick={() => onOpen(article)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(article)}
    >
      {/* Thumbnail 40×40 */}
      <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-violet-50">
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Newspaper className="text-violet-300" size={16} />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1 pr-5">
        <p className="text-xs font-medium text-ink line-clamp-1 leading-snug">
          {article.title}
        </p>
        <p className="mt-0.5 text-[11px] text-muted truncate">
          {article.source} · {relativeTime}
        </p>
      </div>

      {/* Scissor button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClip(article); }}
        title={isClipped ? 'Already clipped' : 'Clip article'}
        className={[
          'absolute top-1 right-1 rounded p-0.5 transition-all',
          'opacity-0 group-hover:opacity-100',
          isClipped
            ? 'text-primary'
            : 'text-muted hover:text-primary',
        ].join(' ')}
      >
        <Scissors size={12} />
      </button>
    </div>
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
  const [activeTab, setActiveTab] = useState<TabId>('top10');

  // Top 10: first 10 articles sorted by recency
  const top10Articles = [...trendingData.news]
    .sort((a, b) => {
      try {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      } catch {
        return 0;
      }
    })
    .slice(0, 10);

  // Evergreen: same articles sorted by description length desc (proxy for depth)
  const evergreenArticles = [...trendingData.news]
    .sort((a, b) => (b.description?.length ?? 0) - (a.description?.length ?? 0))
    .slice(0, 10);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'top10':
        return (
          <div className="space-y-0.5">
            {loading ? (
              [0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="flex gap-2.5 rounded-lg p-2"
                  variants={skeletonPulseVariants}
                  animate="animate"
                >
                  <div className="shrink-0 w-10 h-10 rounded-md bg-violet-100" />
                  <div className="flex-1 space-y-1.5 pt-0.5">
                    <div className="h-2.5 rounded bg-violet-100 w-full" />
                    <div className="h-2 rounded bg-violet-50 w-1/2" />
                  </div>
                </motion.div>
              ))
            ) : top10Articles.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted leading-relaxed px-3">
                Search a topic or select an interest group to see today's top articles
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
        );

      case 'evergreen':
        return (
          <div className="space-y-0.5">
            <p className="px-2 pb-2 text-[11px] text-muted leading-relaxed">
              Background reading — deeper, more substantive articles on this topic
            </p>
            {loading ? (
              [0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="flex gap-2.5 rounded-lg p-2"
                  variants={skeletonPulseVariants}
                  animate="animate"
                >
                  <div className="shrink-0 w-10 h-10 rounded-md bg-violet-100" />
                  <div className="flex-1 space-y-1.5 pt-0.5">
                    <div className="h-2.5 rounded bg-violet-100 w-full" />
                    <div className="h-2 rounded bg-violet-50 w-1/2" />
                  </div>
                </motion.div>
              ))
            ) : evergreenArticles.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted leading-relaxed px-3">
                Search a topic or select an interest group to see background articles
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
        );

      case 'youtube':
        return <YouTubePanel videos={trendingData.youtube} />;

      case 'instagram':
        return <InstagramPanel posts={trendingData.instagram} />;

      case 'linkedin':
        return <LinkedInPanel posts={trendingData.linkedin} loading={loading} />;
    }
  };

  return (
    <motion.aside
      className="flex flex-col gap-4 w-72 xl:w-80 shrink-0"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Tab panel */}
      <motion.div variants={cardItemVariants} className="glass-panel rounded-2xl overflow-hidden">

        {/* Tab pills */}
        <div className="overflow-x-auto flex gap-1 px-3 pt-3 pb-2 border-b border-border/40">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-ink cursor-pointer',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-3 max-h-[480px] overflow-y-auto">
          {renderTabContent()}
        </div>
      </motion.div>

      {/* Divider */}
      {(trendingWords.length > 0 || recommendedTopics.length > 0) && (
        <div className="border-t border-border/30" />
      )}

      {/* Trending Words */}
      {trendingWords.length > 0 && onSelectWord && (
        <motion.div variants={cardItemVariants}>
          <TrendingWordsWidget words={trendingWords} onSelectWord={onSelectWord} />
        </motion.div>
      )}

      {/* Recommended Topics */}
      {recommendedTopics.length > 0 && onSelectTopic && (
        <motion.div variants={cardItemVariants}>
          <RecommendationsPanel topics={recommendedTopics} onSelectTopic={onSelectTopic} />
        </motion.div>
      )}
    </motion.aside>
  );
}
