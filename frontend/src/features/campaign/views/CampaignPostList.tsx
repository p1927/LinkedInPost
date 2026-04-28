import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CHANNEL_OPTIONS, type ChannelId } from '@/integrations/channels';
import type { CampaignPostV1 } from '../schema/types';
import { Trash2 } from 'lucide-react';
import clsx from 'clsx';

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

function InlineDateCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        className="rounded border border-indigo-300 bg-white px-1.5 py-0.5 text-xs tabular-nums text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded px-1 py-0.5 text-xs tabular-nums text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
      title="Click to edit date"
    >
      {value || '—'}
    </button>
  );
}

function InlineChannelCell({
  channels,
  onChange,
}: {
  channels: ChannelId[];
  onChange: (v: ChannelId[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <select
        autoFocus
        multiple
        value={channels}
        onChange={(e) =>
          onChange(Array.from(e.target.selectedOptions, (o) => o.value as ChannelId))
        }
        onBlur={() => setEditing(false)}
        className="rounded border border-indigo-300 bg-white px-1 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        size={Math.min(CHANNEL_OPTIONS.length, 5)}
      >
        {CHANNEL_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex flex-wrap gap-1"
      title="Click to edit channels"
    >
      {channels.length > 0 ? (
        channels.map((c) => (
          <Badge key={c} variant="secondary" className="text-[10px] font-medium hover:bg-indigo-100 transition-colors cursor-pointer">
            {c}
          </Badge>
        ))
      ) : (
        <span className="rounded px-1 py-0.5 text-xs text-slate-300 hover:bg-indigo-50 hover:text-indigo-500 transition-colors">
          + channel
        </span>
      )}
    </button>
  );
}

export function CampaignPostList({
  posts,
  selectedIndices,
  onToggleSelect,
  onDeletePost,
  onUpdatePost,
}: {
  posts: CampaignPostV1[];
  selectedIndices: ReadonlySet<number>;
  onToggleSelect: (index: number) => void;
  onDeletePost: (index: number) => void;
  onUpdatePost?: (index: number, patch: Partial<CampaignPostV1>) => void;
}) {
  return (
    <ul className="custom-scrollbar max-h-[min(28rem,50vh)] list-none divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 p-0">
      {posts.map((p, i) => (
        <li
          key={p._rowId ?? `post-${i}`}
          className={clsx(
            'flex gap-3 px-3 py-3 text-sm transition-colors duration-100',
            selectedIndices.has(i) ? 'bg-indigo-50/60' : 'bg-white hover:bg-slate-50/70',
          )}
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
              <InlineDateCell
                value={p.date ?? ''}
                onChange={(v) => onUpdatePost?.(i, { date: v })}
              />
              {p.postTime && (
                <span className="text-xs tabular-nums text-slate-400">· {p.postTime}</span>
              )}
              <InlineChannelCell
                channels={p.channels ?? []}
                onChange={(v) => onUpdatePost?.(i, { channels: v })}
              />
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
