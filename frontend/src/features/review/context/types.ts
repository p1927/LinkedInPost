import { type ReactNode } from 'react';
import type { CustomWorkflowSummary } from '../../generation/WorkflowCardPicker';
import { type DraftPreviewSelection, type SheetRow } from '../../../services/sheets';
import {
  type ContentReviewReport,
  type GenerationRequest,
  type GenerationScope,
  type NewsResearchHistoryItem,
  type NewsResearchSearchPayload,
  type NewsResearchSearchResult,
  type NewsResearchSnapshotDetail,
  type NodeRunItem,
  type PostTemplate,
  type QuickChangePreviewResult,
  type ResearchArticleRef,
  type TextSelectionRange,
  type VariantsPreviewResponse,
} from '../../../services/backendApi';
import type { ContextDocument } from '../components/ContextDocumentsPanel';
import { type ImageAssetOption } from '../../../components/ImageAssetManager';
import { type ReviewRoutedNavigation } from '../ReviewWorkspace';
import { type ChannelId } from '../../../integrations/channels';
import { type PendingScheduledPublish } from '@/features/scheduled-publish';
import type { LlmRef, NewsResearchStored, NewsProviderKeys, ImageGenProvider } from '../../../services/configService';
import { type SheetVariantForReview } from './utils';

export interface CompareState {
  scope: GenerationScope;
  title: string;
  currentText: string;
  proposedText: string;
  resultingText: string;
  onConfirm: () => void;
}

export interface GeneratedStyleCard {
  id: string;
  label: string;
  dimensionWeights: Record<string, number>;
  baseCardId?: string;
  createdAt: number;
}

export interface VersionEntry {
  id: string;
  timestamp: number;
  content: string;
  /** "Viral Story", "Custom", "Saved · 10:32", "Original" */
  label: string;
  /** ID of the built-in or generated card active at snapshot time */
  cardId?: string;
  dimensionWeights: Record<string, number>;
  source: 'generate' | 'save' | 'initial';
}

/**
 * Editor-sensitive state that changes on every keystroke (editorText, selection, instruction)
 * and all generation state coupled to the editor. Kept in a separate context so components
 * that don't touch the editor (VariantCarousel, ReviewHeader, etc.) don't re-render on typing.
 */
export interface ReviewFlowEditorContextValue {
  // Editor state
  editorText: string;
  setEditorText: React.Dispatch<React.SetStateAction<string>>;
  editorBaselineText: string;
  setEditorBaselineText: React.Dispatch<React.SetStateAction<string>>;
  selection: TextSelectionRange | null;
  setSelection: React.Dispatch<React.SetStateAction<TextSelectionRange | null>>;
  scope: GenerationScope;
  setScope: React.Dispatch<React.SetStateAction<GenerationScope>>;
  instruction: string;
  setInstruction: React.Dispatch<React.SetStateAction<string>>;
  // Post type / workflow enrichment
  postType: string;
  setPostType: React.Dispatch<React.SetStateAction<string>>;
  dimensionWeights: Record<string, number>;
  setDimensionWeights: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  // Generation state
  generationLoading: 'quick-change' | 'variants' | null;
  quickChangePreview: QuickChangePreviewResult | null;
  setQuickChangePreview: React.Dispatch<React.SetStateAction<QuickChangePreviewResult | null>>;
  variantsPreview: VariantsPreviewResponse | null;
  setVariantsPreview: React.Dispatch<React.SetStateAction<VariantsPreviewResponse | null>>;
  previewVariantSaveByIndex: Record<number, 'idle' | 'saving' | 'saved' | 'error'>;
  previewVariantSaveErrors: Record<number, string>;
  compareState: CompareState | null;
  setCompareState: React.Dispatch<React.SetStateAction<CompareState | null>>;
  // Computed from editor state
  effectiveScope: GenerationScope;
  aiRefineBlocked: boolean;
  aiRefineBlockedReason: string;
  currentTargetText: string;
  editorDirty: boolean;
  // Editor-coupled actions
  applySheetVariantBase: (variant: SheetVariantForReview, variantIndex?: number) => void;
  handleGenerateQuickChange: () => Promise<void>;
  handleGenerateVariants: () => Promise<void>;
  openCompare: (title: string, proposedText: string, resultingText: string) => void;
  handleApplyQuickChange: () => void;
  handleApplyVariant: (index: number) => void;
  handleSavePreviewVariantAtIndex: (index: number) => Promise<void>;
  handleFormatting: (action: 'tighten-spacing' | 'bulletize' | 'emphasize') => void;

