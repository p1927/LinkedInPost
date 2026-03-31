import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '../../lib/cn';
import type { ContentPattern } from './types';
import { filterPatterns } from './filterPatterns';

interface TemplateSelectorProps {
  patterns: ContentPattern[];
  selectedPatternId?: string | null;
  /** Filter to only show patterns compatible with this channel (empty = show all). */
  deliveryChannel?: string;
  onSelect: (patternId: string) => void;
  onClose?: () => void;
  className?: string;
}

export function TemplateSelector({
  patterns,
  selectedPatternId,
  deliveryChannel,
  onSelect,
  onClose,
  className,
}: TemplateSelectorProps) {
  const [query, setQuery] = useState('');

  const filtered = filterPatterns(patterns, { channel: deliveryChannel, query });

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-lg',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Choose a content pattern</p>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close pattern selector"
            className="h-7 w-7 rounded-md text-ink/40 hover:text-ink/70"
          >
            <X className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink/40"
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patterns…"
          aria-label="Search patterns"
          className="w-full rounded-lg border border-border bg-surface-muted py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Pattern list */}
      <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink/50">
            {query ? 'No patterns match your search.' : 'No patterns available.'}
          </p>
        ) : (
          filtered.map((pattern) => {
            const active = pattern.id === selectedPatternId;
            return (
              <button
                key={pattern.id}
                type="button"
                onClick={() => onSelect(pattern.id)}
                aria-pressed={active}
                className={cn(
                  'flex min-w-0 flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  active
                    ? 'border-violet-300 bg-violet-50 text-ink'
                    : 'border-transparent bg-surface-muted hover:border-border hover:bg-white text-ink/80',
                )}
              >
                <span className="text-sm font-semibold leading-tight">{pattern.name}</span>
                {pattern.whenToUse ? (
                  <span className="line-clamp-2 text-xs text-ink/55 leading-snug">
                    {pattern.whenToUse}
                  </span>
                ) : null}
                {pattern.tags && pattern.tags.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {pattern.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
