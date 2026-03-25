import { Globe2, ImageOff, MessageCircle, MoreHorizontal, Repeat2, Send, ThumbsUp } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { normalizePreviewImageUrl } from '../services/imageUrls';

interface LinkedInPostPreviewProps {
  optionNumber: number;
  text: string;
  imageUrl?: string;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpanded: () => void;
  mode?: 'hero' | 'carousel';
}

const SOCIAL_PROOF = [
  { reactions: 42, comments: 8, reposts: 2 },
  { reactions: 31, comments: 5, reposts: 1 },
  { reactions: 27, comments: 6, reposts: 3 },
  { reactions: 19, comments: 4, reposts: 1 },
];

const ACTIONS = [
  { label: 'Like', icon: ThumbsUp },
  { label: 'Comment', icon: MessageCircle },
  { label: 'Repost', icon: Repeat2 },
  { label: 'Send', icon: Send },
];

function renderLinkedText(text: string): ReactNode[] {
  return text.split('\n').flatMap((line, lineIndex) => {
    const segments = line.split(/([#@][\w-]+)/g);
    const nodes = segments.map((segment, segmentIndex) => {
      const isTag = /^([#@])[\w-]+$/.test(segment);

      if (!segment) {
        return null;
      }

      return isTag ? (
        <span key={`segment-${lineIndex}-${segmentIndex}`} className="font-medium text-[#0a66c2]">
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
}: LinkedInPostPreviewProps) {
  const proof = SOCIAL_PROOF[(optionNumber - 1) % SOCIAL_PROOF.length];
  const shouldClamp = text.length > 280 || text.split('\n').length > 5;
  const resolvedImageUrl = normalizePreviewImageUrl(imageUrl);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const isCarousel = mode === 'carousel';

  useEffect(() => {
    setImageLoadFailed(false);
  }, [resolvedImageUrl]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative w-full border text-left transition duration-200 ${
        isCarousel ? 'h-full rounded-[26px] p-2.5 sm:p-3' : 'rounded-[30px] p-3 sm:p-4'
      } ${
        selected
          ? 'border-[#0a66c2] bg-[#eef6ff] shadow-[0_18px_42px_rgba(10,102,194,0.18)]'
          : 'border-[#d8dce6] bg-[#f7f5f2] hover:border-[#9ebfe2] hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)]'
      }`}
    >
      <div className={`flex items-center justify-between gap-3 px-1 ${isCarousel ? 'mb-2.5' : 'mb-3'}`}>
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#6d7886]">Draft option {optionNumber}</p>
          <p className={`mt-1 text-[#394553] ${isCarousel ? 'text-[0.82rem]' : 'text-sm'}`}>
            {isCarousel ? 'Tap to load this draft into the main view' : 'Feed preview with text and image pairing'}
          </p>
        </div>
        <div
          className={`flex min-w-8 items-center justify-center rounded-full border px-2 text-xs font-semibold ${
            isCarousel ? 'h-7' : 'h-8'
          } ${
            selected ? 'border-[#0a66c2] bg-[#0a66c2] text-white' : 'border-[#c9d0db] bg-white text-[#5b6674]'
          }`}
        >
          {selected ? (isCarousel ? 'Active' : 'Selected') : `Pick ${optionNumber}`}
        </div>
      </div>

      <div className={`overflow-hidden border border-[#d8dce6] bg-[#f3f2ef] ${isCarousel ? 'rounded-[22px] p-2.5 sm:p-3' : 'rounded-[24px] p-3 sm:p-4'}`}>
        <div className={`mx-auto overflow-hidden border border-[#d8dce6] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.10)] ${isCarousel ? 'max-w-none rounded-[18px]' : 'max-w-[430px] rounded-[20px]'}`}>
          <div className={isCarousel ? 'px-3.5 pb-3.5 pt-3.5' : 'px-4 pb-4 pt-4 sm:px-5'}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className={`flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0a66c2,#4c90d9)] font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] ${isCarousel ? 'h-10 w-10 text-[0.82rem]' : 'h-12 w-12 text-sm'}`}>
                  LB
                </div>
                <div className="min-w-0">
                  <p className={`truncate font-semibold text-[#191919] ${isCarousel ? 'text-[0.88rem]' : 'text-[0.95rem]'}`}>LinkedIn Bot Preview</p>
                  <p className={`truncate text-[#666666] ${isCarousel ? 'text-[0.72rem]' : 'text-[0.8rem]'}`}>AI-assisted draft preview</p>
                  <div className={`mt-0.5 flex items-center gap-1 text-[#666666] ${isCarousel ? 'text-[0.68rem]' : 'text-[0.75rem]'}`}>
                    <span>Now</span>
                    <span aria-hidden="true">•</span>
                    <Globe2 className={isCarousel ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                  </div>
                </div>
              </div>
              <MoreHorizontal className={`mt-1 shrink-0 text-[#666666] ${isCarousel ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </div>

            <div className={`text-[#191919] ${isCarousel ? 'mt-3 text-[0.84rem] leading-5' : 'mt-4 text-[0.95rem] leading-6'}`}>
              <div
                className={!expanded && shouldClamp ? 'overflow-hidden' : undefined}
                style={!expanded && shouldClamp ? { display: '-webkit-box', WebkitLineClamp: isCarousel ? 4 : 5, WebkitBoxOrient: 'vertical' } : undefined}
              >
                {renderLinkedText(text)}
              </div>
              {shouldClamp && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleExpanded();
                  }}
                  className={`mt-2 font-semibold text-[#666666] hover:text-[#191919] ${isCarousel ? 'text-[0.78rem]' : 'text-sm'}`}
                >
                  {expanded ? 'Show less' : '...see more'}
                </button>
              )}
            </div>
          </div>

          {resolvedImageUrl && !imageLoadFailed ? (
            <div className="border-y border-[#e8e8e8] bg-[#f3f2ef]">
              <div className={`${isCarousel ? 'aspect-[4/3]' : 'aspect-[4/5] sm:aspect-[1.2/1]'} bg-[#f3f2ef]`}>
                <img
                  src={resolvedImageUrl}
                  alt={`Preview media for option ${optionNumber}`}
                  className="h-full w-full object-contain"
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
            <div className="border-y border-[#e8e8e8] bg-[#f7f5f2] px-5 py-8 text-center text-[#5b6674]">
              <div className="mx-auto flex max-w-[260px] flex-col items-center gap-2 rounded-2xl border border-dashed border-[#cfd6e1] bg-white px-4 py-5">
                <ImageOff className="h-5 w-5 text-[#7d8794]" />
                <p className="text-sm font-medium text-[#1f2937]">Image preview unavailable</p>
                <p className="text-xs leading-5 text-[#6b7280]">Open the browser console to inspect the logged source URL and normalized preview URL.</p>
              </div>
            </div>
          ) : null}

          <div className={`text-[#666666] ${isCarousel ? 'px-3.5 py-2 text-[0.7rem]' : 'px-4 py-2 text-[0.78rem] sm:px-5'}`}>
            <div className="flex items-center justify-between gap-2 border-b border-[#e8e8e8] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0a66c2] text-[0.6rem] text-white">👍</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#057642] text-[0.6rem] text-white">👏</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b24020] text-[0.6rem] text-white">❤</span>
                </div>
                <span>{proof.reactions}</span>
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span>{proof.comments} comments</span>
                <span aria-hidden="true">•</span>
                <span>{proof.reposts} reposts</span>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-4 ${isCarousel ? 'px-1.5 pb-1.5 pt-0.5' : 'px-2 pb-2 sm:px-3 sm:pb-3'}`}>
            {ACTIONS.map(({ label, icon: Icon }) => (
              <div key={label} className={`flex items-center justify-center gap-1 rounded-xl font-medium text-[#666666] transition group-hover:bg-[#f6f8fa] ${isCarousel ? 'px-1.5 py-2 text-[0.68rem]' : 'px-2 py-2.5 text-[0.82rem]'}`}>
                <Icon className={isCarousel ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}