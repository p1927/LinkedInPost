import { useCallback, useEffect } from 'react';
import { type ReviewFlowProviderProps } from './types';
import { type GenerationRequest } from '../../../services/backendApi';
import { useAlert } from '../../../components/AlertProvider';
import { applyFormattingAction } from '../../editor/selection';
import { mergeUniqueImageOptions } from './utils';
import { type ImageAssetOption } from '../../../components/ImageAssetManager';

export function useReviewFlowActions(
  props: ReviewFlowProviderProps,
  state: ReturnType<typeof import('./useReviewFlowState').useReviewFlowState>
) {
  const {
    onApprove,
    onGenerateQuickChange,
    onGenerateVariants,
    onSaveVariants,
    onFetchMoreImages,
    onUploadImage,
    onCancel,
    routed,
    googleModel,
  } = props;

  const {
    sheetRow, setSheetRow,
    editorText, setEditorText,
    setEditorBaselineText,
    selection, setSelection,
    setScope,
    instruction, setInstruction,
    setGenerationLoading,
    quickChangePreview, setQuickChangePreview,
    variantsPreview, setVariantsPreview,
    setPreviewVariantSaveByIndex,
    setPreviewVariantSaveErrors,
    postTime,
    emailTo,
    emailCc,
    emailBcc,
    emailSubject,
    setSelectedImageUrl,
    alternateImageOptions, setAlternateImageOptions,
    setUploadedImageOptions,
    pendingVariantIndex, setPendingVariantIndex,
    setOpenMediaAfterVariantConfirm,
    pendingClose, setPendingClose,
    pendingNavigateToVariants, setPendingNavigateToVariants,
    compareState, setCompareState,
    setSubmitting,
    setActiveWorkspacePanel,
    setReviewPhase,
    setEditorVariantIndex,
    setPickCarouselIndex,
    sheetVariants,
    showPickPhase,
    showEditorLayout,
    effectiveScope,
    currentTargetText,
    hasUnsavedReviewState,
    pickCarouselIndex,
    setChrome
  } = state;

  const { showAlert } = useAlert();

  const requestClose = useCallback(() => {
    if (hasUnsavedReviewState) {
      setPendingClose(true);
      return;
    }
    onCancel();
  }, [hasUnsavedReviewState, onCancel, setPendingClose]);

  const leaveToTopics = useCallback(() => {
    if (showPickPhase && routed) {
      routed.onNavigateToTopics();
      return;
    }
    requestClose();
  }, [showPickPhase, routed, requestClose]);

  const requestNavigateToVariants = useCallback(() => {
    if (hasUnsavedReviewState) {
      setPendingNavigateToVariants(true);
      return;
    }
    if (routed) {
      routed.onNavigateToVariants();
    } else {
      setReviewPhase('pick-variant');
    }
  }, [hasUnsavedReviewState, routed, setPendingNavigateToVariants, setReviewPhase]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (
        pendingClose ||
        pendingNavigateToVariants ||
        pendingVariantIndex !== null ||
        compareState !== null
      ) {
        return;
      }
      event.preventDefault();
      if (routed?.screen === 'editor' && sheetVariants.length > 0) {
        requestNavigateToVariants();
        return;
      }
      leaveToTopics();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [
    compareState,
    pendingClose,
    pendingNavigateToVariants,
    pendingVariantIndex,
    leaveToTopics,
    requestNavigateToVariants,
    routed?.screen,
    sheetVariants.length,
  ]);

  const buildGenerationRequest = (): GenerationRequest => ({
    row: sheetRow,
    editorText,
    scope: effectiveScope,
    selection: effectiveScope === 'selection' ? selection : null,
    instruction,
    googleModel,
  });

  const applySheetVariantBase = useCallback((variant: { text: string; imageUrl: string }, variantIndex?: number) => {
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
    setEditorVariantIndex(variantIndex ?? null);
    setReviewPhase('edit');
  }, [
    setEditorText,
    setEditorBaselineText,
    setSelection,
    setScope,
    setInstruction,
    setQuickChangePreview,
    setVariantsPreview,
    setPreviewVariantSaveByIndex,
    setPreviewVariantSaveErrors,
    setSelectedImageUrl,
    setEditorVariantIndex,
    setReviewPhase
  ]);

  const handleGenerateQuickChange = async () => {
    if (!(editorText || '').trim()) {
      void showAlert({ title: 'Notice', description: 'Add or keep some draft text before generating a quick change.' });
      return;
    }

    if (!(instruction || '').trim()) {
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
    if (!(editorText || '').trim()) {
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
    if (!(editorText || '').trim()) {
      void showAlert({ title: 'Notice', description: 'Post text cannot be empty.' });
      return;
    }

    setSubmitting(true);
    try {
      let formattedTime = '';
      if (postTime) {
        const date = new Date(postTime);
        const yyyy = date.getUTCFullYear();
        const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(date.getUTCDate()).padStart(2, '0');
        const hh = String(date.getUTCHours()).padStart(2, '0');
        const min = String(date.getUTCMinutes()).padStart(2, '0');
        formattedTime = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      }

      await onApprove(editorText.trim(), state.selectedImageUrl, formattedTime, emailTo, emailCc, emailBcc, emailSubject);
    } catch (error) {
      console.error('Approval failed:', error);
      void showAlert({
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'An error occurred while approving the draft. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSheetVariant = useCallback(
    (index: number) => {
      const variant = sheetVariants[index];
      if (!variant) {
        return;
      }

      if (routed?.screen === 'variants') {
        routed.onNavigateToEditor(variant.originalIndex);
        return;
      }

      if (hasUnsavedReviewState) {
        setOpenMediaAfterVariantConfirm(false);
        setPendingVariantIndex(index);
        return;
      }

      applySheetVariantBase(variant, index);
    },
    [applySheetVariantBase, sheetVariants, routed, hasUnsavedReviewState, setOpenMediaAfterVariantConfirm, setPendingVariantIndex],
  );

  const handleOpenMediaFromPickTile = useCallback(
    (index: number) => {
      const variant = sheetVariants[index];
      if (!variant) {
        return;
      }

      if (routed?.screen === 'variants') {
        routed.onNavigateToEditor(variant.originalIndex, { openMedia: true });
        return;
      }

      if (hasUnsavedReviewState) {
        setOpenMediaAfterVariantConfirm(true);
        setPendingVariantIndex(index);
        return;
      }

      applySheetVariantBase(variant, index);
      setActiveWorkspacePanel('media');
    },
    [applySheetVariantBase, sheetVariants, routed, hasUnsavedReviewState, setOpenMediaAfterVariantConfirm, setPendingVariantIndex, setActiveWorkspacePanel],
  );

  useEffect(() => {
    if (!routed) {
      setChrome({ topicReviewHeader: null });
      return;
    }

    const t = sheetRow.topic.trim();
    const topicLabel = t.length > 48 ? `${t.slice(0, 45).trimEnd()}…` : t || 'Topic';

    setChrome({
      topicReviewHeader: {
        onBackToTopics: leaveToTopics,
        onBackToVariants:
          showEditorLayout && sheetVariants.length > 0 ? requestNavigateToVariants : undefined,
        crumbs: [
          { key: 'topics', label: 'Topics', onPress: leaveToTopics },
          { key: 'topic', label: topicLabel },
          {
            key: 'phase',
            label: showPickPhase ? 'Choose variant' : 'Refine',
            current: true,
          },
        ],
        pickToolbar: showPickPhase
          ? {
              onMedia: () => handleOpenMediaFromPickTile(pickCarouselIndex),
              onOpenEditor: () => handleLoadSheetVariant(pickCarouselIndex),
            }
          : null,
      },
    });
  }, [
    routed,
    sheetRow.topic,
    showPickPhase,
    showEditorLayout,
    sheetVariants.length,
    pickCarouselIndex,
    leaveToTopics,
    requestNavigateToVariants,
    handleLoadSheetVariant,
    handleOpenMediaFromPickTile,
    setChrome,
  ]);

  const changePickCarouselBy = useCallback(
    (direction: -1 | 1) => {
      if (sheetVariants.length <= 1) {
        return;
      }
      setPickCarouselIndex((index) =>
        Math.max(0, Math.min(sheetVariants.length - 1, index + direction)),
      );
    },
    [sheetVariants.length, setPickCarouselIndex],
  );

  const handlePickCarouselKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
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

  return {
    leaveToTopics,
    requestNavigateToVariants,
    applySheetVariantBase,
    handleGenerateQuickChange,
    handleGenerateVariants,
    openCompare,
    handleApplyQuickChange,
    handleApplyVariant,
    handleSavePreviewVariantAtIndex,
    handleFetchMoreImageOptions,
    handleUploadImageOption,
    handleApprove,
    handleLoadSheetVariant,
    handleOpenMediaFromPickTile,
    changePickCarouselBy,
    handlePickCarouselKeyDown,
    handleFormatting,
  };
}
