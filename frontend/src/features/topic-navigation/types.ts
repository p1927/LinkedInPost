import { type SheetRow } from '../../services/sheets';
import {
  type GenerationRequest,
  type NewsResearchHistoryItem,
  type NewsResearchSearchPayload,
  type NewsResearchSearchResult,
  type NewsResearchSnapshotDetail,
  type PostTemplate,
  type QuickChangePreviewResult,
  type VariantsPreviewResponse,
} from '../../services/backendApi';
import { type ChannelId } from '../../integrations/channels';
import { type PendingScheduledPublish } from '@/features/scheduled-publish';
import type { LlmRef, NewsResearchStored, NewsProviderKeys } from '../../services/configService';

export type TopicReviewPagesBaseProps = {
  rows: SheetRow[];
  deliveryChannel: ChannelId;
  previewAuthorName?: string;
  /** Workspace-wide rules; ignored for LLM when this topic has non-empty topic rules. */
  globalGenerationRules: string;
  googleModel: string;
  generationLlm?: LlmRef;
  newsResearch?: NewsResearchStored;
  newsProviderKeys?: NewsProviderKeys;
  onApprove: (row: SheetRow, selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string, selectedImageUrlsJson?: string) => Promise<void>;
  /** Approve current editor content and send immediately to the workspace delivery channel (skips the queue Publish click). */
  onPublishNow: (row: SheetRow, selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string, selectedImageUrlsJson?: string) => Promise<void>;
  onSaveEmailFields: (row: SheetRow, emailTo: string, emailCc: string, emailBcc: string, emailSubject: string) => Promise<void>;
  globalEmailDefaults: { emailTo: string; emailCc: string; emailBcc: string; emailSubject: string };
  onGenerateQuickChange: (request: GenerationRequest) => Promise<QuickChangePreviewResult>;
  onGenerateVariants: (request: GenerationRequest) => Promise<VariantsPreviewResponse>;
  onSaveVariants: (row: SheetRow, variants: string[]) => Promise<SheetRow>;
  onFetchMoreImages: (row: SheetRow, searchQuery?: string) => Promise<string[]>;
  onPromoteRemoteImage: (row: SheetRow, sourceUrl: string) => Promise<string>;
  onUploadImage: (row: SheetRow, file: File) => Promise<string>;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  queueLoading: boolean;
  isAdmin: boolean;
  /** Persists column S “Topic rules” on the draft row (sheet API). */
  onSaveTopicGenerationRules: (row: SheetRow, topicRules: string) => Promise<SheetRow>;
  /** Loads reusable post templates from the PostTemplates sheet. */
  loadPostTemplates: () => Promise<PostTemplate[]>;
  /** Persists column U “Generation template id” on the draft row. */
  onSaveGenerationTemplateId: (row: SheetRow, generationTemplateId: string) => Promise<SheetRow>;
  pendingScheduledPublish?: PendingScheduledPublish | null;
  scheduledPublishCancelBusy?: boolean;
  onCancelScheduledPublish?: () => void | Promise<void>;
  /** Optional news search for the editor researcher panel. */
  onSearchNewsResearch?: (row: SheetRow, payload: NewsResearchSearchPayload) => Promise<NewsResearchSearchResult>;
  onListNewsResearchHistory?: (row: SheetRow) => Promise<NewsResearchHistoryItem[]>;
  onGetNewsResearchSnapshot?: (row: SheetRow, id: string) => Promise<NewsResearchSnapshotDetail>;
};

/** Fills workspace main via flex; use with {@link WorkspaceShell} `lockMainScroll` so height is not double-scrolled. */
export const reviewShellClass =
  '-mx-4 -my-6 flex min-h-0 min-w-0 flex-1 flex-col sm:-mx-6';
