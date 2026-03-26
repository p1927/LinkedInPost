import { Bot } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { type GoogleModelOption } from '../../../services/configService';

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
        <select
          value={googleModel}
          onChange={(e) => setGoogleModel(e.target.value)}
          className={cn('ui-select ui-select-sm mt-1 h-9 w-full max-w-none')}
        >
          {availableModels.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
