import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../../lib/cn';
import type { VersionEntry } from '../../review/context/types';

interface VersionHistoryStripProps {
  versions: VersionEntry[];
  currentVersionId: string | null;
  onRestore: (entry: VersionEntry) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const SOURCE_LABEL: Record<VersionEntry['source'], string> = {
  generate: 'AI',
  save: 'Saved',
  initial: 'Original',
};

const SOURCE_COLORS: Record<VersionEntry['source'], string> = {
  generate: 'bg-violet-100 text-violet-600',
  save: 'bg-emerald-100 text-emerald-700',
  initial: 'bg-slate-100 text-slate-500',
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${date} · ${time}`;
}

export function VersionHistoryStrip({
  versions,
  currentVersionId,
  onRestore,
  isOpen,
  onToggle,
}: VersionHistoryStripProps) {
  const mostRecent = versions.at(-1);
  const isOnCurrent = !currentVersionId || currentVersionId === mostRecent?.id;

  // Refresh relative timestamps every 30s while the strip is open
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, [isOpen]);

  const reversedVersions = useMemo(() => [...versions].reverse(), [versions]);

  return (
    <div className="font-sans border-t border-violet-200/40 mt-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-violet-50/50 rounded-b-lg"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink/40">
          Version history
        </span>
        {versions.length > 0 && (
          <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-600 leading-none">
            {versions.length}
          </span>
        )}
        <span
          aria-hidden="true"
          className={cn(
            'ml-auto text-ink/30 transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
          )}
        >
          ▾
        </span>
      </button>

      {isOpen && versions.length > 0 && (
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto px-3 pb-3 scrollbar-thin scrollbar-thumb-violet-200">
          {/* Current — always pinned top */}
          <button
            type="button"
            onClick={() => mostRecent && onRestore(mostRecent)}
            disabled={isOnCurrent}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all duration-150',
              isOnCurrent
                ? 'border-violet-300/70 bg-violet-50 text-violet-700 cursor-default shadow-sm'
                : 'border-gray-200 bg-white text-ink/60 hover:border-violet-300 hover:bg-violet-50/60 hover:text-violet-700',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" aria-hidden />
            <span className="text-xs font-semibold">Current</span>
            {isOnCurrent && (
              <span className="ml-auto text-[10px] font-semibold text-violet-500 uppercase tracking-wide">Active</span>
            )}
          </button>

          {/* Past versions — newest to oldest */}
          {reversedVersions.map(entry => {
            const isActive = currentVersionId === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onRestore(entry)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all duration-150',
                  isActive
                    ? 'border-violet-300/70 bg-violet-50 text-violet-700 shadow-sm'
                    : 'border-gray-100 bg-white/60 text-ink/70 hover:border-violet-200 hover:bg-violet-50/40 hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none',
                    SOURCE_COLORS[entry.source],
                  )}
                >
                  {SOURCE_LABEL[entry.source]}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{entry.label}</span>
                <span className="shrink-0 text-[10px] text-ink/40 tabular-nums">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
