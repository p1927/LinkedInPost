import { Button } from '@/components/ui/button';
import { GenerationPanel } from '../../generation/GenerationPanel';
import { RulesPanel } from '../../rules/RulesPanel';
import { ImageAssetManager } from '../../../components/ImageAssetManager';
import { useReviewFlow } from '../../review/context/ReviewFlowContext';

export function EditorSidebar() {
  const {
    activeWorkspacePanel,
    setActiveWorkspacePanel,
    instruction,
    setInstruction,
    generationLoading,
    quickChangePreview,
    variantsPreview,
    handleGenerateQuickChange,
    handleGenerateVariants,
    handleApplyQuickChange,
    handleApplyVariant,
    previewVariantSaveByIndex,
    previewVariantSaveErrors,
    handleSavePreviewVariantAtIndex,
    sheetRow,
    imageOptions,
    selectedImageUrl,
    setSelectedImageUrl,
    handleFetchMoreImageOptions,
    handleUploadImageOption,
    onDownloadImage,
    sharedRules,
  } = useReviewFlow();

  return (
    <aside
      aria-label="Refine, media, and publishing rules"
      className="order-2 min-h-0 min-w-0 border-b border-violet-200/30 px-3 py-3 xl:order-none xl:max-h-full xl:border-b-0 xl:border-r xl:border-violet-200/30 xl:overflow-y-auto"
    >
      <div
        className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-white p-0.5 shadow-sm"
        role="tablist"
        aria-label="Review workspace panels"
      >
        <Button
          type="button"
          variant="ghost"
          size="inline"
          role="tab"
          aria-selected={activeWorkspacePanel === 'refine'}
          onClick={() => setActiveWorkspacePanel('refine')}
          className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 ${activeWorkspacePanel === 'refine' ? 'bg-white/90 text-ink shadow-md ring-1 ring-violet-200/70' : 'text-muted hover:bg-white/60 hover:text-ink/70'}`}
        >
          Refine
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="inline"
          role="tab"
          aria-selected={activeWorkspacePanel === 'media'}
          onClick={() => setActiveWorkspacePanel('media')}
          className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 ${activeWorkspacePanel === 'media' ? 'bg-white/90 text-ink shadow-md ring-1 ring-violet-200/70' : 'text-muted hover:bg-white/60 hover:text-ink/70'}`}
        >
          Media
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="inline"
          role="tab"
          aria-selected={activeWorkspacePanel === 'rules'}
          onClick={() => setActiveWorkspacePanel('rules')}
          className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 ${activeWorkspacePanel === 'rules' ? 'bg-white/90 text-ink shadow-md ring-1 ring-violet-200/70' : 'text-muted hover:bg-white/60 hover:text-ink/70'}`}
        >
          Rules
        </Button>
      </div>

      <div className="mt-3 space-y-3">
        {activeWorkspacePanel === 'refine' ? (
          <GenerationPanel
            instruction={instruction}
            loadingAction={generationLoading}
            quickChangePreview={quickChangePreview}
            variantsPreview={variantsPreview}
            onInstructionChange={setInstruction}
            onGenerateQuickChange={() => void handleGenerateQuickChange()}
            onGenerateVariants={() => void handleGenerateVariants()}
            onApplyQuickChange={handleApplyQuickChange}
            onApplyVariant={handleApplyVariant}
            compact
            previewVariantSaveByIndex={previewVariantSaveByIndex}
            previewVariantSaveErrors={previewVariantSaveErrors}
            onSavePreviewVariant={(index) => void handleSavePreviewVariantAtIndex(index)}
          />
        ) : null}

        {activeWorkspacePanel === 'media' ? (
          <section className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <ImageAssetManager
              topic={sheetRow.topic}
              images={imageOptions}
              selectedImageUrl={selectedImageUrl}
              onSelectImage={setSelectedImageUrl}
              onFetchMoreImages={handleFetchMoreImageOptions}
              onUploadImage={handleUploadImageOption}
              onDownloadImage={onDownloadImage}
            />
          </section>
        ) : null}

        {activeWorkspacePanel === 'rules' ? <RulesPanel sharedRules={sharedRules} compact /> : null}
      </div>
    </aside>
  );
}
