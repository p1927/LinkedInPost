import { ArrowLeft, Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { ImageAssetManager, type ImageAssetOption } from '../../components/ImageAssetManager';
import { useAlert } from '../../components/AlertProvider';
import { LinkedInPostPreview } from '../../components/LinkedInPostPreview';
import { type SheetRow } from '../../services/sheets';
import {
  type GenerationRequest,
  type GenerationScope,
  type QuickChangePreviewResult,
  type TextSelectionRange,
  type VariantsPreviewResponse,
} from '../../services/backendApi';
import { DraftEditor } from '../editor/DraftEditor';
import { applyFormattingAction, getEffectiveScope, getTargetText } from '../editor/selection';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';
import { GenerationPanel } from '../generation/GenerationPanel';
import { RulesPanel } from '../rules/RulesPanel';
import { CompareDialog } from '../compare/CompareDialog';
import { getChannelLabel, type ChannelId } from '../../integrations/channels';

interface ReviewWorkspaceProps {
  row: SheetRow;
  deliveryChannel: ChannelId;
  /** Shown on the feed preview card (e.g. derived from the signed-in user’s email). */
  previewAuthorName?: string;
  sharedRules: string;
  googleModel: string;
  onApprove: (selectedText: string, selectedImageId: string, postTime: string) => Promise<void>;
  onGenerateQuickChange: (request: GenerationRequest) => Promise<QuickChangePreviewResult>;
  onGenerateVariants: (request: GenerationRequest) => Promise<VariantsPreviewResponse>;
  onSaveVariants: (row: SheetRow, variants: string[]) => Promise<SheetRow>;
  onFetchMoreImages: () => Promise<string[]>;
  onUploadImage: (file: File) => Promise<string>;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  onCancel: () => void;
}

interface CompareState {
  scope: GenerationScope;
  title: string;
  currentText: string;
  proposedText: string;
  resultingText: string;
  onConfirm: () => void;
}

function getInitialEditorText(row: SheetRow): string {
  return [row.selectedText, row.variant1, row.variant2, row.variant3, row.variant4].find((value) => value.trim()) || '';
}

function buildSheetVariants(row: SheetRow) {
  return [
    { text: row.variant1, imageUrl: row.imageLink1, originalIndex: 0 },
    { text: row.variant2, imageUrl: row.imageLink2, originalIndex: 1 },
    { text: row.variant3, imageUrl: row.imageLink3, originalIndex: 2 },
    { text: row.variant4, imageUrl: row.imageLink4, originalIndex: 3 },
  ].filter((variant) => variant.text.trim());
}

function buildGeneratedImages(row: SheetRow): ImageAssetOption[] {
  return [row.imageLink1, row.imageLink2, row.imageLink3, row.imageLink4]
    .map((imageUrl, originalIndex) => ({
      id: `generated-${originalIndex}`,
      imageUrl,
      originalIndex,
      label: `Generated ${originalIndex + 1}`,
      kind: 'generated' as const,
    }))
    .filter((option) => option.imageUrl.trim());
}

function mergeUniqueImageOptions(nextOptions: ImageAssetOption[]): ImageAssetOption[] {
  const seen = new Set<string>();
  return nextOptions.filter((option) => {
    const key = option.imageUrl.trim();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function ReviewWorkspace({
  row,
  deliveryChannel,
  previewAuthorName,
  sharedRules,
  googleModel,
  onApprove,
  onGenerateQuickChange,
  onGenerateVariants,
  onSaveVariants,
  onFetchMoreImages,
  onUploadImage,
  onDownloadImage,
  onCancel,
}: ReviewWorkspaceProps) {
  const { showAlert } = useAlert();
  const [sheetRow, setSheetRow] = useState(row);
  const [editorText, setEditorText] = useState(getInitialEditorText(row));
  const [editorBaselineText, setEditorBaselineText] = useState(getInitialEditorText(row));
  const [selection, setSelection] = useState<TextSelectionRange | null>(null);
  const [scope, setScope] = useState<GenerationScope>('whole-post');
  const [instruction, setInstruction] = useState('');
  const [generationLoading, setGenerationLoading] = useState<'quick-change' | 'variants' | null>(null);
  const [quickChangePreview, setQuickChangePreview] = useState<QuickChangePreviewResult | null>(null);
  const [variantsPreview, setVariantsPreview] = useState<VariantsPreviewResponse | null>(null);
  const [previewVariantSaveByIndex, setPreviewVariantSaveByIndex] = useState<
    Record<number, 'idle' | 'saving' | 'saved' | 'error'>
  >({});
  const [previewVariantSaveErrors, setPreviewVariantSaveErrors] = useState<Record<number, string>>({});
  const [postTime, setPostTime] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState(row.selectedImageId || row.imageLink1 || '');
  const [alternateImageOptions, setAlternateImageOptions] = useState<ImageAssetOption[]>([]);
  const [uploadedImageOptions, setUploadedImageOptions] = useState<ImageAssetOption[]>([]);
  const [pendingVariantIndex, setPendingVariantIndex] = useState<number | null>(null);
  const [openMediaAfterVariantConfirm, setOpenMediaAfterVariantConfirm] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [compareState, setCompareState] = useState<CompareState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeWorkspacePanel, setActiveWorkspacePanel] = useState<'refine' | 'media' | 'rules'>('refine');
  const [reviewPhase, setReviewPhase] = useState<'pick-variant' | 'edit'>(() =>
    buildSheetVariants(row).length > 0 ? 'pick-variant' : 'edit',
  );
  const [topicExpanded, setTopicExpanded] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  useEffect(() => {
    const initialText = getInitialEditorText(row);
    setSheetRow(row);
    setEditorText(initialText);
    setEditorBaselineText(initialText);
    setSelection(null);
    setScope('whole-post');
    setInstruction('');
    setGenerationLoading(null);
    setQuickChangePreview(null);
    setVariantsPreview(null);
    setPreviewVariantSaveByIndex({});
    setPreviewVariantSaveErrors({});
    setPostTime('');
    setSelectedImageUrl(row.selectedImageId || row.imageLink1 || '');
    setAlternateImageOptions([]);
    setUploadedImageOptions([]);
    setPendingVariantIndex(null);
    setOpenMediaAfterVariantConfirm(false);
    setPendingClose(false);
    setCompareState(null);
    setActiveWorkspacePanel('refine');
    setReviewPhase(buildSheetVariants(row).length > 0 ? 'pick-variant' : 'edit');
    setTopicExpanded(false);
    setPreviewCollapsed(false);
  }, [row]);

  const sheetVariants = useMemo(() => buildSheetVariants(sheetRow), [sheetRow]);
  const showPickPhase = reviewPhase === 'pick-variant' && sheetVariants.length > 0;
  const topicIsLong = sheetRow.topic.length > 140 || sheetRow.topic.split('\n').length > 2;
  const generatedImageOptions = useMemo(() => buildGeneratedImages(sheetRow), [sheetRow]);
  const imageOptions = useMemo(
    () => [...uploadedImageOptions, ...generatedImageOptions, ...alternateImageOptions],
    [alternateImageOptions, generatedImageOptions, uploadedImageOptions],
  );
  const effectiveScope = getEffectiveScope(scope, selection);
  const currentTargetText = getTargetText(editorText, effectiveScope, selection);
  const editorDirty = editorText !== editorBaselineText;
  const hasUnsavedReviewState = editorDirty || instruction.trim().length > 0 || Boolean(quickChangePreview) || Boolean(variantsPreview?.variants.length);
  const previewReadyCount = variantsPreview?.variants.length || (quickChangePreview ? 1 : 0);

  useEffect(() => {
    if (!selectedImageUrl && imageOptions[0]?.imageUrl) {
      setSelectedImageUrl(imageOptions[0].imageUrl);
      return;
    }

    if (selectedImageUrl && !imageOptions.some((option) => option.imageUrl === selectedImageUrl)) {
      setSelectedImageUrl(imageOptions[0]?.imageUrl || '');
    }
  }, [imageOptions, selectedImageUrl]);

  const buildGenerationRequest = (): GenerationRequest => ({
    row: sheetRow,
    editorText,
    scope: effectiveScope,
    selection: effectiveScope === 'selection' ? selection : null,
    instruction,
    googleModel,
  });

  const applySheetVariantBase = (variant: { text: string; imageUrl: string }) => {
    setEditorText(variant.text);
    setEditorBaselineText(variant.text);
    setSelection(null);
    setScope('whole-post');
    setInstruction('');
    setQuickChangePreview(null);
    setVariantsPreview(null);
    setPreviewVariantSaveByIndex({});
    setPreviewVariantSaveErrors({});
    if (variant.imageUrl) {
      setSelectedImageUrl(variant.imageUrl);
    }
    setReviewPhase('edit');
  };

  const handleGenerateQuickChange = async () => {
    if (!editorText.trim()) {
      void showAlert({ title: 'Notice', description: 'Add or keep some draft text before generating a quick change.' });
      return;
    }

    if (!instruction.trim()) {
      void showAlert({ title: 'Notice', description: 'Add a per-run instruction before using Quick Change.' });
      return;
    }

    setGenerationLoading('quick-change');
    try {
      const preview = await onGenerateQuickChange(buildGenerationRequest());
      setQuickChangePreview(preview);
    } finally {
      setGenerationLoading(null);
    }
  };

  const handleGenerateVariants = async () => {
    if (!editorText.trim()) {
      void showAlert({ title: 'Notice', description: 'Add or keep some draft text before generating variants.' });
      return;
    }

    setGenerationLoading('variants');
    try {
      const preview = await onGenerateVariants(buildGenerationRequest());
      setVariantsPreview(preview);
      setPreviewVariantSaveByIndex({});
      setPreviewVariantSaveErrors({});
    } finally {
      setGenerationLoading(null);
    }
  };

  const openCompare = (title: string, proposedText: string, resultingText: string) => {
    setCompareState({
      scope: effectiveScope,
      title,
      currentText: currentTargetText,
      proposedText,
      resultingText,
      onConfirm: () => {
        setEditorText(resultingText);
        setSelection(null);
        setScope('whole-post');
        setCompareState(null);
      },
    });
  };

  const handleApplyQuickChange = () => {
    if (!quickChangePreview) {
      return;
    }

    openCompare('Apply Quick Change preview', quickChangePreview.replacementText, quickChangePreview.fullText);
  };

  const handleApplyVariant = (index: number) => {
    const variant = variantsPreview?.variants[index];
    if (!variant) {
      return;
    }

    openCompare(`Apply preview ${index + 1}`, variant.replacementText, variant.fullText);
  };

  const handleSavePreviewVariantAtIndex = async (index: number) => {
    const variant = variantsPreview?.variants[index];
    if (!variant || variantsPreview.variants.length !== 4) {
      return;
    }

    setPreviewVariantSaveByIndex((current) => ({ ...current, [index]: 'saving' }));
    setPreviewVariantSaveErrors((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
    try {
      const merged = [
        index === 0 ? variant.fullText : sheetRow.variant1,
        index === 1 ? variant.fullText : sheetRow.variant2,
        index === 2 ? variant.fullText : sheetRow.variant3,
        index === 3 ? variant.fullText : sheetRow.variant4,
      ];
      const updatedRow = await onSaveVariants(sheetRow, merged);
      setSheetRow(updatedRow);
      setPreviewVariantSaveByIndex((current) => ({ ...current, [index]: 'saved' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save to Sheets.';
      setPreviewVariantSaveByIndex((current) => ({ ...current, [index]: 'error' }));
      setPreviewVariantSaveErrors((current) => ({ ...current, [index]: message }));
    }
  };

  const handleFetchMoreImageOptions = async () => {
    const nextImageUrls = await onFetchMoreImages();
    const nextOptions = nextImageUrls.map((imageUrl, index) => ({
      id: `alternate-${Date.now()}-${index}`,
      imageUrl,
      label: `Alternative ${index + 1}`,
      kind: 'alternate' as const,
      originalIndex: index,
    }));

    const dedupedAlternates = mergeUniqueImageOptions([
      ...nextOptions,
      ...alternateImageOptions.filter((option) => option.kind === 'alternate'),
    ]).slice(0, Math.max(nextOptions.length, 4));
    setAlternateImageOptions(dedupedAlternates);
    if (dedupedAlternates[0]?.imageUrl) {
      setSelectedImageUrl(dedupedAlternates[0].imageUrl);
    }
  };

  const handleUploadImageOption = async (file: File) => {
    const imageUrl = await onUploadImage(file);
    const uploadedOption: ImageAssetOption = {
      id: `upload-${Date.now()}`,
      imageUrl,
      label: file.name ? file.name.replace(/\.[^.]+$/, '') : 'Uploaded image',
      kind: 'upload',
    };

    setUploadedImageOptions((current) => mergeUniqueImageOptions([uploadedOption, ...current]).slice(0, 4));
    setSelectedImageUrl(imageUrl);
  };

  const handleApprove = async () => {
    if (!editorText.trim()) {
      void showAlert({ title: 'Notice', description: 'Post text cannot be empty.' });
      return;
    }

    setSubmitting(true);
    try {
      let formattedTime = '';
      if (postTime) {
        const date = new Date(postTime);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        formattedTime = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      }

      await onApprove(editorText.trim(), selectedImageUrl, formattedTime);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSheetVariant = (index: number) => {
    if (hasUnsavedReviewState) {
      setOpenMediaAfterVariantConfirm(false);
      setPendingVariantIndex(index);
      return;
    }

    const variant = sheetVariants[index];
    if (!variant) {
      return;
    }

    applySheetVariantBase(variant);
  };

  const handleOpenMediaFromPickTile = (index: number) => {
    if (hasUnsavedReviewState) {
      setOpenMediaAfterVariantConfirm(true);
      setPendingVariantIndex(index);
      return;
    }

    const variant = sheetVariants[index];
    if (!variant) {
      return;
    }

    applySheetVariantBase(variant);
    setActiveWorkspacePanel('media');
  };

  const handleFormatting = (action: 'tighten-spacing' | 'bulletize' | 'emphasize') => {
    const nextState = applyFormattingAction(editorText, effectiveScope, selection, action);
    setEditorText(nextState.value);
    setSelection(nextState.selection);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-deep-purple/35 px-4 py-6 backdrop-blur-md sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-full w-full max-w-[min(100vw-2rem,1760px)] items-center justify-center">
        <div className="glass-panel-strong flex max-h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-3xl">
          <div className="shrink-0 border-b border-white/45 bg-white/50 px-4 py-3 backdrop-blur-md sm:py-2.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                {reviewPhase === 'edit' && sheetVariants.length > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setReviewPhase('pick-variant')}
                    aria-label="Back to sheet variants"
                    className="min-h-[44px] shrink-0 gap-1.5 px-3 sm:mt-0.5 sm:min-h-[40px]"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="whitespace-nowrap">Back to variants</span>
                  </Button>
                ) : null}
                <div className="min-w-0 flex-1">
                  {sheetVariants.length > 0 ? (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">
                      {showPickPhase ? 'Step 1 of 2 · Choose draft' : 'Step 2 of 2 · Refine and approve'}
                    </p>
                  ) : (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Review</p>
                  )}
                  <h2
                    className={cn(
                      'mt-0.5 text-sm font-medium leading-snug text-ink',
                      !topicExpanded && topicIsLong && 'line-clamp-3',
                    )}
                  >
                    {sheetRow.topic}
                  </h2>
                  {topicIsLong ? (
                    <button
                      type="button"
                      onClick={() => setTopicExpanded((v) => !v)}
                      className="mt-1 cursor-pointer text-left text-[11px] font-semibold text-primary transition-colors hover:text-primary-hover"
                    >
                      {topicExpanded ? 'Show less' : 'Show full topic'}
                    </button>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="neutral" size="xs" className="normal-case">
                      {getChannelLabel(deliveryChannel)}
                    </Badge>
                    {sheetVariants.length > 0 ? (
                      <Badge variant="neutral" size="xs" className="normal-case">
                        {sheetVariants.length} sheet variant{sheetVariants.length === 1 ? '' : 's'}
                      </Badge>
                    ) : null}
                    {showPickPhase ? (
                      <Badge variant="info" size="xs" className="normal-case">
                        Choosing variant
                      </Badge>
                    ) : null}
                    {reviewPhase === 'edit' && sheetVariants.length > 0 ? (
                      <Badge variant="info" size="xs" className="normal-case">
                        Editing
                      </Badge>
                    ) : null}
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center rounded-full border border-violet-200/60 bg-white/70 p-1 text-muted transition-colors hover:border-primary/40 hover:text-primary"
                      title={`Generation model: ${googleModel}`}
                      aria-label={`Generation model: ${googleModel}`}
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    {editorDirty ? (
                      <Badge variant="warning" size="xs" className="normal-case">
                        Draft edited
                      </Badge>
                    ) : null}
                    {previewReadyCount > 0 ? (
                      <Badge variant="neutral" size="xs" className="normal-case">
                        {previewReadyCount} AI preview{previewReadyCount === 1 ? '' : 's'}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                {!showPickPhase ? (
                  <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto">
                    <label
                      htmlFor="review-post-time-input"
                      className="text-[10px] font-semibold uppercase tracking-wider text-ink/70"
                    >
                      Schedule{' '}
                      <span className="font-normal normal-case tracking-normal text-ink/60">(optional)</span>
                    </label>
                    <input
                      id="review-post-time-input"
                      type="datetime-local"
                      value={postTime}
                      onChange={(event) => setPostTime(event.target.value)}
                      aria-label="Schedule post time (optional)"
                      className={cn(
                        'min-h-[40px] w-full min-w-0 rounded-xl border border-violet-200/55 bg-white/85 px-3 py-2 text-xs font-semibold text-ink shadow-sm outline-none backdrop-blur-md transition-[border-color,box-shadow] duration-200',
                        'focus:border-primary focus:ring-2 focus:ring-primary/25 focus:ring-offset-2 focus:ring-offset-canvas sm:w-[220px]',
                      )}
                    />
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {!showPickPhase ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => void handleApprove()}
                      disabled={submitting}
                      className="min-h-[40px]"
                    >
                      {submitting ? 'Approving…' : 'Approve'}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (hasUnsavedReviewState) {
                        setPendingClose(true);
                        return;
                      }
                      onCancel();
                    }}
                    className="min-h-[40px]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {reviewPhase === 'pick-variant' && sheetVariants.length > 0 ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/70">Choose a sheet draft</p>
              <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-ink/80">
                Select a draft to open it in the editor. Use &ldquo;Back to variants&rdquo; anytime to compare again.
              </p>
              <div className="mt-4 grid min-h-[min(44vh,520px)] flex-1 grid-cols-1 gap-4 sm:min-h-[min(48vh,560px)] sm:grid-cols-2 sm:grid-rows-2 [grid-auto-rows:minmax(0,1fr)]">
                {sheetVariants.map((variant, index) => (
                  <div
                    key={`sheet-variant-${variant.originalIndex}`}
                    className="flex h-full min-h-[260px] flex-col sm:min-h-[280px]"
                  >
                    <LinkedInPostPreview
                      optionNumber={index + 1}
                      text={variant.text}
                      imageUrl={variant.imageUrl || undefined}
                      selected={false}
                      expanded={false}
                      pickMode
                      previewChannel={deliveryChannel}
                      previewAuthorName={previewAuthorName}
                      mode="carousel"
                      className="glass-inset h-full min-h-0 overflow-y-auto overscroll-contain border-2 border-border-strong bg-white/80 shadow-card backdrop-blur-sm"
                      onSelect={() => handleLoadSheetVariant(index)}
                      onToggleExpanded={() => undefined}
                      onOpenMedia={() => handleOpenMediaFromPickTile(index)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {reviewPhase === 'edit' || sheetVariants.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:grid xl:min-h-0 xl:grid-cols-[minmax(220px,0.26fr)_minmax(0,1fr)_minmax(200px,0.3fr)] xl:gap-0 xl:overflow-hidden">
              <aside className="order-2 min-h-0 border-b border-white/40 bg-white/15 px-3 py-3 backdrop-blur-sm xl:order-none xl:max-h-full xl:border-b-0 xl:border-r xl:border-white/40 xl:overflow-y-auto">
                <div className="glass-panel grid grid-cols-3 gap-1 rounded-lg p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setActiveWorkspacePanel('refine')}
                    className={`cursor-pointer rounded-md px-1.5 py-1 text-[11px] font-semibold transition-colors ${activeWorkspacePanel === 'refine' ? 'bg-white/75 text-ink shadow-sm ring-1 ring-violet-200/60' : 'text-muted hover:bg-white/45'}`}
                  >
                    Refine
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspacePanel('media')}
                    className={`cursor-pointer rounded-md px-1.5 py-1 text-[11px] font-semibold transition-colors ${activeWorkspacePanel === 'media' ? 'bg-white/75 text-ink shadow-sm ring-1 ring-violet-200/60' : 'text-muted hover:bg-white/45'}`}
                  >
                    Media
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspacePanel('rules')}
                    className={`cursor-pointer rounded-md px-1.5 py-1 text-[11px] font-semibold transition-colors ${activeWorkspacePanel === 'rules' ? 'bg-white/75 text-ink shadow-sm ring-1 ring-violet-200/60' : 'text-muted hover:bg-white/45'}`}
                  >
                    Rules
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {activeWorkspacePanel === 'refine' ? (
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
                      compact
                      previewVariantSaveByIndex={previewVariantSaveByIndex}
                      previewVariantSaveErrors={previewVariantSaveErrors}
                      onSavePreviewVariant={(index) => void handleSavePreviewVariantAtIndex(index)}
                    />
                  ) : null}

                  {activeWorkspacePanel === 'media' ? (
                    <section className="glass-panel rounded-xl p-3 shadow-card">
                      <ImageAssetManager
                        topic={sheetRow.topic}
                        images={imageOptions}
                        selectedImageUrl={selectedImageUrl}
                        onSelectImage={setSelectedImageUrl}
                        onFetchMoreImages={handleFetchMoreImageOptions}
                        onUploadImage={handleUploadImageOption}
                        onDownloadImage={onDownloadImage}
                      />
                    </section>
                  ) : null}

                  {activeWorkspacePanel === 'rules' ? <RulesPanel sharedRules={sharedRules} compact /> : null}
                </div>
              </aside>

              <section className="order-1 flex min-h-0 flex-col overflow-y-auto border-b border-white/40 px-3 py-3 xl:order-none xl:h-full xl:max-h-full xl:overflow-hidden xl:border-b-0 xl:border-r xl:border-white/40">
                <DraftEditor
                  value={editorText}
                  selection={selection}
                  preferredScope={scope}
                  dirty={editorDirty}
                  onChange={setEditorText}
                  onSelectionChange={setSelection}
                  onScopeChange={setScope}
                  onFormatting={handleFormatting}
                  compact
                  className="min-h-0 flex-1"
                />
              </section>

              <aside className="order-3 min-h-0 overflow-y-auto bg-white/10 px-2 py-3 xl:order-none xl:max-h-full xl:overflow-y-auto">
                <div className="sticky top-0 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 px-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Live preview</p>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="neutral" size="xs" className="normal-case">
                        {selectedImageUrl ? 'Image' : 'Text only'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setPreviewCollapsed((c) => !c)}
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-white/50 hover:text-primary-hover"
                      >
                        {previewCollapsed ? 'Show' : 'Hide'}
                      </button>
                    </div>
                  </div>
                  {!previewCollapsed ? (
                    <div className="flex justify-center">
                      <LinkedInPostPreview
                        optionNumber={1}
                        text={editorText}
                        imageUrl={selectedImageUrl}
                        previewChannel={deliveryChannel}
                        previewAuthorName={previewAuthorName}
                        layout="sidebar"
                        selected
                        expanded
                        onSelect={() => undefined}
                        onToggleExpanded={() => undefined}
                        onOpenMedia={() => setActiveWorkspacePanel('media')}
                      />
                    </div>
                  ) : (
                    <p className="px-1 text-center text-[10px] leading-relaxed text-muted">
                      Preview hidden. Show when you want to check layout and media.
                    </p>
                  )}
                </div>
              </aside>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog
        open={pendingVariantIndex !== null}
        title="Discard current editor changes?"
        description="Loading a different sheet variant will replace the current editor working state."
        confirmLabel="Discard and load"
        onCancel={() => {
          setOpenMediaAfterVariantConfirm(false);
          setPendingVariantIndex(null);
        }}
        onConfirm={() => {
          if (pendingVariantIndex === null) {
            return;
          }

          const variant = sheetVariants[pendingVariantIndex];
          const alsoMedia = openMediaAfterVariantConfirm;
          setPendingVariantIndex(null);
          setOpenMediaAfterVariantConfirm(false);
          if (!variant) {
            return;
          }

          applySheetVariantBase(variant);
          if (alsoMedia) {
            setActiveWorkspacePanel('media');
          }
        }}
      />

      <Dialog
        open={pendingClose}
        title="Discard current editor changes?"
        description="Closing now will remove the current local editor state and preview context. Sheet drafts will remain unchanged."
        confirmLabel="Discard and close"
        onCancel={() => setPendingClose(false)}
        onConfirm={() => {
          setPendingClose(false);
          onCancel();
        }}
      />

      <CompareDialog
        open={compareState !== null}
        scope={compareState?.scope || 'whole-post'}
        title={compareState?.title || 'Compare preview'}
        currentText={compareState?.currentText || ''}
        proposedText={compareState?.proposedText || ''}
        resultingText={compareState?.resultingText || ''}
        onCancel={() => setCompareState(null)}
        onConfirm={() => compareState?.onConfirm()}
      />
    </div>
  );
}
