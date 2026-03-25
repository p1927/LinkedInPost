import { Globe2, MessageCircle, MoreHorizontal, Repeat2, Send, ThumbsUp } from 'lucide-react';
import type { ReactNode } from 'react';

interface LinkedInPostPreviewProps {
  optionNumber: number;
  text: string;
  imageUrl?: string;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpanded: () => void;
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
}: LinkedInPostPreviewProps) {
  const proof = SOCIAL_PROOF[(optionNumber - 1) % SOCIAL_PROOF.length];
  const shouldClamp = text.length > 280 || text.split('\n').length > 5;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full rounded-[30px] border p-3 text-left transition duration-200 sm:p-4 ${
        selected
          ? 'border-[#0a66c2] bg-[#eef6ff] shadow-[0_18px_42px_rgba(10,102,194,0.18)]'
          : 'border-[#d8dce6] bg-[#f7f5f2] hover:border-[#9ebfe2] hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)]'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#6d7886]">Draft option {optionNumber}</p>
          <p className="mt-1 text-sm text-[#394553]">Feed preview with text and image pairing</p>
        </div>
        <div
          className={`flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-semibold ${
            selected ? 'border-[#0a66c2] bg-[#0a66c2] text-white' : 'border-[#c9d0db] bg-white text-[#5b6674]'
          }`}
        >
          {selected ? 'Selected' : `Pick ${optionNumber}`}
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[#d8dce6] bg-[#f3f2ef] p-3 sm:p-4">
        <div className="mx-auto max-w-[430px] overflow-hidden rounded-[20px] border border-[#d8dce6] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.10)]">
          <div className="px-4 pb-4 pt-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0a66c2,#4c90d9)] text-sm font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">
                  LB
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[0.95rem] font-semibold text-[#191919]">LinkedIn Bot Preview</p>
                  <p className="truncate text-[0.8rem] text-[#666666]">AI-assisted draft preview</p>
                  <div className="mt-0.5 flex items-center gap-1 text-[0.75rem] text-[#666666]">
                    <span>Now</span>
                    <span aria-hidden="true">•</span>
                    <Globe2 className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
              <MoreHorizontal className="mt-1 h-5 w-5 shrink-0 text-[#666666]" />
            </div>

            <div className="mt-4 text-[0.95rem] leading-6 text-[#191919]">
              <div
                className={!expanded && shouldClamp ? 'overflow-hidden' : undefined}
                style={!expanded && shouldClamp ? { display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' } : undefined}
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
                  className="mt-2 text-sm font-semibold text-[#666666] hover:text-[#191919]"
                >
                  {expanded ? 'Show less' : '...see more'}
                </button>
              )}
            </div>
          </div>

          {imageUrl ? (
            <div className="border-y border-[#e8e8e8] bg-[#f3f2ef]">
              <div className="aspect-[4/5] bg-[#f3f2ef] sm:aspect-[1.2/1]">
                <img src={imageUrl} alt={`Preview media for option ${optionNumber}`} className="h-full w-full object-contain" />
              </div>
            </div>
          ) : null}

          <div className="px-4 py-2 text-[0.78rem] text-[#666666] sm:px-5">
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

          <div className="grid grid-cols-4 px-2 pb-2 sm:px-3 sm:pb-3">
            {ACTIONS.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-[0.82rem] font-medium text-[#666666] transition group-hover:bg-[#f6f8fa]">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}