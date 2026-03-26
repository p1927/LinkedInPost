import { useState, useMemo, useEffect, useRef } from 'react';
import { type ReviewFlowProviderProps, type CompareState } from './types';
import { getInitialEditorText, buildSheetVariants, buildGeneratedImages } from './utils';
import { type GenerationScope, type TextSelectionRange, type QuickChangePreviewResult, type VariantsPreviewResponse } from '../../../services/backendApi';
import { type ImageAssetOption } from '../../../components/ImageAssetManager';
import { getVariantSlotContent } from '../../topic-navigation/utils/topicRoute';
import { getEffectiveScope, getTargetText } from '../../editor/selection';
import { useWorkspaceChrome, useRegisterUnsavedChanges } from '../../../components/workspace/WorkspaceChromeContext';

export function useReviewFlowState(props: ReviewFlowProviderProps) {
  const { row, routed, editorStartMediaPanel } = props;
  const { setChrome } = useWorkspaceChrome();

  const [sheetRow, setSheetRow] = useState(row);
  const [editorText, setEditorText] = useState(getInitialEditorText(row));
  const [editorBaselineText, setEditorBaselineText] = useState(getInitialEditorText(row));
  const [selection, setSelection] = useState<TextSelectionRange | null>(null);
  const [scope, setScope] = useState<GenerationScope>('whole-post');
  const [instruction, setInstruction] = useState('');
  const [generationLoading, setGenerationLoading] = useState<'quick-change' | 'variants' | null>(null);
  const [quickChangePreview, setQuickChangePreview] = useState<QuickChangePreviewResult | null>(null);
  const [variantsPreview, setVariantsPreview] = useState<VariantsPreviewResponse | null>(null);
  const [previewVariantSaveByIndex, setPreviewVariantSaveByIndex] = useState<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [previewVariantSaveErrors, setPreviewVariantSaveErrors] = useState<Record<number, string>>({});
  const [postTime, setPostTime] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState(row.selectedImageId || row.imageLink1 || '');
  const [alternateImageOptions, setAlternateImageOptions] = useState<ImageAssetOption[]>([]);
  const [uploadedImageOptions, setUploadedImageOptions] = useState<ImageAssetOption[]>([]);
  const [pendingVariantIndex, setPendingVariantIndex] = useState<number | null>(null);
  const [openMediaAfterVariantConfirm, setOpenMediaAfterVariantConfirm] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [pendingNavigateToVariants, setPendingNavigateToVariants] = useState(false);
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
  const lastInitRef = useRef<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSheetRow(row);

    const initKey = `${row.topic}:${routed?.screen}:${routed?.editorVariantSlot}:${editorStartMediaPanel}`;
    if (lastInitRef.current === initKey) {
      return;
    }
    lastInitRef.current = initKey;

    setSelection(null);
    setScope('whole-post');
    setInstruction('');
    setGenerationLoading(null);
    setQuickChangePreview(null);
    setVariantsPreview(null);
    setPreviewVariantSaveByIndex({});
    setPreviewVariantSaveErrors({});
    setAlternateImageOptions([]);
    setUploadedImageOptions([]);
    setPendingVariantIndex(null);
    setOpenMediaAfterVariantConfirm(false);
    setPendingClose(false);
    setPendingNavigateToVariants(false);
    setCompareState(null);
    setTopicExpanded(false);
    setPreviewCollapsed(false);
    setPickCarouselIndex(0);

    if (routed?.screen === 'editor') {
      const sc = getVariantSlotContent(row, routed.editorVariantSlot);
      const textForEditor = sc?.text.trim() ? sc.text : getInitialEditorText(row);
      setEditorText(textForEditor);
      setEditorBaselineText(textForEditor);
      setPostTime('');
      setSelectedImageUrl(
        (sc?.imageUrl?.trim() ? sc.imageUrl : '') || row.selectedImageId || row.imageLink1 || '',
      );
      setReviewPhase('edit');
      setActiveWorkspacePanel(editorStartMediaPanel ? 'media' : 'refine');
      return;
    }

    const initialText = getInitialEditorText(row);
    setEditorText(initialText);
    setEditorBaselineText(initialText);
    setPostTime('');
    setSelectedImageUrl(row.selectedImageId || row.imageLink1 || '');
    setReviewPhase(
      routed?.screen === 'variants'
        ? 'pick-variant'
        : buildSheetVariants(row).length > 0
          ? 'pick-variant'
          : 'edit',
    );
    setActiveWorkspacePanel('refine');
  }, [row, routed?.screen, routed?.editorVariantSlot, editorStartMediaPanel]);

  const sheetVariants = useMemo(() => buildSheetVariants(sheetRow), [sheetRow]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPickCarouselIndex((index) =>
      sheetVariants.length === 0 ? 0 : Math.min(index, sheetVariants.length - 1),
    );
  }, [sheetVariants.length]);

  const showPickPhase =
    sheetVariants.length > 0 && (routed ? routed.screen === 'variants' : reviewPhase === 'pick-variant');
  const showEditorLayout =
    sheetVariants.length === 0 || (routed ? routed.screen === 'editor' : reviewPhase === 'edit');
  const topicTitleInWorkspaceChrome = Boolean(routed);
  const topicIsLong = (sheetRow.topic || '').length > 140 || (sheetRow.topic || '').split('\n').length > 2;
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

  useRegisterUnsavedChanges(hasUnsavedReviewState);

  useEffect(() => {
    if (!hasUnsavedReviewState) return;

    window.history.pushState({ trap: true }, '');

    const handlePopState = () => {
      window.history.pushState({ trap: true }, '');
      
      if (routed?.screen === 'editor' && sheetVariants.length > 0) {
        setPendingNavigateToVariants(true);
      } else {
        setPendingClose(true);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.trap) {
        window.history.back();
      }
    };
  }, [hasUnsavedReviewState, routed?.screen, sheetVariants.length]);

  useEffect(() => {
    topicHeadingRef.current?.focus();
  }, [row]);

  useEffect(() => {
    if (!selectedImageUrl && imageOptions[0]?.imageUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedImageUrl(imageOptions[0].imageUrl);
      return;
    }

    if (selectedImageUrl && !imageOptions.some((option) => option.imageUrl === selectedImageUrl)) {
      setSelectedImageUrl(imageOptions[0]?.imageUrl || '');
    }
  }, [imageOptions, selectedImageUrl]);

  return {
    sheetRow, setSheetRow,
    editorText, setEditorText,
    editorBaselineText, setEditorBaselineText,
    selection, setSelection,
    scope, setScope,
    instruction, setInstruction,
    generationLoading, setGenerationLoading,
    quickChangePreview, setQuickChangePreview,
    variantsPreview, setVariantsPreview,
    previewVariantSaveByIndex, setPreviewVariantSaveByIndex,
    previewVariantSaveErrors, setPreviewVariantSaveErrors,
    postTime, setPostTime,
    selectedImageUrl, setSelectedImageUrl,
    alternateImageOptions, setAlternateImageOptions,
    uploadedImageOptions, setUploadedImageOptions,
    pendingVariantIndex, setPendingVariantIndex,
    openMediaAfterVariantConfirm, setOpenMediaAfterVariantConfirm,
    pendingClose, setPendingClose,
    pendingNavigateToVariants, setPendingNavigateToVariants,
    compareState, setCompareState,
    submitting, setSubmitting,
    activeWorkspacePanel, setActiveWorkspacePanel,
    reviewPhase, setReviewPhase,
    topicExpanded, setTopicExpanded,
    previewCollapsed, setPreviewCollapsed,
    pickCarouselIndex, setPickCarouselIndex,
    sheetVariants,
    showPickPhase,
    showEditorLayout,
    topicTitleInWorkspaceChrome,
    topicIsLong,
    generatedImageOptions,
    imageOptions,
    effectiveScope,
    currentTargetText,
    editorDirty,
    hasUnsavedReviewState,
    previewReadyCount,
    topicHeadingRef,
    setChrome
  };
}
