import { Button } from '@/components/ui/button';
import { GenerationPanel } from '../../generation/GenerationPanel';
import { RulesPanel } from '../../rules/RulesPanel';
import { ImageAssetManager } from '../../../components/ImageAssetManager';
import { useReviewFlow } from '../../review/context/useReviewFlow';
import { useReviewFlowEditor } from '../../review/context/ReviewFlowEditorContext';
import { ResearcherPanel } from '../../news-research';
import { getImageGenCapabilities } from '../../../services/configService';
import { ContextDocumentsPanel } from '../../review/components/ContextDocumentsPanel';

export function EditorSidebar() {
  const {
    activeWorkspacePanel,
    setActiveWorkspacePanel,
    sheetRow,
    imageOptions,
    selectedImageUrls,
    handleSelectImageOption,
    handleClearSelectedImage,
    handleFetchMoreImageOptions,
    handleUploadImageOption,
    handleUploadReferenceImage,
    handleGenerateReferenceImage,
    imageGenConfig,
    onDownloadImage,
    sharedRules,
    globalGenerationRules,
    handleSaveTopicRules,
    savingTopicRules,
    postTemplates,
    handleSaveGenerationTemplateId,
    savingGenerationTemplateId,
    deliveryChannel,
    emailTo, setEmailTo,
    emailCc, setEmailCc,
    emailBcc, setEmailBcc,
    emailSubject, setEmailSubject,
    handleSaveEmailFields,
    savingEmailFields,
    newsResearch,
    researchContextArticles,
    setResearchContextArticles,
    onSearchNewsResearch,
    onListNewsResearchHistory,
    onGetNewsResearchSnapshot,
    contextDocuments,
    uploadingContextDocument,
    uploadContextDocument,
    removeContextDocument,
  } = useReviewFlow();
  const {
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
    aiRefineBlocked,
    aiRefineBlockedReason,
  } = useReviewFlowEditor();

  return (
    <aside
      aria-label="Refine, media, and publishing rules"
      className="order-2 min-h-0 min-w-0 border-b border-violet-200/30 px-4 py-3 xl:order-none xl:max-h-full xl:border-b-0 xl:overflow-y-auto"
    >
      <div
        className={`grid ${deliveryChannel === 'gmail' ? 'grid-cols-4' : 'grid-cols-3'} gap-1 rounded-xl border border-border bg-white p-1 shadow-sm`}
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
          className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 ${activeWorkspacePanel === 'refine' ? 'bg-white text-ink shadow-md ring-1 ring-violet-200/70' : 'text-muted hover:bg-white/60 hover:text-ink/70'}`}
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
          className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 ${activeWorkspacePanel === 'media' ? 'bg-white text-ink shadow-md ring-1 ring-violet-200/70' : 'text-muted hover:bg-white/60 hover:text-ink/70'}`}
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
          className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 ${activeWorkspacePanel === 'rules' ? 'bg-white text-ink shadow-md ring-1 ring-violet-200/70' : 'text-muted hover:bg-white/60 hover:text-ink/70'}`}
        >
          Topic rules
        </Button>
        {deliveryChannel === 'gmail' ? (
          <Button
            type="button"
            variant="ghost"
            size="inline"
            role="tab"
            aria-selected={activeWorkspacePanel === 'email'}
            onClick={() => setActiveWorkspacePanel('email')}
            className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 ${activeWorkspacePanel === 'email' ? 'bg-white text-ink shadow-md ring-1 ring-violet-200/70' : 'text-muted hover:bg-white/60 hover:text-ink/70'}`}
          >
            Email
          </Button>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
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
            aiGenerateDisabled={aiRefineBlocked}
            aiGenerateDisabledReason={aiRefineBlockedReason}
            compact
            previewVariantSaveByIndex={previewVariantSaveByIndex}
            previewVariantSaveErrors={previewVariantSaveErrors}
            onSavePreviewVariant={(index) => void handleSavePreviewVariantAtIndex(index)}
          />
        ) : null}

        {activeWorkspacePanel === 'refine' && onSearchNewsResearch ? (
          <ResearcherPanel
            row={sheetRow}
            newsResearch={newsResearch}
            onSearch={onSearchNewsResearch}
            onListHistory={onListNewsResearchHistory}
            onLoadSnapshot={onGetNewsResearchSnapshot}
            selectedRefs={researchContextArticles}
            onSelectedRefsChange={setResearchContextArticles}
          />
        ) : null}

        {activeWorkspacePanel === 'refine' ? (
          <ContextDocumentsPanel
            documents={contextDocuments}
            onUpload={(file) => uploadContextDocument(file)}
            onRemove={removeContextDocument}
            uploading={uploadingContextDocument}
          />
        ) : null}

        {activeWorkspacePanel === 'media' ? (
          <section className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <ImageAssetManager
              topic={sheetRow.topic}
              images={imageOptions}
              selectedImageUrls={selectedImageUrls}
              onSelectImage={handleSelectImageOption}
              onFetchMoreImages={handleFetchMoreImageOptions}
              onUploadImage={handleUploadImageOption}
              onDownloadImage={onDownloadImage}
              onClearSelectedImage={handleClearSelectedImage}
              compact
              supportsReferenceImage={getImageGenCapabilities(imageGenConfig?.provider ?? 'pixazo', imageGenConfig?.model).supportsReferenceImage}
              onUploadReferenceImage={handleUploadReferenceImage}
              onGenerateReferenceImage={handleGenerateReferenceImage}
              channel={deliveryChannel}
            />
          </section>
        ) : null}

        {activeWorkspacePanel === 'rules' ? (
          <RulesPanel
            globalGenerationRules={globalGenerationRules}
            topicGenerationRules={sheetRow.topicGenerationRules || ''}
            generationTemplateId={sheetRow.generationTemplateId || ''}
            effectiveGenerationRules={sharedRules}
            postTemplates={postTemplates}
            compact
            onSaveTopic={handleSaveTopicRules}
            savingTopic={savingTopicRules}
            onSaveGenerationTemplate={handleSaveGenerationTemplateId}
            savingGenerationTemplate={savingGenerationTemplateId}
          />
        ) : null}

        {activeWorkspacePanel === 'email' ? (
          <section className="rounded-xl border border-border bg-white p-3 shadow-sm space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">To</label>
              <input type="text" className="w-full rounded-md border border-border px-2 py-1 text-sm focus:ring-1 focus:ring-primary" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="recipient@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Cc</label>
              <input type="text" className="w-full rounded-md border border-border px-2 py-1 text-sm focus:ring-1 focus:ring-primary" value={emailCc} onChange={e => setEmailCc(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Bcc</label>
              <input type="text" className="w-full rounded-md border border-border px-2 py-1 text-sm focus:ring-1 focus:ring-primary" value={emailBcc} onChange={e => setEmailBcc(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Subject</label>
              <input type="text" className="w-full rounded-md border border-border px-2 py-1 text-sm focus:ring-1 focus:ring-primary" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Subject line" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="inline"
              disabled={savingEmailFields}
              onClick={() => void handleSaveEmailFields()}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-violet-50 disabled:opacity-50"
            >
              {savingEmailFields ? 'Saving…' : 'Save email settings'}
            </Button>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
