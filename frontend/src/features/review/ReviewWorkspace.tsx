import { type DraftPreviewSelection, type SheetRow } from '../../services/sheets';
import type { LlmRef, NewsResearchStored, NewsProviderKeys, ImageGenProvider } from '../../services/configService';
import { type PendingScheduledPublish } from '@/features/scheduled-publish';
import {
  type ContentReviewReport,
  type GenerationRequest,
  type NewsResearchHistoryItem,
  type NewsResearchSearchPayload,
  type NewsResearchSearchResult,
  type NewsResearchSnapshotDetail,
  type NodeRunItem,
  type PostTemplate,
  type QuickChangePreviewResult,
  type VariantsPreviewResponse,
} from '../../services/backendApi';
import { type ChannelId } from '../../integrations/channels';
import type { CustomWorkflowSummary } from '../generation/WorkflowCardPicker';
import type { CreateWorkflowFormValues } from '../workflows/useCustomWorkflows';
import { ReviewFlowProvider } from './context/ReviewFlowContext';
import { useReviewFlow } from './context/useReviewFlow';
import { ReviewHeader } from './components/ReviewHeader';
import { ReviewDialogs } from './components/ReviewDialogs';
import { VariantSelectionScreen } from '../variant/screens/VariantSelectionScreen';
import { EditorScreen } from '../review-editor/screens/EditorScreen';

export type ReviewRoutedNavigation = {
  screen: 'variants' | 'editor';
  editorVariantSlot: number;
  onNavigateToTopics: () => void;
  onNavigateToVariants: () => void;
  onNavigateToEditor: (variantSlot: number, options?: { openMedia?: boolean }) => void;
};

export interface ReviewWorkspaceProps {
  row: SheetRow;
  deliveryChannel: ChannelId;
  /** Shown on the feed preview card (e.g. derived from the signed-in user’s email). */
  previewAuthorName?: string;
  globalGenerationRules: string;
  googleModel: string;
  generationLlm?: LlmRef;
  onApprove: (selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string, selectedImageUrlsJson?: string) => Promise<void>;
  onPublishNow: (selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string, selectedImageUrlsJson?: string) => Promise<void>;
  onSaveEmailFields: (emailTo: string, emailCc: string, emailBcc: string, emailSubject: string) => Promise<void>;
  globalEmailDefaults?: { emailTo: string; emailCc: string; emailBcc: string; emailSubject: string };
  onGenerateQuickChange: (
    request: GenerationRequest,
    onProgress?: (event: { type: 'node_start'; nodeId: string } | { type: 'node_done'; nodeId: string; durationMs: number; insightSummary: string | null }) => void,
  ) => Promise<QuickChangePreviewResult>;
  onGenerateVariants: (request: GenerationRequest) => Promise<VariantsPreviewResponse>;
  onSaveVariants: (row: SheetRow, variants: string[], previewSelection?: DraftPreviewSelection) => Promise<SheetRow>;
  onFetchMoreImages: (searchQuery?: string) => Promise<string[]>;
  onPromoteRemoteImage: (sourceUrl: string) => Promise<string>;
  onUploadImage: (file: File) => Promise<string>;
  onGenerateReferenceImage?: (referenceImageUrl: string, instructions: string) => Promise<string>;
  onGenerateImageFromText?: (prompt: string) => Promise<string>;
  imageGenConfig?: { provider: ImageGenProvider; model?: string };
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  onCancel: () => void;
  isAdmin: boolean;
  onSaveTopicGenerationRules: (row: SheetRow, topicRules: string) => Promise<SheetRow>;
  loadPostTemplates: () => Promise<PostTemplate[]>;
  onSaveGenerationTemplateId: (row: SheetRow, generationTemplateId: string) => Promise<SheetRow>;
  /** URL-driven flow: variants page vs editor page. */
  routed?: ReviewRoutedNavigation;
  /** Set when opening `/topics/.../editor/N?media=1`. */
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
  onCreateCustomWorkflow?: (payload: CreateWorkflowFormValues) => Promise<string | null>;
  onUpdateCustomWorkflow?: (id: string, payload: CreateWorkflowFormValues) => Promise<boolean>;
  onDeleteCustomWorkflow?: (id: string) => Promise<boolean>;
}

function ReviewWorkspaceLayout() {
  const { showPickPhase, showEditorLayout } = useReviewFlow();

  return (
    <>
      <section
        aria-labelledby="review-workspace-title"
        aria-describedby="review-workspace-desc"
        className="flex min-h-0 h-full min-w-0 w-full flex-1 flex-col self-stretch outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        <div className="flex min-h-0 h-full min-w-0 w-full flex-1 flex-col overflow-hidden">
          <p id="review-workspace-desc" className="sr-only">
            Pick a variant, refine, then approve.
          </p>

          <ReviewHeader />

          {showPickPhase && <VariantSelectionScreen />}
          {showEditorLayout && <EditorScreen />}
        </div>
      </section>

      <ReviewDialogs />
    </>
  );
}

export function ReviewWorkspace(props: ReviewWorkspaceProps) {
  return (
    <ReviewFlowProvider {...props}>
      <ReviewWorkspaceLayout />
    </ReviewFlowProvider>
  );
}
