import { cn } from '@/lib/cn';

export type StatusKind =
  | 'pending'
  | 'drafted'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'blocked';

type StatusMeta = {
  label: string;
  dotClass: string;
  textClass: string;
};

const STATUS_META: Record<StatusKind, StatusMeta> = {
  pending:   { label: 'Pending',   dotClass: 'bg-slate-400',   textClass: 'text-slate-700' },
  drafted:   { label: 'Drafted',   dotClass: 'bg-blue-500',    textClass: 'text-slate-700' },
  approved:  { label: 'Approved',  dotClass: 'bg-violet-500',  textClass: 'text-slate-700' },
  scheduled: { label: 'Scheduled', dotClass: 'bg-amber-500',   textClass: 'text-slate-700' },
  published: { label: 'Published', dotClass: 'bg-emerald-500', textClass: 'text-slate-700' },
  blocked:   { label: 'Blocked',   dotClass: 'bg-rose-500',    textClass: 'text-rose-700' },
};

export interface StatusPillProps {
  status: StatusKind;
  size?: 'sm' | 'md';
  /** Override the auto-derived label (defaults to status's canonical name). */
  label?: string;
  className?: string;
}

/**
 * Compact status indicator: small colored dot + neutral text.
 * Used by the topics queue, topic detail drawer, and any other surface that
 * renders the lifecycle state of a topic.
 */
export function StatusPill({ status, size = 'sm', label, className }: StatusPillProps) {
  const meta = STATUS_META[status];
  const display = label ?? meta.label;
  return (
    <span
      role="status"
      aria-label={`Status: ${display}`}
      className={cn(
        'inline-flex items-center gap-1.5 leading-none font-semibold',
        size === 'sm' ? 'text-[11px]' : 'text-xs',
        meta.textClass,
        className,
      )}
    >
      <span
        className={cn(
          'shrink-0 rounded-full',
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
          meta.dotClass,
        )}
        aria-hidden
      />
      {display}
    </span>
  );
}

/**
 * Map a free-form status string from the sheet/backend into a canonical pill kind.
 * Pass `isScheduled=true` when the row has an active scheduled-publish entry so
 * Drafted/Approved rows render as "Scheduled" instead.
 */
export function deriveStatus(
  rawStatus: string | undefined | null,
  options?: { isScheduled?: boolean },
): StatusKind {
  const raw = (rawStatus ?? '').trim().toLowerCase();
  if (options?.isScheduled && (raw === 'approved' || raw === 'drafted' || raw === 'draft' || raw === 'ready')) {
    return 'scheduled';
  }
  if (raw === 'published' || raw === 'live' || raw === 'sent') return 'published';
  if (raw === 'approved' || raw === 'ready') return 'approved';
  if (raw === 'drafted' || raw === 'draft') return 'drafted';
  if (raw === 'blocked' || raw === 'failed' || raw === 'error') return 'blocked';
  return 'pending';
}
