import { CheckCheck, ImageOff } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import { normalizePreviewImageUrl } from '../../services/imageUrls';
import { Button } from '@/components/ui/button';
import { cn } from '../../lib/cn';
import type { ChannelPreviewProps } from './types';
import { TG } from './platformTokens';
import {
  messagingBubbleMaxClass,
  messagingChatPanelWidthClass,
  renderTaggedText,
} from './shared';

export function TelegramChannelPreview({
  optionNumber,
  text,
  imageUrl,
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
  previewAuthorName: _previewAuthorName,
  onOpenMedia,
}: ChannelPreviewProps) {
  const isCarousel = mode === 'carousel';
  const isPickCarousel = pickMode && isCarousel;
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [imageRetryKey, setImageRetryKey] = useState(0);
  const [pickBodyExpanded, setPickBodyExpanded] = useState(false);
  const resolvedImageUrl = normalizePreviewImageUrl(imageUrl);
  const shouldClamp =
    !forceExpanded &&
    (isPickCarousel || text.length > 320 || text.split('\n').length > 6);
  const bodyExpanded = forceExpanded || expanded || (isPickCarousel && pickBodyExpanded);
  const isSidebar = layout === 'sidebar';
  const showAsSelected = !isSidebar && selected;
  const compact = isCarousel || isSidebar;
  const lineClampLines = isSidebar ? 10 : isPickCarousel ? 6 : 8;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageLoadFailed(false);
  }, [resolvedImageUrl]);

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
          ? 'border-2 border-[#229ED9] bg-[#e8f4fc] shadow-lg ring-4 ring-[#229ED9]/20'
          : cn(
              'border-2 border-border bg-canvas focus-visible:ring-4 focus-visible:ring-[#229ED9]/25',
              !isSidebar && 'hover:border-[#229ED9]/40 hover:bg-surface hover:shadow-card',
            ),
        className,
      )}
    >
      {!isSidebar && (
        <div className={`flex items-center justify-between gap-3 px-1 ${compact ? 'mb-2' : 'mb-3'}`}>
          <div>
            <p className="font-heading text-xs font-bold uppercase tracking-widest text-muted">Draft {optionNumber}</p>
            <p className="mt-0.5 text-sm text-ink/80">
              {isPickCarousel ? 'Select to open in editor' : 'Telegram (outgoing message)'}
            </p>
          </div>
          <div
            className={cn(
              'flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-xs font-bold transition-colors',
              selected
                ? 'text-white shadow-md'
                : 'border border-[#229ED9]/35 bg-white text-[#229ED9] group-hover:bg-[#e8f4fc]',
            )}
            style={selected ? { backgroundColor: TG.brand } : undefined}
          >
            {selected ? (isCarousel ? 'Active' : 'Selected') : isPickCarousel ? 'Open' : `Pick ${optionNumber}`}
          </div>
        </div>
      )}

      <div
        className={cn(
          'overflow-hidden rounded-2xl',
          messagingChatPanelWidthClass(isSidebar),
          isSidebar ? 'p-2' : 'p-3 sm:p-4',
        )}
        style={
          {
            background: `linear-gradient(180deg, ${TG.wallpaperTop} 0%, ${TG.wallpaperBottom} 100%)`,
            border: `1px solid ${TG.bubbleBorder}`,
          } as CSSProperties
        }
      >
        <div className="flex justify-end">
          <div
            className={cn(
              'rounded-[14px] rounded-tr-[4px] shadow-sm',
              messagingBubbleMaxClass(isSidebar),
            )}
            style={{
              backgroundColor: TG.bubbleOut,
              border: `1px solid ${TG.bubbleBorder}`,
            }}
          >
            <div className={cn('px-2.5 pt-2', isSidebar ? 'pb-1' : 'pb-1.5 sm:px-3 sm:pt-2.5')}>
              {resolvedImageUrl && !imageLoadFailed ? (
                <div className="mb-1.5 overflow-hidden rounded-lg">
                  <img
                    key={`${resolvedImageUrl}-${imageRetryKey}`}
                    src={resolvedImageUrl}
                    alt=""
                    className={cn(
                      'w-full object-cover object-center',
                      isSidebar ? 'max-h-28' : 'max-h-32 sm:max-h-36',
                    )}
                    onError={() => setImageLoadFailed(true)}
                  />
                </div>
              ) : imageUrl ? (
                <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-dashed px-2 py-2" style={{ borderColor: TG.bubbleBorder }}>
                  <ImageOff className="h-4 w-4 shrink-0 opacity-60" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-medium" style={{ color: TG.text }}>
                      Image failed
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
              ) : null}
              <div
                className={cn(
                  'text-sm leading-snug',
                  !bodyExpanded && shouldClamp ? 'overflow-hidden' : undefined,
                )}
                style={{
                  color: TG.text,
                  ...( !bodyExpanded && shouldClamp
                    ? {
                        display: '-webkit-box',
                        WebkitLineClamp: lineClampLines,
                        WebkitBoxOrient: 'vertical',
                      }
                    : {}),
                }}
              >
                {renderTaggedText(text, previewChannel)}
              </div>
              {shouldClamp ? (
                <button
                  type="button"
                  className="mt-1 text-[0.7rem] font-semibold"
                  style={{ color: TG.brand }}
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    if (isPickCarousel) setPickBodyExpanded((v) => !v);
                    onToggleExpanded();
                  }}
                >
                  {bodyExpanded ? 'Show less' : 'Read more'}
                </button>
              ) : null}
              <div className="mt-1 flex items-end justify-end gap-1 pb-1">
                <span className="text-[11px] leading-none tabular-nums" style={{ color: `${TG.text}99` }}>
                  12:42
                </span>
                <CheckCheck className="h-[14px] w-[14px] shrink-0" style={{ color: TG.readCheck }} strokeWidth={2.5} aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
