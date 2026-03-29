import { Bot } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { type GoogleModelOption } from '../../../services/configService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function DashboardToolbar({
  googleModel,
  setGoogleModel,
  availableModels,
  modelPickerLocked = false,
  embedded = false,
}: {
  googleModel: string;
  setGoogleModel: (val: string) => void;
  availableModels: GoogleModelOption[];
  /** When true, the workspace only allows one model (no switching). */
  modelPickerLocked?: boolean;
  /** Omit outer glass card when nested inside a parent panel (Topics right rail). */
  embedded?: boolean;
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
        </span>
        {modelPickerLocked ? (
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            This workspace is limited to one model. An admin can allow more in Settings → GitHub Actions.
          </p>
        ) : null}
        <Select
          value={googleModel}
          onValueChange={(val) => setGoogleModel(val as string)}
          itemToStringLabel={(v) => availableModels.find((m) => m.value === v)?.label ?? String(v ?? '')}
        >
          <SelectTrigger className="mt-1" disabled={modelPickerLocked}>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}
