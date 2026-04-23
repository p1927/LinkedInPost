import { useCallback, useEffect, useRef, useState } from 'react';
import { type ReviewFlowProviderProps } from './types';
import type { LlmRef } from '../../../services/configService';
import { type GenerationRequest, isAuthErrorMessage } from '../../../services/backendApi';
import { useAlert } from '../../../components/useAlert';
import { applyFormattingAction } from '@/features/draft-selection-target';
import { rowMatchesPendingScheduledPublish } from '@/features/scheduled-publish';
import { mergeUniqueImageOptions, type SheetVariantForReview } from './utils';
import { type ImageAssetOption } from '../../../components/ImageAssetManager';
import { shouldPromoteImageUrlBeforeDelivery } from '../../../services/deliveryImageUrl';
import {
  DRAFT_IMAGE_SEARCH_CHOICE_COUNT,
  MAX_IMAGES_PER_POST,
  serializeRowImageUrls,
} from '../../../services/selectedImageUrls';
import { topicNeedsFullTooltip, truncateTopicForUi } from '../../../lib/topicDisplay';
import { FEATURE_MULTI_PROVIDER_LLM } from '../../../generated/features';

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
    onGenerateReferenceImage,
    onCancel,
    routed,
    googleModel,
    generationLlm,
    onSaveTopicGenerationRules,
    onSaveGenerationTemplateId,
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
    editorVariantIndex,
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
    setChrome,
    researchContextArticles,
  } = state;

  const { showAlert } = useAlert();
  const [publishSubmitting, setPublishSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const leaveToTopics = useCallback(() => {
    if (hasUnsavedReviewState) {
      setPendingClose(true);
      return;
    }
    if (showPickPhase && routed) {
      routed.onNavigateToTopics();
      return;
    }
    onCancel();
  }, [hasUnsavedReviewState, showPickPhase, routed, onCancel, setPendingClose]);

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
  ]);

  const buildGenerationRequest = (): GenerationRequest => {
    const { selectedImageId, selectedImageUrlsJson } = serializeRowImageUrls(selectedImageUrls);
    const base: GenerationRequest = {
      row: { ...sheetRow, selectedImageId, selectedImageUrlsJson },
      editorText,
      scope: effectiveScope,
      selection: effectiveScope === 'selection' ? selection : null,
      instruction,
      ...(researchContextArticles.length > 0 ? { researchArticles: researchContextArticles } : {}),
    };
    if (FEATURE_MULTI_PROVIDER_LLM && generationLlm) {
      base.llm = { provider: generationLlm.provider, model: generationLlm.model };
      if (generationLlm.provider === 'gemini') {
        base.googleModel = generationLlm.model;
      }
    } else {
      base.googleModel = googleModel;
    }
    return base;
  };

  const applySheetVariantBase = useCallback((variant: SheetVariantForReview, variantIndex?: number) => {
    setEditorText(variant.text);
    setEditorBaselineText(variant.text);
    setSelection(null);
    setScope('whole-post');
    setInstruction('');
    setQuickChangePreview(null);
    setVariantsPreview(null);
    setPreviewVariantSaveByIndex({});
    setPreviewVariantSaveErrors({});
    if (variant.imageUrls?.length) {
      setSuppressAutoImageSelection(false);
      setSelectedImageUrls(variant.imageUrls);
    } else if (variant.imageUrl) {
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
    if (!variant) {
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
    }));

    const dedupedAlternates = mergeUniqueImageOptions([
      ...nextOptions,
      ...alternateImageOptions.filter((option) => option.kind === 'alternate'),
    ]).slice(0, Math.max(nextOptions.length, DRAFT_IMAGE_SEARCH_CHOICE_COUNT));
    setAlternateImageOptions(dedupedAlternates);
    if (dedupedAlternates[0]?.imageUrl && !suppressAutoImageSelection && selectedImageUrls.length === 0) {
      setSelectedImageUrls([dedupedAlternates[0].imageUrl]);
    }
  };

  const handleClearSelectedImage = useCallback(() => {
    setSuppressAutoImageSelection(true);
    setSelectedImageUrls([]);
  }, [setSelectedImageUrls, setSuppressAutoImageSelection]);

  const handleSelectImageOption = (option: ImageAssetOption) => {
    const url = option.imageUrl;
    const idx = selectedImageUrls.indexOf(url);
    if (idx >= 0 && selectedImageUrls.length === 1) {
      setSuppressAutoImageSelection(true);
      setSelectedImageUrls([]);
      return;
    }
    setSuppressAutoImageSelection(false);
    setSelectedImageUrls((prev) => {
      const i = prev.indexOf(url);
      if (i >= 0) {
        return prev.filter((_, j) => j !== i);
      }
      if (prev.length >= MAX_IMAGES_PER_POST) {
        return prev;
      }
      return [...prev, url];
    });
  };

  const ensureSelectedImagesStored = async (): Promise<string[]> => {
    const urls = [...selectedImageUrls];
    const promotedBySource = new Map<string, string>();
    const next: string[] = [];
    const sourceToGcs = new Map<string, string>();

    for (const url of urls) {
      const trimmed = url.trim();
      if (!trimmed) {
        continue;
      }

      const already = promotedBySource.get(trimmed);
      if (already !== undefined) {
        next.push(already);
        continue;
      }

      if (!shouldPromoteImageUrlBeforeDelivery(trimmed)) {
        promotedBySource.set(trimmed, trimmed);
        next.push(trimmed);
        continue;
      }

      try {
        const gcsUrl = await onPromoteRemoteImage(trimmed);
        promotedBySource.set(trimmed, gcsUrl);
        sourceToGcs.set(trimmed, gcsUrl);
        next.push(gcsUrl);
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error ? error.message : 'Failed to copy the image to workspace storage.';
        void showAlert({
          title: 'Could not prepare image',
          description:
            'This image must be copied to workspace storage before approve or publish. ' + message,
        });
        throw error;
      }
    }

    if (sourceToGcs.size > 0) {
      setAlternateImageOptions((prev) =>
        prev.map((o) => {
          const gcsUrl = sourceToGcs.get(o.imageUrl);
          return gcsUrl ? { ...o, imageUrl: gcsUrl } : o;
        }),
      );
      setUploadedImageOptions((prev) =>
        prev.map((o) => {
          const gcsUrl = sourceToGcs.get(o.imageUrl);
          return gcsUrl ? { ...o, imageUrl: gcsUrl } : o;
        }),
      );
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

    setUploadedImageOptions((current) =>
      mergeUniqueImageOptions([uploadedOption, ...current]).slice(0, DRAFT_IMAGE_SEARCH_CHOICE_COUNT),
    );
    setSuppressAutoImageSelection(false);
    setSelectedImageUrls((prev) =>
      prev.length >= MAX_IMAGES_PER_POST ? prev : prev.includes(imageUrl) ? prev : [...prev, imageUrl],
    );
  };

  const handleUploadReferenceImage = async (file: File): Promise<string> => {
    return onUploadImage(file);
  };

  const handleGenerateReferenceImage = async (referenceImageUrl: string, instructions: string): Promise<void> => {
    if (!onGenerateReferenceImage) return;
    const imageUrl = await onGenerateReferenceImage(referenceImageUrl, instructions);
    const generatedOption: ImageAssetOption = {
      id: `generated-ref-${Date.now()}`,
      imageUrl,
      label: 'AI Generated',
      kind: 'generated',
    };
    setUploadedImageOptions((current) =>
      mergeUniqueImageOptions([generatedOption, ...current]).slice(0, DRAFT_IMAGE_SEARCH_CHOICE_COUNT),
    );
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
        { topicId: sheetRow.topicId, postTime },
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

  const handleSaveDraft = async () => {
    if (!(editorText || '').trim()) {
      void showAlert({ title: 'Notice', description: 'Post text cannot be empty.' });
      return;
    }
    setSavingDraft(true);
    try {
      const urlsForSheet = await ensureSelectedImagesStored();
      const { selectedImageId, selectedImageUrlsJson } = serializeRowImageUrls(urlsForSheet);
      const slot = editorVariantIndex ?? 0;
      const merged = [
        slot === 0 ? editorText.trim() : (sheetRow.variant1 ?? ''),
        slot === 1 ? editorText.trim() : (sheetRow.variant2 ?? ''),
        slot === 2 ? editorText.trim() : (sheetRow.variant3 ?? ''),
        slot === 3 ? editorText.trim() : (sheetRow.variant4 ?? ''),
      ];
      const updatedRow = await onSaveVariants(sheetRow, merged, {
        selectedText: editorText.trim(),
        selectedImageId,
        selectedImageUrlsJson,
      });
      setSheetRow(updatedRow);
      setEditorBaselineText(editorText.trim());
      void showAlert({ title: 'Saved', description: 'Draft saved.' });
    } catch (error) {
      void showAlert({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save the draft.',
      });
    } finally {
      setSavingDraft(false);
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
    const topicLabel = t ? truncateTopicForUi(t) : 'Topic';

    setChrome({
      topicReviewHeader: {
        onBackToTopics: leaveToTopics,
        onBackToVariants:
          showEditorLayout && sheetVariants.length > 0 && routed.screen !== 'editor'
            ? requestNavigateToVariants
            : undefined,
        crumbs: [
          { key: 'topics', label: 'Topics', onPress: leaveToTopics },
          {
            key: 'topic',
            label: topicLabel,
            labelTitle: topicNeedsFullTooltip(sheetRow.topic) ? t : undefined,
          },
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

  const [savingGenerationTemplateId, setSavingGenerationTemplateId] = useState(false);
  const saveGenerationTemplateInFlight = useRef(false);

  const handleSaveGenerationTemplateId = useCallback(
    async (templateId: string) => {
      if (saveGenerationTemplateInFlight.current) return;
      saveGenerationTemplateInFlight.current = true;
      setSavingGenerationTemplateId(true);
      try {
        const nextRow = await onSaveGenerationTemplateId(sheetRow, templateId);
        setSheetRow(nextRow);
        void showAlert({ title: 'Saved', description: 'Post template selection was saved to the sheet.' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save template selection.';
        console.error(error);
        if (isAuthErrorMessage(message)) {
          void showAlert({ title: 'Session expired', description: 'Sign in again to continue.' });
          return;
        }
        void showAlert({ title: 'Could not save', description: message });
      } finally {
        saveGenerationTemplateInFlight.current = false;
        setSavingGenerationTemplateId(false);
      }
    },
    [onSaveGenerationTemplateId, sheetRow, setSheetRow, showAlert],
  );

  const [savingGenerationLlm, setSavingGenerationLlm] = useState(false);
  const saveGenerationLlmInFlight = useRef(false);

  const handleSaveGenerationLlm = useCallback(
    async (llm: LlmRef) => {
      if (saveGenerationLlmInFlight.current) return;
      if (!props.onSaveGenerationLlm) return;
      saveGenerationLlmInFlight.current = true;
      setSavingGenerationLlm(true);
      try {
        await props.onSaveGenerationLlm(llm);
        void showAlert({ title: 'Saved', description: 'LLM provider and model selection saved.' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save LLM selection.';
        console.error(error);
        void showAlert({ title: 'Could not save', description: message });
      } finally {
        saveGenerationLlmInFlight.current = false;
        setSavingGenerationLlm(false);
      }
    },
    [props, showAlert],
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
    handleUploadImageOption,
    handleUploadReferenceImage,
    handleGenerateReferenceImage,
    handleSaveDraft,
    savingDraft,
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
    handleSaveGenerationTemplateId,
    savingGenerationTemplateId,
    handleSaveGenerationLlm,
    savingGenerationLlm,
    handleSaveEmailFields,
    savingEmailFields,
  };
}
