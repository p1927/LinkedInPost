import {
  Globe2,
  Heart,
  ImageOff,
  MessageCircle,
  MoreHorizontal,
  PartyPopper,
  Repeat2,
  Send,
  ThumbsUp,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { normalizePreviewImageUrl } from '../services/imageUrls';
import { type ChannelId } from '../integrations/channels';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '../lib/cn';
import { Button } from '@/components/ui/button';

interface LinkedInPostPreviewProps {
  optionNumber: number;
  text: string;
  imageUrl?: string;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpanded: () => void;
  mode?: 'hero' | 'carousel';
  /** Shapes labels and accent styling to match the selected delivery channel. */
  previewChannel?: ChannelId;
  /** Narrow column: smaller type and card so the full post fits without heavy scrolling. */
  layout?: 'default' | 'sidebar';
  /** Merged onto the root element (e.g. h-full in grids). */
  className?: string;
  /** Always show full post body; hides see more / show less (e.g. variant picker tiles). */
  forceExpanded?: boolean;
  /** Sheet-variant picker: clamp body, shorter chrome, “Open” CTA styling. */
  pickMode?: boolean;
  /** Shown as the preview profile name (e.g. derived from the signed-in user). */
  previewAuthorName?: string;
  /** Opens the Media panel in review; shown when an image fails to load if provided. */
  onOpenMedia?: () => void;
}

const SOCIAL_PROOF = [
  { reactions: 42, comments: 8, reposts: 2 },
  { reactions: 31, comments: 5, reposts: 1 },
  { reactions: 27, comments: 6, reposts: 3 },
  { reactions: 19, comments: 4, reposts: 1 },
];

const ACTIONS = [
  { label: 'React', icon: ThumbsUp },
  { label: 'Reply', icon: MessageCircle },
  { label: 'Forward', icon: Repeat2 },
  { label: 'Share', icon: Send },
];

const TAG_CLASS_BY_CHANNEL: Record<ChannelId, string> = {
  linkedin: 'font-medium text-[#0a66c2]',
  instagram: 'font-medium text-[#d62976]',
  telegram: 'font-medium text-[#229ED9]',
  whatsapp: 'font-medium text-[#128C7E]',
};

function previewAuthorInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
  }
  const one = parts[0] ?? '?';
  return one.slice(0, 2).toUpperCase();
}

function previewSubtitle(channel: ChannelId | undefined): string {
  switch (channel) {
    case 'instagram':
      return 'Approximate feed-style preview';
    case 'telegram':
      return 'Message-style preview';
    case 'whatsapp':
      return 'Message-style preview';
    case 'linkedin':
    default:
      return 'LinkedIn-style preview';
  }
}

