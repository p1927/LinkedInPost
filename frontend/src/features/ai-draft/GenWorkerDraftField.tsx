import { X } from 'lucide-react';
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

  const fieldId = `field-${label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

  const inputSurface = cn(
    'border-border/70 bg-white/90 shadow-sm',
    'placeholder:text-muted-foreground/80',
    'focus-visible:border-primary/35 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-white',
  );

  return (
    <div className="flex flex-col gap-2">
      <label
        className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground select-none"
        htmlFor={fieldId}
      >
        {label}
      </label>

      {/* Free-text first so typing is primary; chips stay compact below */}
      {multiline ? (
        <Textarea
          id={fieldId}
          placeholder={placeholder}
          value={freeValue}
          onChange={(e) => onFreeChange(e.target.value)}
          disabled={disabled}
          rows={freeRows}
          className={cn('resize-none text-sm leading-snug', inputSurface)}
        />
      ) : (
        <Input
          id={fieldId}
          placeholder={placeholder}
          value={freeValue}
          onChange={(e) => onFreeChange(e.target.value)}
          disabled={disabled}
          className={cn('h-9 text-sm', inputSurface)}
        />
      )}

      {/* Selected + suggestion chips in one tight wrap row */}
      {(chips.length > 0 || available.length > 0) && (
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label={`${label} tags`}
        >
          {chips.map((c) => (
            <span
              key={c}
              className={cn(
                'inline-flex max-w-[min(100%,220px)] items-center gap-0.5 rounded-md border px-1.5 py-0.5',
                'border-primary/30 bg-primary/10 text-[11px] font-medium text-ink',
                'transition-colors duration-150',
                disabled ? 'opacity-50' : 'hover:border-primary/45 hover:bg-primary/[0.14]',
              )}
            >
              <span className="min-w-0 truncate leading-tight" title={c}>
                {c}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoveChip(c)}
                className={cn(
                  'inline-flex size-5 shrink-0 items-center justify-center rounded text-ink/45',
                  'transition-colors duration-150',
                  'hover:bg-red-500/15 hover:text-red-600',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
                  disabled && 'pointer-events-none opacity-40',
                )}
                aria-label={`Remove ${c}`}
              >
                <X className="h-3 w-3" strokeWidth={2.25} />
              </button>
            </span>
          ))}
          {available.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => onAddChip(s)}
              title={s}
              className={cn(
                'inline-flex max-w-[min(100%,200px)] items-center truncate rounded-md border border-dashed px-1.5 py-0.5',
                'min-h-7 text-[11px] font-medium text-muted-foreground',
                'border-border/90 bg-white/50 transition-colors duration-150',
                'hover:border-primary/40 hover:bg-primary/8 hover:text-ink',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
                'active:bg-primary/12',
                disabled && 'pointer-events-none cursor-not-allowed opacity-40',
              )}
            >
              <span className="truncate">+ {s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
