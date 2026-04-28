import { useState } from 'react';
import { Scissors, ThumbsDown, ThumbsUp } from 'lucide-react';
import { formatRelativeTime } from '@/lib/relativeTime';
import type { NewsArticle } from '../../trending/types';
import type { FeedVote } from '../types';

const SOURCE_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-amber-500',
];

function sourceColor(source: string): string {
  let n = 0;
  for (const c of source) n += c.charCodeAt(0);
  return SOURCE_COLORS[n % SOURCE_COLORS.length];
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

  function handleClip(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (clipping) return;
    setClipping(true);
    onClip(article);
    setTimeout(() => setClipping(false), 600);
  }

  function handleCardClick() {
    onOpen(article);
  }

  const isDownvoted = feedbackVote === 'down';
  const description = article.description?.trim() ?? '';

  return (
    <div
      className={[
        'group relative flex gap-3 rounded-xl border border-white/40 bg-white/30 p-3 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-white/50 hover:ring-2 hover:ring-primary/10 cursor-pointer',
        isDownvoted ? 'opacity-40 hover:opacity-60' : '',
      ].join(' ')}
      onClick={handleCardClick}
    >
      {/* Thumbnail — bigger square (96px) for image-prominent layout */}
      <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden">
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              const parent = e.currentTarget.parentElement as HTMLElement;
              parent.classList.add(sourceColor(article.source), 'flex', 'items-center', 'justify-center');
              parent.innerHTML = `<span class="text-white text-2xl font-bold">${article.source[0]?.toUpperCase() ?? '?'}</span>`;
            }}
          />
        ) : (
          <div className={`w-full h-full ${sourceColor(article.source)} flex items-center justify-center`}>
            <span className="text-white text-2xl font-bold">{article.source[0]?.toUpperCase() ?? '?'}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug text-ink group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </p>
        {description ? (
          <p className="mt-1.5 text-[12px] leading-snug text-muted line-clamp-2">{description}</p>
        ) : (
          <p className="mt-1.5 text-[12px] italic text-muted/60">No summary available.</p>
        )}
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted">
          <span className="truncate text-primary/80 font-medium">{article.source}</span>
          <span>·</span>
          <span className="shrink-0">{formatRelativeTime(article.publishedAt)}</span>
        </div>
      </div>

      {/* Hover-only action toolbar — top-right, white pill background */}
      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full border border-white/60 bg-white/95 p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onThumbsUp?.(article); }}
          aria-label="Mark article helpful"
          title="Helpful"
          className={[
            'flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-150',
            feedbackVote === 'up'
              ? 'bg-green-100 text-green-600'
              : 'text-muted hover:bg-green-50 hover:text-green-500',
          ].join(' ')}
        >
          <ThumbsUp size={13} aria-hidden />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onThumbsDown?.(article); }}
          aria-label="Mark article not helpful"
          title="Not helpful"
          className={[
            'flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-150',
            feedbackVote === 'down'
              ? 'bg-red-100 text-red-500'
              : 'text-muted hover:bg-red-50 hover:text-red-400',
          ].join(' ')}
        >
          <ThumbsDown size={13} aria-hidden />
        </button>
        <button
          type="button"
          onClick={handleClip}
          aria-label={isClipped ? 'Already clipped' : 'Clip article'}
          title={isClipped ? 'Already clipped' : 'Clip this article'}
          className={[
            'flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-150',
            isClipped ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-primary/10 hover:text-primary',
          ].join(' ')}
        >
          <Scissors
            size={13}
            className={clipping ? 'scale-[1.3] text-green-500 transition-transform' : ''}
            aria-hidden
          />
        </button>
      </div>
    </div>
  );
}
