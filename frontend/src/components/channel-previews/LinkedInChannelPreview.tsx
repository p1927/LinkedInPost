import {
  Globe2,
  Heart,
  ImageOff,
  Lightbulb,
  MessageCircle,
  MoreHorizontal,
  PartyPopper,
  Repeat2,
  Send,
  ThumbsUp,
  Plus,
} from 'lucide-react';
import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import { normalizePreviewImageUrl } from '../../services/imageUrls';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '../../lib/cn';
import type { ChannelPreviewProps } from './types';
import { LI } from './platformTokens';
import { linkedInFeedCardWidthClass, previewAuthorInitials, renderTaggedText } from './shared';

const SOCIAL_PROOF = [
  { reactions: 42, comments: 8, reposts: 2 },
  { reactions: 31, comments: 5, reposts: 1 },
  { reactions: 27, comments: 6, reposts: 3 },
  { reactions: 19, comments: 4, reposts: 1 },
];

/** Matches LinkedIn feed: Like, Comment, Repost, Send. */
const ACTIONS = [
  { label: 'Like', icon: ThumbsUp },
  { label: 'Comment', icon: MessageCircle },
  { label: 'Repost', icon: Repeat2 },
  { label: 'Send', icon: Send },
] as const;

export function LinkedInChannelPreview({
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
  previewAuthorName,
  onOpenMedia,
}: ChannelPreviewProps) {
  const proof = SOCIAL_PROOF[(optionNumber - 1) % SOCIAL_PROOF.length];
  const authorLabel = previewAuthorName?.trim() || 'Your channel';
  const authorInitials = previewAuthorInitials(authorLabel);
  const isCarousel = mode === 'carousel';
  const isPickCarousel = pickMode && isCarousel;
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [imageRetryKey, setImageRetryKey] = useState(0);
  const [pickBodyExpanded, setPickBodyExpanded] = useState(false);
  const resolvedImageUrl = normalizePreviewImageUrl(imageUrl);
  const shouldClamp =
    !forceExpanded &&
    (isPickCarousel || text.length > 280 || text.split('\n').length > 5);
  const bodyExpanded = forceExpanded || expanded || (isPickCarousel && pickBodyExpanded);
  const isSidebar = layout === 'sidebar';
  const compact = isCarousel || isSidebar;
  const heroLift = !isSidebar && !isCarousel;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on prop-derived URL
    setImageLoadFailed(false);
  }, [resolvedImageUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPickBodyExpanded(false);
  }, [text, pickMode, optionNumber]);

  const lineClampLines = isSidebar ? 8 : isPickCarousel ? 5 : isCarousel ? 4 : 5;

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
        'group relative w-full cursor-pointer text-left outline-none',
        heroLift ? 'transition-all duration-300' : 'transition-colors duration-200',
        isSidebar ? 'rounded-xl p-2' : isCarousel ? 'h-full min-h-0 rounded-3xl p-3' : 'rounded-[28px] p-3 sm:rounded-[32px] sm:p-4',
        selected
          ? 'border-2 border-primary bg-white/90 shadow-xl ring-4 ring-primary/10'
          : cn(
              'border-2 border-white/90 bg-white/45 shadow-sm',
              !isSidebar && 'hover:border-primary/35 hover:bg-white/70 hover:shadow-lg',
              heroLift && 'hover:-translate-y-0.5',
              'focus-visible:ring-4 focus-visible:ring-primary/20',
            ),
        className,
      )}
    >
      <div className={`flex items-center justify-between gap-3 px-1 ${compact ? 'mb-2' : 'mb-4'}`}>
        <div>
          <p
            className={cn(
              'font-heading font-bold uppercase tracking-widest text-slate-500',
              isSidebar ? 'text-[0.65rem]' : 'text-xs',
            )}
          >
            Draft {optionNumber}
          </p>
          <p
            className={cn(
              'mt-0.5 text-slate-600',
              isSidebar ? 'text-[0.7rem]' : isCarousel ? 'text-[0.8rem]' : 'text-sm',
            )}
          >
            {isPickCarousel
              ? 'Select to open in editor'
              : isCarousel
                ? 'Feed preview'
                : 'LinkedIn-style preview'}
          </p>
        </div>
        <div
          title={isPickCarousel ? 'Open this draft in the editor' : undefined}
          className={cn(
            'flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-xs font-bold transition-colors duration-300',
            selected
              ? 'bg-primary text-primary-fg shadow-md'
              : 'border border-slate-200 bg-white/85 text-slate-500 shadow-sm group-hover:border-primary/25 group-hover:bg-white group-hover:text-primary',
          )}
        >
          {selected ? (isCarousel ? 'Active' : 'Selected') : isPickCarousel ? 'Open' : `Pick ${optionNumber}`}
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden backdrop-blur-sm',
          'border border-[color:var(--li-border)] bg-[color:var(--li-feed)]',
          isSidebar ? 'rounded-lg p-1.5' : isCarousel ? 'rounded-2xl p-2.5 sm:p-3' : 'rounded-[24px] p-2.5 sm:rounded-[28px] sm:p-4',
        )}
        style={
          {
            '--li-feed': LI.feedBg,
            '--li-border': LI.border,
          } as CSSProperties
        }
      >
        <div
          className={cn(
            'overflow-hidden bg-[color:var(--li-card)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06]',
            linkedInFeedCardWidthClass(isSidebar, isCarousel, isPickCarousel),
            isSidebar ? 'rounded-md' : isCarousel ? 'rounded-lg' : 'rounded-lg',
          )}
          style={{ '--li-card': LI.card } as CSSProperties}
        >
          <div className={isSidebar ? 'px-2.5 pb-2 pt-2.5' : isCarousel ? 'px-3 pb-3 pt-3 sm:px-4 sm:pb-3.5 sm:pt-4' : 'px-4 pb-3 pt-3.5'}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <div
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-full bg-[#D9D9D9] text-[#5C5C5C]',
                    isSidebar ? 'h-10 w-10 text-xs font-semibold' : isCarousel ? 'h-10 w-10 text-sm font-semibold' : 'h-12 w-12 text-base font-semibold',
                  )}
                  aria-hidden
                >
                  {authorInitials}
                </div>
                <div className="min-w-0 font-sans">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'truncate font-semibold text-black/[0.9] hover:text-[color:var(--li-link)] hover:underline cursor-pointer',
                        isSidebar ? 'text-[0.85rem]' : isCarousel ? 'text-[0.9rem]' : 'text-[0.95rem]',
                      )}
                      style={{ '--li-link': LI.link } as CSSProperties}
                    >
                      {authorLabel}
                    </span>
                    <span className="text-black/60 text-xs font-normal" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-black/60 text-xs font-normal">
                      2nd
                    </span>
                  </div>
                  <p
                    className={cn(
                      'truncate text-[color:var(--li-muted)] -mt-0.5',
                      isSidebar ? 'text-[0.7rem]' : isCarousel ? 'text-[0.75rem]' : 'text-xs',
                    )}
                    style={{ '--li-muted': LI.textMuted } as CSSProperties}
                  >
                    Your headline
                  </p>
                  <div
                    className={cn(
                      'flex items-center gap-1 text-[color:var(--li-muted)]',
                      isSidebar ? 'text-[0.65rem]' : isCarousel ? 'text-[0.7rem]' : 'text-xs',
                    )}
                    style={{ '--li-muted': LI.textMuted } as CSSProperties}
                  >
                    <span>1d</span>
                    <span aria-hidden="true">
                      ·
                    </span>
                    <Globe2 className={isSidebar ? 'h-2.5 w-2.5' : isCarousel ? 'h-3 w-3' : 'h-3 w-3'} aria-hidden />
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-1">
                {!isSidebar && (
                  <button 
                    type="button"
                    className="flex items-center gap-1 text-[color:var(--li-link)] font-semibold text-[0.95rem] hover:bg-[#0A66C2]/10 px-2 py-1 rounded-md transition-colors -mt-1" 
                    style={{ '--li-link': LI.link } as CSSProperties}
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                    Follow
                  </button>
                )}
                <button type="button" className="p-1 hover:bg-black/5 rounded-full transition-colors -mt-1 -mr-1">
                  <MoreHorizontal
                    className={cn(
                      'shrink-0 text-[color:var(--li-muted)] transition-colors hover:text-black/80',
                      isSidebar ? 'h-4 w-4' : isCarousel ? 'h-5 w-5' : 'h-5 w-5',
                    )}
                    style={{ '--li-muted': LI.textMuted } as CSSProperties}
                  />
                </button>
              </div>
            </div>

            <div
              className={cn(
                'font-sans text-black/[0.9]',
                isSidebar ? 'mt-2 text-[0.75rem] leading-snug' : isCarousel ? 'mt-3 text-[0.875rem] leading-snug' : 'mt-3 text-[0.875rem] leading-[1.45]',
              )}
            >
              <div
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
              </div>
              {shouldClamp ? (
                <button
                  type="button"
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    if (isPickCarousel) {
                      setPickBodyExpanded((v) => !v);
                    }
                    onToggleExpanded();
                  }}
                  className={cn(
                    'mt-1 font-semibold text-[color:var(--li-muted)] hover:text-[color:var(--li-link)] hover:underline transition-colors',
                    isSidebar ? 'text-[0.7rem]' : isCarousel ? 'text-[0.8rem]' : 'text-[0.875rem]',
                  )}
                  style={{ '--li-muted': LI.textMuted, '--li-link': LI.link } as CSSProperties}
                >
                  {bodyExpanded ? 'Show less' : isPickCarousel ? 'See more' : '...see more'}
                </button>
              ) : null}
            </div>
          </div>

          {resolvedImageUrl && !imageLoadFailed ? (
            <div className="border-t border-[color:var(--li-line)] bg-[#F8F9FA]" style={{ '--li-line': LI.border } as CSSProperties}>
              <div
                className={cn(
                  'relative mx-auto w-full overflow-hidden group/image flex items-center justify-center',
                  isPickCarousel && 'min-h-[10rem] py-1',
                  !isPickCarousel && 'min-h-[100px]',
                )}
              >
                <img
                  key={`${resolvedImageUrl}-${imageRetryKey}`}
                  src={resolvedImageUrl}
                  alt={`Preview media for option ${optionNumber}`}
                  className={cn(
                    'transition-transform duration-700 w-full object-contain object-center',
                    !isPickCarousel && 'group-hover/image:scale-[1.02]',
                    isPickCarousel ? 'max-h-[14rem]' : isSidebar ? 'max-h-[12rem]' : isCarousel ? 'max-h-[16rem]' : 'max-h-[400px]',
                  )}
                  onLoad={() => {
                    if (import.meta.env.DEV) {
                      console.info('Preview image loaded', {
                        optionNumber,
                        originalUrl: imageUrl,
                        resolvedImageUrl,
                      });
                    }
                  }}
                  onError={() => {
                    if (import.meta.env.DEV) {
                      console.warn('Preview image failed to load', {
                        optionNumber,
                        originalUrl: imageUrl,
                        resolvedImageUrl,
                      });
                    }
                    setImageLoadFailed(true);
                  }}
                />
              </div>
            </div>
          ) : imageUrl ? (
            <div
              className="border-t border-[color:var(--li-line)] bg-[#FAFAFA] px-4 py-6 text-center"
              role="status"
              aria-live="polite"
              style={{ '--li-line': LI.border } as CSSProperties}
            >
              <div className="mx-auto flex max-w-[260px] flex-col items-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-5">
                <div className="rounded-full bg-neutral-100 p-3">
                  <ImageOff className="h-6 w-6 text-neutral-400" aria-hidden />
                </div>
                <p className="text-sm font-semibold text-neutral-800">Image preview unavailable</p>
                <p className="text-xs leading-relaxed text-neutral-500">
                  Retry the URL or open Media to pick another image.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                      event.stopPropagation();
                      setImageLoadFailed(false);
                      setImageRetryKey((k) => k + 1);
                    }}
                    className="cursor-pointer rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-[0.7rem] font-semibold text-neutral-700 transition-colors hover:border-black/20"
                  >
                    Retry
                  </button>
                  {onOpenMedia ? (
                    <button
                      type="button"
                      onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        onOpenMedia();
                      }}
                      className="cursor-pointer rounded-md border px-3 py-1.5 text-[0.7rem] font-semibold transition-colors hover:opacity-90"
                      style={{ borderColor: `${LI.link}40`, backgroundColor: `${LI.link}12`, color: LI.link }}
                    >
                      Open Media
                    </button>
                  ) : null}
                </div>
              </div>
              {import.meta.env.DEV ? (
                <Collapsible className="mt-4 text-left">
                  <CollapsibleTrigger className="mx-auto flex cursor-pointer items-center justify-center rounded-sm text-[0.65rem] font-medium text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a66c2]/30">
                    Technical details (dev)
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="mt-1 break-all font-mono text-[0.6rem] text-neutral-400">
                      {imageUrl}
                      {resolvedImageUrl !== imageUrl ? (
                        <>
                          <br />
                          <span className="text-neutral-600">Resolved: </span>
                          {resolvedImageUrl}
                        </>
                      ) : null}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </div>
          ) : null}

          {!isPickCarousel ? (
            <>
              <div
                className={cn(
                  'font-sans text-[color:var(--li-muted)]',
                  isSidebar ? 'px-2 py-1.5 text-[0.62rem]' : isCarousel ? 'px-3 py-2 text-xs sm:px-4' : 'px-4 py-2.5 text-xs sm:text-sm',
                )}
                style={{ '--li-muted': LI.textMuted } as CSSProperties}
              >
                <div
                  className={cn(
                    'flex items-center justify-between gap-2 border-b border-[color:var(--li-line)]',
                    isSidebar ? 'pb-1.5' : 'pb-2.5',
                  )}
                  style={{ '--li-line': LI.border } as CSSProperties}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      <span
                        className="z-30 flex h-[22px] w-[22px] items-center justify-center rounded-full text-white ring-2 ring-white"
                        style={{ backgroundColor: LI.reactionLike }}
                        title="Like"
                      >
                        <ThumbsUp className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                      </span>
                      <span
                        className="z-20 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#6DAE4F] text-white ring-2 ring-white"
                        title="Celebrate"
                      >
                        <PartyPopper className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                      </span>
                      <span
                        className="z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#DF704D] text-white ring-2 ring-white"
                        title="Love"
                      >
                        <Heart className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                      </span>
                      <span
                        className="z-0 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#C37D16] text-white ring-2 ring-white"
                        title="Insightful"
                      >
                        <Lightbulb className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                      </span>
                    </div>
                    <span className="font-semibold text-black/70">{proof.reactions}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-1 whitespace-nowrap">
                    <span>{proof.comments} comments</span>
                    <span aria-hidden="true" className="text-black/25">
                      ·
                    </span>
                    <span>{proof.reposts} reposts</span>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'grid grid-cols-4 font-sans px-1 sm:px-2 pt-1',
                  isSidebar ? 'pb-1' : isCarousel ? 'pb-1' : 'pb-1.5',
                )}
              >
                {ACTIONS.map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className={cn(
                      'flex cursor-pointer items-center justify-center font-semibold text-[color:var(--li-soft)] transition-colors hover:bg-black/5 rounded-md',
                      isSidebar ? 'flex-col gap-0.5 py-1.5 text-[0.55rem]' : 'flex-col sm:flex-row gap-1 sm:gap-1.5 py-2 sm:py-2.5 text-[0.62rem] sm:text-[0.8rem]',
                    )}
                    style={{ '--li-soft': LI.textSoft } as CSSProperties}
                  >
                    <Icon className={isSidebar ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]'} strokeWidth={2} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
