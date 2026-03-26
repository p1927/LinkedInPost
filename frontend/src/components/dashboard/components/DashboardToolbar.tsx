import { Bot, RefreshCw } from 'lucide-react';
import { type GoogleModelOption } from '../../../services/configService';

export function DashboardToolbar({
  googleModel,
  setGoogleModel,
  availableModels,
  onRefreshQueue,
  queueLoading,
}: {
  googleModel: string;
  setGoogleModel: (val: string) => void;
  availableModels: GoogleModelOption[];
  onRefreshQueue: () => void;
  queueLoading: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card">
      <div className="min-w-[200px] flex-1">
        <label className="flex cursor-pointer flex-col gap-1">
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            <Bot className="h-3.5 w-3.5 text-primary" aria-hidden />
            AI model
          </span>
          <span className="text-[11px] leading-4 text-muted">Quick Change and variants in review.</span>
          <select
            value={googleModel}
            onChange={(e) => setGoogleModel(e.target.value)}
            className="mt-1 w-full max-w-xs cursor-pointer rounded-lg border border-border bg-canvas px-2 py-2 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-primary/25"
          >
            {availableModels.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={() => onRefreshQueue()}
        disabled={queueLoading}
        className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-canvas px-4 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${queueLoading ? 'animate-spin' : ''}`} aria-hidden />
        Refresh from Sheets
      </button>
    </div>
  );
}
