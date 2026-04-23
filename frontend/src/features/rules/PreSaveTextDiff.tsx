import { useMemo } from 'react';
import { diffLines } from '@/utils/lineDiff';
import { cn } from '@/lib/cn';

export function PreSaveTextDiff({
  baseline,
  draft,
  title = 'Changes vs saved',
  className,
  treatTrimAsNoChanges = true,
}: {
  baseline: string;
  draft: string;
  title?: string;
  className?: string;
  treatTrimAsNoChanges?: boolean;
}) {
  const noEffectiveChange =
    treatTrimAsNoChanges ? baseline.trim() === draft.trim() : baseline === draft;

  const rows = useMemo(() => diffLines(baseline, draft), [baseline, draft]);

  return (
    <div className={cn('mt-4', className)}>
      <h3 className="font-heading text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-xs text-muted">Review what will change before you save.</p>
      <div
        className="custom-scrollbar mt-3 max-h-[min(40vh,320px)] overflow-auto rounded-xl border border-border bg-ink/[0.03] p-3 font-mono text-xs leading-5"
        role="region"
        aria-label={title}
      >
        {noEffectiveChange ? (
          <p className="text-muted">No unsaved changes.</p>
        ) : rows.length === 0 ? (
          <p className="text-muted">No differences.</p>
        ) : (
          rows.map((row, i) => (
            <div
              key={i}
              className={
                row.kind === 'same'
                  ? 'text-ink/80'
                  : row.kind === 'add'
                    ? 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-100'
                    : 'bg-rose-500/15 text-rose-900 dark:text-rose-100'
              }
            >
              <span className="select-none pr-2 text-muted">
                {row.kind === 'same' ? ' ' : row.kind === 'add' ? '+' : '-'}
              </span>
              {row.line || ' '}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
