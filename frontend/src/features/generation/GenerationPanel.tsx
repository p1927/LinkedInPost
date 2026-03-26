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
    <section className={`rounded-2xl border border-border bg-surface shadow-card ${pad}`}>
      <p className={`font-semibold uppercase tracking-[0.18em] text-muted ${compact ? 'text-[0.65rem]' : 'text-xs'}`}>Refine with AI</p>
      <h4 className={`mt-1.5 font-heading font-semibold text-ink ${title}`}>Try rewrites before you commit to one</h4>
      <p className={`mt-1.5 text-muted ${body}`}>
        {compact
          ? 'Describe the change you want, then run 4 Variants to explore or Quick Change for a single pass.'
          : 'Quick Change returns one preview. Generate 4 Variants returns four preview options. Use Save on a preview to write that slot to Sheets.'}
      </p>

      {compact ? (
        <Collapsible className="mt-2 rounded-lg border border-violet-200/40 bg-white/40 px-2 py-1.5">
          <CollapsibleTrigger className="flex cursor-pointer items-center text-[0.65rem] font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-sm">
            How this works
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="mt-1.5 text-[0.65rem] leading-relaxed text-muted">
              Quick Change returns one preview. 4 Variants returns four. Use Save on a variant to write that slot to your Sheet. Use Review changes to see a diff before applying.
            </p>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <label className={`mt-3 block font-semibold text-ink ${label}`} htmlFor="generation-instruction">
        Rewrite direction
      </label>
      <Textarea
        id="generation-instruction"
        value={instruction}
        onChange={(event) => onInstructionChange(event.target.value)}
        rows={compact ? 4 : undefined}
        className={`mt-1.5 w-full resize-y rounded-xl border border-violet-200/55 bg-white/80 text-ink shadow-sm outline-none backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-canvas ${compact ? 'min-h-[96px] max-h-[200px] px-2.5 py-2 text-xs leading-5' : 'min-h-[110px] px-4 py-4 text-sm leading-6'}`}
        placeholder="Examples: make the hook stronger, sound more founder-like, keep it concise, add one sharper example."
      />

      <div className={`mt-3 flex flex-wrap ${compact ? 'gap-2' : 'gap-3'}`}>
        <Button
          type="button"
          variant="ink"
          size={compact ? 'sm' : 'md'}
          onClick={onGenerateVariants}
          disabled={loadingAction !== null}
          className={btn}
        >
          <Sparkles className={icon} />
          {loadingAction === 'variants' ? 'Generating…' : '4 Variants'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size={compact ? 'sm' : 'md'}
          onClick={onGenerateQuickChange}
          disabled={loadingAction !== null}
          className={btn}
        >
          <WandSparkles className={icon} />
          {loadingAction === 'quick-change' ? 'Generating…' : 'Quick Change'}
        </Button>
      </div>

      {quickChangePreview ? (
        <div className={`mt-4 rounded-xl border border-ai-border/90 bg-ai-surface/90 ${compact ? 'p-2.5' : 'p-4'}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className={`font-semibold uppercase tracking-[0.15em] text-ai-ink ${compact ? 'text-[0.65rem]' : 'text-xs'}`}>Quick Change preview</p>
              <p className={`mt-1.5 text-ink ${compact ? 'line-clamp-4 text-xs leading-5' : 'line-clamp-6 text-sm leading-6'}`}>{quickChangePreview.replacementText}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size={compact ? 'sm' : 'md'}
              onClick={onApplyQuickChange}
              className={`shrink-0 ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}
            >
              Review changes
            </Button>
          </div>
        </div>
      ) : null}

      {variantsPreview?.variants.length ? (
        <div className={`mt-4 ${compact ? 'space-y-2' : 'space-y-3'}`}>
          {variantsPreview.variants.map((variant, index) => (
            <div key={variant.id} className={`rounded-xl border border-border bg-canvas ${compact ? 'p-2.5' : 'p-4'}`}>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className={`font-semibold uppercase tracking-[0.15em] text-muted ${compact ? 'text-[0.65rem]' : 'text-xs'}`}>Preview {index + 1}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {onSavePreviewVariant ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSavePreviewVariant(index)}
                        disabled={
                          (previewVariantSaveByIndex[index] ?? 'idle') === 'saving' || variantsPreview.variants.length !== 4
                        }
                        className="px-2.5 py-1 text-xs"
                      >
                        {saveLabel(index)}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onApplyVariant(index)}
                      className="px-2.5 py-1 text-xs sm:text-sm"
                    >
                      Review changes
                    </Button>
                  </div>
                </div>
                <p className={`text-ink ${compact ? 'line-clamp-5 text-xs leading-5' : 'line-clamp-6 text-sm leading-6'}`}>{variant.fullText}</p>
                {previewVariantSaveErrors[index] ? (
                  <p className="text-xs leading-snug text-red-800">{previewVariantSaveErrors[index]}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
