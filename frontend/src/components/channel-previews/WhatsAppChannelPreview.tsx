import { CheckCheck, ImageOff } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import { normalizePreviewImageUrl } from '../../services/imageUrls';
import { Button } from '@/components/ui/button';
import { cn } from '../../lib/cn';
import type { ChannelPreviewProps } from './types';
import { WA } from './platformTokens';
import {
  messagingBubbleMaxClass,
  messagingChatPanelWidthClass,
  renderTaggedText,
} from './shared';

export function WhatsAppChannelPreview({
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
      tabIndex={0}
      role="region"
      aria-label={
        isPickCarousel
          ? `Draft ${optionNumber}, select to open in editor`
          : `Preview draft ${optionNumber}`
      }
      className={cn(
        'group relative w-full cursor-pointer text-left outline-none transition-colors duration-200',
        isSidebar ? 'rounded-xl p-2' : isCarousel ? 'h-full min-h-0 rounded-3xl p-3' : 'rounded-2xl p-3 sm:p-4',
        selected
          ? 'border-2 border-[#128C7E] bg-[#e8f5e9] shadow-lg ring-4 ring-[#128C7E]/20'
          : 'border-2 border-border bg-canvas hover:border-[#128C7E]/40 hover:bg-surface hover:shadow-card focus-visible:ring-4 focus-visible:ring-[#128C7E]/25',
        className,
      )}
    >
      <div className={`flex items-center justify-between gap-3 px-1 ${compact ? 'mb-2' : 'mb-3'}`}>
        <div>
          <p className={cn('font-heading font-bold uppercase tracking-widest text-muted', isSidebar ? 'text-[0.65rem]' : 'text-xs')}>
            Draft {optionNumber}
          </p>
          <p className={cn('mt-0.5 text-ink/80', isSidebar ? 'text-[0.7rem]' : 'text-sm')}>
            {isPickCarousel ? 'Select to open in editor' : 'WhatsApp (outgoing message)'}
          </p>
        </div>
        <div
          className={cn(
            'flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-xs font-bold transition-colors',
            selected
              ? 'bg-[#128C7E] text-white shadow-md'
              : 'border border-[#128C7E]/35 bg-white text-[#128C7E] group-hover:bg-[#e8f5e9]',
          )}
        >
          {selected ? (isCarousel ? 'Active' : 'Selected') : isPickCarousel ? 'Open' : `Pick ${optionNumber}`}
        </div>
      </div>

      <div
        className={cn('overflow-hidden rounded-2xl', messagingChatPanelWidthClass(isSidebar), isSidebar ? 'p-2' : 'p-3 sm:p-4')}
        style={
          {
            backgroundColor: WA.chatBg,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1.2' cy='1.2' r='0.55' fill='%23c8beb3' opacity='0.28'/%3E%3C/svg%3E")`,
            border: '1px solid #d9ccc0',
          } as CSSProperties
        }
      >
        <div className="flex justify-end">
          <div
            className={cn('rounded-[7px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]', messagingBubbleMaxClass(isSidebar))}
            style={{
              backgroundColor: WA.bubbleOut,
              border: `1px solid ${WA.bubbleBorder}`,
            }}
          >
            <div className={cn('px-2 pt-1.5', isSidebar ? 'pb-1' : 'pb-1 sm:px-2.5 sm:pt-2')}>
              {resolvedImageUrl && !imageLoadFailed ? (
                <div className="mb-1 overflow-hidden rounded-md">
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
                <div className="mb-1 flex items-center gap-2 rounded-md border border-dashed border-black/15 bg-white/40 px-2 py-2">
                  <ImageOff className="h-4 w-4 shrink-0 opacity-50" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-medium" style={{ color: WA.text }}>
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
                className={cn('text-sm leading-snug', !bodyExpanded && shouldClamp ? 'overflow-hidden' : undefined)}
                style={{
                  color: WA.text,
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
                  style={{ color: '#128C7E' }}
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    if (isPickCarousel) setPickBodyExpanded((v) => !v);
                    onToggleExpanded();
                  }}
                >
                  {bodyExpanded ? 'Show less' : 'Read more'}
                </button>
              ) : null}
              <div className="mt-0.5 flex items-end justify-end gap-1 pb-1">
                <span className="text-[11px] leading-none tabular-nums" style={{ color: WA.meta }}>
                  12:42
                </span>
                <CheckCheck className="h-[14px] w-[14px] shrink-0" style={{ color: WA.tickRead }} strokeWidth={2.5} aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
