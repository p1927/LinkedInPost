import { Bookmark, Heart, ImageOff, MessageCircle, MoreHorizontal, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { normalizePreviewImageUrl } from '../../services/imageUrls';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '../../lib/cn';
import type { ChannelPreviewProps } from './types';
import { IG } from './platformTokens';
import { instagramPhoneCardWidthClass, previewAuthorInitials, renderTaggedText, resolvePreviewImageUrls } from './shared';

export function InstagramChannelPreview({
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
}: ChannelPreviewProps) {
  const authorLabel = previewAuthorName?.trim() || 'your_channel';
  const authorInitials = previewAuthorInitials(authorLabel);
  const isCarousel = mode === 'carousel';
  const isPickCarousel = pickMode && isCarousel;
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [imageRetryKey, setImageRetryKey] = useState(0);
  const [pickBodyExpanded, setPickBodyExpanded] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselViewportRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const skipNextCarouselClickRef = useRef(false);
  const urls = resolvePreviewImageUrls(imageUrl, imageUrls);
  const resolvedImageUrl = normalizePreviewImageUrl(urls[0] || '');
  const shouldClamp =
    !forceExpanded &&
    (isPickCarousel || text.length > 220 || text.split('\n').length > 4);
  const bodyExpanded = forceExpanded || expanded || (isPickCarousel && pickBodyExpanded);
  const isSidebar = layout === 'sidebar';
  const showAsSelected = !isSidebar && selected;
  const compact = isCarousel || isSidebar;
  const lineClampLines = isSidebar ? 6 : isPickCarousel ? 4 : isCarousel ? 3 : 4;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageLoadFailed(false);
  }, [resolvedImageUrl, urls.join('|')]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarouselIndex(0);
  }, [urls.join('|')]);

  const goCarouselPrev = useCallback(() => {
    setCarouselIndex((i) => Math.max(0, i - 1));
  }, []);

  const goCarouselNext = useCallback(() => {
    setCarouselIndex((i) => Math.min(urls.length - 1, i + 1));
  }, [urls.length]);

  const markCarouselNavigatedByTouch = useCallback(() => {
    skipNextCarouselClickRef.current = true;
    window.setTimeout(() => {
      skipNextCarouselClickRef.current = false;
    }, 400);
  }, []);

  const onCarouselTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onCarouselTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || urls.length < 2) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const el = carouselViewportRef.current;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) {
        if (dx < 0) {
          goCarouselNext();
          markCarouselNavigatedByTouch();
        } else {
          goCarouselPrev();
          markCarouselNavigatedByTouch();
        }
        return;
      }
      if (Math.abs(dx) < 14 && Math.abs(dy) < 14 && el) {
        const rect = el.getBoundingClientRect();
        const rx = (t.clientX - rect.left) / rect.width;
        if (rx < 0.32) {
          goCarouselPrev();
          markCarouselNavigatedByTouch();
        } else if (rx > 0.68) {
          goCarouselNext();
          markCarouselNavigatedByTouch();
        }
      }
    },
    [goCarouselNext, goCarouselPrev, markCarouselNavigatedByTouch, urls.length],
  );

  const onCarouselKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (urls.length < 2) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        goCarouselPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        goCarouselNext();
      }
    },
    [goCarouselNext, goCarouselPrev, urls.length],
  );

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
        isSidebar ? 'cursor-default' : 'cursor-pointer',
        isSidebar ? 'rounded-xl p-2' : isCarousel ? 'h-full min-h-0 rounded-3xl p-3' : 'rounded-2xl p-3 sm:p-4',
        showAsSelected
          ? 'border-2 border-[#d62976]/80 bg-gradient-to-br from-[#fdf4f9] to-white shadow-lg ring-4 ring-[#d62976]/15'
          : cn(
              'border-2 border-border bg-canvas focus-visible:ring-4 focus-visible:ring-[#d62976]/25',
              !isSidebar && 'hover:border-[#d62976]/35 hover:bg-surface hover:shadow-card',
            ),
        className,
      )}
    >
      {!isSidebar && (
        <div className={`flex items-center justify-between gap-3 px-1 ${compact ? 'mb-2' : 'mb-3'}`}>
          <div>
            <p className="font-heading text-xs font-bold uppercase tracking-widest text-muted">Draft {optionNumber}</p>
            <p className={cn('mt-0.5 text-ink/80', isCarousel ? 'text-[0.8rem]' : 'text-sm')}>
              {isPickCarousel ? 'Select to open in editor' : 'Instagram feed (mobile)'}
            </p>
          </div>
          <div
            title={isPickCarousel ? 'Open this draft in the editor' : undefined}
            className={cn(
              'flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-xs font-bold transition-colors',
              selected
                ? 'bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-md'
                : 'border border-[#d62976]/25 bg-white text-[#d62976] shadow-sm group-hover:bg-[#fdf4f9]',
            )}
          >
            {selected ? (isCarousel ? 'Active' : 'Selected') : isPickCarousel ? 'Open' : `Pick ${optionNumber}`}
          </div>
        </div>
      )}

      <div
        className={cn(
          'min-w-0 overflow-hidden bg-[color:var(--ig-bg)] font-sans shadow-sm ring-1 ring-black/[0.08]',
          instagramPhoneCardWidthClass(isSidebar, isCarousel),
          isSidebar ? 'rounded-md' : 'rounded-sm',
        )}
        style={{ '--ig-bg': IG.bg } as CSSProperties}
      >
        <div
          className={cn(
            'flex h-11 items-center justify-between gap-2 border-b border-[color:var(--ig-border)]',
            isSidebar ? 'px-2' : 'px-3',
          )}
          style={{ '--ig-border': IG.border } as CSSProperties}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full bg-[#DBDBDB] font-semibold text-[#262626]',
                isSidebar ? 'h-7 w-7 text-[0.6rem]' : 'h-8 w-8 text-[0.65rem]',
              )}
            >
              {authorInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate font-semibold"
                style={
                  {
                    color: IG.text,
                    fontSize: isSidebar ? '0.75rem' : '0.875rem',
                  } as CSSProperties
                }
              >
                {authorLabel.replace(/\s+/g, '_').toLowerCase()}
              </p>
            </div>
          </div>
          <MoreHorizontal
            className={cn('shrink-0', isSidebar ? 'h-4 w-4' : 'h-5 w-5')}
            style={{ color: IG.text }}
            strokeWidth={2}
          />
        </div>

        {urls.length > 1 && !imageLoadFailed ? (
          <div
            className="min-w-0 w-full bg-black"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div
              ref={carouselViewportRef}
              role="group"
              aria-roledescription="carousel"
              aria-label={`Post images, ${carouselIndex + 1} of ${urls.length}`}
              tabIndex={0}
              className="relative aspect-square w-full overflow-hidden bg-black outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              onKeyDown={onCarouselKeyDown}
              onTouchStart={onCarouselTouchStart}
              onTouchEnd={onCarouselTouchEnd}
            >
              <div
                className="flex h-full transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
                style={{
                  width: `${urls.length * 100}%`,
                  transform: `translateX(-${(100 / urls.length) * carouselIndex}%)`,
                }}
              >
                {urls.map((u, i) => (
                  <div
                    key={`${u}-${i}`}
                    className="flex h-full shrink-0 items-center justify-center bg-black"
                    style={{ width: `${100 / urls.length}%` }}
                  >
                    <img
                      src={normalizePreviewImageUrl(u)}
                      alt=""
                      draggable={false}
                      className="h-full w-full select-none object-contain object-center"
                      onError={() => setImageLoadFailed(true)}
                    />
                  </div>
                ))}
              </div>
              <div
                className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-0.5 px-2"
                aria-hidden
              >
                {urls.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-0.5 rounded-full transition-all duration-200',
                      i === carouselIndex ? 'w-1.5 bg-white' : 'w-0.5 bg-white/40',
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Previous image"
                className="absolute inset-y-0 left-0 z-[1] w-[32%] cursor-w-resize bg-transparent opacity-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (skipNextCarouselClickRef.current) return;
                  goCarouselPrev();
                }}
              />
              <button
                type="button"
                aria-label="Next image"
                className="absolute inset-y-0 right-0 z-[1] w-[32%] cursor-e-resize bg-transparent opacity-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (skipNextCarouselClickRef.current) return;
                  goCarouselNext();
                }}
              />
            </div>
          </div>
        ) : resolvedImageUrl && !imageLoadFailed ? (
          <div className="w-full bg-black">
            <div className="group/image relative flex aspect-square w-full items-center justify-center overflow-hidden">
              <img
                key={`${resolvedImageUrl}-${imageRetryKey}`}
                src={resolvedImageUrl}
                alt=""
                className="h-full w-full object-contain object-center transition-transform duration-500 group-hover/image:scale-[1.02]"
                onError={() => setImageLoadFailed(true)}
              />
            </div>
          </div>
        ) : urls.length ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-2 border-y border-[color:var(--ig-border)] bg-[#FAFAFA] px-3 py-5',
              isSidebar ? 'aspect-square min-h-0 max-h-[16rem]' : 'aspect-square min-h-0 max-h-[18rem]',
            )}
            style={{ '--ig-border': IG.border } as CSSProperties}
          >
            <ImageOff className="h-8 w-8 text-muted" aria-hidden />
            <p className="text-center text-xs font-medium text-ink">Couldn&apos;t load image</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-[0.7rem]"
                onClick={(e) => {
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
                  className="text-[0.7rem]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMedia();
                  }}
                >
                  Media
                </Button>
              ) : null}
            </div>
            {import.meta.env.DEV ? (
              <Collapsible className="w-full max-w-xs text-left">
                <CollapsibleTrigger className="text-[0.6rem] text-muted">URL (dev)</CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="mt-1 break-all font-mono text-[0.55rem] text-muted">{urls.join(' | ')}</p>
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </div>
        ) : (
          <div
            className={cn(
              'flex aspect-square w-full items-center justify-center border-y border-dashed border-[color:var(--ig-border)] bg-[#FAFAFA] py-6',
              isSidebar ? 'max-h-[16rem]' : 'max-h-[18rem]',
            )}
            style={{ '--ig-border': IG.border } as CSSProperties}
          >
            <p className="px-3 text-center text-xs text-muted">No image — Instagram posts usually include media</p>
          </div>
        )}

        <div className={cn(isSidebar ? 'px-2 py-1.5' : 'px-3 py-2')}>
          <div className="flex items-center justify-between" style={{ color: IG.icon }}>
            <div className="flex gap-4">
              <Heart className={cn(isSidebar ? 'h-6 w-6' : 'h-6 w-6')} fill="none" strokeWidth={2} />
              <MessageCircle className={cn(isSidebar ? 'h-6 w-6' : 'h-6 w-6')} strokeWidth={2} />
              <Send className={cn(isSidebar ? 'h-6 w-6' : 'h-6 w-6')} strokeWidth={2} />
            </div>
            <Bookmark className={cn(isSidebar ? 'h-6 w-6' : 'h-6 w-6')} strokeWidth={2} />
          </div>
          <p
            className={cn('mt-2 font-semibold', isSidebar ? 'text-[0.7rem]' : 'text-sm')}
            style={{ color: IG.text }}
          >
            1,240 likes
          </p>
          <div
            className={cn(
              'mt-1',
              isSidebar ? 'text-[0.68rem] leading-snug' : 'text-sm leading-snug',
            )}
            style={{ color: IG.text }}
          >
            <span className="font-semibold">{authorLabel.replace(/\s+/g, '_').toLowerCase()} </span>
            <span
              className={!bodyExpanded && shouldClamp ? 'overflow-hidden' : undefined}
              style={
                !bodyExpanded && shouldClamp
                  ? {
                      display: '-webkit-box',
                      WebkitLineClamp: lineClampLines,
                      WebkitBoxOrient: 'vertical',
                    }
                  : undefined
              }
            >
              {renderTaggedText(text, previewChannel)}
            </span>
          </div>
          {shouldClamp ? (
            <button
              type="button"
              className="mt-1 text-xs font-normal"
              style={{ color: IG.textMuted }}
              onClick={(e) => {
                e.stopPropagation();
                if (isPickCarousel) setPickBodyExpanded((v) => !v);
                onToggleExpanded();
              }}
            >
              {bodyExpanded ? 'less' : 'more'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
