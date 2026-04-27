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

const SOURCE_ICON: Record<VersionEntry['source'], string> = {
  generate: '✦',
  save: '⬡',
  initial: '·',
};

function formatTimestamp(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return { date: 'Today', time };
  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return { date, time };
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
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 px-4 py-1.5 text-left text-[0.65rem] font-semibold text-ink/40 hover:text-ink/60 transition-colors"
      >
        <span>Version history</span>
        <span
          aria-hidden="true"
          className={cn(
            'ml-auto transition-transform duration-150',
            isOpen ? 'rotate-180' : '',
          )}
        >
          ▾
        </span>
      </button>

      {isOpen && versions.length > 0 && (
        <div className="flex max-h-44 flex-col gap-1 overflow-y-auto px-3 pb-3 scrollbar-thin scrollbar-thumb-gray-200">
          {/* Current — always pinned top */}
          <button
            type="button"
            onClick={() => mostRecent && onRestore(mostRecent)}
            disabled={isOnCurrent}
            className={cn(
              'flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 transition-colors',
              isOnCurrent
                ? 'border-violet-300 bg-violet-50 text-violet-700 cursor-default'
                : 'border-gray-200 bg-white text-ink/50 hover:border-violet-200 hover:text-violet-600',
            )}
          >
            <span className="text-[0.6rem] font-bold uppercase tracking-wide">Current</span>
          </button>

          {/* Past versions — newest to oldest */}
          {reversedVersions.map(entry => {
            const isActive = currentVersionId === entry.id;
            const { date, time } = formatTimestamp(entry.timestamp);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onRestore(entry)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 transition-colors',
                  isActive
                    ? 'border-violet-300 bg-violet-50 text-violet-700'
                    : 'border-gray-200 bg-white text-ink/50 hover:border-violet-200 hover:text-ink/70',
                )}
              >
                <span className="text-[0.6rem] font-semibold">
                  <span aria-hidden="true">{SOURCE_ICON[entry.source]} </span>
                  <span>{entry.label}</span>
                </span>
                <span className="flex flex-col items-end text-[0.55rem] opacity-60">
                  <span>{date}</span>
                  <span>{time}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
