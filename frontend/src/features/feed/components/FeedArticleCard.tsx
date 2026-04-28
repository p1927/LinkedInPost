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
        'flex flex-col rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm overflow-hidden cursor-pointer transition-all hover:border-primary/30 hover:bg-white/50 hover:ring-2 hover:ring-primary/10',
        isDownvoted ? 'opacity-40 hover:opacity-60' : '',
      ].join(' ')}
      onClick={handleCardClick}
    >
      {/* Image block — full width, fixed height */}
      <div className="h-36 w-full overflow-hidden shrink-0">
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt=""
            className="h-36 w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              const parent = e.currentTarget.parentElement as HTMLElement;
              parent.classList.add(sourceColor(article.source), 'flex', 'items-center', 'justify-center');
              parent.innerHTML = `<span class="text-white text-3xl font-bold">${article.source[0]?.toUpperCase() ?? '?'}</span>`;
            }}
          />
        ) : (
          <div className={`h-36 w-full ${sourceColor(article.source)} flex items-center justify-center`}>
            <span className="text-white text-3xl font-bold">{article.source[0]?.toUpperCase() ?? '?'}</span>
          </div>
        )}
      </div>

      {/* Content block */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="text-sm font-semibold leading-snug text-ink line-clamp-2">
          {article.title}
        </p>
        {description ? (
          <p className="text-xs leading-relaxed text-muted line-clamp-2">{description}</p>
        ) : (
          <p className="text-xs italic text-muted/60">No summary available.</p>
        )}

        {/* Footer — always visible */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/30">
          {/* Left: source + time */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted min-w-0">
            <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${sourceColor(article.source)}`} />
            <span className="truncate font-medium text-primary/80">{article.source}</span>
            <span>·</span>
            <span className="shrink-0">{formatRelativeTime(article.publishedAt)}</span>
          </div>

          {/* Right: action buttons — always visible */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onThumbsUp?.(article); }}
              aria-label="Mark article helpful"
              title="Helpful"
              className={[
                'flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-150 opacity-100',
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
                'flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-150 opacity-100',
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
                'flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-150 opacity-100',
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
      </div>
    </div>
  );
}