  // ── Styles tab ────────────────────────────────────────────
  /** ID of the card visually highlighted in the card grid (decoupled from postType) */
  selectedCardId: string | null;
  setSelectedCardId: (id: string | null) => void;
  /** Auto-created cards from the styles tab generate button, session-only */
  generatedCards: GeneratedStyleCard[];
  /** Config used for the last successful styles-tab generation; used to disable the button */
  lastGeneratedConfig: { cardId: string | null; dimensionWeights: Record<string, number> } | null;
  /** Direct-apply generation from the Styles tab (no instruction required) */
  handleGenerateFromStyle: () => Promise<void>;

  // ── Version history ────────────────────────────────────────
  versionHistory: VersionEntry[];
  currentVersionId: string | null;
  /** Restore editor to a past VersionEntry (also resets editor undo stack) */
  restoreVersion: (entry: VersionEntry) => void;
  /** Increments on every restore; used in historyResetKey to clear undo stack */
  versionRestoreCounter: number;
}

/**
 * Stable context — does NOT change on typing. Components like VariantCarousel, ReviewHeader,
 * and EditorVariantBar consume only this context and skip re-renders during editor input.
 */
export interface ReviewFlowContextValue {
  // Props
  row: SheetRow;
  deliveryChannel: ChannelId;
  previewAuthorName?: string;
  sharedRules: string;
  globalGenerationRules: string;
  isAdmin: boolean;
  googleModel: string;
  generationLlm?: LlmRef;
  routed?: ReviewRoutedNavigation;
  editorStartMediaPanel: boolean;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  pendingScheduledPublish: PendingScheduledPublish | null;
  scheduledPublishCancelBusy: boolean;
  onCancelScheduledPublish: () => void | Promise<void>;
  newsResearch: NewsResearchStored;
  newsProviderKeys: NewsProviderKeys;
  onSearchNewsResearch?: (payload: NewsResearchSearchPayload) => Promise<NewsResearchSearchResult>;
  onListNewsResearchHistory?: () => Promise<NewsResearchHistoryItem[]>;
  onGetNewsResearchSnapshot?: (id: string) => Promise<NewsResearchSnapshotDetail>;

  // State
  sheetRow: SheetRow;
  setSheetRow: React.Dispatch<React.SetStateAction<SheetRow>>;
  postTime: string;
  setPostTime: React.Dispatch<React.SetStateAction<string>>;
  selectedImageUrls: string[];
  setSelectedImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
  /** Select an image (search hits keep their source URL until publish). */
  handleSelectImageOption: (option: ImageAssetOption) => void;
  /** Clear the selected attachment so the post has no image until one is chosen again. */
  handleClearSelectedImage: () => void;
  alternateImageOptions: ImageAssetOption[];
  uploadedImageOptions: ImageAssetOption[];
  pendingVariantIndex: number | null;
  setPendingVariantIndex: React.Dispatch<React.SetStateAction<number | null>>;
  openMediaAfterVariantConfirm: boolean;
  setOpenMediaAfterVariantConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  pendingClose: boolean;
  setPendingClose: React.Dispatch<React.SetStateAction<boolean>>;
  pendingNavigateToVariants: boolean;
  setPendingNavigateToVariants: React.Dispatch<React.SetStateAction<boolean>>;
  submitting: boolean;
  activeWorkspacePanel: 'styles' | 'refine' | 'news' | 'media' | 'rules' | 'email';
  setActiveWorkspacePanel: React.Dispatch<React.SetStateAction<'styles' | 'refine' | 'news' | 'media' | 'rules' | 'email'>>;
  reviewPhase: 'pick-variant' | 'edit';
  setReviewPhase: React.Dispatch<React.SetStateAction<'pick-variant' | 'edit'>>;
  editorVariantIndex: number | null;
  setEditorVariantIndex: React.Dispatch<React.SetStateAction<number | null>>;
  topicExpanded: boolean;
  setTopicExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  previewCollapsed: boolean;
  setPreviewCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  pickCarouselIndex: number;
  setPickCarouselIndex: React.Dispatch<React.SetStateAction<number>>;

