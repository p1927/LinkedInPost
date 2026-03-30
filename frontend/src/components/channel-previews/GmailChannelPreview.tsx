import { ImageOff, Paperclip } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import { normalizePreviewImageUrl } from '../../services/imageUrls';
import { Button } from '@/components/ui/button';
import { cn } from '../../lib/cn';
import type { ChannelPreviewProps } from './types';
import { GM } from './platformTokens';
import { previewAuthorInitials, renderTaggedText, resolvePreviewImageUrls } from './shared';

function truncateLine(s: string, max: number): string {
  const t = s.trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function GmailChannelPreview({
  optionNumber,
  text,
  imageUrl,
  imageUrls,
  selected,
  expanded,
  onSelect,
  onToggleExpanded,
  mode = 'hero',
  previewChannel,
  layout = 'default',
  className,
  forceExpanded = false,
  pickMode = false,
  previewAuthorName,
  onOpenMedia,
  gmailTo = '',
  gmailSubject = '',
}: ChannelPreviewProps) {
  const isCarousel = mode === 'carousel';
  const isPickCarousel = pickMode && isCarousel;
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [imageRetryKey, setImageRetryKey] = useState(0);
  const [pickBodyExpanded, setPickBodyExpanded] = useState(false);
  const urls = resolvePreviewImageUrls(imageUrl, imageUrls);
  const resolvedImageUrl = normalizePreviewImageUrl(urls[0] || '');
  const shouldClamp =
    !forceExpanded &&
    (isPickCarousel || text.length > 360 || text.split('\n').length > 8);
  const bodyExpanded = forceExpanded || expanded || (isPickCarousel && pickBodyExpanded);
  const isSidebar = layout === 'sidebar';
  const showAsSelected = !isSidebar && selected;
  const lineClampLines = isSidebar ? 10 : isPickCarousel ? 6 : 8;

  const fromLabel = previewAuthorName?.trim() || 'Your name';
  const fromInitials = previewAuthorInitials(fromLabel);
  const toDisplay = gmailTo?.trim() ? truncateLine(gmailTo, isSidebar ? 42 : 56) : 'Recipients not set';
  const subjectDisplay = gmailSubject?.trim() ? truncateLine(gmailSubject, isSidebar ? 48 : 72) : '(No subject)';

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageLoadFailed(false);
  }, [resolvedImageUrl, urls.join('|')]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPickBodyExpanded(false);
  }, [text, pickMode, optionNumber]);

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={isSidebar ? -1 : 0}
      role="region"
      aria-label={
        isPickCarousel
          ? `Draft ${optionNumber}, select to open in editor`
          : `Preview draft ${optionNumber}`
      }
      className={cn(
        'group relative w-full text-left outline-none transition-colors duration-200',
        isSidebar
          ? 'cursor-default rounded-xl p-2'
          : isCarousel
            ? 'h-full min-h-0 cursor-pointer rounded-3xl p-3'
            : 'cursor-pointer rounded-2xl p-3 sm:p-4',
        showAsSelected
          ? 'border-2 border-[color:var(--gm-ring)] bg-white shadow-lg ring-4 ring-[color:var(--gm-ring-soft)]'
          : cn(
              'border-2 border-border bg-canvas focus-visible:ring-4 focus-visible:ring-[color:var(--gm-ring)]/25',
              !isSidebar &&
                'hover:border-[color:var(--gm-ring)]/40 hover:bg-surface hover:shadow-card',
            ),
        className,
      )}
      style={
        {
          '--gm-ring': GM.blue,
          '--gm-ring-soft': `${GM.blue}26`,
        } as CSSProperties
      }
    >
      {!isSidebar && (
        <div className={`flex items-center justify-between gap-3 px-1 ${isCarousel ? 'mb-2' : 'mb-3'}`}>
          <div>
            <p className="font-heading text-xs font-bold uppercase tracking-widest text-muted">Draft {optionNumber}</p>
            <p className="mt-0.5 text-sm text-ink/80">
              {isPickCarousel ? 'Select to open in editor' : 'Gmail (compose)'}
            </p>
          </div>
          <div
            className={cn(
              'flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-xs font-bold transition-colors',
              selected ? 'text-white shadow-md' : 'border bg-white group-hover:bg-[color:var(--gm-shell)]',
            )}
            style={
              selected
                ? { backgroundColor: GM.blue }
                : { borderColor: GM.border, color: GM.blue }
            }
          >
            {selected ? (isCarousel ? 'Active' : 'Selected') : isPickCarousel ? 'Open' : `Pick ${optionNumber}`}
          </div>
        </div>
      )}

      <div
        className={cn(
          'overflow-hidden rounded-2xl border',
          isSidebar ? 'p-2' : 'p-2.5 sm:p-3',
        )}
        style={{
          backgroundColor: GM.shell,
          borderColor: GM.border,
        }}
      >
        <div
          className="overflow-hidden rounded-xl border bg-white shadow-sm"
          style={{ borderColor: GM.border }}
        >
          <div
            className={cn(
              'flex items-center gap-2 border-b px-2.5 py-2',
              isSidebar ? 'py-1.5' : 'sm:px-3 sm:py-2',
            )}
            style={{ borderColor: GM.border, backgroundColor: `${GM.red}08` }}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[11px] font-bold text-white"
              style={{ backgroundColor: GM.red }}
              aria-hidden
            >
              M
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: GM.muted }}>
              New message
            </span>
          </div>

          <div className={cn('space-y-0', isSidebar ? 'text-[0.72rem]' : 'text-sm')}>
            <div className="flex min-h-[2rem] items-center gap-2 border-b px-2.5 py-1.5 sm:px-3" style={{ borderColor: GM.border }}>
              <span className="w-12 shrink-0 text-[0.65rem] font-medium uppercase tracking-wide" style={{ color: GM.muted }}>
                From
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: GM.blue }}
                  aria-hidden
                >
                  {fromInitials}
                </div>
                <span className="min-w-0 truncate font-medium" style={{ color: GM.text }}>
                  {fromLabel}
                </span>
              </div>
            </div>
            <div className="flex min-h-[2rem] items-start gap-2 border-b px-2.5 py-1.5 sm:px-3" style={{ borderColor: GM.border }}>
              <span className="w-12 shrink-0 pt-0.5 text-[0.65rem] font-medium uppercase tracking-wide" style={{ color: GM.muted }}>
                To
              </span>
              <span className="min-w-0 flex-1 break-words font-normal leading-snug" style={{ color: GM.text }}>
                {toDisplay}
              </span>
            </div>
            <div className="flex min-h-[2rem] items-center gap-2 border-b px-2.5 py-1.5 sm:px-3" style={{ borderColor: GM.border }}>
              <span className="w-12 shrink-0 text-[0.65rem] font-medium uppercase tracking-wide" style={{ color: GM.muted }}>
                Subj
              </span>
              <span className="min-w-0 flex-1 truncate font-medium" style={{ color: GM.text }}>
                {subjectDisplay}
              </span>
            </div>
          </div>

          {urls.length > 1 && !imageLoadFailed ? (
            <div className="border-b px-2.5 py-2 sm:px-3" style={{ borderColor: GM.border }}>
              <div className="flex items-center gap-2 text-[0.65rem] font-medium" style={{ color: GM.muted }}>
                <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Inline images ({urls.length})</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {urls.map((u, i) => (
                  <div
                    key={`${u}-${i}`}
                    className="overflow-hidden rounded-lg border"
                    style={{ borderColor: GM.border, maxWidth: isSidebar ? '5rem' : '6.5rem' }}
                  >
                    <img
                      src={normalizePreviewImageUrl(u)}
                      alt=""
                      className="h-20 w-full object-cover object-center sm:h-24"
                      onError={() => setImageLoadFailed(true)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : resolvedImageUrl && !imageLoadFailed ? (
            <div className="border-b px-2.5 py-2 sm:px-3" style={{ borderColor: GM.border }}>
              <div className="flex items-center gap-2 text-[0.65rem] font-medium" style={{ color: GM.muted }}>
                <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Inline image</span>
              </div>
              <div className="mt-2 overflow-hidden rounded-lg border" style={{ borderColor: GM.border }}>
                <img
                  key={`${resolvedImageUrl}-${imageRetryKey}`}
                  src={resolvedImageUrl}
                  alt=""
                  className={cn('w-full object-cover object-center', isSidebar ? 'max-h-28' : 'max-h-36 sm:max-h-40')}
                  onError={() => setImageLoadFailed(true)}
                />
              </div>
            </div>
          ) : urls.length ? (
            <div className="border-b px-2.5 py-2 sm:px-3" style={{ borderColor: GM.border }}>
              <div
                className="flex items-center gap-2 rounded-lg border border-dashed px-2 py-2"
                style={{ borderColor: GM.border }}
              >
                <ImageOff className="h-4 w-4 shrink-0 opacity-60" style={{ color: GM.muted }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-medium" style={{ color: GM.text }}>
                    Image failed to load
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2 text-[0.65rem]"
                      onClick={(e: MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        setImageLoadFailed(false);
                        setImageRetryKey((k) => k + 1);
                      }}
                    >
                      Retry
                    </Button>
                    {onOpenMedia ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[0.65rem]"
                        onClick={(e: MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          onOpenMedia();
                        }}
                      >
                        Media
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className={cn('px-2.5 py-2 sm:px-3 sm:py-2.5', isSidebar ? 'min-h-[4.5rem]' : 'min-h-[5.5rem]')}>
            <div
              className={cn(
                'whitespace-pre-wrap font-sans leading-relaxed',
                !bodyExpanded && shouldClamp ? 'overflow-hidden' : undefined,
              )}
              style={{
                color: GM.text,
                fontSize: isSidebar ? '0.78rem' : undefined,
                ...(!bodyExpanded && shouldClamp
                  ? {
                      display: '-webkit-box',
                      WebkitLineClamp: lineClampLines,
                      WebkitBoxOrient: 'vertical',
                    }
                  : {}),
              }}
            >
              {text.trim() ? renderTaggedText(text, previewChannel) : <span style={{ color: GM.muted }}>(Message body)</span>}
            </div>
            {shouldClamp ? (
              <button
                type="button"
                className="mt-1.5 text-[0.7rem] font-semibold"
                style={{ color: GM.blue }}
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  if (isPickCarousel) setPickBodyExpanded((v) => !v);
                  onToggleExpanded();
                }}
              >
                {bodyExpanded ? 'Show less' : 'Read more'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
