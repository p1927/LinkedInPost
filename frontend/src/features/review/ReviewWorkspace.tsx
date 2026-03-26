import { ArrowLeft } from 'lucide-react';
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
import { GenerationPanel } from '../generation/GenerationPanel';
import { VariantPersistencePanel } from '../persistence/VariantPersistencePanel';
import { RulesPanel } from '../rules/RulesPanel';
import { CompareDialog } from '../compare/CompareDialog';
import { type ChannelId } from '../../integrations/channels';

interface ReviewWorkspaceProps {
  row: SheetRow;
  deliveryChannel: ChannelId;
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
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [postTime, setPostTime] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState(row.selectedImageId || row.imageLink1 || '');
  const [alternateImageOptions, setAlternateImageOptions] = useState<ImageAssetOption[]>([]);
  const [uploadedImageOptions, setUploadedImageOptions] = useState<ImageAssetOption[]>([]);
  const [pendingVariantIndex, setPendingVariantIndex] = useState<number | null>(null);
  const [pendingClose, setPendingClose] = useState(false);
  const [compareState, setCompareState] = useState<CompareState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeWorkspacePanel, setActiveWorkspacePanel] = useState<'refine' | 'media' | 'rules'>('refine');
  const [reviewPhase, setReviewPhase] = useState<'pick-variant' | 'edit'>(() =>
    buildSheetVariants(row).length > 0 ? 'pick-variant' : 'edit',
  );

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
    setSaveState('idle');
    setSaveError('');
    setPostTime('');
    setSelectedImageUrl(row.selectedImageId || row.imageLink1 || '');
    setAlternateImageOptions([]);
    setUploadedImageOptions([]);
    setPendingVariantIndex(null);
    setPendingClose(false);
    setCompareState(null);
    setActiveWorkspacePanel('refine');
    setReviewPhase(buildSheetVariants(row).length > 0 ? 'pick-variant' : 'edit');
  }, [row]);

  const sheetVariants = useMemo(() => buildSheetVariants(sheetRow), [sheetRow]);
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
    setSaveState('idle');
    setSaveError('');
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
      setSaveState('idle');
      setSaveError('');
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

  const handleSavePreviewVariants = async () => {
    if (!variantsPreview?.variants.length) {
      return;
    }

    setSaveState('saving');
    setSaveError('');
    try {
      const updatedRow = await onSaveVariants(sheetRow, variantsPreview.variants.map((variant) => variant.fullText));
      setSheetRow(updatedRow);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof Error ? error.message : 'Failed to save preview variants.');
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
      setPendingVariantIndex(index);
      return;
    }

    const variant = sheetVariants[index];
    if (!variant) {
      return;
    }

    applySheetVariantBase(variant);
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
          <div className="shrink-0 border-b border-white/45 bg-white/50 px-4 py-2.5 backdrop-blur-md">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Review</p>
                <h2 className="truncate text-sm font-medium leading-snug text-ink">{sheetRow.topic}</h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  {sheetVariants.length} sheet variant{sheetVariants.length === 1 ? '' : 's'}
                  {reviewPhase === 'edit' ? ' · editing' : ''}
                  {editorDirty ? ' · draft edited' : ''}
                  {previewReadyCount ? ` · ${previewReadyCount} preview${previewReadyCount === 1 ? '' : 's'}` : ''}
                  <span className="text-muted/80"> · {googleModel}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  id="review-post-time-input"
                  type="datetime-local"
                  value={postTime}
                  onChange={(event) => setPostTime(event.target.value)}
                  aria-label="Post time (optional)"
                  className="glass-inset w-full min-w-0 rounded-lg px-2.5 py-1.5 text-xs text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20 sm:w-[200px]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleApprove()}
                    disabled={submitting}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasUnsavedReviewState) {
                        setPendingClose(true);
                        return;
                      }
                      onCancel();
                    }}
                    className="glass-inset inline-flex cursor-pointer items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-white/80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {reviewPhase === 'pick-variant' && sheetVariants.length > 0 ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Choose a sheet draft</p>
              <p className="mt-0.5 text-xs text-muted">Picking one opens the editor and tools. You can go back to switch.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {sheetVariants.map((variant, index) => (
                  <button
                    key={`sheet-variant-${index}`}
                    type="button"
                    onClick={() => handleLoadSheetVariant(index)}
                    className="glass-inset min-w-[200px] max-w-md flex-1 cursor-pointer rounded-2xl px-4 py-3 text-left transition-colors hover:border-violet-300/70 hover:bg-white/75 sm:min-w-[220px]"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Variant {index + 1}</p>
                    <p className="mt-1.5 line-clamp-4 text-xs leading-relaxed text-ink">{variant.text}</p>
                    <span className="glass-inset mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                      Use as base
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {reviewPhase === 'edit' || sheetVariants.length === 0 ? (
            <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
              <section className="min-h-0 space-y-4 overflow-y-auto border-b border-white/40 px-4 py-4 xl:border-b-0 xl:border-r xl:border-white/40">
                {sheetVariants.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setReviewPhase('pick-variant')}
                    className="glass-inset inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-white/80"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    Back to variants
                  </button>
                ) : null}

                <DraftEditor
                  value={editorText}
                  selection={selection}
                  preferredScope={scope}
                  dirty={editorDirty}
                  onChange={setEditorText}
                  onSelectionChange={setSelection}
                  onScopeChange={setScope}
                  onFormatting={handleFormatting}
                />

                <section className="glass-panel rounded-2xl p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Preview</p>
                    <span className="glass-inset rounded-full px-2 py-0.5 text-[11px] font-semibold text-muted">
                      {selectedImageUrl ? 'Image attached' : 'No image'}
                    </span>
                  </div>
                  <div className="mt-3">
                    <LinkedInPostPreview
                      optionNumber={1}
                      text={editorText}
                      imageUrl={selectedImageUrl}
                      previewChannel={deliveryChannel}
                      selected
                      expanded
                      onSelect={() => undefined}
                      onToggleExpanded={() => undefined}
                    />
                  </div>
                </section>
              </section>

              <aside className="min-h-0 overflow-y-auto bg-white/20 px-4 py-4 backdrop-blur-sm">
                <div className="glass-panel grid grid-cols-3 gap-1.5 rounded-xl p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setActiveWorkspacePanel('refine')}
                    className={`cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${activeWorkspacePanel === 'refine' ? 'bg-white/75 text-ink shadow-sm ring-1 ring-violet-200/60' : 'text-muted hover:bg-white/45'}`}
                  >
                    Refine
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspacePanel('media')}
                    className={`cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${activeWorkspacePanel === 'media' ? 'bg-white/75 text-ink shadow-sm ring-1 ring-violet-200/60' : 'text-muted hover:bg-white/45'}`}
                  >
                    Media
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspacePanel('rules')}
                    className={`cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${activeWorkspacePanel === 'rules' ? 'bg-white/75 text-ink shadow-sm ring-1 ring-violet-200/60' : 'text-muted hover:bg-white/45'}`}
                  >
                    Rules
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {activeWorkspacePanel === 'refine' ? (
                    <>
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
                      />

                      <VariantPersistencePanel
                        hasPreview={Boolean(variantsPreview?.variants.length)}
                        variantCount={variantsPreview?.variants.length || 0}
                        saveState={saveState}
                        errorMessage={saveError}
                        onSave={() => void handleSavePreviewVariants()}
                      />
                    </>
                  ) : null}

                  {activeWorkspacePanel === 'media' ? (
                    <section className="glass-panel rounded-2xl p-4 shadow-card">
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

                  {activeWorkspacePanel === 'rules' ? <RulesPanel sharedRules={sharedRules} /> : null}
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
        onCancel={() => setPendingVariantIndex(null)}
        onConfirm={() => {
          if (pendingVariantIndex === null) {
            return;
          }

          const variant = sheetVariants[pendingVariantIndex];
          setPendingVariantIndex(null);
          if (!variant) {
            return;
          }

          applySheetVariantBase(variant);
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
