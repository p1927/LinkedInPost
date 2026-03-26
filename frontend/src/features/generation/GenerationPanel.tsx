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
    <section className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Refine with AI</p>
      <h4 className="mt-2 text-lg font-semibold text-slate-900">Try rewrites before you commit to one</h4>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Quick Change returns one preview. Generate 4 Variants returns four preview options. Neither action writes to Sheets.
      </p>

      <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="generation-instruction">
        Rewrite direction
      </label>
      <textarea
        id="generation-instruction"
        value={instruction}
        onChange={(event) => onInstructionChange(event.target.value)}
        className="mt-2 min-h-[110px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition-colors focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200"
        placeholder="Examples: make the hook stronger, sound more founder-like, keep it concise, add one sharper example."
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onGenerateQuickChange}
          disabled={loadingAction !== null}
          className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <WandSparkles className="h-4 w-4" />
          {loadingAction === 'quick-change' ? 'Generating quick preview...' : 'Quick Change'}
        </button>
        <button
          type="button"
          onClick={onGenerateVariants}
          disabled={loadingAction !== null}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <Sparkles className="h-4 w-4" />
          {loadingAction === 'variants' ? 'Generating 4 previews...' : 'Generate 4 Variants'}
        </button>
      </div>

      {quickChangePreview ? (
        <div className="mt-5 rounded-xl border border-purple-200 bg-purple-50/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-700">Quick Change preview</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{quickChangePreview.replacementText}</p>
            </div>
            <button
              type="button"
              onClick={onApplyQuickChange}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm transition-colors hover:bg-purple-100"
            >
              Compare and apply
            </button>
          </div>
        </div>
      ) : null}

      {variantsPreview?.variants.length ? (
        <div className="mt-5 space-y-3">
          {variantsPreview.variants.map((variant, index) => (
            <div key={variant.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Preview {index + 1}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{variant.fullText}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onApplyVariant(index)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
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