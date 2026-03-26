import { Sparkles, WandSparkles } from 'lucide-react';
import type { QuickChangePreviewResult, VariantsPreviewResponse } from '../../services/backendApi';

interface GenerationPanelProps {
  instruction: string;
  loadingAction: 'quick-change' | 'variants' | null;
  quickChangePreview: QuickChangePreviewResult | null;
  variantsPreview: VariantsPreviewResponse | null;
  onInstructionChange: (value: string) => void;
  onGenerateQuickChange: () => void;
  onGenerateVariants: () => void;
  onApplyQuickChange: () => void;
  onApplyVariant: (index: number) => void;
}

export function GenerationPanel({
  instruction,
  loadingAction,
  quickChangePreview,
  variantsPreview,
  onInstructionChange,
  onGenerateQuickChange,
  onGenerateVariants,
  onApplyQuickChange,
  onApplyVariant,
}: GenerationPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Refine with AI</p>
      <h4 className="mt-2 font-heading text-lg font-semibold text-ink">Try rewrites before you commit to one</h4>
      <p className="mt-2 text-sm leading-6 text-muted">
        Quick Change returns one preview. Generate 4 Variants returns four preview options. Neither action writes to Sheets.
      </p>

      <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="generation-instruction">
        Rewrite direction
      </label>
      <textarea
        id="generation-instruction"
        value={instruction}
        onChange={(event) => onInstructionChange(event.target.value)}
        className="mt-2 min-h-[110px] w-full rounded-xl border border-border bg-canvas px-4 py-4 text-sm leading-6 text-ink outline-none transition-colors focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
        placeholder="Examples: make the hook stronger, sound more founder-like, keep it concise, add one sharper example."
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onGenerateQuickChange}
          disabled={loadingAction !== null}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <WandSparkles className="h-4 w-4" />
          {loadingAction === 'quick-change' ? 'Generating quick preview...' : 'Quick Change'}
        </button>
        <button
          type="button"
          onClick={onGenerateVariants}
          disabled={loadingAction !== null}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {loadingAction === 'variants' ? 'Generating 4 previews...' : 'Generate 4 Variants'}
        </button>
      </div>

      {quickChangePreview ? (
        <div className="mt-5 rounded-xl border border-orange-200/80 bg-orange-50/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-900">Quick Change preview</p>
              <p className="mt-2 text-sm leading-6 text-ink">{quickChangePreview.replacementText}</p>
            </div>
            <button
              type="button"
              onClick={onApplyQuickChange}
              className="cursor-pointer rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-canvas"
            >
              Compare and apply
            </button>
          </div>
        </div>
      ) : null}

      {variantsPreview?.variants.length ? (
        <div className="mt-5 space-y-3">
          {variantsPreview.variants.map((variant, index) => (
            <div key={variant.id} className="rounded-xl border border-border bg-canvas p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Preview {index + 1}</p>
                  <p className="mt-2 text-sm leading-6 text-ink">{variant.fullText}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onApplyVariant(index)}
                  className="cursor-pointer rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
                >
                  Compare and apply
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
