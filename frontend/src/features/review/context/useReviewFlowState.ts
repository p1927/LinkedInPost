import { useState, useMemo, useEffect, useRef } from 'react';
import { type ReviewFlowProviderProps, type CompareState } from './types';
import { getInitialEditorText, buildSheetVariants, buildGeneratedImages } from './utils';
import {
  type GenerationScope,
  type PostTemplate,
  type QuickChangePreviewResult,
  type ResearchArticleRef,
  type TextSelectionRange,
  type VariantsPreviewResponse,
} from '../../../services/backendApi';
import { type ImageAssetOption } from '../../../components/ImageAssetManager';
import { getVariantSlotContent } from '../../topic-navigation/utils/topicRoute';
import { getEffectiveScope, getTargetText, isSelectionScopeWaitingForRange } from '@/features/draft-selection-target';
import { useWorkspaceChrome, useRegisterUnsavedChanges } from '../../../components/workspace/WorkspaceChromeContext';
import { parseRowImageUrls } from '../../../services/selectedImageUrls';
import { topicNeedsTruncation } from '../../../lib/topicDisplay';

function imageOptionMatchesUrl(option: ImageAssetOption, url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  return (option.imageUrl || '').trim() === u;
}

function urlAppearsInImageOptions(url: string, options: ImageAssetOption[]): boolean {
  return options.some((o) => imageOptionMatchesUrl(o, url));
}

/** Sheet-backed selections are not always present in variant columns or search hits; include them so sync logic does not drop valid URLs. */
function mergePersistedSelectionOptions(
  base: ImageAssetOption[],
  selectedUrls: string[],
): ImageAssetOption[] {
  const seen = new Set<string>();
  for (const o of base) {
    const k = (o.imageUrl || '').trim();
    if (k) seen.add(k);
  }
  const extras: ImageAssetOption[] = [];
  let extraIdx = 0;
  for (const u of selectedUrls) {
    const t = u.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    extras.push({
      id: `saved-selection-${extraIdx}`,
      imageUrl: u.trim(),
      label: 'Saved image',
      kind: 'generated',
    });
    extraIdx += 1;
  }
  return [...base, ...extras];
}

function resolveEffectiveGenerationRulesWithTemplate(
  topicRules: string | undefined,
  templateId: string | undefined,
  templates: PostTemplate[],
  globalRules: string,
): string {
  const local = (topicRules || '').trim();
  if (local) return local;
  const tid = (templateId || '').trim();
  if (tid) {
    const t = templates.find((x) => x.id === tid);
    if (t && (t.rules || '').trim()) {
      return t.rules;
    }
  }
  return (globalRules || '').trim();
}

const formatLocalDateTimeForInput = (d: Date): string => {
  const localY = d.getFullYear();
  const localM = String(d.getMonth() + 1).padStart(2, '0');
  const localD = String(d.getDate()).padStart(2, '0');
  const localH = String(d.getHours()).padStart(2, '0');
  const localMin = String(d.getMinutes()).padStart(2, '0');
  return `${localY}-${localM}-${localD}T${localH}:${localMin}`;
};

const getInitialPostTime = (rowPostTime: string | undefined): string => {
  if (!rowPostTime?.trim()) return formatLocalDateTimeForInput(new Date());
  const match = rowPostTime.trim().match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return formatLocalDateTimeForInput(new Date());
  const yyyy = match[1];
  const mm = match[2];
  const dd = match[3];
  const hh = match[4];
  const min = match[5];
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min)));
  if (isNaN(d.getTime())) return formatLocalDateTimeForInput(new Date());
  return formatLocalDateTimeForInput(d);
};

