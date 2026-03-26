import { Globe2, ImageOff, MessageCircle, MoreHorizontal, Repeat2, Send, ThumbsUp } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { normalizePreviewImageUrl } from '../services/imageUrls';
import { type ChannelId } from '../integrations/channels';
import { Badge } from './ui/Badge';
import { cn } from '../lib/cn';

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
}: LinkedInPostPreviewProps) {
  const proof = SOCIAL_PROOF[(optionNumber - 1) % SOCIAL_PROOF.length];
  const shouldClamp = !forceExpanded && (text.length > 280 || text.split('\n').length > 5);
  const bodyExpanded = forceExpanded || expanded;
  const resolvedImageUrl = normalizePreviewImageUrl(imageUrl);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const isCarousel = mode === 'carousel';
  const isSidebar = layout === 'sidebar';
  const compact = isCarousel || isSidebar;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageLoadFailed(false);
  }, [resolvedImageUrl]);

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
      aria-label={`Preview draft ${optionNumber}`}
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
          <p className={`mt-0.5 text-muted ${isSidebar ? 'text-[0.7rem]' : isCarousel ? 'text-[0.8rem]' : 'text-sm'}`}>
            {isCarousel ? 'Tap to preview' : previewSubtitle(previewChannel)}
          </p>
        </div>
        <Badge
          variant={selected ? 'primary' : 'neutral'}
          size="md"
          className={cn(
            'min-w-10 justify-center font-bold normal-case transition-[color,background-color,border-color,box-shadow] duration-200',
            !selected &&
              'group-hover:border-primary/35 group-hover:bg-canvas group-hover:text-primary group-hover:shadow-md',
          )}
        >
          {selected ? (isCarousel ? 'Active' : 'Selected') : `Pick ${optionNumber}`}
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
                >
                  CB
                </div>
                <div className="min-w-0">
                  <p className={`truncate font-bold text-ink ${isSidebar ? 'text-[0.8rem]' : isCarousel ? 'text-[0.9rem]' : 'text-[0.95rem]'}`}>
                    Channel Bot
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
                        WebkitLineClamp: isSidebar ? 8 : isCarousel ? 4 : 5,
                        WebkitBoxOrient: 'vertical',
                      }
                    : undefined
                }
              >
                {renderLinkedText(text, previewChannel)}
              </div>
              {shouldClamp && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleExpanded();
                  }}
                  className={`mt-1.5 font-semibold text-primary transition-colors hover:text-primary-hover ${isSidebar ? 'text-[0.68rem]' : isCarousel ? 'text-[0.8rem]' : 'text-[0.85rem]'}`}
                >
                  {bodyExpanded ? 'Show less' : '...see more'}
                </button>
              )}
            </div>
          </div>

          {resolvedImageUrl && !imageLoadFailed ? (
            <div className="border-y border-border bg-canvas">
              <div
                className={`${isSidebar || isCarousel ? 'aspect-[4/3]' : 'aspect-[4/5] sm:aspect-[1.2/1]'} relative overflow-hidden bg-surface-muted group/image`}
              >
                <img
                  src={resolvedImageUrl}
                  alt={`Preview media for option ${optionNumber}`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover/image:scale-105"
                  onLoad={() => {
                    console.info('Preview image loaded', {
                      optionNumber,
                      originalUrl: imageUrl,
                      resolvedImageUrl,
                    });
                  }}
                  onError={() => {
                    console.warn('Preview image failed to load', {
                      optionNumber,
                      originalUrl: imageUrl,
                      resolvedImageUrl,
                    });
                    setImageLoadFailed(true);
                  }}
                />
              </div>
            </div>
          ) : imageUrl ? (
            <div className="border-y border-border bg-canvas px-4 py-6 text-center text-muted">
              <div className="mx-auto flex max-w-[260px] flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-5 shadow-sm">
                <div className="rounded-full bg-canvas p-3">
                  <ImageOff className="h-6 w-6 text-muted" />
                </div>
                <p className="text-sm font-semibold text-ink">Image preview unavailable</p>
                <p className="text-xs leading-relaxed text-muted">Open the browser console to inspect the logged source URL.</p>
              </div>
            </div>
          ) : null}

          <div
            className={`text-muted ${
              isSidebar ? 'px-2 py-1.5 text-[0.62rem]' : isCarousel ? 'px-4 py-2.5 text-[0.75rem]' : 'px-4 py-2.5 text-[0.8rem]'
            }`}
          >
            <div className={`flex items-center justify-between gap-2 border-b border-border ${isSidebar ? 'pb-1.5' : 'pb-3'}`}>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[0.6rem] text-primary-fg ring-2 ring-surface z-20 shadow-sm">👍</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cta text-[0.6rem] text-success-fg ring-2 ring-surface z-10 shadow-sm">👏</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[0.6rem] text-primary-fg ring-2 ring-surface z-0 shadow-sm">❤</span>
                </div>
                <span className="font-medium">{proof.reactions}</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span>{proof.comments} comments</span>
                <span aria-hidden="true" className="text-border-strong">•</span>
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
        </div>
      </div>
    </div>
  );
}