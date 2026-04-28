import { createContext } from 'react';
import { DEFAULT_NEWS_RESEARCH_CONFIG } from '../../../services/configService';
import { type ReviewFlowContextValue, type ReviewFlowEditorContextValue, type ReviewFlowProviderProps } from './types';
import { useReviewFlowState } from './useReviewFlowState';
import { useReviewFlowActions } from './useReviewFlowActions';
import { ReviewFlowEditorContext } from './ReviewFlowEditorContext';

export const ReviewFlowContext = createContext<ReviewFlowContextValue | null>(null);

export function ReviewFlowProvider(props: ReviewFlowProviderProps) {
  const state = useReviewFlowState(props);
  const actions = useReviewFlowActions(props, state);

  // Internal-only fields stripped from context (prefixed _ to satisfy noUnusedLocals)
  const {
    setChrome: _setChrome, // eslint-disable-line @typescript-eslint/no-unused-vars
    effectiveGenerationRules,
    suppressAutoImageSelection: _suppressAutoImageSelection, // eslint-disable-line @typescript-eslint/no-unused-vars
    setSuppressAutoImageSelection: _setSuppressAutoImageSelection, // eslint-disable-line @typescript-eslint/no-unused-vars
    setGenerationLoading: _setGenerationLoading, // eslint-disable-line @typescript-eslint/no-unused-vars
    setAlternateImageOptions: _setAlternateImageOptions, // eslint-disable-line @typescript-eslint/no-unused-vars
    setUploadedImageOptions: _setUploadedImageOptions, // eslint-disable-line @typescript-eslint/no-unused-vars
    setSubmitting: _setSubmitting, // eslint-disable-line @typescript-eslint/no-unused-vars
    setPreviewVariantSaveByIndex: _setPreviewVariantSaveByIndex, // eslint-disable-line @typescript-eslint/no-unused-vars
    setPreviewVariantSaveErrors: _setPreviewVariantSaveErrors, // eslint-disable-line @typescript-eslint/no-unused-vars
    ...restState
  } = state;

  // Editor-sensitive context (re-renders on every keystroke / generation change)
  const editorValue: ReviewFlowEditorContextValue = {
    editorText: restState.editorText,
    setEditorText: restState.setEditorText,
    editorBaselineText: restState.editorBaselineText,
    setEditorBaselineText: restState.setEditorBaselineText,
    selection: restState.selection,
    setSelection: restState.setSelection,
    scope: restState.scope,
    setScope: restState.setScope,
    instruction: restState.instruction,
    setInstruction: restState.setInstruction,
    generationLoading: restState.generationLoading,
    quickChangePreview: restState.quickChangePreview,
    setQuickChangePreview: restState.setQuickChangePreview,
    variantsPreview: restState.variantsPreview,
    setVariantsPreview: restState.setVariantsPreview,
    previewVariantSaveByIndex: restState.previewVariantSaveByIndex,
    previewVariantSaveErrors: restState.previewVariantSaveErrors,
    compareState: restState.compareState,
    setCompareState: restState.setCompareState,
    effectiveScope: restState.effectiveScope,
    aiRefineBlocked: restState.aiRefineBlocked,
    aiRefineBlockedReason: restState.aiRefineBlockedReason,
    currentTargetText: restState.currentTargetText,
    editorDirty: restState.editorDirty,
    postType: restState.postType,
    setPostType: restState.setPostType,
    dimensionWeights: restState.dimensionWeights,
    setDimensionWeights: restState.setDimensionWeights,
    rewriteIntensity: restState.rewriteIntensity,
    setRewriteIntensity: restState.setRewriteIntensity,
    applySheetVariantBase: actions.applySheetVariantBase,
    handleGenerateQuickChange: actions.handleGenerateQuickChange,
    handleGenerateVariants: actions.handleGenerateVariants,
    openCompare: actions.openCompare,
    handleApplyQuickChange: actions.handleApplyQuickChange,
    handleApplyVariant: actions.handleApplyVariant,
    handleLoadVariantIntoEditor: actions.handleLoadVariantIntoEditor,
    handleSavePreviewVariantAtIndex: actions.handleSavePreviewVariantAtIndex,
    handleFormatting: actions.handleFormatting,
    selectedCardId: restState.selectedCardId,
    setSelectedCardId: restState.setSelectedCardId,
    generatedCards: restState.generatedCards,
    lastGeneratedConfig: restState.lastGeneratedConfig,
    handleGenerateFromStyle: actions.handleGenerateFromStyle,
    removeGeneratedCard: restState.removeGeneratedCard,
    versionHistory: restState.versionHistory,
    currentVersionId: restState.currentVersionId,
    restoreVersion: restState.restoreVersion,
    versionRestoreCounter: restState.versionRestoreCounter,
  };

  // Stable context — does NOT change on typing
  const stableValue: ReviewFlowContextValue = {
    // Props
    row: props.row,
    deliveryChannel: props.deliveryChannel,
    previewAuthorName: props.previewAuthorName,
    sharedRules: effectiveGenerationRules,
    globalGenerationRules: props.globalGenerationRules,
    isAdmin: props.isAdmin,
    googleModel: props.googleModel,
    generationLlm: props.generationLlm,
    routed: props.routed,
    editorStartMediaPanel: props.editorStartMediaPanel ?? false,
    onDownloadImage: props.onDownloadImage,
    onCancel: props.onCancel,
    pendingScheduledPublish: props.pendingScheduledPublish ?? null,
    scheduledPublishCancelBusy: props.scheduledPublishCancelBusy ?? false,
    onCancelScheduledPublish: props.onCancelScheduledPublish ?? (() => {}),
    newsResearch: props.newsResearch ?? DEFAULT_NEWS_RESEARCH_CONFIG,
    newsProviderKeys: props.newsProviderKeys ?? {
      newsapi: false,
      gnews: false,
      newsdata: false,
      serpapi: false,
    },
    onSearchNewsResearch: props.onSearchNewsResearch,
    onListNewsResearchHistory: props.onListNewsResearchHistory,
    onGetNewsResearchSnapshot: props.onGetNewsResearchSnapshot,
    onRunContentReview: props.onRunContentReview,
    onAfterContentReview: props.onAfterContentReview,
    // State
    sheetRow: restState.sheetRow,
    setSheetRow: restState.setSheetRow,
    postTime: restState.postTime,
    setPostTime: restState.setPostTime,
    selectedImageUrls: restState.selectedImageUrls,
    setSelectedImageUrls: restState.setSelectedImageUrls,
    handleSelectImageOption: actions.handleSelectImageOption,
    handleClearSelectedImage: actions.handleClearSelectedImage,
    alternateImageOptions: restState.alternateImageOptions,
    uploadedImageOptions: restState.uploadedImageOptions,
    pendingVariantIndex: restState.pendingVariantIndex,
    setPendingVariantIndex: restState.setPendingVariantIndex,
    openMediaAfterVariantConfirm: restState.openMediaAfterVariantConfirm,
    setOpenMediaAfterVariantConfirm: restState.setOpenMediaAfterVariantConfirm,
    pendingClose: restState.pendingClose,
    setPendingClose: restState.setPendingClose,
    pendingNavigateToVariants: restState.pendingNavigateToVariants,
    setPendingNavigateToVariants: restState.setPendingNavigateToVariants,
    submitting: restState.submitting,
    activeWorkspacePanel: restState.activeWorkspacePanel,
    setActiveWorkspacePanel: restState.setActiveWorkspacePanel,
    reviewPhase: restState.reviewPhase,
    setReviewPhase: restState.setReviewPhase,
    editorVariantIndex: restState.editorVariantIndex,
    setEditorVariantIndex: restState.setEditorVariantIndex,
    topicExpanded: restState.topicExpanded,
    setTopicExpanded: restState.setTopicExpanded,
    previewCollapsed: restState.previewCollapsed,
    setPreviewCollapsed: restState.setPreviewCollapsed,
    pickCarouselIndex: restState.pickCarouselIndex,
    setPickCarouselIndex: restState.setPickCarouselIndex,
    emailTo: restState.emailTo,
    setEmailTo: restState.setEmailTo,
    emailCc: restState.emailCc,
    setEmailCc: restState.setEmailCc,
    emailBcc: restState.emailBcc,
    setEmailBcc: restState.setEmailBcc,
    emailSubject: restState.emailSubject,
    setEmailSubject: restState.setEmailSubject,
    savingEmailFields: actions.savingEmailFields,
    // Computed
    sheetVariants: restState.sheetVariants,
    showPickPhase: restState.showPickPhase,
    showEditorLayout: restState.showEditorLayout,
    topicTitleInWorkspaceChrome: restState.topicTitleInWorkspaceChrome,
    topicIsLong: restState.topicIsLong,
    generatedImageOptions: restState.generatedImageOptions,
    imageOptions: restState.imageOptions,
    hasUnsavedReviewState: restState.hasUnsavedReviewState,
    previewReadyCount: restState.previewReadyCount,
    // Refs
    topicHeadingRef: restState.topicHeadingRef,
    // Functions
    leaveToTopics: actions.leaveToTopics,
    requestNavigateToVariants: actions.requestNavigateToVariants,
    handleFetchMoreImageOptions: actions.handleFetchMoreImageOptions,
    handleUploadImageOption: actions.handleUploadImageOption,
    handleUploadReferenceImage: props.onUploadImage,
    handleGenerateReferenceImage: actions.handleGenerateReferenceImage,
    handleGenerateImageFromText: actions.handleGenerateImageFromText,
    imageGenConfig: props.imageGenConfig,
    handleSaveDraft: actions.handleSaveDraft,
    savingDraft: actions.savingDraft,
    handleApprove: actions.handleApprove,
    handlePublishNow: actions.handlePublishNow,
    publishSubmitting: actions.publishSubmitting,
    handleLoadSheetVariant: actions.handleLoadSheetVariant,
    handleOpenMediaFromPickTile: actions.handleOpenMediaFromPickTile,
    changePickCarouselBy: actions.changePickCarouselBy,
    handlePickCarouselKeyDown: actions.handlePickCarouselKeyDown,
    handleSaveTopicRules: actions.handleSaveTopicRules,
    savingTopicRules: actions.savingTopicRules,
    postTemplates: restState.postTemplates,
    handleSaveGenerationTemplateId: actions.handleSaveGenerationTemplateId,
    savingGenerationTemplateId: actions.savingGenerationTemplateId,
    handleSaveGenerationLlm: actions.handleSaveGenerationLlm,
    savingGenerationLlm: actions.savingGenerationLlm,
    handleSaveEmailFields: actions.handleSaveEmailFields,
    researchContextArticles: restState.researchContextArticles,
    setResearchContextArticles: restState.setResearchContextArticles,
    contextDocuments: actions.contextDocuments,
    uploadingContextDocument: actions.uploadingContextDocument,
    uploadContextDocument: actions.uploadContextDocument,
    removeContextDocument: actions.removeContextDocument,
    nodeRuns: restState.nodeRuns,
    nodeRunsLoading: restState.nodeRunsLoading,
    customWorkflows: props.customWorkflows ?? [],
    isLoadingCustomWorkflows: props.isLoadingCustomWorkflows ?? false,
    onCreateCustomWorkflow: props.onCreateCustomWorkflow,
    onUpdateCustomWorkflow: props.onUpdateCustomWorkflow,
    onDeleteCustomWorkflow: props.onDeleteCustomWorkflow,
  };

  return (
    <ReviewFlowContext.Provider value={stableValue}>
      <ReviewFlowEditorContext.Provider value={editorValue}>
        {props.children}
      </ReviewFlowEditorContext.Provider>
    </ReviewFlowContext.Provider>
  );
}
