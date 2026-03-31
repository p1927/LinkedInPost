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

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label={`Selected ${label}`}>
          {chips.map((c) => (
            <span
              key={c}
              role="listitem"
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-canvas px-2.5 py-1 text-xs font-medium text-ink"
            >
              <span className="min-w-0 truncate" title={c}>
                {c}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoveChip(c)}
                className={cn(
                  'shrink-0 rounded-full p-0.5 text-muted hover:bg-red-50 hover:text-red-600',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  disabled && 'pointer-events-none opacity-40',
                )}
                aria-label={`Remove ${c}`}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.25} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {multiline ? (
        <Textarea
          placeholder={placeholder}
          value={freeValue}
          onChange={(e) => onFreeChange(e.target.value)}
          disabled={disabled}
          rows={freeRows}
          className="resize-none"
        />
      ) : (
        <Input placeholder={placeholder} value={freeValue} onChange={(e) => onFreeChange(e.target.value)} disabled={disabled} />
      )}
      {available.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Quick add</span>
          <div className="flex flex-wrap gap-1.5">
            {available.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => onAddChip(s)}
                title={s}
                className={cn(
                  'max-w-full truncate rounded-full border border-dashed border-border/80 bg-white/80 px-2.5 py-1 text-left text-xs font-medium text-ink/80',
                  'hover:border-primary/40 hover:bg-primary/5 hover:text-ink',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  disabled && 'pointer-events-none opacity-40',
                )}
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
