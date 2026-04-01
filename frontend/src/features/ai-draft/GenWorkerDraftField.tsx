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

  /* Violet-tinted surfaces (theme) + calm focus — avoids flat grey from shadcn muted. */
  const inputSurface = cn(
    'border border-primary/22 bg-white shadow-sm',
    'placeholder:text-ink/45',
    'transition-[border-color,box-shadow,background-color] duration-200',
    'hover:border-primary/32 hover:bg-white hover:shadow-[0_1px_3px_rgba(124,58,237,0.06)]',
    'focus-visible:border-primary/55 focus-visible:bg-white',
    'focus-visible:ring-0 focus-visible:outline-none',
    'focus-visible:shadow-[0_0_0_3px_rgba(124,58,237,0.14)]',
  );

  return (
    <div className="flex flex-col gap-2">
      <label
        className="block text-[10px] font-semibold uppercase tracking-wide text-primary select-none"
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
                'inline-flex max-w-[min(100%,15rem)] items-center gap-0.5 rounded-md border px-1.5 py-0.5',
                'border-primary/40 bg-primary/14 text-[11px] font-medium text-ink shadow-[0_1px_0_rgba(255,255,255,0.65)_inset]',
                'transition-colors duration-200',
                disabled ? 'opacity-50' : 'hover:border-primary/55 hover:bg-primary/[0.18]',
              )}
            >
              <span className="min-w-0 break-words leading-tight" title={c}>
                {c}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoveChip(c)}
                className={cn(
                  'inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-primary/50',
                  'transition-colors duration-200',
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
                'inline-flex max-w-[min(100%,15rem)] cursor-pointer items-start rounded-md border border-dashed border-primary/30',
                'bg-violet-50/90 px-2 py-1 text-left text-[11px] font-medium leading-snug text-ink/85',
                'shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] transition-colors duration-200',
                'hover:border-primary/50 hover:bg-primary/12 hover:text-ink hover:shadow-[0_1px_4px_rgba(124,58,237,0.1)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0',
                'active:bg-primary/16',
                disabled && 'pointer-events-none cursor-not-allowed opacity-40',
              )}
            >
              <span className="break-words">+ {s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
