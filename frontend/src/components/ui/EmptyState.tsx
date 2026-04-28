import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  helper?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, helper, actionLabel, onAction, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center py-16 text-center', className)}>
      {icon && <div className="mb-4 text-muted/60">{icon}</div>}
      <p className="text-base font-semibold text-ink">{title}</p>
      {helper && <p className="mt-1 text-sm text-muted">{helper}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
