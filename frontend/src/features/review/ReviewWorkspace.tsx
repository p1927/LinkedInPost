import { type SheetRow } from '../../services/sheets';
import {
  type GenerationRequest,
  type QuickChangePreviewResult,
  type VariantsPreviewResponse,
} from '../../services/backendApi';
import { type ChannelId } from '../../integrations/channels';
import { ReviewFlowProvider, useReviewFlow } from './context/ReviewFlowContext';
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
  onApprove: (selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string) => Promise<void>;
  onSaveEmailFields: (emailTo: string, emailCc: string, emailBcc: string, emailSubject: string) => Promise<void>;
  globalEmailDefaults?: { emailTo: string; emailCc: string; emailBcc: string; emailSubject: string };
  onGenerateQuickChange: (request: GenerationRequest) => Promise<QuickChangePreviewResult>;
  onGenerateVariants: (request: GenerationRequest) => Promise<VariantsPreviewResponse>;
  onSaveVariants: (row: SheetRow, variants: string[]) => Promise<SheetRow>;
  onFetchMoreImages: () => Promise<string[]>;
  onUploadImage: (file: File) => Promise<string>;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  onCancel: () => void;
  isAdmin: boolean;
  onSaveTopicGenerationRules: (row: SheetRow, topicRules: string) => Promise<SheetRow>;
  /** URL-driven flow: variants page vs editor page. */
  routed?: ReviewRoutedNavigation;
  /** Set when opening `/topics/.../editor/N?media=1`. */
  editorStartMediaPanel?: boolean;
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
