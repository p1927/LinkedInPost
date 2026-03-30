import { useCallback, useEffect, useRef, useState } from 'react';
import { type ReviewFlowProviderProps } from './types';
import { type GenerationRequest, isAuthErrorMessage } from '../../../services/backendApi';
import { useAlert } from '../../../components/AlertProvider';
import { applyFormattingAction } from '@/features/draft-selection-target';
import { rowMatchesPendingScheduledPublish } from '@/features/scheduled-publish';
import { mergeUniqueImageOptions } from './utils';
import { type ImageAssetOption } from '../../../components/ImageAssetManager';
import { MAX_IMAGES_PER_POST, serializeRowImageUrls } from '../../../services/selectedImageUrls';

export function useReviewFlowActions(
  props: ReviewFlowProviderProps,
  state: ReturnType<typeof import('./useReviewFlowState').useReviewFlowState>
) {
  const {
    onApprove,
    onPublishNow,
    onSaveEmailFields,
    onGenerateQuickChange,
    onGenerateVariants,
    onSaveVariants,
    onFetchMoreImages,
    onPromoteRemoteImage,
    onUploadImage,
    onCancel,
    routed,
    googleModel,
    onSaveTopicGenerationRules,
    pendingScheduledPublish,
    deliveryChannel,
  } = props;

  const {
    sheetRow, setSheetRow,
    editorText, setEditorText,
    submitting,
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
    selectedImageUrls,
    setSelectedImageUrls,
    suppressAutoImageSelection,
    setSuppressAutoImageSelection,
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
    aiRefineBlocked,
    aiRefineBlockedReason,
    currentTargetText,
    hasUnsavedReviewState,
    pickCarouselIndex,
    setChrome
  } = state;

  const { showAlert } = useAlert();
  const [publishSubmitting, setPublishSubmitting] = useState(false);
  const [imagePromoteOptionId, setImagePromoteOptionId] = useState('');

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
        compareState !== null ||
        submitting ||
        publishSubmitting
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
    submitting,
    publishSubmitting,
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
      setSuppressAutoImageSelection(false);
      setSelectedImageUrls([variant.imageUrl]);
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
    setSelectedImageUrls,
    setSuppressAutoImageSelection,
    setEditorVariantIndex,
    setReviewPhase
  ]);

  const handleGenerateQuickChange = async () => {
    if (aiRefineBlocked) {
      void showAlert({ title: 'Notice', description: aiRefineBlockedReason });
      return;
    }

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
    if (aiRefineBlocked) {
      void showAlert({ title: 'Notice', description: aiRefineBlockedReason });
      return;
    }

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

  const handleFetchMoreImageOptions = async (searchQuery?: string) => {
    const nextImageUrls = await onFetchMoreImages(searchQuery);
    const nextOptions = nextImageUrls.map((imageUrl, index) => ({
      id: `alternate-${Date.now()}-${index}`,
      imageUrl,
      label: `Result ${index + 1}`,
      kind: 'alternate' as const,
      originalIndex: index,
      pendingCloudUpload: true as const,
    }));

    const dedupedAlternates = mergeUniqueImageOptions([
      ...nextOptions,
      ...alternateImageOptions.filter((option) => option.kind === 'alternate'),
    ]).slice(0, Math.max(nextOptions.length, 4));
    setAlternateImageOptions(dedupedAlternates);
    if (dedupedAlternates[0]?.imageUrl && !suppressAutoImageSelection && selectedImageUrls.length === 0) {
      setSelectedImageUrls([dedupedAlternates[0].imageUrl]);
    }
  };

  const promoteAlternateOption = async (option: ImageAssetOption): Promise<string> => {
    const gcsUrl = await onPromoteRemoteImage(option.imageUrl);
    setAlternateImageOptions((prev) =>
      prev.map((o) =>
        o.id === option.id ? { ...o, imageUrl: gcsUrl, pendingCloudUpload: false } : o,
      ),
    );
    return gcsUrl;
  };

  const handleClearSelectedImage = useCallback(() => {
    setSuppressAutoImageSelection(true);
    setSelectedImageUrls([]);
  }, [setSelectedImageUrls, setSuppressAutoImageSelection]);

  const handleSelectImageOption = async (option: ImageAssetOption) => {
    setSuppressAutoImageSelection(false);
    let url = option.imageUrl;
    if (option.pendingCloudUpload) {
      setImagePromoteOptionId(option.id);
      try {
        url = await promoteAlternateOption(option);
      } catch (error) {
        console.error(error);
        void showAlert({
          title: 'Could not save image',
          description: error instanceof Error ? error.message : 'Failed to copy the image to workspace storage.',
        });
        return;
      } finally {
        setImagePromoteOptionId('');
      }
    }

    setSelectedImageUrls((prev) => {
      const idx = prev.indexOf(url);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      if (prev.length >= MAX_IMAGES_PER_POST) {
        return prev;
      }
      return [...prev, url];
    });
  };

  const ensureSelectedImagesStored = async (): Promise<string[]> => {
    const urls = [...selectedImageUrls];
    const next = [...urls];
    for (let i = 0; i < next.length; i += 1) {
      const url = next[i]!;
      const pendingAlt = alternateImageOptions.find((o) => o.imageUrl === url && o.pendingCloudUpload);
      if (!pendingAlt) {
        continue;
      }
      setImagePromoteOptionId(pendingAlt.id);
      try {
        next[i] = await promoteAlternateOption(pendingAlt);
      } finally {
        setImagePromoteOptionId('');
      }
    }
    setSelectedImageUrls(next);
    return next;
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
    setSuppressAutoImageSelection(false);
    setSelectedImageUrls((prev) =>
      prev.length >= MAX_IMAGES_PER_POST ? prev : prev.includes(imageUrl) ? prev : [...prev, imageUrl],
    );
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

      const urlsForSheet = await ensureSelectedImagesStored();
      const { selectedImageId, selectedImageUrlsJson } = serializeRowImageUrls(urlsForSheet);
      await onApprove(
        editorText.trim(),
        selectedImageId,
        formattedTime,
        emailTo,
        emailCc,
        emailBcc,
        emailSubject,
        selectedImageUrlsJson,
      );
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

  const handlePublishNow = async () => {
    if (!(editorText || '').trim()) {
      void showAlert({ title: 'Notice', description: 'Post text cannot be empty.' });
      return;
    }

    if (
      rowMatchesPendingScheduledPublish(
        { topic: sheetRow.topic, date: sheetRow.date, postTime },
        pendingScheduledPublish ?? null,
        deliveryChannel,
      )
    ) {
      void showAlert({
        title: 'Notice',
        description:
          'This topic is already queued for that scheduled time. Cancel in the banner or delivery panel, or change the schedule before publishing again.',
      });
      return;
    }

    setPublishSubmitting(true);
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

      const urlsForPublish = await ensureSelectedImagesStored();
      const { selectedImageId, selectedImageUrlsJson } = serializeRowImageUrls(urlsForPublish);
      await onPublishNow(
        editorText.trim(),
        selectedImageId,
        formattedTime,
        emailTo,
        emailCc,
        emailBcc,
        emailSubject,
        selectedImageUrlsJson,
      );
    } catch (error) {
      console.error('Publish failed:', error);
      void showAlert({
        title: 'Publish Failed',
        description: error instanceof Error ? error.message : 'An error occurred while publishing. Please try again.',
      });
    } finally {
      setPublishSubmitting(false);
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

  const [savingEmailFields, setSavingEmailFields] = useState(false);
  const saveEmailFieldsInFlight = useRef(false);

  const handleSaveEmailFields = useCallback(async () => {
    if (saveEmailFieldsInFlight.current) return;
    saveEmailFieldsInFlight.current = true;
    setSavingEmailFields(true);
    try {
      await onSaveEmailFields(
        emailTo,
        emailCc,
        emailBcc,
        emailSubject,
      );
      void showAlert({ title: 'Saved', description: 'Email settings saved to this topic.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save email settings.';
      void showAlert({ title: 'Could not save', description: message });
    } finally {
      saveEmailFieldsInFlight.current = false;
      setSavingEmailFields(false);
    }
  }, [onSaveEmailFields, emailTo, emailCc, emailBcc, emailSubject, showAlert]);

  const [savingTopicRules, setSavingTopicRules] = useState(false);
  const saveTopicRulesInFlight = useRef(false);

  const handleSaveTopicRules = useCallback(
    async (rules: string) => {
      if (saveTopicRulesInFlight.current) return;
      saveTopicRulesInFlight.current = true;
      setSavingTopicRules(true);
      try {
        const nextRow = await onSaveTopicGenerationRules(sheetRow, rules);
        setSheetRow(nextRow);
        void showAlert({ title: 'Saved', description: 'Topic rules were saved to the sheet.' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save topic rules.';
        console.error(error);
        if (isAuthErrorMessage(message)) {
          void showAlert({ title: 'Session expired', description: 'Sign in again to continue.' });
          return;
        }
        void showAlert({ title: 'Could not save', description: message });
      } finally {
        saveTopicRulesInFlight.current = false;
        setSavingTopicRules(false);
      }
    },
    [onSaveTopicGenerationRules, sheetRow, setSheetRow, showAlert],
  );

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
    handleSelectImageOption,
    handleClearSelectedImage,
    imagePromoteOptionId,
    handleUploadImageOption,
    handleApprove,
    handlePublishNow,
    publishSubmitting,
    handleLoadSheetVariant,
    handleOpenMediaFromPickTile,
    changePickCarouselBy,
    handlePickCarouselKeyDown,
    handleFormatting,
    handleSaveTopicRules,
    savingTopicRules,
    handleSaveEmailFields,
    savingEmailFields,
  };
}