export function useReviewFlowState(props: ReviewFlowProviderProps) {
  const { row, routed, editorStartMediaPanel, globalEmailDefaults, globalGenerationRules, loadPostTemplates } = props;
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
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>(() => {
    const fromRow = parseRowImageUrls(row);
    if (fromRow.length > 0) return fromRow;
    return row.imageLink1 ? [row.imageLink1] : [];
  });
  /** When true, do not auto-pick the first image after the user clears the selection. */
  const [suppressAutoImageSelection, setSuppressAutoImageSelection] = useState(false);
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
  const [postTemplates, setPostTemplates] = useState<PostTemplate[]>([]);
  const [researchContextArticles, setResearchContextArticles] = useState<ResearchArticleRef[]>([]);

  const topicHeadingRef = useRef<HTMLHeadingElement>(null);
  const lastInitRef = useRef<string | null>(null);

  useEffect(() => {
    const initKey = `${row.topic}:${routed?.screen}:${routed?.editorVariantSlot}:${editorStartMediaPanel}`;
    if (lastInitRef.current === initKey) {
      // Same topic/screen/slot: do not reset sheetRow from props — parent row can lag or (after a sheet
      // merge) carry stale "Topic rules" from the Post tab, which would undo clears/saves from the Draft row.
      return;
    }
    lastInitRef.current = initKey;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSheetRow(row);

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
    setSuppressAutoImageSelection(false);
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
      {
        const fromRow = parseRowImageUrls(row);
        const fromVariant = sc?.imageUrl?.trim() ? [sc.imageUrl] : [];
        setSelectedImageUrls(
          fromRow.length > 0
            ? fromRow
            : fromVariant.length > 0
              ? fromVariant
              : row.imageLink1
                ? [row.imageLink1]
                : [],
        );
      }
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
    {
      const fromRow = parseRowImageUrls(row);
      setSelectedImageUrls(fromRow.length > 0 ? fromRow : row.imageLink1 ? [row.imageLink1] : []);
    }

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

  useEffect(() => {
    let cancelled = false;
    void loadPostTemplates()
      .then((list) => {
        if (!cancelled) setPostTemplates(list);
      })
      .catch(() => {
        if (!cancelled) setPostTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPostTemplates, row.topic, row.date]);

  const effectiveGenerationRules = useMemo(
    () =>
      resolveEffectiveGenerationRulesWithTemplate(
        sheetRow.topicGenerationRules,
        sheetRow.generationTemplateId,
        postTemplates,
        globalGenerationRules,
      ),
    [sheetRow.topicGenerationRules, sheetRow.generationTemplateId, postTemplates, globalGenerationRules],
  );

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
  const topicIsLong = topicNeedsTruncation(sheetRow.topic || '');
  const generatedImageOptions = useMemo(() => buildGeneratedImages(sheetRow), [sheetRow]);
  const imageOptions = useMemo(() => {
    const base = [...uploadedImageOptions, ...generatedImageOptions, ...alternateImageOptions];
    return mergePersistedSelectionOptions(base, selectedImageUrls);
  }, [alternateImageOptions, generatedImageOptions, uploadedImageOptions, selectedImageUrls]);
  const effectiveScope = getEffectiveScope(scope, selection);
  const aiRefineBlocked = isSelectionScopeWaitingForRange(scope, selection);
  const aiRefineBlockedReason = 'Select part of the draft in the editor before running Quick Change or 4 Variants.';
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
      // Browser back should leave toward the topics list, not the variant picker.
      setPendingClose(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.trap) {
        window.history.back();
      }
    };
  }, [hasUnsavedReviewState]);

  useEffect(() => {
    topicHeadingRef.current?.focus();
  }, [row]);

  useEffect(() => {
    if (suppressAutoImageSelection) {
      if (selectedImageUrls.length === 0) {
        return;
      }
      const filtered = selectedImageUrls.filter((u) => urlAppearsInImageOptions(u, imageOptions));
      if (filtered.length !== selectedImageUrls.length) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedImageUrls(filtered.length > 0 ? filtered : imageOptions[0]?.imageUrl ? [imageOptions[0].imageUrl.trim()] : []);
      }
      return;
    }

    const baseOnly = [...uploadedImageOptions, ...generatedImageOptions, ...alternateImageOptions];
    if (selectedImageUrls.length === 0 && baseOnly[0]?.imageUrl?.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedImageUrls([baseOnly[0].imageUrl.trim()]);
      return;
    }

    const first = selectedImageUrls[0];
    if (first?.trim() && !urlAppearsInImageOptions(first, imageOptions)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedImageUrls(baseOnly[0]?.imageUrl?.trim() ? [baseOnly[0].imageUrl.trim()] : []);
    }
  }, [
    imageOptions,
    selectedImageUrls,
    suppressAutoImageSelection,
    uploadedImageOptions,
    generatedImageOptions,
    alternateImageOptions,
  ]);

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
    selectedImageUrls, setSelectedImageUrls,
    suppressAutoImageSelection, setSuppressAutoImageSelection,
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
    aiRefineBlocked,
    aiRefineBlockedReason,
    currentTargetText,
    editorDirty,
    hasUnsavedReviewState,
    previewReadyCount,
    topicHeadingRef,
    setChrome,
    effectiveGenerationRules,
    postTemplates,
    researchContextArticles,
    setResearchContextArticles,
  };
}
