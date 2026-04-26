import { useState, useMemo } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GenerationPanel } from '../../generation/GenerationPanel';
import { GenerationJustificationPanel } from '../../review/GenerationJustificationPanel';
import { RulesPanel } from '../../rules/RulesPanel';
import { ImageAssetManager } from '../../../components/ImageAssetManager';
import { useReviewFlow } from '../../review/context/useReviewFlow';
import { useReviewFlowEditor } from '../../review/context/ReviewFlowEditorContext';
import { ResearcherPanel } from '../../news-research';
import { getImageGenCapabilities } from '../../../services/configService';
import { ContextDocumentsPanel } from '../../review/components/ContextDocumentsPanel';
import { WorkflowBuilderModal } from '../../workflows/WorkflowBuilderModal';
import type { CustomWorkflowSummary } from '../../generation/WorkflowCardPicker';
import type { CreateWorkflowFormValues } from '../../workflows/useCustomWorkflows';
import { BUILT_IN_WORKFLOW_CARDS, FEATURED_WORKFLOW_IDS } from '../../generation/builtInWorkflowCards';
import { recordsEqual } from '../../../utils/recordsEqual';
import type { GeneratedStyleCard } from '../../review/context/types';
import { cn } from '@/lib/cn';

// ─── Dimension slider data (mirrors GenerationPanel internals) ─────────────────

const DIMENSIONS = [
  { key: 'emotions', label: 'Emotions' },
  { key: 'psychology', label: 'Psychology' },
  { key: 'persuasion', label: 'Persuasion' },
  { key: 'copywriting', label: 'Copywriting' },
  { key: 'storytelling', label: 'Storytelling' },
  { key: 'typography', label: 'Typography' },
  { key: 'vocabulary', label: 'Vocabulary' },
] as const;

const DEFAULT_WEIGHTS: Record<string, number> = {
  emotions: 50, psychology: 50, persuasion: 50,
  copywriting: 50, storytelling: 50, typography: 50, vocabulary: 50,
};

function getLevelName(v: number) {
  if (v <= 10) return 'Off';
  if (v <= 30) return 'Light';
  if (v <= 50) return 'Moderate';
  if (v <= 80) return 'Strong';
  return 'Max';
}

function getLevelColor(v: number) {
  if (v <= 10) return 'text-slate-400';
  if (v <= 30) return 'text-blue-500';
  if (v <= 50) return 'text-amber-500';
  if (v <= 80) return 'text-orange-500';
  return 'text-red-500';
}

// ─── Card colour maps ──────────────────────────────────────────────────────────

type ColorKey = 'violet' | 'amber' | 'emerald' | 'blue' | 'rose' | 'slate';

const CARD_BG: Record<ColorKey, string> = {
  violet:  'border-violet-200  bg-violet-50/70  hover:border-violet-300',
  amber:   'border-amber-200   bg-amber-50/70   hover:border-amber-300',
  emerald: 'border-emerald-200 bg-emerald-50/70 hover:border-emerald-300',
  blue:    'border-blue-200    bg-blue-50/70    hover:border-blue-300',
  rose:    'border-rose-200    bg-rose-50/70    hover:border-rose-300',
  slate:   'border-slate-200   bg-slate-50/70   hover:border-slate-300',
};

const CARD_RING: Record<ColorKey, string> = {
  violet:  'ring-violet-400',
  amber:   'ring-amber-400',
  emerald: 'ring-emerald-400',
  blue:    'ring-blue-400',
  rose:    'ring-rose-400',
  slate:   'ring-slate-400',
};

function orderedCards() {
  const featured = FEATURED_WORKFLOW_IDS
    .map(id => BUILT_IN_WORKFLOW_CARDS.find(c => c.id === id))
    .filter((c): c is (typeof BUILT_IN_WORKFLOW_CARDS)[number] => c !== undefined);
  const rest = BUILT_IN_WORKFLOW_CARDS.filter(c => !FEATURED_WORKFLOW_IDS.includes(c.id));
  return [...featured, ...rest];
}

const ORDERED_CARDS = orderedCards();

