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
    <div className="space-y-2.5">
      {/* Single unified action row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Selection group */}
        <button
          type="button"
          disabled={empty}
          onClick={onSelectAll}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700',
            'hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40',
            'transition-colors duration-150 cursor-pointer',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600',
          )}
        >
          <ListChecks className="h-3.5 w-3.5" aria-hidden />
          All
        </button>
        <button
          type="button"
          disabled={noneSelected}
          onClick={onClearSelection}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700',
            'hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40',
            'transition-colors duration-150 cursor-pointer',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-400',
          )}
        >
          Clear
        </button>

        {/* Count badge */}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-500">
          {selectedCount}/{postCount}
        </span>

        {/* Divider */}
        <span className="h-4 w-px bg-slate-200" aria-hidden />

        {/* Bulk action group (on selection) */}
        <button
          type="button"
          disabled={noneSelected}
          onClick={onOpenSetSchedule}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700',
            'hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40',
            'transition-colors duration-150 cursor-pointer',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600',
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Schedule
        </button>
        <button
          type="button"
          disabled={noneSelected}
          onClick={onOpenSetChannels}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700',
            'hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40',
            'transition-colors duration-150 cursor-pointer',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600',
          )}
        >
          Channels
        </button>

        {/* Divider */}
        <span className="h-4 w-px bg-slate-200" aria-hidden />

        {/* Global actions */}
        <button
          type="button"
          disabled={empty}
          onClick={onDraftAll}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800',
            'hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40',
            'transition-colors duration-150 cursor-pointer',
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
            'inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700',
            'hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40',
            'transition-colors duration-150 cursor-pointer',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rose-600',
          )}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Delete all
        </button>
      </div>

      <p className="text-[10px] leading-snug text-slate-400">
        <kbd className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[10px]">⌘</kbd>/
        <kbd className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[10px]">Ctrl</kbd>+click
        a calendar event to toggle selection without opening it.
      </p>
    </div>
  );
}
