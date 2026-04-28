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
}

function SkeletonCard() {
  return (
    <div className="flex gap-3 rounded-xl border border-white/40 bg-white/30 p-3 animate-pulse">
      <div className="w-14 h-14 rounded-lg bg-gray-200/60 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200/60 rounded w-3/4" />
        <div className="h-3 bg-gray-200/60 rounded w-1/2" />
        <div className="h-2 bg-gray-200/60 rounded w-1/3" />
      </div>
    </div>
  );
}

const BATCH_SIZE = 10;

export function FeedLeftPanel({ articles, loading, onClip, onOpen, clippedUrls, feedbackMap = {}, onThumbsUp, onThumbsDown }: FeedLeftPanelProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Sort thumbs-down articles to the bottom
  const sortedArticles = useMemo(() => {
    const downvoted = articles.filter(a => feedbackMap[a.url] === 'down');
    const rest = articles.filter(a => feedbackMap[a.url] !== 'down');
    return [...rest, ...downvoted];
  }, [articles, feedbackMap]);

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
      <div className="space-y-3">
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
    <div className="space-y-3">
      <motion.div
        className="space-y-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {visibleArticles.map(article => (
          <motion.div key={article.id} variants={cardItemVariants}>
            <FeedArticleCard
              article={article}
              onClip={onClip}
              onOpen={onOpen}
              isClipped={clippedUrls.has(article.url)}
              feedbackVote={feedbackMap[article.url] as FeedVote | undefined}
              onThumbsUp={onThumbsUp}
              onThumbsDown={onThumbsDown}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Sentinel + load-more skeleton */}
      <div ref={sentinelRef} className="h-1" />
      {hasMore && (
        <div className="space-y-3 pt-1">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      )}
    </div>
  );
}