  emailTo: string;
  setEmailTo: React.Dispatch<React.SetStateAction<string>>;
  emailCc: string;
  setEmailCc: React.Dispatch<React.SetStateAction<string>>;
  emailBcc: string;
  setEmailBcc: React.Dispatch<React.SetStateAction<string>>;
  emailSubject: string;
  setEmailSubject: React.Dispatch<React.SetStateAction<string>>;
  savingEmailFields: boolean;

  // Computed
  sheetVariants: SheetVariantForReview[];
  showPickPhase: boolean;
  showEditorLayout: boolean;
  topicTitleInWorkspaceChrome: boolean;
  topicIsLong: boolean;
  generatedImageOptions: ImageAssetOption[];
  imageOptions: ImageAssetOption[];
  hasUnsavedReviewState: boolean;
  previewReadyCount: number;

  // Refs
  topicHeadingRef: React.RefObject<HTMLHeadingElement | HTMLParagraphElement | null>;

  // Image gen
  imageGenConfig?: { provider: ImageGenProvider; model?: string };

  // Functions
  leaveToTopics: () => void;
  requestNavigateToVariants: () => void;
  handleFetchMoreImageOptions: (searchQuery?: string) => Promise<void>;
  handleUploadImageOption: (file: File) => Promise<void>;
  handleUploadReferenceImage: (file: File) => Promise<string>;
  handleGenerateReferenceImage: (referenceImageUrl: string, instructions: string) => Promise<void>;
  handleSaveDraft: () => Promise<void>;
  savingDraft: boolean;
  handleApprove: () => Promise<void>;
  handlePublishNow: () => Promise<void>;
  publishSubmitting: boolean;
  handleLoadSheetVariant: (index: number) => void;
  handleOpenMediaFromPickTile: (index: number) => void;
  changePickCarouselBy: (direction: -1 | 1) => void;
  handlePickCarouselKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  handleSaveTopicRules: (rules: string) => Promise<void>;
  savingTopicRules: boolean;
  postTemplates: PostTemplate[];
  handleSaveGenerationTemplateId: (templateId: string) => Promise<void>;
  savingGenerationTemplateId: boolean;
  handleSaveGenerationLlm: (llm: LlmRef) => Promise<void>;
  savingGenerationLlm: boolean;
  handleSaveEmailFields: () => Promise<void>;
  onCancel: () => void;
  researchContextArticles: ResearchArticleRef[];
  setResearchContextArticles: React.Dispatch<React.SetStateAction<ResearchArticleRef[]>>;
  onRunContentReview?: (
    editorText: string,
    selectedImageUrls: string[],
    deliveryChannel: ChannelId,
  ) => Promise<ContentReviewReport>;
  onAfterContentReview?: () => Promise<void>;
  contextDocuments: ContextDocument[];
  uploadingContextDocument: boolean;
  uploadContextDocument: (file: File) => Promise<void>;
  removeContextDocument: (id: string) => void;
  nodeRuns: NodeRunItem[];
  nodeRunsLoading: boolean;
  customWorkflows: CustomWorkflowSummary[];
  isLoadingCustomWorkflows: boolean;
  onCreateCustomWorkflow?: (payload: import('../../workflows/useCustomWorkflows').CreateWorkflowFormValues) => Promise<string | null>;
  onUpdateCustomWorkflow?: (id: string, payload: import('../../workflows/useCustomWorkflows').CreateWorkflowFormValues) => Promise<boolean>;
  onDeleteCustomWorkflow?: (id: string) => Promise<boolean>;
}

