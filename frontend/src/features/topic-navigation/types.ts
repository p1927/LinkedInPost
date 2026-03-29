import { type SheetRow } from '../../services/sheets';
import {
  type GenerationRequest,
  type QuickChangePreviewResult,
  type VariantsPreviewResponse,
} from '../../services/backendApi';
import { type ChannelId } from '../../integrations/channels';

export type TopicReviewPagesBaseProps = {
  rows: SheetRow[];
  deliveryChannel: ChannelId;
  previewAuthorName?: string;
  sharedRules: string;
  googleModel: string;
  onApprove: (row: SheetRow, selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string) => Promise<void>;
  onSaveEmailFields: (row: SheetRow, emailTo: string, emailCc: string, emailBcc: string, emailSubject: string) => Promise<void>;
  globalEmailDefaults: { emailTo: string; emailCc: string; emailBcc: string; emailSubject: string };
  onGenerateQuickChange: (request: GenerationRequest) => Promise<QuickChangePreviewResult>;
  onGenerateVariants: (request: GenerationRequest) => Promise<VariantsPreviewResponse>;
  onSaveVariants: (row: SheetRow, variants: string[]) => Promise<SheetRow>;
  onFetchMoreImages: (row: SheetRow) => Promise<string[]>;
  onUploadImage: (row: SheetRow, file: File) => Promise<string>;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  queueLoading: boolean;
  isAdmin: boolean;
  /** Persists shared generation rules (Worker `saveConfig`; admin-only on the server). */
  onSaveGenerationRules: (rules: string) => Promise<void>;
};

/** Fills workspace main via flex; use with {@link WorkspaceShell} `lockMainScroll` so height is not double-scrolled. */
export const reviewShellClass =
  '-mx-4 -my-6 flex min-h-0 min-w-0 flex-1 flex-col sm:-mx-6';
