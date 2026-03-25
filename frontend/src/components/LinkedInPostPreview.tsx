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
  { label: 'React', icon: ThumbsUp },
  { label: 'Reply', icon: MessageCircle },
  { label: 'Forward', icon: Repeat2 },
  { label: 'Share', icon: Send },
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
      className={`group relative w-full text-left transition-all duration-300 outline-none ${
        isCarousel ? 'h-full rounded-3xl p-3' : 'rounded-[32px] p-3 sm:p-4'
      } ${
        selected
          ? 'bg-white/80 border-2 border-primary shadow-xl ring-4 ring-primary/10'
          : 'bg-white/40 border-2 border-white hover:bg-white/60 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1'
      }`}
    >
      <div className={`flex items-center justify-between gap-3 px-1 ${isCarousel ? 'mb-3' : 'mb-4'}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 font-heading">Draft {optionNumber}</p>
          <p className={`mt-1 text-slate-600 ${isCarousel ? 'text-[0.8rem]' : 'text-sm'}`}>
            {isCarousel ? 'Tap to preview' : 'Full message preview'}
          </p>
        </div>
        <div
          className={`flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-xs font-bold transition-colors duration-300 ${
            selected ? 'bg-primary text-white shadow-md' : 'bg-white/80 text-slate-500 border border-slate-200 shadow-sm group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20'
          }`}
        >
          {selected ? (isCarousel ? 'Active' : 'Selected') : `Pick ${optionNumber}`}
        </div>
      </div>

      <div className={`overflow-hidden bg-slate-50/50 backdrop-blur-sm border border-slate-200 ${isCarousel ? 'rounded-2xl p-2.5 sm:p-3' : 'rounded-[28px] p-2.5 sm:p-4'}`}>
        <div className={`mx-auto overflow-hidden bg-white shadow-sm border border-slate-100 ${isCarousel ? 'max-w-none rounded-[16px]' : 'max-w-[430px] rounded-2xl'}`}>
          <div className={isCarousel ? 'px-4 pb-3.5 pt-4' : 'px-4 pb-3 pt-4'}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3 items-center">
                <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 font-bold text-white shadow-inner ${isCarousel ? 'h-10 w-10 text-sm' : 'h-12 w-12 text-base'}`}>
                  CB
                </div>
                <div className="min-w-0">
                  <p className={`truncate font-bold text-slate-900 ${isCarousel ? 'text-[0.9rem]' : 'text-[0.95rem]'}`}>Channel Bot</p>
                  <p className={`truncate text-slate-500 ${isCarousel ? 'text-[0.75rem]' : 'text-[0.8rem]'}`}>AI-assisted message preview</p>
                  <div className={`mt-0.5 flex items-center gap-1.5 text-slate-400 ${isCarousel ? 'text-[0.7rem]' : 'text-[0.75rem]'}`}>
                    <span>Now</span>
                    <span aria-hidden="true">•</span>
                    <Globe2 className={isCarousel ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                  </div>
                </div>
              </div>
              <MoreHorizontal className={`mt-1 shrink-0 text-slate-400 hover:text-slate-600 transition-colors ${isCarousel ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </div>

            <div className={`text-slate-800 ${isCarousel ? 'mt-4 text-[0.85rem] leading-snug' : 'mt-4 text-[0.95rem] leading-relaxed'}`}>
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
                  className={`mt-2 font-semibold text-primary hover:text-indigo-800 transition-colors ${isCarousel ? 'text-[0.8rem]' : 'text-[0.85rem]'}`}
                >
                  {expanded ? 'Show less' : '...see more'}
                </button>
              )}
            </div>
          </div>

          {resolvedImageUrl && !imageLoadFailed ? (
            <div className="border-y border-slate-100 bg-slate-50">
              <div className={`${isCarousel ? 'aspect-[4/3]' : 'aspect-[4/5] sm:aspect-[1.2/1]'} bg-slate-100 relative overflow-hidden group/image`}>
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
            <div className="border-y border-slate-100 bg-slate-50 px-4 py-6 text-center text-slate-500">
              <div className="mx-auto flex max-w-[260px] flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 shadow-sm">
                <div className="p-3 bg-slate-50 rounded-full">
                  <ImageOff className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Image preview unavailable</p>
                <p className="text-xs leading-relaxed text-slate-500">Open the browser console to inspect the logged source URL.</p>
              </div>
            </div>
          ) : null}

          <div className={`text-slate-500 ${isCarousel ? 'px-4 py-2.5 text-[0.75rem]' : 'px-4 py-2.5 text-[0.8rem]'}`}>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[0.6rem] text-white ring-2 ring-white z-20 shadow-sm">👍</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[0.6rem] text-white ring-2 ring-white z-10 shadow-sm">👏</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[0.6rem] text-white ring-2 ring-white z-0 shadow-sm">❤</span>
                </div>
                <span className="font-medium">{proof.reactions}</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span>{proof.comments} comments</span>
                <span aria-hidden="true" className="text-slate-300">•</span>
                <span>{proof.reposts} shares</span>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-4 ${isCarousel ? 'px-1.5 pb-2 pt-0.5' : 'px-2 pb-2 pt-0.5'}`}>
            {ACTIONS.map(({ label, icon: Icon }) => (
              <div key={label} className={`flex items-center justify-center gap-1.5 rounded-xl font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer ${isCarousel ? 'px-2 py-2.5 text-[0.7rem]' : 'px-2 py-2.5 text-[0.8rem]'}`}>
                <Icon className={isCarousel ? 'h-4 w-4' : 'h-4.5 w-4.5'} />
                <span className="hidden sm:inline">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}