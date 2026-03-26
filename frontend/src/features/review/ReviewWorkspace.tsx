import { CalendarClock, CheckCircle2, ChevronRight, FileText, ImageIcon, Layers3, Sparkles } from 'lucide-react';
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

interface ReviewWorkspaceProps {
  row: SheetRow;
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

type ReviewStep = 'draft' | 'refine' | 'approve';

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
  const [reviewStep, setReviewStep] = useState<ReviewStep>('draft');

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
    setReviewStep('draft');
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
  const reviewSteps: Array<{ id: ReviewStep; label: string; description: string; icon: typeof FileText }> = [
    { id: 'draft', label: 'Draft', description: 'Choose a base and edit the copy.', icon: FileText },
    { id: 'refine', label: 'Refine', description: 'Generate previews, media, and rules context.', icon: Sparkles },
    { id: 'approve', label: 'Approve', description: 'Schedule and lock the final draft.', icon: CheckCircle2 },
  ];
  const activeReviewStepIndex = reviewSteps.findIndex((step) => step.id === reviewStep);
  const selectedStepMeta = reviewSteps[activeReviewStepIndex] || reviewSteps[0];

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.18),transparent_35%),rgba(15,23,42,0.68)] px-4 py-6 backdrop-blur-md sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-full w-full max-w-[min(100vw-2rem,1760px)] items-center justify-center">
        <div className="flex max-h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-[36px] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.95))] shadow-[0_40px_120px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200/80 px-6 py-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <span>Dashboard</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>Review</span>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-slate-700">{selectedStepMeta.label}</span>
                </div>
                <h2 className="mt-3 text-3xl font-semibold text-slate-900">{sheetRow.topic}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Move through the draft in order: set the base, refine what needs help, then approve the final package.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Sheet variants: {sheetVariants.length}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${editorDirty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  Draft: {editorDirty ? 'edited locally' : 'clean'}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${previewReadyCount ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'}`}>
                  Previews: {previewReadyCount ? `${previewReadyCount} ready` : 'none'}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  Model: {googleModel}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {reviewSteps.map((step, index) => {
                const Icon = step.icon;
                const selected = reviewStep === step.id;
                const completed = activeReviewStepIndex > index;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setReviewStep(step.id)}
                    className={`rounded-[24px] border px-4 py-4 text-left transition-all ${selected ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : completed ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${selected ? 'bg-white/12 text-white' : completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${selected ? 'text-slate-300' : completed ? 'text-emerald-700/70' : 'text-slate-400'}`}>
                        Step {index + 1}
                      </span>
                    </div>
                    <p className="mt-4 text-lg font-semibold">{step.label}</p>
                    <p className={`mt-1 text-sm leading-6 ${selected ? 'text-slate-200' : completed ? 'text-emerald-800/85' : 'text-slate-500'}`}>
                      {step.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid flex-1 gap-0 overflow-y-auto xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
            <section className="min-h-0 space-y-5 overflow-y-auto border-b border-slate-200/80 px-6 py-6 xl:border-b-0 xl:border-r">
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

              <section className="rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Current draft</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">Live preview of the working copy</h3>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Image: {selectedImageUrl ? 'attached' : 'not selected'}
                  </div>
                </div>
                <div className="mt-5">
                  <LinkedInPostPreview
                    optionNumber={1}
                    text={editorText}
                    imageUrl={selectedImageUrl}
                    selected
                    expanded
                    onSelect={() => undefined}
                    onToggleExpanded={() => undefined}
                  />
                </div>
              </section>
            </section>

            <aside className="min-h-0 overflow-y-auto px-6 py-6">
              <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <Layers3 className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Step workspace</p>
                </div>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">{selectedStepMeta.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selectedStepMeta.description}</p>
              </section>

              <div className="mt-5 space-y-5">
                {reviewStep === 'draft' ? (
                  <>
                    <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Choose base draft</p>
                      <h4 className="mt-2 text-lg font-semibold text-slate-900">Start from an existing sheet variant</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Loading a saved variant resets the local working copy, selection, and preview state.
                      </p>
                      <div className="mt-4 space-y-3">
                        {sheetVariants.length === 0 ? (
                          <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                            No saved variants yet. Keep editing the current draft or generate previews in Step 2.
                          </div>
                        ) : sheetVariants.map((variant, index) => (
                          <button
                            key={`sheet-variant-${index}`}
                            type="button"
                            onClick={() => handleLoadSheetVariant(index)}
                            className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Variant {index + 1}</p>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Use as base</span>
                            </div>
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">{variant.text}</p>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">What to do here</p>
                      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                        <p>Shape the copy in the editor until the structure is right.</p>
                        <p>Select a sentence only when you want Step 2 to target a narrow section.</p>
                        <p>Move to Refine once the core argument is strong and you need alternate phrasing or new media.</p>
                      </div>
                    </section>
                  </>
                ) : null}

                {reviewStep === 'refine' ? (
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

                    <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-700">
                        <ImageIcon className="h-4 w-4" />
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Media</p>
                      </div>
                      <div className="mt-4">
                        <ImageAssetManager
                          topic={sheetRow.topic}
                          images={imageOptions}
                          selectedImageUrl={selectedImageUrl}
                          onSelectImage={setSelectedImageUrl}
                          onFetchMoreImages={handleFetchMoreImageOptions}
                          onUploadImage={handleUploadImageOption}
                          onDownloadImage={onDownloadImage}
                        />
                      </div>
                    </section>

                    <RulesPanel sharedRules={sharedRules} />
                  </>
                ) : null}

                {reviewStep === 'approve' ? (
                  <>
                    <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-700">
                        <CalendarClock className="h-4 w-4" />
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Approval ready</p>
                      </div>
                      <h4 className="mt-3 text-lg font-semibold text-slate-900">Final checks before approval</h4>
                      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                        <p>Approved text will be saved from the live editor, not from preview cards.</p>
                        <p>Selected image: <span className="font-semibold text-slate-900">{selectedImageUrl ? 'attached' : 'none selected'}</span></p>
                        <p>Variant persistence: <span className="font-semibold text-slate-900">{saveState === 'saved' ? 'saved to Sheets' : hasUnsavedReviewState ? 'local review state present' : 'no unsaved preview state'}</span></p>
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
                      <label className="block text-sm font-semibold text-slate-700" htmlFor="review-post-time-input">
                        Post time (optional)
                      </label>
                      <input
                        id="review-post-time-input"
                        type="datetime-local"
                        value={postTime}
                        onChange={(event) => setPostTime(event.target.value)}
                        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/20"
                      />
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Approval saves the current draft, selected image, and optional schedule. Preview variants stay separate until you save them.
                      </p>
                    </section>
                  </>
                ) : null}
              </div>
            </aside>
          </div>

          <div className="border-t border-slate-200/80 bg-white/95 px-6 py-5 backdrop-blur-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Step {activeReviewStepIndex + 1} of {reviewSteps.length}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {reviewStep === 'draft' ? 'Set the base copy and selection target.' : reviewStep === 'refine' ? 'Generate previews, compare, save variants, and lock the image.' : 'Review the final package and approve when ready.'}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setReviewStep(reviewSteps[Math.max(0, activeReviewStepIndex - 1)]?.id || 'draft')}
                  disabled={activeReviewStepIndex === 0}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>
                {activeReviewStepIndex < reviewSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setReviewStep(reviewSteps[Math.min(reviewSteps.length - 1, activeReviewStepIndex + 1)]?.id || 'approve')}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Continue to {reviewSteps[activeReviewStepIndex + 1]?.label}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleApprove()}
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    {submitting ? 'Approving...' : 'Approve draft'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (hasUnsavedReviewState) {
                      setPendingClose(true);
                      return;
                    }
                    onCancel();
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
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