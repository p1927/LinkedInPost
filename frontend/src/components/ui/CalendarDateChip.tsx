import { Calendar } from 'lucide-react';
import { cn } from '../../lib/cn';

function tryFormatDate(raw: string): { line1: string; line2?: string } | null {
  const t = raw.trim();
  if (!t) return null;

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(d.getTime())) {
      return {
        line1: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        line2: iso[1],
      };
    }
  }

  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    return {
      line1: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      line2: d.toLocaleDateString(undefined, { year: 'numeric' }),
    };
  }

  return null;
}

export function CalendarDateChip({ date, className }: { date: string; className?: string }) {
  const trimmed = date.trim();
  if (!trimmed) {
    return <span className={cn('text-xs tabular-nums text-muted', className)}>—</span>;
  }

  const formatted = tryFormatDate(trimmed);
  if (!formatted) {
    return (
      <span
        className={cn(
          'inline-flex max-w-full items-center gap-1.5 rounded-lg border border-violet-200/50 bg-white/75 px-2 py-1 text-xs font-medium text-ink tabular-nums shadow-sm backdrop-blur-sm',
          className,
        )}
        title={trimmed}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span className="truncate">{trimmed}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-xl border border-violet-200/55 bg-white/80 px-2 py-1.5 shadow-sm backdrop-blur-md',
        className,
      )}
      title={trimmed}
    >
      <span
        className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary"
        aria-hidden
      >
        <Calendar className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 text-left leading-tight">
        <span className="block text-xs font-semibold text-ink">{formatted.line1}</span>
        {formatted.line2 ? (
          <span className="block text-[10px] font-medium tabular-nums text-muted">{formatted.line2}</span>
        ) : null}
      </span>
    </span>
  );
}
