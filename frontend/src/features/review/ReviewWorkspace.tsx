import { ArrowLeft, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [pickCarouselIndex, setPickCarouselIndex] = useState(0);
  const topicHeadingRef = useRef<HTMLHeadingElement>(null);
  const pickCarouselNavAtRef = useRef(0);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

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
    setPickCarouselIndex(0);
  }, [row]);

  const sheetVariants = useMemo(() => buildSheetVariants(sheetRow), [sheetRow]);

  useEffect(() => {
    setPickCarouselIndex((index) =>
      sheetVariants.length === 0 ? 0 : Math.min(index, sheetVariants.length - 1),
    );
  }, [sheetVariants.length]);
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

  const requestClose = useCallback(() => {
    if (hasUnsavedReviewState) {
      setPendingClose(true);
      return;
    }
    onCancel();
  }, [hasUnsavedReviewState, onCancel]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (pendingClose || pendingVariantIndex !== null || compareState !== null) {
        return;
      }
      event.preventDefault();
      requestClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [compareState, pendingClose, pendingVariantIndex, requestClose]);

  useEffect(() => {
    topicHeadingRef.current?.focus();
  }, [row]);

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

  const changePickCarouselBy = useCallback(
    (direction: -1 | 1) => {
      if (sheetVariants.length <= 1) {
        return;
      }
      setPickCarouselIndex((index) =>
        Math.max(0, Math.min(sheetVariants.length - 1, index + direction)),
      );
    },
    [sheetVariants.length],
  );

  const handlePickCarouselWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (sheetVariants.length <= 1) {
        return;
      }

      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 24) {
        return;
      }

      event.preventDefault();
      const now = Date.now();
      if (now - pickCarouselNavAtRef.current < 380) {
        return;
      }
      pickCarouselNavAtRef.current = now;
      changePickCarouselBy(delta > 0 ? 1 : -1);
    },
    [changePickCarouselBy, sheetVariants.length],
  );

  const handlePickCarouselKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        changePickCarouselBy(1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        changePickCarouselBy(-1);
      }
    },
    [changePickCarouselBy],
  );

  const handleFormatting = (action: 'tighten-spacing' | 'bulletize' | 'emphasize') => {
    const nextState = applyFormattingAction(editorText, effectiveScope, selection, action);
    setEditorText(nextState.value);
    setSelection(nextState.selection);
  };

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-ink/60 via-ink/48 to-ink/55 backdrop-blur-md motion-safe:transition-colors">
      <div
        className="flex min-h-[100dvh] min-w-full items-center justify-center px-3 py-5 sm:px-6 sm:py-8"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            requestClose();
          }
        }}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-workspace-title"
          aria-describedby="review-workspace-desc"
          className="glass-panel-strong flex max-h-[calc(100dvh-3rem)] w-full max-w-[min(100vw-1.5rem,1760px)] flex-col overflow-hidden rounded-3xl border border-white/55 shadow-2xl shadow-ink/20 ring-1 ring-white/45 outline-none transition-[box-shadow,transform] duration-200 motion-safe:transition-shadow focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          tabIndex={-1}
        >
          <p id="review-workspace-desc" className="sr-only">
            Pick a variant, refine, then approve.
          </p>
          <div className="shrink-0 border-b border-white/50 bg-white/60 px-4 py-4 backdrop-blur-xl sm:py-3.5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                {reviewPhase === 'edit' && sheetVariants.length > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setReviewPhase('pick-variant')}
                    aria-label="Back to variants"
                    className="min-h-[44px] shrink-0 gap-1.5 px-3 sm:mt-0.5 sm:min-h-[40px]"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="whitespace-nowrap">Back</span>
                  </Button>
                ) : null}
                <div className="min-w-0 flex-1">
                  {sheetVariants.length > 0 ? (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">
                      {showPickPhase ? 'Choose variant' : 'Refine'}
                    </p>
                  ) : (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Review</p>
                  )}
                  <h2
                    id="review-workspace-title"
                    ref={topicHeadingRef}
                    tabIndex={-1}
                    className={cn(
                      'mt-0.5 text-sm font-medium leading-snug text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80',
                      !topicExpanded && topicIsLong && 'line-clamp-3',
                    )}
                  >
                    {sheetRow.topic}
                  </h2>
                  {topicIsLong ? (
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setTopicExpanded((v) => !v)}
                      className="mt-1 text-left text-[11px] font-semibold"
                    >
                      {topicExpanded ? 'Show less' : 'Show full topic'}
                    </Button>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="neutral" size="xs" className="normal-case">
                      {getChannelLabel(deliveryChannel)}
                    </Badge>
                    {sheetVariants.length > 0 ? (
                      <Badge variant="neutral" size="xs" className="normal-case">
                        {sheetVariants.length} variant{sheetVariants.length === 1 ? '' : 's'}
                      </Badge>
                    ) : null}
                    {reviewPhase === 'edit' && sheetVariants.length > 0 ? (
                      <Badge variant="info" size="xs" className="normal-case">
                        Editing
                      </Badge>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      className="size-7 min-h-7 min-w-7 rounded-full border-violet-200/60 bg-white/70 p-0 text-muted hover:border-primary/40 hover:text-primary"
                      title={`Generation model: ${googleModel}`}
                      aria-label={`Generation model: ${googleModel}`}
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden />
                    </Button>
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
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
                {!showPickPhase ? (
                  <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:max-w-[240px]">
                    <label
                      htmlFor="review-post-time-input"
                      className="text-[10px] font-semibold uppercase tracking-wider text-ink/75"
                    >
                      Schedule{' '}
                      <span className="font-normal normal-case tracking-normal text-ink/65">(optional)</span>
                    </label>
                    <Input
                      id="review-post-time-input"
                      type="datetime-local"
                      value={postTime}
                      onChange={(event) => setPostTime(event.target.value)}
                      aria-label="Schedule post time (optional)"
                      className={cn(
                        'min-h-[44px] w-full min-w-0 rounded-xl border border-violet-200/60 bg-white/90 px-3 py-2 text-xs font-semibold text-ink shadow-sm outline-none backdrop-blur-md transition-[border-color,box-shadow] duration-200',
                        'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white/90 sm:w-[220px]',
                      )}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {reviewPhase === 'pick-variant' && sheetVariants.length > 0 ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-5">
              <div className="flex shrink-0 items-center justify-end gap-2">
                <p className="mr-auto text-xs font-semibold tabular-nums text-ink/70">
                  {pickCarouselIndex + 1}
                  <span className="font-medium text-ink/50"> / {sheetVariants.length}</span>
                </p>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="size-9 rounded-full border-violet-200/60 bg-white/80 shadow-sm"
                    aria-label="Previous variant"
                    disabled={pickCarouselIndex === 0}
                    onClick={() => changePickCarouselBy(-1)}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="size-9 rounded-full border-violet-200/60 bg-white/80 shadow-sm"
                    aria-label="Next variant"
                    disabled={pickCarouselIndex === sheetVariants.length - 1}
                    onClick={() => changePickCarouselBy(1)}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>

              <div
                className="relative mt-4 flex min-h-[min(44vh,520px)] flex-1 flex-col sm:min-h-[min(48vh,560px)]"
                role="region"
                aria-roledescription="carousel"
                aria-label="Variants"
              >
                <div
                  className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/50 bg-white/25 shadow-inner backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                  onWheel={handlePickCarouselWheel}
                  onKeyDown={handlePickCarouselKeyDown}
                  tabIndex={0}
                >
                  <div
                    className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      width: `${sheetVariants.length * 100}%`,
                      transform: `translateX(-${(100 / sheetVariants.length) * pickCarouselIndex}%)`,
                    }}
                  >
                    {sheetVariants.map((variant, index) => (
                      <div
                        key={`sheet-variant-${variant.originalIndex}`}
                        className="flex h-full min-h-[260px] flex-shrink-0 flex-col px-1 sm:min-h-[280px] sm:px-2"
                        style={{ width: `${100 / sheetVariants.length}%` }}
                        aria-hidden={index !== pickCarouselIndex}
                      >
                        <LinkedInPostPreview
                          optionNumber={index + 1}
                          text={variant.text}
                          imageUrl={variant.imageUrl || undefined}
                          selected={index === pickCarouselIndex}
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

                <div
                  className="mt-3 flex justify-center gap-2"
                  role="tablist"
                  aria-label="Jump to variant"
                >
                  {sheetVariants.map((variant, index) => {
                    const active = index === pickCarouselIndex;
                    return (
                      <Button
                        key={`pick-dot-${variant.originalIndex}`}
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        role="tab"
                        aria-selected={active}
                        aria-label={`Variant ${index + 1}`}
                        onClick={() => setPickCarouselIndex(index)}
                        className={cn(
                          'size-2.5 min-h-0 min-w-0 rounded-full p-0 transition-colors duration-200',
                          active
                            ? 'scale-110 bg-primary shadow-sm ring-2 ring-primary/25'
                            : 'bg-ink/20 hover:bg-ink/35',
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {reviewPhase === 'edit' || sheetVariants.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:grid xl:min-h-0 xl:grid-cols-[minmax(220px,0.26fr)_minmax(0,1fr)_minmax(200px,0.3fr)] xl:gap-0 xl:overflow-hidden">
              <aside className="order-2 min-h-0 border-b border-white/45 bg-white/20 px-3 py-3 backdrop-blur-md xl:order-none xl:max-h-full xl:border-b-0 xl:border-r xl:border-white/45 xl:overflow-y-auto">
                <div
                  className="glass-panel grid grid-cols-3 gap-1 rounded-xl border border-white/40 p-0.5 shadow-sm"
                  role="tablist"
                  aria-label="Review workspace panels"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="inline"
                    role="tab"
                    aria-selected={activeWorkspacePanel === 'refine'}
                    onClick={() => setActiveWorkspacePanel('refine')}
                    className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 ${activeWorkspacePanel === 'refine' ? 'bg-white/80 text-ink shadow-sm ring-1 ring-violet-200/65' : 'text-muted hover:bg-white/50'}`}
                  >
                    Refine
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="inline"
                    role="tab"
                    aria-selected={activeWorkspacePanel === 'media'}
                    onClick={() => setActiveWorkspacePanel('media')}
                    className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 ${activeWorkspacePanel === 'media' ? 'bg-white/80 text-ink shadow-sm ring-1 ring-violet-200/65' : 'text-muted hover:bg-white/50'}`}
                  >
                    Media
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="inline"
                    role="tab"
                    aria-selected={activeWorkspacePanel === 'rules'}
                    onClick={() => setActiveWorkspacePanel('rules')}
                    className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 ${activeWorkspacePanel === 'rules' ? 'bg-white/80 text-ink shadow-sm ring-1 ring-violet-200/65' : 'text-muted hover:bg-white/50'}`}
                  >
                    Rules
                  </Button>
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

              <section className="order-1 flex min-h-0 flex-col overflow-y-auto border-b border-white/45 bg-white/10 px-3 py-3 xl:order-none xl:h-full xl:max-h-full xl:overflow-hidden xl:border-b-0 xl:border-r xl:border-white/45">
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

              <aside className="order-3 min-h-0 overflow-y-auto bg-white/15 px-2 py-3 xl:order-none xl:max-h-full xl:overflow-y-auto">
                <div className="sticky top-0 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 px-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/65">Live preview</p>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="neutral" size="xs" className="normal-case">
                        {selectedImageUrl ? 'Image' : 'Text only'}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="inline"
                        onClick={() => setPreviewCollapsed((c) => !c)}
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-white/55 hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-primary/35"
                      >
                        {previewCollapsed ? 'Show' : 'Hide'}
                      </Button>
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

          <footer className="shrink-0 border-t border-white/50 bg-white/70 px-4 py-3.5 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 sm:px-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={requestClose}
                className="min-h-[44px] w-full cursor-pointer sm:w-auto sm:min-w-[7.5rem]"
              >
                {showPickPhase ? 'Close' : 'Cancel'}
              </Button>
              {!showPickPhase ? (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => void handleApprove()}
                  disabled={submitting}
                  className="min-h-[44px] w-full cursor-pointer shadow-[0_6px_20px_rgba(124,58,237,0.28)] transition-[box-shadow,opacity] duration-200 hover:shadow-[0_10px_28px_rgba(109,40,217,0.32)] sm:w-auto sm:min-w-[9rem]"
                >
                  {submitting ? 'Approving…' : 'Approve draft'}
                </Button>
              ) : null}
            </div>
          </footer>
        </div>
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
    </>
  );
}
