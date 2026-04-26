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

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
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
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-thin scrollbar-thumb-gray-200">
          {/* Current chip — always pinned left */}
          <button
            type="button"
            onClick={() => mostRecent && onRestore(mostRecent)}
            disabled={isOnCurrent}
            className={cn(
              'flex shrink-0 flex-col items-start gap-0.5 rounded-lg border px-2.5 py-1.5 transition-colors',
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
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onRestore(entry)}
                className={cn(
                  'flex shrink-0 flex-col items-start gap-0.5 rounded-lg border px-2.5 py-1.5 transition-colors',
                  isActive
                    ? 'border-violet-300 bg-violet-50 text-violet-700'
                    : 'border-gray-200 bg-white text-ink/50 hover:border-violet-200 hover:text-ink/70',
                )}
              >
                <span className="text-[0.6rem] font-semibold whitespace-nowrap">
                  <span aria-hidden="true">{SOURCE_ICON[entry.source]} </span>
                  <span>{entry.label}</span>
                </span>
                <span className="text-[0.55rem] opacity-60">{relativeTime(entry.timestamp)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
