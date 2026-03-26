import { Bot } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { type GoogleModelOption } from '../../../services/configService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

export function DashboardToolbar({
  googleModel,
  setGoogleModel,
  availableModels,
  embedded = false,
}: {
  googleModel: string;
  setGoogleModel: (val: string) => void;
  availableModels: GoogleModelOption[];
  /** Omit outer glass card when nested inside a parent panel (Topics right rail). */
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        embedded ? '' : 'glass-panel rounded-2xl px-4 py-3 shadow-card',
        embedded && 'px-0 py-0',
      )}
    >
      <label className="flex cursor-pointer flex-col gap-1">
        {!embedded ? (
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/70">
            <Bot className="h-3.5 w-3.5 text-primary" aria-hidden />
            Model
          </span>
        ) : null}
        <span className="text-[11px] leading-4 text-muted">Quick Change and variants in review.</span>
        <Select value={googleModel} onValueChange={(val) => setGoogleModel(val as string)}>
          <SelectTrigger className="mt-1 h-9 w-full max-w-none rounded-xl border border-violet-200/55 bg-white/88 px-3.5 py-2 text-sm font-semibold text-ink shadow-sm backdrop-blur-md transition-[box-shadow,border-color,background-color] hover:border-primary/40 hover:bg-white hover:shadow-md focus:border-primary focus:ring-2 focus:ring-primary/25">
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
