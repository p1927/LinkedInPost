import { type SheetRow } from '../../../services/sheets';
import {
  type GenerationRequest,
  type QuickChangePreviewResult,
  type VariantsPreviewResponse,
} from '../../../services/backendApi';
import { type ChannelId } from '../../../integrations/channels';

export type TopicReviewPagesBaseProps = {
  rows: SheetRow[];
  deliveryChannel: ChannelId;
  previewAuthorName?: string;
  sharedRules: string;
  googleModel: string;
  onApprove: (row: SheetRow, selectedText: string, selectedImageId: string, postTime: string) => Promise<void>;
  onGenerateQuickChange: (request: GenerationRequest) => Promise<QuickChangePreviewResult>;
  onGenerateVariants: (request: GenerationRequest) => Promise<VariantsPreviewResponse>;
  onSaveVariants: (row: SheetRow, variants: string[]) => Promise<SheetRow>;
  onFetchMoreImages: (row: SheetRow) => Promise<string[]>;
  onUploadImage: (row: SheetRow, file: File) => Promise<string>;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  queueLoading: boolean;
};

export const reviewShellClass = '-mx-4 min-h-[calc(100dvh-7.5rem)] sm:-mx-6';
