import { type SheetRow } from '../../services/sheets';
import {
  type GenerationRequest,
  type QuickChangePreviewResult,
  type VariantsPreviewResponse,
} from '../../services/backendApi';
import { type ChannelId } from '../../integrations/channels';
import { type PendingScheduledPublish } from '@/features/scheduled-publish';

export type TopicReviewPagesBaseProps = {
  rows: SheetRow[];
  deliveryChannel: ChannelId;
  previewAuthorName?: string;
  /** Workspace-wide rules; ignored for LLM when this topic has non-empty topic rules. */
  globalGenerationRules: string;
  googleModel: string;
  onApprove: (row: SheetRow, selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string) => Promise<void>;
  /** Approve current editor content and send immediately to the workspace delivery channel (skips the queue Publish click). */
  onPublishNow: (row: SheetRow, selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string) => Promise<void>;
  onSaveEmailFields: (row: SheetRow, emailTo: string, emailCc: string, emailBcc: string, emailSubject: string) => Promise<void>;
  globalEmailDefaults: { emailTo: string; emailCc: string; emailBcc: string; emailSubject: string };
  onGenerateQuickChange: (request: GenerationRequest) => Promise<QuickChangePreviewResult>;
  onGenerateVariants: (request: GenerationRequest) => Promise<VariantsPreviewResponse>;
  onSaveVariants: (row: SheetRow, variants: string[]) => Promise<SheetRow>;
  onFetchMoreImages: (row: SheetRow, searchQuery?: string) => Promise<string[]>;
  /** Persist a search-result image to workspace storage (required before approve). */
  onPromoteRemoteImage: (row: SheetRow, sourceUrl: string) => Promise<string>;
  onUploadImage: (row: SheetRow, file: File) => Promise<string>;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  queueLoading: boolean;
  isAdmin: boolean;
  /** Persists column S “Topic rules” on the draft row (sheet API). */
  onSaveTopicGenerationRules: (row: SheetRow, topicRules: string) => Promise<SheetRow>;
  pendingScheduledPublish?: PendingScheduledPublish | null;
  scheduledPublishCancelBusy?: boolean;
  onCancelScheduledPublish?: () => void | Promise<void>;
  onDismissScheduledPublish?: () => void;
};

/** Fills workspace main via flex; use with {@link WorkspaceShell} `lockMainScroll` so height is not double-scrolled. */
export const reviewShellClass =
  '-mx-4 -my-6 flex min-h-0 min-w-0 flex-1 flex-col sm:-mx-6';
