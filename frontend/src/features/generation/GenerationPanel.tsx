import { Sparkles, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { QuickChangePreviewResult, VariantsPreviewResponse } from '../../services/backendApi';

type VariantSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  compact?: boolean;
  /** When true, Quick Change and 4 Variants are disabled (e.g. Selection mode without a range). */
  aiGenerateDisabled?: boolean;
  aiGenerateDisabledReason?: string;
  previewVariantSaveByIndex?: Record<number, VariantSaveStatus>;
  previewVariantSaveErrors?: Record<number, string>;
  onSavePreviewVariant?: (index: number) => void;
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
  compact = false,
  aiGenerateDisabled = false,
  aiGenerateDisabledReason,
  previewVariantSaveByIndex = {},
  previewVariantSaveErrors = {},
  onSavePreviewVariant,
}: GenerationPanelProps) {
  const pad = compact ? 'p-3' : 'p-4';
  const title = compact ? 'text-base' : 'text-lg';
  const body = compact ? 'text-xs leading-5' : 'text-sm leading-6';
  const label = compact ? 'text-xs' : 'text-sm';
  const btn = compact ? 'gap-1.5 rounded-lg px-3 py-2 text-xs' : 'gap-2 rounded-xl px-4 py-3 text-sm';
  const icon = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';

  const saveLabel = (index: number) => {
    const st = previewVariantSaveByIndex[index] ?? 'idle';
    if (st === 'saving') return 'Saving…';
    if (st === 'saved') return 'Saved';
    if (st === 'error') return 'Retry save';
    return 'Save';
  };

  return (
    <section className={`rounded-2xl border border-indigo-300/60 bg-gradient-to-br from-indigo-50/95 to-white/90 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:border-indigo-300/80 hover:from-indigo-50/98 hover:to-white/95 ${pad}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 shadow-md"></div>
        <p className={`font-bold uppercase tracking-[0.2em] text-indigo-700/90 ${compact ? 'text-[0.65rem]' : 'text-xs'}`}>Refine with AI</p>
      </div>
      <p className={`mt-2 font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-indigo-800 ${title}`}>
        Try rewrites before you commit to one
      </p>
      <p className={`mt-3 text-slate-700 leading-relaxed font-medium ${body}`}>
        {compact
          ? 'Describe the change you want, then run 4 Variants to explore or Quick Change for a single pass.'
          : 'Quick Change returns one preview. Generate 4 Variants returns four preview options. Use Save on a preview to write that slot to Sheets.'}
      </p>

      {compact ? (
        <Collapsible className="mt-4 rounded-lg border border-violet-200/60 bg-white/80 backdrop-blur-sm px-3 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md">
          <CollapsibleTrigger className="flex cursor-pointer items-center text-[0.65rem] font-bold text-primary transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 rounded-sm">
            How this works
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="mt-3 text-[0.65rem] leading-relaxed text-slate-700 font-medium">
              Quick Change returns one preview. 4 Variants returns four. Use Save on a variant to write that slot to your Sheet. Use Review changes to see a diff before applying.
            </p>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <label className={`mt-5 block font-bold text-ink transition-colors duration-200 ${label}`} htmlFor="generation-instruction">
        Rewrite direction
      </label>
      <Textarea
        id="generation-instruction"
        value={instruction}
        onChange={(event) => onInstructionChange(event.target.value)}
        rows={compact ? 4 : undefined}
        className={`mt-2 w-full resize-y rounded-xl border border-violet-200/70 bg-white/90 text-ink shadow-sm outline-none backdrop-blur-sm transition-all duration-200 hover:border-violet-300/80 hover:bg-white placeholder:text-slate-500 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30 focus:ring-offset-1 focus:shadow-lg ${compact ? 'min-h-[96px] max-h-[200px] px-3 py-2.5 text-xs leading-5' : 'min-h-[110px] px-4 py-4 text-sm leading-6'}`}
        placeholder="Examples: make the hook stronger, sound more founder-like, keep it concise, add one sharper example."
      />

      <div className={`mt-4 flex flex-col ${compact ? 'gap-2' : 'gap-2.5'}`}>
        <div className={`flex flex-wrap ${compact ? 'gap-2.5' : 'gap-3'}`}>
          <Button
            type="button"
            variant="ink"
            size={compact ? 'sm' : 'md'}
            onClick={onGenerateVariants}
            disabled={loadingAction !== null || aiGenerateDisabled}
            className={`${btn} transition-all duration-200 shadow-md hover:shadow-lg active:shadow-sm font-bold`}
          >
            <Sparkles className={icon} />
            {loadingAction === 'variants' ? 'Generating…' : '4 Variants'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size={compact ? 'sm' : 'md'}
            onClick={onGenerateQuickChange}
            disabled={loadingAction !== null || aiGenerateDisabled}
            className={`${btn} transition-all duration-200 shadow-md hover:shadow-lg active:shadow-sm font-bold`}
          >
            <WandSparkles className={icon} />
            {loadingAction === 'quick-change' ? 'Generating…' : 'Quick Change'}
          </Button>
        </div>
        {aiGenerateDisabled && aiGenerateDisabledReason ? (
          <p className={`text-amber-800/90 ${compact ? 'text-[0.65rem] leading-snug' : 'text-xs leading-snug'}`}>
            {aiGenerateDisabledReason}
          </p>
        ) : null}
      </div>

      {quickChangePreview ? (
        <div className={`mt-5 rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-white/70 backdrop-blur-sm shadow-md transition-all duration-200 hover:shadow-lg hover:border-violet-300/80 ${compact ? 'p-3' : 'p-4'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className={`font-bold uppercase tracking-[0.2em] text-violet-700/90 ${compact ? 'text-[0.65rem]' : 'text-xs'}`}>Quick Change preview</p>
              <p className={`mt-2.5 text-ink font-medium ${compact ? 'line-clamp-4 text-xs leading-5' : 'line-clamp-6 text-sm leading-6'}`}>{quickChangePreview.replacementText}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size={compact ? 'sm' : 'md'}
              onClick={onApplyQuickChange}
              className={`shrink-0 transition-all duration-200 font-bold ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'}`}
            >
              Review changes
            </Button>
          </div>
        </div>
      ) : null}

      {variantsPreview?.variants.length ? (
        <div className={`mt-5 ${compact ? 'space-y-3' : 'space-y-4'}`}>
          {variantsPreview.variants.map((variant, index) => (
            <div key={variant.id} className={`rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/40 to-white/80 backdrop-blur-sm shadow-md transition-all duration-200 hover:shadow-lg hover:border-violet-300/80 hover:from-violet-50/50 hover:to-white/90 ${compact ? 'p-3' : 'p-4'}`}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className={`font-bold uppercase tracking-[0.2em] text-violet-700/80 ${compact ? 'text-[0.65rem]' : 'text-xs'}`}>Preview {index + 1}</p>
                  <div className="flex flex-wrap gap-2">
                    {onSavePreviewVariant ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSavePreviewVariant(index)}
                        disabled={
                          (previewVariantSaveByIndex[index] ?? 'idle') === 'saving' || variantsPreview.variants.length !== 4
                        }
                        className="px-2.5 py-1.5 text-xs font-bold transition-all duration-200 hover:shadow-md"
                      >
                        {saveLabel(index)}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onApplyVariant(index)}
                      className="px-2.5 py-1.5 text-xs sm:text-sm font-bold transition-all duration-200 hover:shadow-md"
                    >
                      Review changes
                    </Button>
                  </div>
                </div>
                <p className={`text-ink font-medium ${compact ? 'line-clamp-5 text-xs leading-5' : 'line-clamp-6 text-sm leading-6'}`}>{variant.fullText}</p>
                {previewVariantSaveErrors[index] ? (
                  <p className="text-xs leading-snug text-red-700 font-semibold">{previewVariantSaveErrors[index]}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
