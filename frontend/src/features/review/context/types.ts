import { type ReactNode } from 'react';
import { type SheetRow } from '../../../services/sheets';
import {
  type GenerationRequest,
  type GenerationScope,
  type QuickChangePreviewResult,
  type TextSelectionRange,
  type VariantsPreviewResponse,
} from '../../../services/backendApi';
import { type ImageAssetOption } from '../../../components/ImageAssetManager';
import { type ReviewRoutedNavigation } from '../ReviewWorkspace';
import { type ChannelId } from '../../../integrations/channels';
import { type PendingScheduledPublish } from '@/features/scheduled-publish';

export interface CompareState {
  scope: GenerationScope;
  title: string;
  currentText: string;
  proposedText: string;
  resultingText: string;
  onConfirm: () => void;
}

export interface ReviewFlowContextValue {
  // Props
  row: SheetRow;
  deliveryChannel: ChannelId;
  previewAuthorName?: string;
  sharedRules: string;
  globalGenerationRules: string;
  isAdmin: boolean;
  googleModel: string;
  routed?: ReviewRoutedNavigation;
  editorStartMediaPanel: boolean;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  pendingScheduledPublish: PendingScheduledPublish | null;
  scheduledPublishCancelBusy: boolean;
  onCancelScheduledPublish: () => void | Promise<void>;
  onDismissScheduledPublish: () => void;

  // State
  sheetRow: SheetRow;
  setSheetRow: React.Dispatch<React.SetStateAction<SheetRow>>;
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
  generationLoading: 'quick-change' | 'variants' | null;
  quickChangePreview: QuickChangePreviewResult | null;
  setQuickChangePreview: React.Dispatch<React.SetStateAction<QuickChangePreviewResult | null>>;
  variantsPreview: VariantsPreviewResponse | null;
  setVariantsPreview: React.Dispatch<React.SetStateAction<VariantsPreviewResponse | null>>;
  previewVariantSaveByIndex: Record<number, 'idle' | 'saving' | 'saved' | 'error'>;
  previewVariantSaveErrors: Record<number, string>;
  postTime: string;
  setPostTime: React.Dispatch<React.SetStateAction<string>>;
  selectedImageUrl: string;
  setSelectedImageUrl: React.Dispatch<React.SetStateAction<string>>;
  /** Select an image; search results are promoted to storage when needed. */
  handleSelectImageOption: (option: ImageAssetOption) => Promise<void>;
  imagePromoteOptionId: string;
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
  compareState: CompareState | null;
  setCompareState: React.Dispatch<React.SetStateAction<CompareState | null>>;
  submitting: boolean;
  activeWorkspacePanel: 'refine' | 'media' | 'rules' | 'email';
  setActiveWorkspacePanel: React.Dispatch<React.SetStateAction<'refine' | 'media' | 'rules' | 'email'>>;
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
  sheetVariants: { text: string; imageUrl: string; originalIndex: number }[];
  showPickPhase: boolean;
  showEditorLayout: boolean;
  topicTitleInWorkspaceChrome: boolean;
  topicIsLong: boolean;
  generatedImageOptions: ImageAssetOption[];
  imageOptions: ImageAssetOption[];
  effectiveScope: GenerationScope;
  aiRefineBlocked: boolean;
  aiRefineBlockedReason: string;
  currentTargetText: string;
  editorDirty: boolean;
  hasUnsavedReviewState: boolean;
  previewReadyCount: number;

  // Refs
  topicHeadingRef: React.RefObject<HTMLHeadingElement | null>;

  // Functions
  leaveToTopics: () => void;
  requestNavigateToVariants: () => void;
  applySheetVariantBase: (variant: { text: string; imageUrl: string }, variantIndex?: number) => void;
  handleGenerateQuickChange: () => Promise<void>;
  handleGenerateVariants: () => Promise<void>;
  openCompare: (title: string, proposedText: string, resultingText: string) => void;
  handleApplyQuickChange: () => void;
  handleApplyVariant: (index: number) => void;
  handleSavePreviewVariantAtIndex: (index: number) => Promise<void>;
  handleFetchMoreImageOptions: (searchQuery?: string) => Promise<void>;
  handleUploadImageOption: (file: File) => Promise<void>;
  handleApprove: () => Promise<void>;
  handlePublishNow: () => Promise<void>;
  publishSubmitting: boolean;
  handleLoadSheetVariant: (index: number) => void;
  handleOpenMediaFromPickTile: (index: number) => void;
  changePickCarouselBy: (direction: -1 | 1) => void;
  handlePickCarouselKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  handleFormatting: (action: 'tighten-spacing' | 'bulletize' | 'emphasize') => void;
  handleSaveTopicRules: (rules: string) => Promise<void>;
  savingTopicRules: boolean;
  handleSaveEmailFields: () => Promise<void>;
  onCancel: () => void;
}

export interface ReviewFlowProviderProps {
  children: ReactNode;
  row: SheetRow;
  deliveryChannel: ChannelId;
  previewAuthorName?: string;
  globalGenerationRules: string;
  isAdmin: boolean;
  googleModel: string;
  onApprove: (selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string) => Promise<void>;
  onPublishNow: (selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string) => Promise<void>;
  onSaveEmailFields: (emailTo: string, emailCc: string, emailBcc: string, emailSubject: string) => Promise<void>;
  globalEmailDefaults?: { emailTo: string; emailCc: string; emailBcc: string; emailSubject: string };
  onGenerateQuickChange: (request: GenerationRequest) => Promise<QuickChangePreviewResult>;
  onGenerateVariants: (request: GenerationRequest) => Promise<VariantsPreviewResponse>;
  onSaveVariants: (row: SheetRow, variants: string[]) => Promise<SheetRow>;
  onFetchMoreImages: (searchQuery?: string) => Promise<string[]>;
  onPromoteRemoteImage: (sourceUrl: string) => Promise<string>;
  onUploadImage: (file: File) => Promise<string>;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  onCancel: () => void;
  onSaveTopicGenerationRules: (row: SheetRow, topicRules: string) => Promise<SheetRow>;
  routed?: ReviewRoutedNavigation;
  editorStartMediaPanel?: boolean;
  pendingScheduledPublish?: PendingScheduledPublish | null;
  scheduledPublishCancelBusy?: boolean;
  onCancelScheduledPublish?: () => void | Promise<void>;
  onDismissScheduledPublish?: () => void;
}
