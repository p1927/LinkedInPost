import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Scissors, Bookmark } from 'lucide-react';
import { formatRelativeTime } from '@/lib/relativeTime';
import type { NewsArticle } from '../../trending/types';
import type { FeedVote } from '../types';

const SOURCE_HEX = ['#3b82f6','#22c55e','#8b5cf6','#f97316','#f43f5e','#14b8a6','#6366f1','#f59e0b'];
function sourceHex(source: string): string {
  let n = 0;
  for (const c of source) n += c.charCodeAt(0);
  return SOURCE_HEX[n % SOURCE_HEX.length];
}

export interface FeedArticleCardProps {
  article: NewsArticle;
  onClip: (article: NewsArticle) => void;
  onOpen: (article: NewsArticle) => void;
  isClipped?: boolean;
  feedbackVote?: FeedVote;
  onThumbsUp?: (article: NewsArticle) => void;
  onThumbsDown?: (article: NewsArticle) => void;
}

export function FeedArticleCard({
  article,
  onClip,
  onOpen,
  isClipped,
  feedbackVote,
  onThumbsUp,
  onThumbsDown,
}: FeedArticleCardProps) {
  const [clipping, setClipping] = useState(false);
  const isDownvoted = feedbackVote === 'down';
  const deck = article.description?.trim() ?? '';

  function handleClip(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (clipping) return;
    setClipping(true);
    onClip(article);
    setTimeout(() => setClipping(false), 600);
  }

  return (
    <article
      className={[
        'group py-4 border-b border-border/40 cursor-pointer',
        isDownvoted ? 'opacity-40 hover:opacity-60' : '',
      ].join(' ')}
      onClick={() => onOpen(article)}
    >
      {/* Title */}
      <h2
        className={[
          'text-[17px] leading-snug font-medium tracking-[-0.005em] mb-1.5',
          isDownvoted ? 'text-muted' : 'text-ink',
        ].join(' ')}
      >
        {article.title}
      </h2>

      {/* Deck */}
      {deck && (
        <p className="text-[13px] leading-relaxed text-muted line-clamp-2 mb-2 max-w-[620px]">
          {deck}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted font-medium">
        <span
          className="inline-block w-2.5 h-2.5 rounded-[3px] shrink-0 flex-shrink-0"
          style={{ background: sourceHex(article.source) }}
        />
        <span className="text-ink font-semibold">{article.source}</span>
        <span className="w-[2.5px] h-[2.5px] rounded-full bg-border-strong flex-shrink-0" />
        <span>{formatRelativeTime(article.publishedAt)}</span>
      </div>

      {/* Hover-only actions — reserve space to prevent layout shift */}
      <div
        className="flex gap-0.5 items-center mt-2.5 min-h-[26px] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onThumbsUp?.(article); }}
          aria-label="Mark helpful"
          className={[
            'w-[26px] h-[26px] inline-flex items-center justify-center rounded-[5px] border-none bg-transparent transition-colors',
            feedbackVote === 'up' ? 'text-primary' : 'text-muted/60 hover:text-primary',
          ].join(' ')}
        >
          <ThumbsUp size={13} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onThumbsDown?.(article); }}
          aria-label="Not helpful"
          className={[
            'w-[26px] h-[26px] inline-flex items-center justify-center rounded-[5px] border-none bg-transparent transition-colors',
            feedbackVote === 'down' ? 'text-rose-500' : 'text-muted/60 hover:text-primary',
          ].join(' ')}
        >
          <ThumbsDown size={13} />
        </button>
        <button
          type="button"
          onClick={handleClip}
          aria-label={isClipped ? 'Already clipped' : 'Clip article'}
          className={[
            'w-[26px] h-[26px] inline-flex items-center justify-center rounded-[5px] border-none bg-transparent transition-colors',
            isClipped ? 'text-primary' : 'text-muted/60 hover:text-primary',
          ].join(' ')}
        >
          <Scissors size={13} className={clipping ? 'scale-125 transition-transform' : ''} />
        </button>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="Bookmark"
          className="w-[26px] h-[26px] inline-flex items-center justify-center rounded-[5px] border-none bg-transparent text-muted/60 hover:text-primary transition-colors"
        >
          <Bookmark size={13} />
        </button>
      </div>
    </article>
  );
}
