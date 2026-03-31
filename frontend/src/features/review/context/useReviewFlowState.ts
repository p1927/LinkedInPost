import { useState, useMemo, useEffect, useRef, useReducer } from 'react';
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
import { type SheetRow } from '../../../services/sheets';
import { getVariantSlotContent } from '../../topic-navigation/utils/topicRoute';
import { getEffectiveScope, getTargetText, isSelectionScopeWaitingForRange } from '@/features/draft-selection-target';
import { useWorkspaceChrome, useRegisterUnsavedChanges } from '../../../components/workspace/WorkspaceChromeContext';
import { parseRowImageUrls } from '../../../services/selectedImageUrls';
import { topicNeedsTruncation } from '../../../lib/topicDisplay';
import { type ReviewRoutedNavigation } from '../ReviewWorkspace';

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Reducer state — all state that resets together when the topic/route changes
// ---------------------------------------------------------------------------

type ActivePanel = 'refine' | 'media' | 'rules' | 'email';

interface ReviewFlowState {
  sheetRow: SheetRow;
  editorText: string;
  editorBaselineText: string;
  selection: TextSelectionRange | null;
  scope: GenerationScope;
  instruction: string;
  generationLoading: 'quick-change' | 'variants' | null;
  quickChangePreview: QuickChangePreviewResult | null;
  variantsPreview: VariantsPreviewResponse | null;
  previewVariantSaveByIndex: Record<number, 'idle' | 'saving' | 'saved' | 'error'>;
  previewVariantSaveErrors: Record<number, string>;
  postTime: string;
  emailTo: string;
  emailCc: string;
  emailBcc: string;
  emailSubject: string;
  selectedImageUrls: string[];
  suppressAutoImageSelection: boolean;
  alternateImageOptions: ImageAssetOption[];
  uploadedImageOptions: ImageAssetOption[];
  pendingVariantIndex: number | null;
  openMediaAfterVariantConfirm: boolean;
  pendingClose: boolean;
  pendingNavigateToVariants: boolean;
  compareState: CompareState | null;
  submitting: boolean;
  activeWorkspacePanel: ActivePanel;
  reviewPhase: 'pick-variant' | 'edit';
  editorVariantIndex: number | null;
  topicExpanded: boolean;
  previewCollapsed: boolean;
  pickCarouselIndex: number;
}

// ---------------------------------------------------------------------------
// Reducer actions
// ---------------------------------------------------------------------------

/** Generic field setter — supports both value and functional update patterns. */
type SetFieldAction = {
  [K in keyof ReviewFlowState]: {
    type: 'SET';
    key: K;
    value: ReviewFlowState[K] | ((prev: ReviewFlowState[K]) => ReviewFlowState[K]);
  };
}[keyof ReviewFlowState];

type ReviewFlowAction =
  /** Full atomic reset when navigating to a new topic/route. */
  | { type: 'INIT_ROW'; state: ReviewFlowState }
  /** Partial update when the server row changes persisted image columns only (avoids full reset). */
  | { type: 'UPDATE_IMAGE_FINGERPRINT'; selectedImageUrls: string[]; partialSheetRow: Pick<SheetRow, 'selectedImageId' | 'selectedImageUrlsJson'> }
  | SetFieldAction;

function reviewFlowReducer(s: ReviewFlowState, action: ReviewFlowAction): ReviewFlowState {
  switch (action.type) {
    case 'INIT_ROW':
      return action.state;
    case 'UPDATE_IMAGE_FINGERPRINT':
      return {
        ...s,
        selectedImageUrls: action.selectedImageUrls,
        sheetRow: {
          ...s.sheetRow,
          selectedImageId: action.partialSheetRow.selectedImageId,
          selectedImageUrlsJson: action.partialSheetRow.selectedImageUrlsJson,
        },
      };
    case 'SET': {
      // key and value are correlated by the mapped union type — cast required
      const prev = s[action.key];
      const next = typeof action.value === 'function'
        ? (action.value as (p: typeof prev) => typeof prev)(prev)
        : action.value;
      return { ...s, [action.key]: next };
    }
  }
}

// ---------------------------------------------------------------------------
// Initial state builder
// ---------------------------------------------------------------------------

