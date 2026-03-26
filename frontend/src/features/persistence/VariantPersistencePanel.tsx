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
    ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80'
    : saveState === 'error'
      ? 'bg-rose-100 text-rose-900 ring-1 ring-rose-200/80'
      : hasPreview
        ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80'
        : 'border border-border bg-canvas text-muted';

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
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Persistence</p>
          <h4 className="mt-2 font-heading text-lg font-semibold text-ink">Save preview variants only when ready</h4>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClassName}`}>
          {badgeLabel}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">
        Save writes the current 4-variant preview set back to Sheets. Approval still works even if this step fails.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!hasPreview || variantCount !== 4 || saveState === 'saving'}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        >
          {saveState === 'saving' ? 'Saving variants...' : saveState === 'error' ? 'Retry save' : 'Save variants'}
        </button>
        {hasPreview ? <span className="text-sm text-muted">{variantCount} preview variants ready</span> : null}
      </div>
      {errorMessage ? <p className="mt-3 text-sm leading-6 text-red-800">{errorMessage}</p> : null}
    </section>
  );
}
