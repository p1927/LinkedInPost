import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type GenWorkerDraftFieldProps = {
  label: string;
  placeholder: string;
  chips: string[];
  onAddChip: (value: string) => void;
  onRemoveChip: (value: string) => void;
  freeValue: string;
  onFreeChange: (value: string) => void;
  suggestions: string[];
  disabled?: boolean;
  multiline?: boolean;
  freeRows?: number;
};

export function GenWorkerDraftField({
  label,
  placeholder,
  chips,
  onAddChip,
  onRemoveChip,
  freeValue,
  onFreeChange,
  suggestions,
  disabled,
  multiline,
  freeRows = 2,
}: GenWorkerDraftFieldProps) {
  const picked = new Set(chips);
  const available = suggestions.filter((s) => !picked.has(s));

  return (
    <div className="flex flex-col gap-3">
      {/* Field label */}
      <label
        className="block text-[11px] font-semibold uppercase tracking-widest text-primary/80 select-none"
        htmlFor={`field-${label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
      >
        {label}
      </label>

      {/* Selected chips */}
      {chips.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5"
          role="list"
          aria-label={`Selected ${label}`}
        >
          {chips.map((c) => (
            <span
              key={c}
              role="listitem"
              className={cn(
                'inline-flex max-w-[240px] items-center gap-1 rounded-full border px-3 py-1',
                'border-primary/25 bg-primary/8 text-xs font-medium text-ink',
                'shadow-[0_1px_3px_rgba(124,58,237,0.08)]',
                'transition-all duration-150',
                disabled
                  ? 'opacity-50'
                  : 'hover:border-primary/45 hover:bg-primary/12 hover:shadow-[0_2px_6px_rgba(124,58,237,0.14)]',
              )}
            >
              <span className="min-w-0 truncate leading-none" title={c}>
                {c}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoveChip(c)}
                className={cn(
                  'shrink-0 rounded-full',
                  /* Expand hit area to 44×44px via padding while keeping visual size small */
                  'p-[10px] -m-[10px]',
                  'text-ink/40 transition-colors duration-150',
                  'hover:bg-red-100 hover:text-red-600',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1',
                  'active:bg-red-200 active:text-red-700',
                  disabled && 'pointer-events-none opacity-40',
                )}
                aria-label={`Remove ${c}`}
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Free-text input / textarea */}
      {multiline ? (
        <Textarea
          id={`field-${label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
          placeholder={placeholder}
          value={freeValue}
          onChange={(e) => onFreeChange(e.target.value)}
          disabled={disabled}
          rows={freeRows}
          className={cn(
            'resize-none text-sm leading-relaxed',
            'placeholder:text-muted/70',
          )}
        />
      ) : (
        <Input
          id={`field-${label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
          placeholder={placeholder}
          value={freeValue}
          onChange={(e) => onFreeChange(e.target.value)}
          disabled={disabled}
          className="text-sm"
        />
      )}

      {/* Quick-add suggestions */}
      {available.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted/70 select-none">
            Quick add
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Quick add ${label}`}>
            {available.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => onAddChip(s)}
                title={s}
                className={cn(
                  'inline-flex max-w-[200px] items-center gap-1 truncate rounded-full border border-dashed px-2.5',
                  'min-h-[44px] py-1',
                  'border-border-strong/80 bg-white/60 text-xs font-medium text-ink/70',
                  'transition-all duration-150',
                  'hover:border-primary/50 hover:bg-primary/8 hover:text-ink hover:shadow-[0_1px_4px_rgba(124,58,237,0.12)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
                  'active:bg-primary/12 active:scale-[0.97]',
                  disabled && 'pointer-events-none opacity-40 cursor-not-allowed',
                )}
              >
                <Plus className="h-3 w-3 shrink-0 opacity-60" strokeWidth={2.5} />
                <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
