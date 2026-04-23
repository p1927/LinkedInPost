import { Bot } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { type GoogleModelOption } from '../../../services/configService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FEATURE_MULTI_PROVIDER_LLM } from '../../../generated/features';

export function DashboardToolbar({
  googleModel,
  setGoogleModel,
  availableModels,
  modelPickerLocked = false,
  embedded = false,
  providerLabel,
}: {
  googleModel: string;
  setGoogleModel: (val: string) => void;
  availableModels: GoogleModelOption[];
  /** When true, the workspace only allows one model (no switching). */
  modelPickerLocked?: boolean;
  /** Omit outer glass card when nested inside a parent panel (Topics right rail). */
  embedded?: boolean;
  /** Shown next to the picker when multi-provider LLM is enabled. */
  providerLabel?: string;
}) {
  return (
    <div
      className={cn(
        embedded ? '' : 'glass-panel rounded-2xl border border-violet-200/50 px-5 py-4 shadow-card',
        embedded && 'px-0 py-0',
      )}
    >
      <label className="flex cursor-pointer flex-col gap-1.5">
        {!embedded ? (
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink/70">
            <Bot className="h-4 w-4 text-primary" aria-hidden />
            AI model
          </span>
        ) : null}
        <span className="text-[11px] leading-relaxed text-muted">
          Powers Quick Change and variant generation during review.
          {FEATURE_MULTI_PROVIDER_LLM && providerLabel ? (
            <span className="mt-0.5 block font-medium leading-snug text-ink/80">Provider: {providerLabel}</span>
          ) : null}
        </span>
        {modelPickerLocked ? (
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            This workspace is limited to one model. An admin can allow more in Settings → AI / LLM.
          </p>
        ) : null}
        <Select
          value={googleModel}
          onValueChange={(val) => setGoogleModel(val as string)}
          itemToStringLabel={(v) => availableModels.find((m) => m.value === v)?.label ?? String(v ?? '')}
        >
          <SelectTrigger
            className={cn('mt-1 h-auto min-h-10 py-2.5 font-medium', embedded && 'text-left')}
            disabled={modelPickerLocked}
          >
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent className="max-w-[min(100vw-1.5rem,28rem)]">
            {availableModels.map((model) => (
              <SelectItem key={model.value} value={model.value} className="items-start py-2.5">
                <span className="whitespace-normal leading-snug">{model.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}