// ─── Tab config ────────────────────────────────────────────────────────────────

const TABS_BASE = [
  { id: 'styles',  label: 'Writing Styles' },
  { id: 'refine',  label: 'Refine' },
  { id: 'news',    label: 'News' },
  { id: 'media',   label: 'Media' },
  { id: 'rules',   label: 'Topic Rules' },
] as const;

// ─── EditorSidebar ─────────────────────────────────────────────────────────────

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
    nodeRuns,
    nodeRunsLoading,
    customWorkflows,
    isLoadingCustomWorkflows,
    onCreateCustomWorkflow,
    onUpdateCustomWorkflow,
    onDeleteCustomWorkflow,
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
    postType,
    setPostType,
    dimensionWeights,
    setDimensionWeights,
    selectedCardId,
    setSelectedCardId,
    generatedCards,
    lastGeneratedConfig,
    handleGenerateFromStyle,
  } = useReviewFlowEditor();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderWorkflow, setBuilderWorkflow] = useState<CustomWorkflowSummary | undefined>(undefined);

  async function handleModalSave(values: CreateWorkflowFormValues) {
    if (builderWorkflow) {
      await onUpdateCustomWorkflow?.(builderWorkflow.id, values);
    } else {
      await onCreateCustomWorkflow?.(values);
    }
    setBuilderOpen(false);
    setBuilderWorkflow(undefined);
  }

  async function handleModalDelete(id: string) {
    await onDeleteCustomWorkflow?.(id);
    setBuilderOpen(false);
    setBuilderWorkflow(undefined);
  }

  function selectStyle(id: string) {
    const card = BUILT_IN_WORKFLOW_CARDS.find(c => c.id === id);
    setSelectedCardId(id);
    setPostType(id);
    setDimensionWeights(card ? card.dimensionWeights : DEFAULT_WEIGHTS);
  }

  function selectGeneratedCard(card: GeneratedStyleCard) {
    setSelectedCardId(card.id);
    setDimensionWeights(card.dimensionWeights);
    // Don't set postType — generated card IDs shouldn't go to the API
  }

  const weights = dimensionWeights ?? DEFAULT_WEIGHTS;
  function handleWeightChange(key: string, value: number) {
    setDimensionWeights({ ...weights, [key]: value });
    setSelectedCardId(null);
  }

  const isGenerateDisabled = useMemo(() => {
    if (generationLoading !== null) return true;
    if (!lastGeneratedConfig) return false;
    return (
      lastGeneratedConfig.cardId === (selectedCardId ?? null) &&
      recordsEqual(lastGeneratedConfig.dimensionWeights, dimensionWeights ?? DEFAULT_WEIGHTS)
    );
  }, [generationLoading, lastGeneratedConfig, selectedCardId, dimensionWeights]);

  const tabs = deliveryChannel === 'gmail'
    ? [...TABS_BASE, { id: 'email' as const, label: 'Email' }]
    : TABS_BASE;

  const selectedStyleName = postType
    ? (BUILT_IN_WORKFLOW_CARDS.find(c => c.id === postType)?.name
        ?? customWorkflows?.find(w => w.id === postType)?.name
        ?? postType)
    : null;

  return (
    <aside
      aria-label="Refine, media, and publishing rules"
      className="order-2 min-h-0 min-w-0 border-b border-violet-200/30 px-4 py-3 xl:order-none xl:max-h-full xl:border-b-0 xl:overflow-y-auto"
    >
      {/* Tab bar */}
      <div
        className={`grid gap-0.5 rounded-xl border border-border bg-white p-1 shadow-sm`}
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        role="tablist"
        aria-label="Review workspace panels"
      >
        {tabs.map(tab => (
          <Button
            key={tab.id}
            type="button"
            variant="ghost"
            size="inline"
            role="tab"
            aria-selected={activeWorkspacePanel === tab.id}
            onClick={() => setActiveWorkspacePanel(tab.id)}
            className={cn(
              'rounded-lg px-1.5 py-2 text-[0.65rem] font-semibold leading-tight transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35',
              activeWorkspacePanel === tab.id
                ? 'bg-white text-ink shadow-md ring-1 ring-violet-200/70'
                : 'text-muted hover:bg-white/60 hover:text-ink/70',
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mt-4 space-y-3">

        {/* ── Writing Styles ─────────────────────────────────────────────────── */}
        {activeWorkspacePanel === 'styles' ? (
          <section className="flex flex-col gap-3">
            {/* Card grid — fixed height with internal scroll */}
            <div className="h-[280px] overflow-y-auto rounded-xl border border-gray-100 pr-0.5">
              <div className="grid grid-cols-2 gap-2 p-1">

                {/* Generated (untitled) cards — most recent first */}
                {generatedCards.slice(0, 5).map(gc => {
                  const isSelected = selectedCardId === gc.id;
                  const topDims = Object.entries(gc.dimensionWeights)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 3)
                    .map(([k]) => k);
                  return (
                    <button
                      key={gc.id}
                      type="button"
                      onClick={() => selectGeneratedCard(gc)}
                      className={cn(
                        'flex flex-col gap-1.5 rounded-xl border-2 border-dashed p-2.5 text-left transition-all duration-150',
                        'border-slate-300 bg-slate-50/80 hover:bg-slate-100/60',
                        isSelected && 'ring-2 ring-offset-1 shadow-md ring-slate-400',
                      )}
                    >
                      <p className="text-xs font-bold text-ink leading-snug truncate">{gc.label}</p>
                      <p className="text-[0.55rem] text-muted">
                        {new Date(gc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-auto pt-0.5">
                        {topDims.map(d => (
                          <span
                            key={d}
                            className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[0.55rem] font-semibold text-slate-600 capitalize"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}

                {/* Built-in cards (featured first) */}
                {ORDERED_CARDS.map(card => {
                  const isSelected = selectedCardId === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => selectStyle(card.id)}
                      className={cn(
                        'flex flex-col gap-1.5 rounded-xl border-2 p-2.5 text-left transition-all duration-150 hover:shadow-md',
                        CARD_BG[card.colorKey],
                        isSelected && `ring-2 ring-offset-1 shadow-md ${CARD_RING[card.colorKey]}`,
                      )}
                    >
                      <p className="text-xs font-bold text-ink leading-snug">{card.name}</p>
                      <p className="text-[0.6rem] leading-relaxed text-slate-600 line-clamp-2">{card.description}</p>
                      <div className="flex flex-wrap gap-1 mt-auto pt-0.5">
                        {card.traits.map(trait => (
                          <span
                            key={trait}
                            className="rounded-full bg-white/70 px-1.5 py-0.5 text-[0.55rem] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}

                {/* Custom user-created workflows */}
                {customWorkflows?.map(wf => {
                  const isSelected = selectedCardId === wf.id;
                  return (
                    <button
                      key={wf.id}
                      type="button"
                      onClick={() => selectStyle(wf.id)}
                      className={cn(
                        'flex flex-col gap-1.5 rounded-xl border-2 border-violet-200 bg-violet-50/70 p-2.5 text-left transition-all duration-150 hover:border-violet-300 hover:shadow-md',
                        isSelected && 'ring-2 ring-offset-1 ring-violet-400 shadow-md',
                      )}
                    >
                      <p className="text-xs font-bold text-ink leading-snug">{wf.name}</p>
                      <p className="text-[0.6rem] leading-relaxed text-slate-600 line-clamp-2">{wf.description}</p>
                    </button>
                  );
                })}

                {/* Create your own */}
                <button
                  type="button"
                  onClick={() => { setBuilderWorkflow(undefined); setBuilderOpen(true); }}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-2.5 text-center transition-all duration-150 hover:border-violet-300 hover:bg-violet-50/40"
                >
                  <Plus className="h-4 w-4 text-muted" />
                  <p className="text-[0.65rem] font-semibold text-muted">Create your own</p>
                </button>
              </div>
            </div>

            {/* Dimension sliders — always visible */}
            <div className="rounded-xl border border-violet-200/60 bg-white/80 px-3 py-3 shadow-sm space-y-2.5">
              <p className="text-[0.65rem] font-bold text-ink/70">Writing emphasis</p>
              {DIMENSIONS.map(({ key, label }) => {
                const val = weights[key] ?? 50;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between">
                      <span className="text-[0.65rem] font-semibold text-ink">{label}</span>
                      <span className={cn('text-[0.65rem] font-bold', getLevelColor(val))}>{getLevelName(val)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={val}
                      onChange={e => handleWeightChange(key, Number(e.target.value))}
                      className="mt-1 w-full accent-primary"
                    />
                  </div>
                );
              })}
            </div>

            {/* Generate button */}
            <button
              type="button"
              disabled={isGenerateDisabled}
              onClick={() => void handleGenerateFromStyle()}
              className={cn(
                'w-full rounded-xl py-2.5 text-[0.75rem] font-semibold transition-all duration-150',
                isGenerateDisabled
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'bg-primary text-white shadow-sm hover:bg-primary/90 active:scale-[0.98]',
              )}
            >
              {generationLoading === 'quick-change' ? 'Generating…' : 'Generate'}
            </button>
          </section>
        ) : null}

        {/* ── Refine ─────────────────────────────────────────────────────────── */}
        {activeWorkspacePanel === 'refine' ? (
          <>
            {/* Selected style chip */}
            {selectedStyleName ? (
              <div className="flex items-center gap-2 rounded-lg border border-violet-200/60 bg-violet-50/40 px-3 py-2">
                <span className="text-[0.65rem] text-muted shrink-0">Style:</span>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[0.65rem] font-semibold text-violet-700 min-w-0 truncate">
                  {selectedStyleName}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveWorkspacePanel('styles')}
                  className="ml-auto shrink-0 flex items-center gap-0.5 text-[0.65rem] font-semibold text-primary hover:text-primary-hover"
                >
                  Change <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveWorkspacePanel('styles')}
                className="flex w-full items-center justify-between rounded-lg border border-dashed border-violet-200 bg-violet-50/30 px-3 py-2 text-[0.65rem] font-semibold text-primary hover:bg-violet-50/60"
              >
                <span>Pick a writing style first</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}

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
              hideStyleControls
              customWorkflows={customWorkflows}
              isLoadingCustomWorkflows={isLoadingCustomWorkflows}
              onOpenWorkflowBuilder={(wf) => {
                setBuilderWorkflow(wf);
                setBuilderOpen(true);
              }}
            />

            <ContextDocumentsPanel
              documents={contextDocuments}
              onUpload={(file) => uploadContextDocument(file)}
              onRemove={removeContextDocument}
              uploading={uploadingContextDocument}
            />

            {nodeRuns.length > 0 || nodeRunsLoading ? (
              <GenerationJustificationPanel nodeRuns={nodeRuns} isLoading={nodeRunsLoading} />
            ) : null}
          </>
        ) : null}

        {/* ── News ───────────────────────────────────────────────────────────── */}
        {activeWorkspacePanel === 'news' ? (
          onSearchNewsResearch ? (
            <ResearcherPanel
              row={sheetRow}
              newsResearch={newsResearch}
              onSearch={onSearchNewsResearch}
              onListHistory={onListNewsResearchHistory}
              onLoadSnapshot={onGetNewsResearchSnapshot}
              selectedRefs={researchContextArticles}
              onSelectedRefsChange={setResearchContextArticles}
            />
          ) : (
            <div className="rounded-xl border border-border bg-white p-4 text-center">
              <p className="text-xs text-muted">News research is not configured.</p>
            </div>
          )
        ) : null}

        {/* ── Media ──────────────────────────────────────────────────────────── */}
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

        {/* ── Topic Rules ────────────────────────────────────────────────────── */}
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

        {/* ── Email (Gmail only) ─────────────────────────────────────────────── */}
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

      <WorkflowBuilderModal
        isOpen={builderOpen}
        workflowToEdit={builderWorkflow}
        onClose={() => { setBuilderOpen(false); setBuilderWorkflow(undefined); }}
        onSave={handleModalSave}
        onDelete={onDeleteCustomWorkflow ? handleModalDelete : undefined}
      />
    </aside>
  );
}
