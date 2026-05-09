import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { containerVariants, cardItemVariants } from '@/lib/motion';
import { FeedArticleCard } from './FeedArticleCard';
import type { NewsArticle } from '../../trending/types';
import type { ArticleFeedbackMap, FeedVote } from '../types';

export interface FeedLeftPanelProps {
  articles: NewsArticle[];
  loading: boolean;
  onClip: (article: NewsArticle) => void;
  onOpen: (article: NewsArticle) => void;
  clippedUrls: Set<string>;
  feedbackMap?: ArticleFeedbackMap;
  onThumbsUp?: (article: NewsArticle) => void;
  onThumbsDown?: (article: NewsArticle) => void;
  highlightedIndex?: number;
  onHighlightedIndexChange?: (index: number) => void;
  readArticles?: Set<string>;
  showUnreadOnly?: boolean;
  onShowUnreadOnlyChange?: (v: boolean) => void;
  /** Topics of the active interest group — shown as filter pills with article counts */
  groupTopics?: string[];
  /** Article count per topic, keyed by topic string */
  topicCounts?: Record<string, number>;
}

function SkeletonCard() {
  return (
    <div className="py-4 border-b border-border/40 animate-pulse space-y-2">
      <div className="h-[17px] bg-slate-100 rounded w-3/4" />
      <div className="h-3 bg-slate-100 rounded w-full" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
      <div className="h-2.5 bg-slate-100 rounded w-1/3 mt-1" />
    </div>
  );
}

const BATCH_SIZE = 20;

export function FeedLeftPanel({
  articles,
  loading,
  onClip,
  onOpen,
  clippedUrls,
  feedbackMap = {},
  onThumbsUp,
  onThumbsDown,
  highlightedIndex = -1,
  readArticles = new Set(),
  showUnreadOnly = false,
  onShowUnreadOnlyChange,
  groupTopics = [],
  topicCounts = {},
}: FeedLeftPanelProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Topic counts — default to computing from articles when not explicitly provided
  const computedTopicCounts = useMemo(() => {
    if (Object.keys(topicCounts).length > 0) return topicCounts;
    if (!groupTopics.length) return {};
    const counts: Record<string, number> = {};
    for (const t of groupTopics) counts[t] = 0;
    for (const a of articles) {
      const title = a.title.toLowerCase();
      const desc = (a.description ?? '').toLowerCase();
      for (const t of groupTopics) {
        if (title.includes(t.toLowerCase()) || desc.includes(t.toLowerCase())) {
          counts[t] = (counts[t] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [articles, groupTopics, topicCounts]);

  // Sort thumbs-down articles to the bottom; apply showUnreadOnly filter
  const sortedArticles = useMemo(() => {
    const downvoted = articles.filter(a => feedbackMap[a.url] === 'down');
    const rest = articles.filter(a => {
      if (feedbackMap[a.url] === 'down') return false;
      if (showUnreadOnly) return !readArticles.has(a.url);
      return true;
    });
    return [...rest, ...downvoted];
  }, [articles, feedbackMap, readArticles, showUnreadOnly]);

  // Reset visible count when articles change
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [articles]);

  // IntersectionObserver to load more
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && visibleCount < sortedArticles.length) {
          setVisibleCount(prev => Math.min(prev + BATCH_SIZE, sortedArticles.length));
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, sortedArticles.length]);

  // Initial loading skeleton
  if (loading) {
    return (
      <div>
        {[0, 1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  // Empty state
  if (sortedArticles.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted">
        No articles yet. Select an interest group or search for a topic.
      </div>
    );
  }

  const visibleArticles = sortedArticles.slice(0, visibleCount);
  const hasMore = visibleCount < sortedArticles.length;

  return (
    <div>
      {/* Unread filter toggle */}
      {onShowUnreadOnlyChange && (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/40">
          <button
            type="button"
            onClick={() => onShowUnreadOnlyChange(!showUnreadOnly)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              showUnreadOnly
                ? 'bg-primary/10 border-primary/25 text-primary'
                : 'bg-white/40 border-border/60 text-muted hover:text-ink hover:bg-white/60',
            ].join(' ')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            Show unread only
          </button>
          {!showUnreadOnly && readArticles.size > 0 && (
            <span className="text-[11px] text-muted">
              {readArticles.size} read
            </span>
          )}
        </div>
      )}

      {/* Topic filter pills with article counts */}
      {groupTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {groupTopics.map(topic => {
            const count = computedTopicCounts[topic] ?? 0;
            return (
              <span
                key={topic}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-primary/8 text-primary border border-primary/20"
              >
                {topic}
                <span className="text-[10px] opacity-70">({count})</span>
              </span>
            );
          })}
        </div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {visibleArticles.map((article, localIdx) => (
          <motion.div key={article.id} variants={cardItemVariants}>
            <FeedArticleCard
              article={article}
              onClip={onClip}
              onOpen={onOpen}
              isClipped={clippedUrls.has(article.url)}
              isRead={readArticles.has(article.url)}
              isHighlighted={localIdx === highlightedIndex}
              feedbackVote={feedbackMap[article.url] as FeedVote | undefined}
              onThumbsUp={onThumbsUp}
              onThumbsDown={onThumbsDown}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Sentinel for IntersectionObserver auto-loading */}
      <div ref={sentinelRef} className="h-1" />

      {/* Continue button as alternate manual load-more trigger */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount(prev => Math.min(prev + BATCH_SIZE, sortedArticles.length))}
          className="w-full mt-6 py-3 text-[12.5px] font-semibold border border-border rounded-xl transition-colors text-ink bg-white/50 hover:bg-white/80 hover:border-border-strong"
        >
          Continue · {sortedArticles.length - visibleCount} more stories
        </button>
      )}
    </div>
  );
}