function buildInitialState(
  row: SheetRow,
  routed: ReviewRoutedNavigation | undefined,
  editorStartMediaPanel: boolean,
  globalEmailDefaults: ReviewFlowProviderProps['globalEmailDefaults'],
): ReviewFlowState {
  const base: Omit<ReviewFlowState, 'editorText' | 'editorBaselineText' | 'selectedImageUrls' | 'reviewPhase' | 'editorVariantIndex' | 'activeWorkspacePanel'> = {
    sheetRow: row,
    selection: null,
    scope: 'whole-post',
    instruction: '',
    generationLoading: null,
    quickChangePreview: null,
    variantsPreview: null,
    previewVariantSaveByIndex: {},
    previewVariantSaveErrors: {},
    postTime: getInitialPostTime(row.postTime),
    emailTo: row.emailTo || globalEmailDefaults?.emailTo || '',
    emailCc: row.emailCc || globalEmailDefaults?.emailCc || '',
    emailBcc: row.emailBcc || globalEmailDefaults?.emailBcc || '',
    emailSubject: row.emailSubject || globalEmailDefaults?.emailSubject || '',
    suppressAutoImageSelection: false,
    alternateImageOptions: [],
    uploadedImageOptions: [],
    pendingVariantIndex: null,
    openMediaAfterVariantConfirm: false,
    pendingClose: false,
    pendingNavigateToVariants: false,
    compareState: null,
    submitting: false,
    topicExpanded: false,
    previewCollapsed: false,
    pickCarouselIndex: 0,
  };

  const variants = buildSheetVariants(row);

  if (routed?.screen === 'editor') {
    const sc = getVariantSlotContent(row, routed.editorVariantSlot);
    const textForEditor = sc?.text.trim() ? sc.text : getInitialEditorText(row);
    const fromRow = parseRowImageUrls(row);
    const fromVariant = sc?.imageUrl?.trim() ? [sc.imageUrl] : [];
    const slotIdx = variants.findIndex((v) => v.originalIndex === routed.editorVariantSlot);

    return {
      ...base,
      editorText: textForEditor,
      editorBaselineText: textForEditor,
      selectedImageUrls:
        fromRow.length > 0
          ? fromRow
          : fromVariant.length > 0
            ? fromVariant
            : row.imageLink1
              ? [row.imageLink1]
              : [],
      reviewPhase: 'edit',
      editorVariantIndex: slotIdx >= 0 ? slotIdx : null,
      activeWorkspacePanel: editorStartMediaPanel ? 'media' : 'refine',
    };
  }

  const initialText = getInitialEditorText(row);
  const fromRow = parseRowImageUrls(row);
  let editorVariantIndex: number | null = null;
  if (row.selectedText?.trim()) {
    const idx = variants.findIndex((v) => v.text?.trim() === row.selectedText!.trim());
    editorVariantIndex = idx >= 0 ? idx : null;
  }

  return {
    ...base,
    editorText: initialText,
    editorBaselineText: initialText,
    selectedImageUrls: fromRow.length > 0 ? fromRow : row.imageLink1 ? [row.imageLink1] : [],
    reviewPhase:
      routed?.screen === 'variants'
        ? 'pick-variant'
        : variants.length > 0 && !row.selectedText?.trim()
          ? 'pick-variant'
          : 'edit',
    editorVariantIndex,
    activeWorkspacePanel: 'refine',
  };
}

// ---------------------------------------------------------------------------
// Stable setter factory
// ---------------------------------------------------------------------------

