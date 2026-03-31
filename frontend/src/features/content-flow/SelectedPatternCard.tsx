import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '../../lib/cn';
import type { ContentPattern } from './types';

interface SelectedPatternCardProps {
  pattern: ContentPattern;
  onClear?: () => void;
  className?: string;
}

export function SelectedPatternCard({ pattern, onClear, className }: SelectedPatternCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-start gap-2 rounded-lg border border-violet-200/60 bg-violet-50/60 px-3 py-2',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600/80">
          Content pattern
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-ink">{pattern.name}</p>
        {pattern.whenToUse ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-ink/60">{pattern.whenToUse}</p>
        ) : null}
        {pattern.tags && pattern.tags.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {pattern.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {onClear ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          aria-label="Remove pattern"
          className="h-6 w-6 shrink-0 rounded-md text-ink/40 hover:text-ink/70"
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
