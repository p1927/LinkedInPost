import clsx from 'clsx';
import { CalendarClock, ListChecks, Trash2, FileEdit } from 'lucide-react';

export function CampaignPreviewToolbar({
  postCount,
  selectedCount,
  onSelectAll,
  onClearSelection,
  onDraftAll,
  onDeleteAll,
  onOpenSetSchedule,
  onOpenSetChannels,
}: {
  postCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDraftAll: () => void;
  onDeleteAll: () => void;
  onOpenSetSchedule: () => void;
  onOpenSetChannels: () => void;
}) {
  const empty = postCount === 0;
  const noneSelected = selectedCount === 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={empty}
          onClick={onSelectAll}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700',
            'hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600',
          )}
        >
          <ListChecks className="h-3.5 w-3.5" aria-hidden />
          Select all
        </button>
        <button
          type="button"
          disabled={noneSelected}
          onClick={onClearSelection}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700',
            'hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-400',
          )}
        >
          Clear selection
        </button>
        <span className="text-xs text-muted">
          {selectedCount} of {postCount} selected
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={empty}
          onClick={onDraftAll}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50/90 px-2.5 py-1.5 text-xs font-semibold text-amber-900',
            'hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600',
          )}
        >
          <FileEdit className="h-3.5 w-3.5" aria-hidden />
          Draft all
        </button>
        <button
          type="button"
          disabled={empty}
          onClick={onDeleteAll}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/90 px-2.5 py-1.5 text-xs font-semibold text-rose-800',
            'hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rose-600',
          )}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Delete all
        </button>
        <button
          type="button"
          disabled={noneSelected}
          onClick={onOpenSetSchedule}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700',
            'hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600',
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Set schedule…
        </button>
        <button
          type="button"
          disabled={noneSelected}
          onClick={onOpenSetChannels}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700',
            'hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600',
          )}
        >
          Set channels…
        </button>
      </div>

      <p className="text-[11px] leading-snug text-muted">
        In calendar view, <kbd className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[10px]">⌘</kbd>{' '}
        or <kbd className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[10px]">Ctrl</kbd>+click an
        event to add or remove it from the selection without opening the detail panel.
      </p>
    </div>
  );
}
