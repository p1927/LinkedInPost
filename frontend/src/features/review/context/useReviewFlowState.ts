import { useState, useMemo, useEffect, useRef } from 'react';
import { type ReviewFlowProviderProps, type CompareState } from './types';
import { getInitialEditorText, buildSheetVariants, buildGeneratedImages } from './utils';
import { type GenerationScope, type TextSelectionRange, type QuickChangePreviewResult, type VariantsPreviewResponse } from '../../../services/backendApi';
import { type ImageAssetOption } from '../../../components/ImageAssetManager';
import { getVariantSlotContent } from '../../topic-navigation/utils/topicRoute';
import { getEffectiveScope, getTargetText } from '../../editor/selection';
import { useWorkspaceChrome, useRegisterUnsavedChanges } from '../../../components/workspace/WorkspaceChromeContext';

const getInitialPostTime = (rowPostTime: string | undefined): string => {
  if (!rowPostTime?.trim()) return '';
  const match = rowPostTime.trim().match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return '';
  const yyyy = match[1];
  const mm = match[2];
  const dd = match[3];
  const hh = match[4];
  const min = match[5];
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min)));
  if (isNaN(d.getTime())) return '';
  const localY = d.getFullYear();
  const localM = String(d.getMonth() + 1).padStart(2, '0');
  const localD = String(d.getDate()).padStart(2, '0');
  const localH = String(d.getHours()).padStart(2, '0');
  const localMin = String(d.getMinutes()).padStart(2, '0');
  return `${localY}-${localM}-${localD}T${localH}:${localMin}`;
};

export function useReviewFlowState(props: ReviewFlowProviderProps) {
  const { row, routed, editorStartMediaPanel, globalEmailDefaults, globalGenerationRules } = props;
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
  const [postTime, setPostTime] = useState(() => getInitialPostTime(row.postTime));
  const [emailTo, setEmailTo] = useState(row.emailTo || globalEmailDefaults?.emailTo || '');
  const [emailCc, setEmailCc] = useState(row.emailCc || globalEmailDefaults?.emailCc || '');
  const [emailBcc, setEmailBcc] = useState(row.emailBcc || globalEmailDefaults?.emailBcc || '');
  const [emailSubject, setEmailSubject] = useState(row.emailSubject || globalEmailDefaults?.emailSubject || '');
  const [selectedImageUrl, setSelectedImageUrl] = useState(row.selectedImageId || row.imageLink1 || '');
  const [alternateImageOptions, setAlternateImageOptions] = useState<ImageAssetOption[]>([]);
  const [uploadedImageOptions, setUploadedImageOptions] = useState<ImageAssetOption[]>([]);
  const [pendingVariantIndex, setPendingVariantIndex] = useState<number | null>(null);
  const [openMediaAfterVariantConfirm, setOpenMediaAfterVariantConfirm] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [pendingNavigateToVariants, setPendingNavigateToVariants] = useState(false);
  const [compareState, setCompareState] = useState<CompareState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeWorkspacePanel, setActiveWorkspacePanel] = useState<'refine' | 'media' | 'rules' | 'email'>('refine');
  const [reviewPhase, setReviewPhase] = useState<'pick-variant' | 'edit'>(() => {
    const variants = buildSheetVariants(row);
    if (variants.length === 0) return 'edit';
    if (row.selectedText?.trim()) return 'edit';
    return 'pick-variant';
  });
  const [editorVariantIndex, setEditorVariantIndex] = useState<number | null>(() => {
    const variants = buildSheetVariants(row);
    if (!row.selectedText?.trim()) return null;
    const idx = variants.findIndex((v) => v.text?.trim() === row.selectedText!.trim());
    return idx >= 0 ? idx : null;
  });
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
    setEditorVariantIndex(null);

    if (routed?.screen === 'editor') {
      const sc = getVariantSlotContent(row, routed.editorVariantSlot);
      const textForEditor = sc?.text.trim() ? sc.text : getInitialEditorText(row);
      setEditorText(textForEditor);
      setEditorBaselineText(textForEditor);
      setPostTime(getInitialPostTime(row.postTime));
      setEmailTo(row.emailTo || globalEmailDefaults?.emailTo || '');
      setEmailCc(row.emailCc || globalEmailDefaults?.emailCc || '');
      setEmailBcc(row.emailBcc || globalEmailDefaults?.emailBcc || '');
      setEmailSubject(row.emailSubject || globalEmailDefaults?.emailSubject || '');
      setSelectedImageUrl(
        (sc?.imageUrl?.trim() ? sc.imageUrl : '') || row.selectedImageId || row.imageLink1 || '',
      );
      const variants = buildSheetVariants(row);
      const slotIdx = variants.findIndex((v) => v.originalIndex === routed.editorVariantSlot);
      setEditorVariantIndex(slotIdx >= 0 ? slotIdx : null);
      setReviewPhase('edit');
      setActiveWorkspacePanel(editorStartMediaPanel ? 'media' : 'refine');
      return;
    }

    const initialText = getInitialEditorText(row);
    setEditorText(initialText);
    setEditorBaselineText(initialText);
    setPostTime(getInitialPostTime(row.postTime));
    setEmailTo(row.emailTo || globalEmailDefaults?.emailTo || '');
    setEmailCc(row.emailCc || globalEmailDefaults?.emailCc || '');
    setEmailBcc(row.emailBcc || globalEmailDefaults?.emailBcc || '');
    setEmailSubject(row.emailSubject || globalEmailDefaults?.emailSubject || '');
    setSelectedImageUrl(row.selectedImageId || row.imageLink1 || '');

    const variants = buildSheetVariants(row);
    if (row.selectedText?.trim()) {
      const idx = variants.findIndex((v) => v.text?.trim() === row.selectedText!.trim());
      setEditorVariantIndex(idx >= 0 ? idx : null);
    }

    setReviewPhase(
      routed?.screen === 'variants'
        ? 'pick-variant'
        : variants.length > 0 && !row.selectedText?.trim()
          ? 'pick-variant'
          : 'edit',
    );
    setActiveWorkspacePanel('refine');
  }, [row, routed?.screen, routed?.editorVariantSlot, editorStartMediaPanel]);

  const sheetVariants = useMemo(() => buildSheetVariants(sheetRow), [sheetRow]);

  const effectiveGenerationRules = useMemo(() => {
    const local = (sheetRow.topicGenerationRules || '').trim();
    return local ? sheetRow.topicGenerationRules || '' : globalGenerationRules;
  }, [sheetRow.topicGenerationRules, globalGenerationRules]);

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
    editorVariantIndex, setEditorVariantIndex,
    topicExpanded, setTopicExpanded,
    previewCollapsed, setPreviewCollapsed,
    pickCarouselIndex, setPickCarouselIndex,
    emailTo, setEmailTo,
    emailCc, setEmailCc,
    emailBcc, setEmailBcc,
    emailSubject, setEmailSubject,
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
    setChrome,
    effectiveGenerationRules,
  };
}