/** Creates a React.Dispatch<React.SetStateAction<V>> wrapper around the reducer dispatch. */
function makeSetter<K extends keyof ReviewFlowState>(
  dispatch: React.Dispatch<ReviewFlowAction>,
  key: K,
): React.Dispatch<React.SetStateAction<ReviewFlowState[K]>> {
  return (value) =>
    dispatch({
      type: 'SET',
      key,
      value: value as ReviewFlowState[K] | ((prev: ReviewFlowState[K]) => ReviewFlowState[K]),
    });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReviewFlowState(props: ReviewFlowProviderProps) {
  const { row, routed, editorStartMediaPanel, globalEmailDefaults, globalGenerationRules, loadPostTemplates } = props;
  const { setChrome } = useWorkspaceChrome();

  const [state, dispatch] = useReducer(
    reviewFlowReducer,
    undefined,
    () => buildInitialState(row, routed, editorStartMediaPanel ?? false, globalEmailDefaults),
  );

  // Stable setters — stable identity because dispatch never changes
  const setters = useMemo(() => ({
    setSheetRow: makeSetter(dispatch, 'sheetRow'),
    setEditorText: makeSetter(dispatch, 'editorText'),
    setEditorBaselineText: makeSetter(dispatch, 'editorBaselineText'),
    setSelection: makeSetter(dispatch, 'selection'),
    setScope: makeSetter(dispatch, 'scope'),
    setInstruction: makeSetter(dispatch, 'instruction'),
    setGenerationLoading: makeSetter(dispatch, 'generationLoading'),
    setQuickChangePreview: makeSetter(dispatch, 'quickChangePreview'),
    setVariantsPreview: makeSetter(dispatch, 'variantsPreview'),
    setPreviewVariantSaveByIndex: makeSetter(dispatch, 'previewVariantSaveByIndex'),
    setPreviewVariantSaveErrors: makeSetter(dispatch, 'previewVariantSaveErrors'),
    setPostTime: makeSetter(dispatch, 'postTime'),
    setEmailTo: makeSetter(dispatch, 'emailTo'),
    setEmailCc: makeSetter(dispatch, 'emailCc'),
    setEmailBcc: makeSetter(dispatch, 'emailBcc'),
    setEmailSubject: makeSetter(dispatch, 'emailSubject'),
    setSelectedImageUrls: makeSetter(dispatch, 'selectedImageUrls'),
    setSuppressAutoImageSelection: makeSetter(dispatch, 'suppressAutoImageSelection'),
    setAlternateImageOptions: makeSetter(dispatch, 'alternateImageOptions'),
    setUploadedImageOptions: makeSetter(dispatch, 'uploadedImageOptions'),
    setPendingVariantIndex: makeSetter(dispatch, 'pendingVariantIndex'),
    setOpenMediaAfterVariantConfirm: makeSetter(dispatch, 'openMediaAfterVariantConfirm'),
    setPendingClose: makeSetter(dispatch, 'pendingClose'),
    setPendingNavigateToVariants: makeSetter(dispatch, 'pendingNavigateToVariants'),
    setCompareState: makeSetter(dispatch, 'compareState'),
    setSubmitting: makeSetter(dispatch, 'submitting'),
    setActiveWorkspacePanel: makeSetter(dispatch, 'activeWorkspacePanel'),
    setReviewPhase: makeSetter(dispatch, 'reviewPhase'),
    setEditorVariantIndex: makeSetter(dispatch, 'editorVariantIndex'),
    setTopicExpanded: makeSetter(dispatch, 'topicExpanded'),
    setPreviewCollapsed: makeSetter(dispatch, 'previewCollapsed'),
    setPickCarouselIndex: makeSetter(dispatch, 'pickCarouselIndex'),
  }), []); // dispatch is stable — setters never need to be recreated

  const topicHeadingRef = useRef<HTMLHeadingElement>(null);
  const lastInitRef = useRef<string | null>(null);
  const lastRowImageFingerprintRef = useRef<string | null>(null);

  const rowPersistedImageFingerprint = `${String(row.selectedImageId ?? '').trim()}|${String(row.selectedImageUrlsJson ?? '').trim()}`;

  // Single atomic dispatch replaces 20+ individual setState calls.
  useEffect(() => {
    const initKey = `${row.topic}:${routed?.screen}:${routed?.editorVariantSlot}:${editorStartMediaPanel}`;
    if (lastInitRef.current === initKey) {
      // Same topic/screen/slot: do not reset sheetRow from props — parent row can lag or (after a sheet
      // merge) carry stale "Topic rules" from the Post tab, which would undo clears/saves from the Draft row.
      // Still merge persisted image columns when the server row updates (e.g. after approve + refresh).
      if (rowPersistedImageFingerprint !== lastRowImageFingerprintRef.current) {
        lastRowImageFingerprintRef.current = rowPersistedImageFingerprint;
        dispatch({
          type: 'UPDATE_IMAGE_FINGERPRINT',
          selectedImageUrls: parseRowImageUrls(row),
          partialSheetRow: {
            selectedImageId: row.selectedImageId,
            selectedImageUrlsJson: row.selectedImageUrlsJson,
          },
        });
      }
      return;
    }
    lastInitRef.current = initKey;
    lastRowImageFingerprintRef.current = rowPersistedImageFingerprint;
    dispatch({ type: 'INIT_ROW', state: buildInitialState(row, routed, editorStartMediaPanel ?? false, globalEmailDefaults) });
  // globalEmailDefaults intentionally excluded: changing defaults should not reset a live editor session.
  // routed object identity excluded in favour of stable primitive fields routed?.screen / routed?.editorVariantSlot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, routed?.screen, routed?.editorVariantSlot, editorStartMediaPanel, rowPersistedImageFingerprint]);

  const sheetVariants = useMemo(() => buildSheetVariants(state.sheetRow), [state.sheetRow]);

  // postTemplates and researchContextArticles are independently managed — not part of row init
  const [postTemplates, setPostTemplates] = useState<PostTemplate[]>([]);
  const [researchContextArticles, setResearchContextArticles] = useState<ResearchArticleRef[]>([]);

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
        state.sheetRow.topicGenerationRules,
        state.sheetRow.generationTemplateId,
        postTemplates,
        globalGenerationRules,
      ),
    [state.sheetRow.topicGenerationRules, state.sheetRow.generationTemplateId, postTemplates, globalGenerationRules],
  );

  useEffect(() => {
    setters.setPickCarouselIndex((index) =>
      sheetVariants.length === 0 ? 0 : Math.min(index, sheetVariants.length - 1),
    );
  }, [sheetVariants.length, setters]);

  const showPickPhase =
    sheetVariants.length > 0 && (routed ? routed.screen === 'variants' : state.reviewPhase === 'pick-variant');
  const showEditorLayout =
    sheetVariants.length === 0 || (routed ? routed.screen === 'editor' : state.reviewPhase === 'edit');
  const topicTitleInWorkspaceChrome = Boolean(routed);
  const topicIsLong = topicNeedsTruncation(state.sheetRow.topic || '');
  const generatedImageOptions = useMemo(() => buildGeneratedImages(state.sheetRow), [state.sheetRow]);
  const imageOptions = useMemo(() => {
    const base = [...state.uploadedImageOptions, ...generatedImageOptions, ...state.alternateImageOptions];
    return mergePersistedSelectionOptions(base, state.selectedImageUrls);
  }, [state.alternateImageOptions, generatedImageOptions, state.uploadedImageOptions, state.selectedImageUrls]);
  const effectiveScope = getEffectiveScope(state.scope, state.selection);
  const aiRefineBlocked = isSelectionScopeWaitingForRange(state.scope, state.selection);
  const aiRefineBlockedReason = 'Select part of the draft in the editor before running Quick Change or 4 Variants.';
  const currentTargetText = getTargetText(state.editorText, effectiveScope, state.selection);
  const editorDirty = state.editorText !== state.editorBaselineText;
  const hasUnsavedReviewState =
    editorDirty ||
    state.instruction.trim().length > 0 ||
    Boolean(state.quickChangePreview) ||
    Boolean(state.variantsPreview?.variants.length);
  const previewReadyCount = state.variantsPreview?.variants.length || (state.quickChangePreview ? 1 : 0);

  useRegisterUnsavedChanges(hasUnsavedReviewState);

  useEffect(() => {
    if (!hasUnsavedReviewState) return;

    window.history.pushState({ trap: true }, '');

    const handlePopState = () => {
      window.history.pushState({ trap: true }, '');
      // Browser back should leave toward the topics list, not the variant picker.
      setters.setPendingClose(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.trap) {
        window.history.back();
      }
    };
  }, [hasUnsavedReviewState, setters]);

  useEffect(() => {
    topicHeadingRef.current?.focus();
  }, [row]);

  useEffect(() => {
    if (state.suppressAutoImageSelection) {
      if (state.selectedImageUrls.length === 0) {
        return;
      }
      const filtered = state.selectedImageUrls.filter((u) => urlAppearsInImageOptions(u, imageOptions));
      if (filtered.length !== state.selectedImageUrls.length) {
        setters.setSelectedImageUrls(
          filtered.length > 0
            ? filtered
            : imageOptions[0]?.imageUrl
              ? [imageOptions[0].imageUrl.trim()]
              : [],
        );
      }
      return;
    }

    const baseOnly = [...state.uploadedImageOptions, ...generatedImageOptions, ...state.alternateImageOptions];
    if (state.selectedImageUrls.length === 0) {
      const persisted = parseRowImageUrls(row);
      if (persisted.length > 0) {
        // Prefer sheet-backed URLs over the first thumbnail so we do not race init/hydration and
        // replace an approved upload with a variant-column image (suppressAutoImageSelection blocks
        // this path after an explicit clear-all).
        setters.setSelectedImageUrls(persisted);
        return;
      }
      if (baseOnly[0]?.imageUrl?.trim()) {
        setters.setSelectedImageUrls([baseOnly[0].imageUrl.trim()]);
      }
      return;
    }

    const first = state.selectedImageUrls[0];
    if (first?.trim() && !urlAppearsInImageOptions(first, imageOptions)) {
      setters.setSelectedImageUrls(baseOnly[0]?.imageUrl?.trim() ? [baseOnly[0].imageUrl.trim()] : []);
    }
  // uploadedImageOptions, generatedImageOptions, alternateImageOptions intentionally excluded:
  // imageOptions is already memoized on all three — they always change together with imageOptions,
  // so including them separately causes redundant effect fires on intermediate renders.
  // row is excluded because only the image-specific fingerprint fields (selectedImageId, selectedImageUrlsJson) matter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imageOptions,
    state.selectedImageUrls,
    state.suppressAutoImageSelection,
    row.selectedImageId,
    row.selectedImageUrlsJson,
    setters,
  ]);

  return {
    // State values (spread from reducer state)
    ...state,
    // Stable individual setters (same interface as before, backed by dispatch)
    ...setters,
    // Computed values
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
    // Internal fields consumed by context provider / actions hook
    setChrome,
    effectiveGenerationRules,
    postTemplates,
    researchContextArticles,
    setResearchContextArticles,
  };
}
