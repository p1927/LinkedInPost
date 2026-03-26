import { Bot } from 'lucide-react';
import { type GoogleModelOption } from '../../../services/configService';

export function DashboardToolbar({
  googleModel,
  setGoogleModel,
  availableModels,
}: {
  googleModel: string;
  setGoogleModel: (val: string) => void;
  availableModels: GoogleModelOption[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-card">
      <label className="flex cursor-pointer flex-col gap-1">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          <Bot className="h-3.5 w-3.5 text-primary" aria-hidden />
          AI model
        </span>
        <span className="text-[11px] leading-4 text-muted">Used for Quick Change and variants in review.</span>
        <select
          value={googleModel}
          onChange={(e) => setGoogleModel(e.target.value)}
          className="mt-1 w-full max-w-md cursor-pointer rounded-lg border border-border bg-canvas px-2 py-2 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-primary/25"
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
