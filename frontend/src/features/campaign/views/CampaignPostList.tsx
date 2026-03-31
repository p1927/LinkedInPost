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
    <ul className="custom-scrollbar max-h-[min(28rem,50vh)] list-none divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 p-0">
      {posts.map((p, i) => (
        <li
          key={p._rowId ?? `post-${i}`}
          className={`flex gap-3 px-3 py-3 text-sm transition-colors duration-100 ${selectedIndices.has(i) ? 'bg-indigo-50/60' : 'bg-white hover:bg-slate-50/70'}`}
        >
          <label className="mt-0.5 flex shrink-0 cursor-pointer items-start pt-px">
            <input
              type="checkbox"
              checked={selectedIndices.has(i)}
              onChange={() => onToggleSelect(i)}
              className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              aria-label={`Select ${p.topic || `post ${i + 1}`}`}
            />
          </label>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-semibold text-slate-900">{p.topic}</span>
              <span className="text-xs tabular-nums text-slate-400">{p.date}{p.postTime ? ` · ${p.postTime}` : ''}</span>
              {p.channels?.map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px] font-medium">
                  {c}
                </Badge>
              ))}
            </div>
            <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">{previewBody(p)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-0.5 shrink-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
            aria-label={`Delete ${p.topic || `post ${i + 1}`}`}
            onClick={() => onDeletePost(i)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
