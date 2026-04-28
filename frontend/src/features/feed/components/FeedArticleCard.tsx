import { useState } from 'react';
import { Scissors, ThumbsUp, ThumbsDown } from 'lucide-react';
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

export function FeedArticleCard({ article, onClip, onOpen, isClipped, feedbackVote, onThumbsUp, onThumbsDown }: FeedArticleCardProps) {
  const [clipping, setClipping] = useState(false);

  function handleClip(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (clipping) return;
    setClipping(true);
    onClip(article);
    setTimeout(() => setClipping(false), 600);
  }

  function handleCardClick(e: React.MouseEvent) {
    e.preventDefault();
    onOpen(article);
  }

  const isDownvoted = feedbackVote === 'down';

  return (
    <div
      className={[
        'group relative flex gap-3 rounded-xl border border-white/40 bg-white/30 p-3 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-white/50 hover:ring-2 hover:ring-primary/10 cursor-pointer',
        isDownvoted ? 'opacity-40 hover:opacity-60' : '',
      ].join(' ')}
      onClick={handleCardClick}
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden">
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              const parent = e.currentTarget.parentElement as HTMLElement;
              parent.classList.add(sourceColor(article.source), 'flex', 'items-center', 'justify-center');
              parent.innerHTML = `<span class="text-white text-lg font-bold">${article.source[0]?.toUpperCase() ?? '?'}</span>`;
            }}
          />
        ) : (
          <div className={`w-full h-full ${sourceColor(article.source)} flex items-center justify-center`}>
            <span className="text-white text-lg font-bold">{article.source[0]?.toUpperCase() ?? '?'}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-24">
        <p className="text-xs font-semibold leading-snug text-ink group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </p>
        {article.description && (
          <p className="text-[10px] text-muted mt-0.5 line-clamp-1">{article.description}</p>
        )}
        <span className="hidden group-hover:inline-flex items-center gap-0.5 text-[10px] text-muted/60 mt-0.5">
          <Scissors size={9} />
          Clip passage
        </span>
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted">
          <span className="truncate text-primary/80">{article.source}</span>
          <span>·</span>
          <span className="shrink-0">{formatRelativeTime(article.publishedAt)}</span>
        </div>
      </div>

      {/* Action buttons: thumbs up, thumbs down, scissors */}
      <div className="absolute top-2.5 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onThumbsUp?.(article); }}
          title="Helpful"
          className={[
            'flex items-center justify-center w-6 h-6 rounded-full transition-all duration-150',
            feedbackVote === 'up'
              ? 'bg-green-100 text-green-600'
              : 'text-muted hover:bg-green-50 hover:text-green-500',
          ].join(' ')}
        >
          <ThumbsUp size={12} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onThumbsDown?.(article); }}
          title="Not helpful"
          className={[
            'flex items-center justify-center w-6 h-6 rounded-full transition-all duration-150',
            feedbackVote === 'down'
              ? 'bg-red-100 text-red-500'
              : 'text-muted hover:bg-red-50 hover:text-red-400',
          ].join(' ')}
        >
          <ThumbsDown size={12} />
        </button>
        <button
          type="button"
          onClick={handleClip}
          title={isClipped ? 'Already clipped' : 'Clip this article'}
          className={[
            'flex items-center justify-center w-6 h-6 rounded-full transition-all duration-150',
            isClipped ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-primary/10 hover:text-primary',
          ].join(' ')}
        >
          <Scissors
            size={12}
            className={clipping ? 'scale-[1.3] text-green-500 transition-transform' : ''}
          />
        </button>
      </div>
    </div>
  );
}
