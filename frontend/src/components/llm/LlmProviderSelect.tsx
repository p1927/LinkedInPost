// frontend/src/components/llm/LlmProviderSelect.tsx
import { cn } from '@/lib/cn';
import type { LlmProviderId } from '@repo/llm-core';

interface LlmProviderSelectProps {
  /** Only the providers to show (filtered to configured ones by caller). */
  providers: Array<{ id: LlmProviderId; name: string }>;
  value: LlmProviderId;
  onChange: (provider: LlmProviderId) => void;
  disabled?: boolean;
  /** 'sm' renders smaller buttons for compact rows. Default: 'default'. */
  size?: 'sm' | 'default';
  className?: string;
}

export function LlmProviderSelect({
  providers,
  value,
  onChange,
  disabled,
  size = 'default',
  className,
}: LlmProviderSelectProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(p.id)}
          className={cn(
            'rounded-xl font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === p.id
              ? 'border border-primary bg-primary text-white'
              : 'border border-border bg-white/80 text-ink hover:bg-violet-100/40',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
