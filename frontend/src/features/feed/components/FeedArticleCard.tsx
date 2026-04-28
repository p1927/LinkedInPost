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
  const isDownvoted = feedbackVote === 'down';
  const description = article.description?.trim() ?? '';

  function handleClip(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (clipping) return;
    setClipping(true);
    onClip(article);
    setTimeout(() => setClipping(false), 600);
  }

  return (
    <div
      className={[
        'group relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm cursor-pointer',
        'transition-all duration-200 hover:shadow-md hover:border-slate-300',
        isDownvoted ? 'opacity-40 hover:opacity-60' : '',
      ].join(' ')}
      onClick={() => onOpen(article)}
    >
      {/* Hero image — fixed height, full card width */}
      <div className="relative h-[168px] w-full overflow-hidden rounded-t-lg">
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              el.style.display = 'none';
              const parent = el.parentElement as HTMLElement;
              const col = sourceColor(article.source);
              parent.classList.add(col, 'flex', 'items-center', 'justify-center');
              parent.innerHTML += `<span class="text-white text-4xl font-bold">${article.source[0]?.toUpperCase() ?? '?'}</span>`;
            }}
          />
        ) : (
          <div className={`h-full w-full ${sourceColor(article.source)} flex items-center justify-center`}>
            <span className="text-white text-4xl font-bold">{article.source[0]?.toUpperCase() ?? '?'}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Source + time metadata */}
        <p className="text-[11px] text-slate-400 mb-1.5">
          <span className="font-medium text-slate-500">{article.source}</span>
          {' · '}
          {formatRelativeTime(article.publishedAt)}
        </p>

        {/* Title */}
        <p className="text-sm font-semibold leading-snug text-slate-900 line-clamp-2">
          {article.title}
        </p>

        {/* Description — always shown if present, clamped at 2 lines */}
        {description && (
          <p className="mt-1.5 text-[12px] leading-snug text-slate-500 line-clamp-2">
            {description}
          </p>
        )}

        {/* Hover-only action row — bottom of content area */}
        <div
          className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onThumbsUp?.(article); }}
            aria-label="Mark helpful"
            className={[
              'h-7 w-7 rounded-full grid place-items-center transition-colors',
              feedbackVote === 'up'
                ? 'bg-green-100 text-green-600'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
            ].join(' ')}
          >
            <ThumbsUp size={12} aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onThumbsDown?.(article); }}
            aria-label="Not helpful"
            className={[
              'h-7 w-7 rounded-full grid place-items-center transition-colors',
              feedbackVote === 'down'
                ? 'bg-red-100 text-red-500'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
            ].join(' ')}
          >
            <ThumbsDown size={12} aria-hidden />
          </button>
          <button
            type="button"
            onClick={handleClip}
            aria-label={isClipped ? 'Already clipped' : 'Clip article'}
            className={[
              'h-7 w-7 rounded-full grid place-items-center transition-colors',
              isClipped
                ? 'bg-violet-100 text-violet-600'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
            ].join(' ')}
          >
            <Scissors
              size={12}
              className={clipping ? 'scale-125 transition-transform' : ''}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </div>
  );
}
