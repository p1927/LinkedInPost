interface VariantPersistencePanelProps {
  hasPreview: boolean;
  variantCount: number;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage: string;
  onSave: () => void;
}

export function VariantPersistencePanel({
  hasPreview,
  variantCount,
  saveState,
  errorMessage,
  onSave,
}: VariantPersistencePanelProps) {
  const badgeClassName = saveState === 'saved'
    ? 'bg-emerald-100 text-emerald-800'
    : saveState === 'error'
      ? 'bg-rose-100 text-rose-800'
      : hasPreview
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-700';

  const badgeLabel = saveState === 'saved'
    ? 'Saved to Sheets'
    : saveState === 'saving'
      ? 'Saving preview set'
      : saveState === 'error'
        ? 'Save failed'
        : hasPreview
          ? 'Unsaved preview set'
          : 'No preview variants yet';

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Persistence</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-900">Save preview variants only when ready</h4>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClassName}`}>
          {badgeLabel}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Save writes the current 4-variant preview set back to Sheets. Approval still works even if this step fails.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!hasPreview || variantCount !== 4 || saveState === 'saving'}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saveState === 'saving' ? 'Saving variants...' : saveState === 'error' ? 'Retry save' : 'Save variants'}
        </button>
        {hasPreview ? <span className="text-sm text-slate-500">{variantCount} preview variants ready</span> : null}
      </div>
      {errorMessage ? <p className="mt-3 text-sm leading-6 text-rose-700">{errorMessage}</p> : null}
    </section>
  );
}