function renderLinkedText(text: string, previewChannel?: ChannelId): ReactNode[] {
  const tagClass = TAG_CLASS_BY_CHANNEL[previewChannel ?? 'linkedin'];
  return text.split('\n').flatMap((line, lineIndex) => {
    const segments = line.split(/([#@][\w-]+)/g);
    const nodes = segments.map((segment, segmentIndex) => {
      const isTag = /^([#@])[\w-]+$/.test(segment);

      if (!segment) {
        return null;
      }

      return isTag ? (
        <span key={`segment-${lineIndex}-${segmentIndex}`} className={tagClass}>
          {segment}
        </span>
      ) : (
        <span key={`segment-${lineIndex}-${segmentIndex}`}>{segment}</span>
      );
    });

    if (lineIndex === 0) {
      return nodes;
    }

    return [<br key={`break-${lineIndex}`} />, ...nodes];
  });
}

export function LinkedInPostPreview({
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
}: LinkedInPostPreviewProps) {
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

  useEffect(() => {
    // Reset stale load state when the resolved URL changes (sync with img key).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on prop-derived URL
    setImageLoadFailed(false);
  }, [resolvedImageUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pick tile body when draft changes
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
      className={`group relative w-full cursor-pointer text-left outline-none transition-colors duration-200 ${
        isSidebar ? 'rounded-xl p-2' : isCarousel ? 'h-full min-h-0 rounded-xl p-3' : 'rounded-xl p-3 sm:p-4'
      } ${
        selected
          ? 'border-2 border-primary bg-surface shadow-lift ring-4 ring-primary/10'
          : 'border-2 border-border bg-canvas hover:border-primary/40 hover:bg-surface hover:shadow-card focus-visible:ring-4 focus-visible:ring-primary/20'
      } ${className ?? ''}`}
    >
      <div className={`flex items-center justify-between gap-3 px-1 ${compact ? 'mb-2' : 'mb-4'}`}>
        <div>
          <p className={`font-heading font-bold uppercase tracking-widest text-muted ${isSidebar ? 'text-[0.65rem]' : 'text-xs'}`}>
            Draft {optionNumber}
          </p>
          <p
            className={`mt-0.5 text-ink/80 ${isSidebar ? 'text-[0.7rem]' : isCarousel ? 'text-[0.8rem]' : 'text-sm'}`}
          >
            {isPickCarousel
              ? 'Select to open in editor'
              : isCarousel
                ? 'Feed preview'
                : previewSubtitle(previewChannel)}
          </p>
        </div>
        <Badge
          variant={selected ? 'primary' : 'neutral'}
          size="md"
          title={isPickCarousel ? 'Open this draft in the editor' : undefined}
          className={cn(
            'min-w-10 justify-center font-bold normal-case transition-[color,background-color,border-color,box-shadow] duration-200',
            !selected &&
              'group-hover:border-primary/35 group-hover:bg-canvas group-hover:text-primary group-hover:shadow-md',
          )}
        >
          {selected ? (isCarousel ? 'Active' : 'Selected') : isPickCarousel ? 'Open' : `Pick ${optionNumber}`}
        </Badge>
      </div>

      <div
        className={`overflow-hidden border border-border bg-surface-muted/80 backdrop-blur-sm ${
          isSidebar ? 'rounded-lg p-1.5' : isCarousel ? 'rounded-lg p-2.5 sm:p-3' : 'rounded-xl p-2.5 sm:p-4'
        }`}
      >
        <div
          className={`mx-auto overflow-hidden border border-border bg-surface shadow-sm ${
            isSidebar ? 'max-w-[300px] rounded-lg' : isCarousel ? 'max-w-none rounded-lg' : 'max-w-[430px] rounded-xl'
          }`}
        >
          <div className={isSidebar ? 'px-2.5 pb-2 pt-2.5' : isCarousel ? 'px-4 pb-3.5 pt-4' : 'px-4 pb-3 pt-4'}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3 items-center">
                <div
                  className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 font-bold text-primary-fg shadow-inner ${
                    isSidebar ? 'h-8 w-8 text-xs' : isCarousel ? 'h-10 w-10 text-sm' : 'h-12 w-12 text-base'
                  }`}
                  aria-hidden
                >
                  {authorInitials}
                </div>
                <div className="min-w-0">
                  <p className={`truncate font-bold text-ink ${isSidebar ? 'text-[0.8rem]' : isCarousel ? 'text-[0.9rem]' : 'text-[0.95rem]'}`}>
                    {authorLabel}
                  </p>
                  <p className={`truncate text-muted ${isSidebar ? 'text-[0.68rem]' : isCarousel ? 'text-[0.75rem]' : 'text-[0.8rem]'}`}>
                    {previewChannel === 'instagram'
                      ? 'Instagram-oriented layout'
                      : previewChannel === 'telegram'
                        ? 'Telegram-oriented layout'
                        : previewChannel === 'whatsapp'
                          ? 'WhatsApp-oriented layout'
                          : 'LinkedIn-oriented layout'}
                  </p>
                  <div
                    className={`mt-0.5 flex items-center gap-1.5 text-muted ${isSidebar ? 'text-[0.62rem]' : isCarousel ? 'text-[0.7rem]' : 'text-[0.75rem]'}`}
                  >
                    <span>Now</span>
                    <span aria-hidden="true">•</span>
                    <Globe2 className={isSidebar ? 'h-2.5 w-2.5' : isCarousel ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                  </div>
                </div>
              </div>
              <MoreHorizontal
                className={`mt-1 shrink-0 text-muted transition-colors hover:text-ink ${isSidebar ? 'h-3.5 w-3.5' : isCarousel ? 'h-4 w-4' : 'h-5 w-5'}`}
              />
            </div>

            <div
              className={`text-ink ${
                isSidebar ? 'mt-2 text-[0.72rem] leading-snug' : isCarousel ? 'mt-4 text-[0.85rem] leading-snug' : 'mt-4 text-[0.95rem] leading-relaxed'
              }`}
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
                {renderLinkedText(text, previewChannel)}
              </div>
              {shouldClamp && (
                <Button
                  type="button"
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    if (isPickCarousel) {
                      setPickBodyExpanded((v) => !v);
                    }
                    onToggleExpanded();
                  }}
                  className={`mt-1.5 font-semibold text-primary transition-colors hover:text-primary-hover ${isSidebar ? 'text-[0.68rem]' : isCarousel ? 'text-[0.8rem]' : 'text-[0.85rem]'}`}
                >
                  {bodyExpanded ? 'Show less' : 'See more'}
                </Button>
              )}
            </div>
          </div>

          {resolvedImageUrl && !imageLoadFailed ? (
            <div className="border-y border-border bg-canvas">
              <div
                className={`${isSidebar || isCarousel ? 'aspect-[4/3]' : 'aspect-[4/5] sm:aspect-[1.2/1]'} relative overflow-hidden bg-surface-muted group/image`}
              >
                <img
                  key={`${resolvedImageUrl}-${imageRetryKey}`}
                  src={resolvedImageUrl}
                  alt={`Preview media for option ${optionNumber}`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover/image:scale-105"
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
              className="border-y border-border-strong bg-surface-muted/50 px-3 py-2"
              role="status"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between">
                <div className="flex min-w-0 items-center gap-2 text-left">
                  <ImageOff className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <p className="text-xs font-semibold leading-snug text-ink">
                    Couldn&apos;t load this image.
                    <span className="mt-0.5 block text-[0.7rem] font-normal text-ink/75">
                      You can still compare text and open a draft in the editor.
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                      event.stopPropagation();
                      setImageLoadFailed(false);
                      setImageRetryKey((k) => k + 1);
                    }}
                    className="cursor-pointer rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-[0.7rem] font-semibold text-ink shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    Retry
                  </Button>
                  {onOpenMedia ? (
                    <Button
                      type="button"
                      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        onOpenMedia();
                      }}
                      className="cursor-pointer rounded-lg border border-primary/35 bg-primary/10 px-2.5 py-1 text-[0.7rem] font-semibold text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary/15"
                    >
                      Open Media
                    </Button>
                  ) : null}
                </div>
              </div>
              {import.meta.env.DEV ? (
                <Collapsible className="mt-2 border-t border-border pt-2 text-left">
                  <CollapsibleTrigger className="flex cursor-pointer items-center text-[0.65rem] font-medium text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-sm">
                    Technical details (dev)
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="mt-1 break-all font-mono text-[0.6rem] text-muted">
                      {imageUrl}
                      {resolvedImageUrl !== imageUrl ? (
                        <>
                          <br />
                          <span className="text-ink/70">Resolved: </span>
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
                className={`text-muted ${
                  isSidebar ? 'px-2 py-1.5 text-[0.62rem]' : isCarousel ? 'px-4 py-2.5 text-[0.75rem]' : 'px-4 py-2.5 text-[0.8rem]'
                }`}
              >
                <p className="mb-1 text-[0.62rem] font-medium uppercase tracking-wide text-ink/55">Preview only</p>
                <div className={`flex items-center justify-between gap-2 border-b border-border ${isSidebar ? 'pb-1.5' : 'pb-3'}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      <span className="z-20 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-primary-fg ring-2 ring-surface shadow-sm">
                        <ThumbsUp className="h-2.5 w-2.5" aria-hidden />
                      </span>
                      <span className="z-10 flex h-5 w-5 items-center justify-center rounded-full bg-cta text-success-fg ring-2 ring-surface shadow-sm">
                        <PartyPopper className="h-2.5 w-2.5" aria-hidden />
                      </span>
                      <span className="z-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-primary-fg ring-2 ring-surface shadow-sm">
                        <Heart className="h-2.5 w-2.5" aria-hidden />
                      </span>
                    </div>
                    <span className="font-medium">{proof.reactions}</span>
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span>{proof.comments} comments</span>
                    <span aria-hidden="true" className="text-border-strong">
                      •
                    </span>
                    <span>{proof.reposts} shares</span>
                  </div>
                </div>
              </div>

              <div className={`grid grid-cols-4 ${isSidebar ? 'px-1 pb-1 pt-0' : isCarousel ? 'px-1.5 pb-2 pt-0.5' : 'px-2 pb-2 pt-0.5'}`}>
                {ACTIONS.map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className={`flex cursor-pointer items-center justify-center gap-1 rounded-xl font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink ${
                      isSidebar ? 'px-1 py-1.5 text-[0.58rem]' : isCarousel ? 'px-2 py-2.5 text-[0.7rem]' : 'px-2 py-2.5 text-[0.8rem]'
                    }`}
                  >
                    <Icon className={isSidebar ? 'h-3 w-3' : isCarousel ? 'h-4 w-4' : 'h-4.5 w-4.5'} />
                    <span className="hidden sm:inline">{label}</span>
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