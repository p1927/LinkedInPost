import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Plus, Loader2 } from 'lucide-react';
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

// ─── Dimension slider data ─────────────────────────────────────────────────────

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

function getLevelPill(v: number) {
  if (v <= 10) return 'bg-slate-100 text-slate-500';
  if (v <= 30) return 'bg-blue-100 text-blue-600';
  if (v <= 50) return 'bg-amber-100 text-amber-600';
  if (v <= 80) return 'bg-orange-100 text-orange-600';
  return 'bg-red-100 text-red-600';
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
    sheetVariants,
    editorVariantIndex,
    handleLoadSheetVariant,
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
    handleLoadVariantIntoEditor,
    previewVariantSaveByIndex,
    previewVariantSaveErrors,
    handleSavePreviewVariantAtIndex,
    aiRefineBlocked,
    aiRefineBlockedReason,
    setPostType,
    dimensionWeights,
    setDimensionWeights,
    selectedCardId,
    setSelectedCardId,
    generatedCards,
    lastGeneratedConfig,
    handleGenerateFromStyle,
    removeGeneratedCard,
  } = useReviewFlowEditor();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderWorkflow, setBuilderWorkflow] = useState<CustomWorkflowSummary | undefined>(undefined);
  const [recentlySelectedIds, setRecentlySelectedIds] = useState<string[]>([]);

  function trackRecent(id: string) {
    setRecentlySelectedIds(prev => [id, ...prev.filter(x => x !== id)]);
  }

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

  async function handleGenerateAndSave() {
    const card = await handleGenerateFromStyle();
    if (!card || !onCreateCustomWorkflow) return;

    const topDims = Object.entries(card.dimensionWeights)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
    const description = `Custom style emphasising ${topDims.join(', ')}.`;

    const savedId = await onCreateCustomWorkflow({
      name: card.label,
      description,
      optimizationTarget: '',
      generationInstruction: card.instruction ?? `Generate a post with ${topDims.join(', ')} emphasis.`,
      extendsWorkflowId: card.baseCardId ?? 'base',
      dimensionWeights: card.dimensionWeights,
    });
    if (savedId) {
      removeGeneratedCard(card.id);
    }
  }

  function selectStyle(id: string) {
    const card = BUILT_IN_WORKFLOW_CARDS.find(c => c.id === id);
    setSelectedCardId(id);
    setPostType(id);
    setDimensionWeights(card ? { ...card.dimensionWeights } : { ...DEFAULT_WEIGHTS });
    trackRecent(id);
  }

  function selectGeneratedCard(card: GeneratedStyleCard) {
    setSelectedCardId(card.id);
    setDimensionWeights({ ...card.dimensionWeights });
    trackRecent(card.id);
  }

  type CardItem =
    | { kind: 'gen'; gc: GeneratedStyleCard }
    | { kind: 'builtin'; c: (typeof ORDERED_CARDS)[number] }
    | { kind: 'custom'; wf: NonNullable<typeof customWorkflows>[number] };

  const allCards = useMemo((): CardItem[] => {
    const pool: CardItem[] = [
      ...generatedCards.slice(0, 5).map(gc => ({ kind: 'gen' as const, gc })),
      ...ORDERED_CARDS.map(c => ({ kind: 'builtin' as const, c })),
      ...(customWorkflows ?? []).map(wf => ({ kind: 'custom' as const, wf })),
    ];
    const getId = (item: CardItem) =>
      item.kind === 'gen' ? item.gc.id : item.kind === 'builtin' ? item.c.id : item.wf.id;
    const recentSet = new Set(recentlySelectedIds);
    const recentItems = recentlySelectedIds
      .map(id => pool.find(item => getId(item) === id))
      .filter((x): x is CardItem => x !== undefined);
    const restItems = pool.filter(item => !recentSet.has(getId(item)));
    return [...recentItems, ...restItems];
  }, [generatedCards, customWorkflows, recentlySelectedIds]);

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

  const isStylesTab = activeWorkspacePanel === 'styles';

  return (
    <aside
      aria-label="Refine, media, and publishing rules"
      className="order-2 flex min-h-0 min-w-0 flex-col border-b border-violet-200/30 xl:order-none xl:flex-1 xl:overflow-hidden xl:border-b-0"
    >
      {/* Tab bar + variant pills — always visible, never scrolls away */}
      <div className="shrink-0 flex items-center gap-2 px-4 pt-3 pb-2">
        <div
          className="flex-1 grid gap-0.5 rounded-xl border border-border bg-white p-1 shadow-sm"
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

        {sheetVariants.length > 0 && (
          <div
            className="flex gap-0.5 rounded-xl border border-border bg-white p-1 shadow-sm"
            role="group"
            aria-label="Variants"
          >
            {sheetVariants.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleLoadSheetVariant(index)}
                aria-pressed={editorVariantIndex === index}
                className={cn(
                  'rounded-lg px-2 py-2 text-[0.65rem] font-semibold leading-tight transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35',
                  editorVariantIndex === index
                    ? 'bg-white text-ink shadow-md ring-1 ring-violet-200/70'
                    : 'text-muted hover:bg-white/60 hover:text-ink/70',
                )}
              >
                V{index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Writing Styles — fills remaining height with internal scroll for cards ── */}
      {isStylesTab ? (
        <section className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-3">
          {/* Generate button */}
          <div className="flex shrink-0 items-center justify-end">
            <button
              type="button"
              disabled={isGenerateDisabled}
              onClick={() => void handleGenerateAndSave()}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150',
                isGenerateDisabled
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'bg-primary text-white shadow-sm hover:bg-primary/90 active:scale-[0.98]',
              )}
            >
              {generationLoading === 'quick-change' && (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              )}
              {generationLoading === 'quick-change' ? 'Generating…' : 'Generate'}
            </button>
          </div>

          {/* Card grid — scrolls internally, fixed proportion so sliders stay visible */}
          <div className="min-h-0 max-h-[38vh] overflow-y-auto rounded-xl border border-gray-100">
            <div className="grid grid-cols-2 gap-2 p-1">

              {/* Create your own — always top-left */}
              <button
                type="button"
                onClick={() => { setBuilderWorkflow(undefined); setBuilderOpen(true); }}
                className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-2.5 text-center transition-all duration-150 hover:border-violet-300 hover:bg-violet-50/40"
              >
                <Plus className="h-4 w-4 text-muted" />
                <p className="text-[0.65rem] font-semibold text-muted">Create your own</p>
              </button>

              {/* All cards: recently selected first, then rest */}
              {allCards.map(item => {
                if (item.kind === 'gen') {
                  const gc = item.gc;
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
                        'flex cursor-pointer flex-col gap-1.5 rounded-xl border-2 border-dashed p-2.5 text-left transition-all duration-150',
                        'border-slate-300 bg-slate-50/80 hover:bg-slate-100/60',
                        isSelected && 'ring-2 ring-offset-1 shadow-md ring-slate-400',
                      )}
                    >
                      <p className="truncate text-xs font-bold leading-snug text-ink">{gc.label}</p>
                      <p className="text-[0.55rem] text-muted">
                        {new Date(gc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="mt-auto flex flex-wrap gap-1 pt-0.5">
                        {topDims.map(d => (
                          <span
                            key={d}
                            className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[0.55rem] font-semibold capitalize text-slate-600"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                }
                if (item.kind === 'builtin') {
                  const card = item.c;
                  const isSelected = selectedCardId === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => selectStyle(card.id)}
                      className={cn(
                        'flex cursor-pointer flex-col gap-1.5 rounded-xl border-2 p-2.5 text-left transition-all duration-150 hover:shadow-md',
                        CARD_BG[card.colorKey],
                        isSelected && `ring-2 ring-offset-1 shadow-md ${CARD_RING[card.colorKey]}`,
                      )}
                    >
                      <p className="text-xs font-bold leading-snug text-ink">{card.name}</p>
                      <p className="line-clamp-2 text-[0.6rem] leading-relaxed text-slate-600">{card.description}</p>
                      <div className="mt-auto flex flex-wrap gap-1 pt-0.5">
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
                }
                // custom
                const wf = item.wf;
                const isSelected = selectedCardId === wf.id;
                return (
                  <div key={wf.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => selectStyle(wf.id)}
                      className={cn(
                        'flex w-full cursor-pointer flex-col gap-1.5 rounded-xl border-2 border-violet-200 bg-violet-50/70 p-2.5 text-left transition-all duration-150 hover:border-violet-300 hover:shadow-md',
                        isSelected && 'ring-2 ring-offset-1 ring-violet-400 shadow-md',
                      )}
                    >
                      <p className="pr-4 text-xs font-bold leading-snug text-ink">{wf.name}</p>
                      <p className="line-clamp-2 text-[0.6rem] leading-relaxed text-slate-600">{wf.description}</p>
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setBuilderWorkflow(wf); setBuilderOpen(true); }}
                      className="absolute right-1.5 top-1.5 rounded p-0.5 opacity-0 transition-opacity hover:bg-violet-200/60 group-hover:opacity-100"
                      aria-label={`Edit ${wf.name}`}
                    >
                      <Pencil className="h-2.5 w-2.5 text-violet-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dimension sliders — 2-column grid, spacious, animated */}
          <div className="shrink-0 rounded-xl border border-violet-200/60 bg-white/80 px-4 py-3.5 shadow-sm">
            <p className="mb-3 text-[0.6rem] font-bold uppercase tracking-widest text-ink/40">Writing emphasis</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {DIMENSIONS.map(({ key, label }) => {
                const val = weights[key] ?? 50;
                const levelName = getLevelName(val);
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[0.68rem] font-semibold text-ink/70">{label}</span>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={levelName}
                          initial={{ opacity: 0, scale: 0.75 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.75 }}
                          transition={{ duration: 0.12, ease: 'easeOut' }}
                          className={cn(
                            'shrink-0 rounded-full px-1.5 py-px text-[0.55rem] font-bold tabular-nums',
                            getLevelPill(val),
                          )}
                        >
                          {levelName}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={val}
                      onChange={e => handleWeightChange(key, Number(e.target.value))}
                      style={{ '--pct': `${val}%` } as React.CSSProperties}
                      className={cn(
                        'w-full h-[3px] cursor-pointer appearance-none rounded-full',
                        '[background:linear-gradient(to_right,#7c3aed_var(--pct),#e2e8f0_var(--pct))]',
                        '[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3',
                        '[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none',
                        '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-600',
                        '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:ring-2',
                        '[&::-webkit-slider-thumb]:ring-white',
                        '[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3',
                        '[&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full',
                        '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-violet-600',
                        '[&::-moz-range-thumb]:shadow-md',
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        /* All other tabs — simple scroll container */
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-1">
          <div className="space-y-3">

            {/* ── Refine ──────────────────────────────────────────────────────── */}
            {activeWorkspacePanel === 'refine' ? (
              <>
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
                  onLoadVariant={handleLoadVariantIntoEditor}
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

            {/* ── News ────────────────────────────────────────────────────────── */}
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

            {/* ── Media ───────────────────────────────────────────────────────── */}
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

            {/* ── Topic Rules ──────────────────────────────────────────────────── */}
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

            {/* ── Email (Gmail only) ───────────────────────────────────────────── */}
            {activeWorkspacePanel === 'email' ? (
              <section className="space-y-3 rounded-xl border border-border bg-white p-3 shadow-sm">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">To</label>
                  <input type="text" className="w-full rounded-md border border-border px-2 py-1 text-sm focus:ring-1 focus:ring-primary" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="recipient@example.com" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">Cc</label>
                  <input type="text" className="w-full rounded-md border border-border px-2 py-1 text-sm focus:ring-1 focus:ring-primary" value={emailCc} onChange={e => setEmailCc(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">Bcc</label>
                  <input type="text" className="w-full rounded-md border border-border px-2 py-1 text-sm focus:ring-1 focus:ring-primary" value={emailBcc} onChange={e => setEmailBcc(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">Subject</label>
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
        </div>
      )}

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