export interface ReviewFlowProviderProps {
  children: ReactNode;
  row: SheetRow;
  deliveryChannel: ChannelId;
  previewAuthorName?: string;
  globalGenerationRules: string;
  isAdmin: boolean;
  googleModel: string;
  generationLlm?: LlmRef;
  onApprove: (selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string, selectedImageUrlsJson?: string) => Promise<void>;
  onPublishNow: (selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string, selectedImageUrlsJson?: string) => Promise<void>;
  onSaveEmailFields: (emailTo: string, emailCc: string, emailBcc: string, emailSubject: string) => Promise<void>;
  globalEmailDefaults?: { emailTo: string; emailCc: string; emailBcc: string; emailSubject: string };
  onGenerateQuickChange: (request: GenerationRequest) => Promise<QuickChangePreviewResult>;
  onGenerateVariants: (request: GenerationRequest) => Promise<VariantsPreviewResponse>;
  onSaveVariants: (row: SheetRow, variants: string[], previewSelection?: DraftPreviewSelection) => Promise<SheetRow>;
  onFetchMoreImages: (searchQuery?: string) => Promise<string[]>;
  /** Copy a remote image to workspace storage before approve/publish when the URL is not already hosted for delivery. */
  onPromoteRemoteImage: (sourceUrl: string) => Promise<string>;
  onUploadImage: (file: File) => Promise<string>;
  onGenerateReferenceImage?: (referenceImageUrl: string, instructions: string) => Promise<string>;
  imageGenConfig?: { provider: ImageGenProvider; model?: string };
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  onCancel: () => void;
  onSaveTopicGenerationRules: (row: SheetRow, topicRules: string) => Promise<SheetRow>;
  loadPostTemplates: () => Promise<PostTemplate[]>;
  onSaveGenerationTemplateId: (row: SheetRow, generationTemplateId: string) => Promise<SheetRow>;
  onSaveGenerationLlm?: (llm: LlmRef) => Promise<void>;
  routed?: ReviewRoutedNavigation;
  editorStartMediaPanel?: boolean;
  pendingScheduledPublish?: PendingScheduledPublish | null;
  scheduledPublishCancelBusy?: boolean;
  onCancelScheduledPublish?: () => void | Promise<void>;
  newsResearch?: NewsResearchStored;
  newsProviderKeys?: NewsProviderKeys;
  onSearchNewsResearch?: (payload: NewsResearchSearchPayload) => Promise<NewsResearchSearchResult>;
  onListNewsResearchHistory?: () => Promise<NewsResearchHistoryItem[]>;
  onGetNewsResearchSnapshot?: (id: string) => Promise<NewsResearchSnapshotDetail>;
  onRunContentReview?: (
    editorText: string,
    selectedImageUrls: string[],
    deliveryChannel: ChannelId,
  ) => Promise<ContentReviewReport>;
  onAfterContentReview?: () => Promise<void>;
  onUploadContextDocument?: (params: { name: string; contentBase64: string; mimeType: string }) => Promise<{ documentId: string; extractedText: string; charCount: number }>;
  onGetNodeRuns?: () => Promise<NodeRunItem[]>;
  customWorkflows?: CustomWorkflowSummary[];
  isLoadingCustomWorkflows?: boolean;
  onCreateCustomWorkflow?: (payload: import('../../workflows/useCustomWorkflows').CreateWorkflowFormValues) => Promise<string | null>;
  onUpdateCustomWorkflow?: (id: string, payload: import('../../workflows/useCustomWorkflows').CreateWorkflowFormValues) => Promise<boolean>;
  onDeleteCustomWorkflow?: (id: string) => Promise<boolean>;
}
