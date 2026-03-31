import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CampaignPostV1 } from '../schema/types';
import { Trash2 } from 'lucide-react';

function previewBody(p: CampaignPostV1): string {
  const v = p.variants?.find((s) => s?.trim())?.trim();
  if (v) return v;
  return (
    p.variant1?.trim() ||
    p.variant2?.trim() ||
    p.variant3?.trim() ||
    p.variant4?.trim() ||
    p.body?.trim() ||
    '—'
  );
}

export function CampaignPostList({
  posts,
  selectedIndices,
  onToggleSelect,
  onDeletePost,
}: {
  posts: CampaignPostV1[];
  selectedIndices: ReadonlySet<number>;
  onToggleSelect: (index: number) => void;
  onDeletePost: (index: number) => void;
}) {
  return (
    <ul className="custom-scrollbar max-h-[min(28rem,50vh)] list-none space-y-2 overflow-y-auto p-0">
      {posts.map((p, i) => (
        <li
          key={p._rowId ?? `post-${i}`}
          className="rounded-xl border border-white/50 bg-white/40 px-3 py-2.5 text-sm shadow-sm backdrop-blur-sm"
        >
          <div className="flex gap-2">
            <label className="mt-0.5 flex cursor-pointer items-start">
              <input
                type="checkbox"
                checked={selectedIndices.has(i)}
                onChange={() => onToggleSelect(i)}
                className="mt-0.5 size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                aria-label={`Select ${p.topic || `post ${i + 1}`}`}
              />
            </label>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-ink">{p.topic}</span>
                <span className="text-xs text-muted">{p.date}</span>
                {p.postTime ? (
                  <span className="text-xs tabular-nums text-muted">{p.postTime}</span>
                ) : null}
                {p.channels?.map((c) => (
                  <Badge key={c} variant="secondary" className="text-[10px] font-medium">
                    {c}
                  </Badge>
                ))}
              </div>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-muted">{previewBody(p)}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted hover:bg-rose-50 hover:text-rose-700"
              aria-label={`Delete ${p.topic || `post ${i + 1}`}`}
              onClick={() => onDeletePost(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
