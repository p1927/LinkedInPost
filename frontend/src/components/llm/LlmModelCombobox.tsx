// frontend/src/components/llm/LlmModelCombobox.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from '@/lib/cn';

interface ModelOption {
  value: string;
  label: string;
}

interface LlmModelComboboxProps {
  /** Models for the currently-selected provider. Component sorts A-Z internally. */
  models: ModelOption[];
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** 'sm' renders a compact trigger (h-8, text-xs). Default: 'default'. */
  size?: 'sm' | 'default';
  className?: string;
  /**
   * Items always shown at the top of the list, before sorted models.
   * Not included in sort. Still matched by search query.
   */
  prependOptions?: ModelOption[];
}

export function LlmModelCombobox({
  models,
  value,
  onChange,
  disabled,
  placeholder = 'Select model',
  size = 'default',
  className,
  prependOptions = [],
}: LlmModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(
    () => [...models].sort((a, b) => a.label.localeCompare(b.label)),
    [models],
  );

  const filteredPrepend = useMemo(
    () =>
      query.trim()
        ? prependOptions.filter(
            (m) =>
              m.label.toLowerCase().includes(query.toLowerCase()) ||
              m.value.toLowerCase().includes(query.toLowerCase()),
          )
        : prependOptions,
    [prependOptions, query],
  );

  const filteredSorted = useMemo(
    () =>
      query.trim()
        ? sorted.filter(
            (m) =>
              m.label.toLowerCase().includes(query.toLowerCase()) ||
              m.value.toLowerCase().includes(query.toLowerCase()),
          )
        : sorted,
    [sorted, query],
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      // Focus search input after popover animation
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  const allOptions = [...prependOptions, ...models];
  const selectedLabel = allOptions.find((m) => m.value === value)?.label ?? value;

  const hasResults = filteredPrepend.length + filteredSorted.length > 0;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        disabled={disabled}
        className={cn(
          'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border border-violet-200/55 bg-white/90 px-3.5 text-left font-semibold text-ink shadow-sm outline-none backdrop-blur-md transition-[border-color,background-color,box-shadow] duration-200 select-none',
          'hover:border-primary/40 hover:bg-white hover:shadow-md',
          'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          size === 'sm'
            ? 'min-h-8 rounded-lg px-2.5 py-1.5 text-xs'
            : 'min-h-9 py-2 text-sm',
          !value && 'font-normal text-muted',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className="pointer-events-none size-4 shrink-0 text-ink/45" />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          side="bottom"
          align="start"
          sideOffset={4}
          className="isolate z-50 w-[var(--anchor-width)] min-w-48 max-w-[min(100vw-1.5rem,36rem)]"
        >
          <PopoverPrimitive.Popup className="flex flex-col overflow-hidden rounded-xl border border-violet-200/50 bg-white/95 shadow-lift backdrop-blur-xl">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models…"
              className="border-b border-border bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:font-normal placeholder:text-muted"
            />
            <div className="max-h-64 overflow-y-auto p-1">
              {!hasResults ? (
                <p className="px-3 py-2 text-xs text-muted">No models match</p>
              ) : (
                <>
                  {filteredPrepend.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        onChange(m.value);
                        setOpen(false);
                      }}
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-violet-100/70',
                        m.value === value && 'bg-violet-100/50 font-semibold',
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                  {filteredSorted.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        onChange(m.value);
                        setOpen(false);
                      }}
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-violet-100/70',
                        m.value === value && 'bg-violet-100/50 font-semibold',
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
