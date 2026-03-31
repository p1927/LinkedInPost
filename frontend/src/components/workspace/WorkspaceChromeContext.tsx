import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type WorkspacePublishingHealth = {
  linkedin: boolean;
  instagram: boolean;
  telegram: boolean;
  whatsapp: boolean;
  gmail: boolean;
};

/** Breadcrumb segment in the sticky workspace header (topic review routes). */
export type TopicReviewCrumb = {
  key: string;
  label: string;
  /** Native tooltip when label is truncated. */
  labelTitle?: string;
  /** Navigable (e.g. Topics). */
  onPress?: () => void;
  /** Current page step. */
  current?: boolean;
};

export type TopicReviewHeaderChrome = {
  onBackToTopics: () => void;
  /** Editor step: back to variant carousel. */
  onBackToVariants?: (() => void) | null;
  crumbs: TopicReviewCrumb[];
  pickToolbar: { onMedia: () => void; onOpenEditor: () => void } | null;
};

export type AddTopicFormChrome = {
  newTopic: string;
  setNewTopic: (v: string) => void;
  handleAddTopic: (e: React.FormEvent) => Promise<void>;
  addingTopic: boolean;
  loading: boolean;
};

type WorkspaceChromeState = {
  onRefreshQueue: (() => void) | null;
  queueLoading: boolean;
  /** Pulse / glow on the header Refresh control (e.g. after draft dispatch). */
  highlightRefreshQueue: boolean;
  health: WorkspacePublishingHealth | null;
  /** When set, the workspace header shows this instead of the nav page title. */
  headerOverride: { title: string; subtitle?: string | null; titleTooltip?: string | null } | null;
  /** Topic draft review: back, breadcrumb, optional pick-phase actions. */
  topicReviewHeader: TopicReviewHeaderChrome | null;
  hasUnsavedChanges: boolean;
  /** When set, renders the add-topic form in the workspace header center. */
  addTopicForm: AddTopicFormChrome | null;
};

const defaultState: WorkspaceChromeState = {
  onRefreshQueue: null,
  queueLoading: false,
  highlightRefreshQueue: false,
  health: null,
  headerOverride: null,
  topicReviewHeader: null,
  hasUnsavedChanges: false,
  addTopicForm: null,
};

type WorkspaceChromeContextValue = WorkspaceChromeState & {
  setChrome: (patch: Partial<WorkspaceChromeState>) => void;
};

const WorkspaceChromeContext = createContext<WorkspaceChromeContextValue | null>(null);

export function WorkspaceChromeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceChromeState>(defaultState);

  const setChrome = useCallback((patch: Partial<WorkspaceChromeState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setChrome,
    }),
    [state, setChrome],
  );

  return <WorkspaceChromeContext.Provider value={value}>{children}</WorkspaceChromeContext.Provider>;
}

export function useWorkspaceChrome() {
  const ctx = useContext(WorkspaceChromeContext);
  if (!ctx) {
    throw new Error('useWorkspaceChrome must be used within WorkspaceChromeProvider');
  }
  return ctx;
}

/** Registers queue refresh + publishing health for the workspace header. */
export function useRegisterWorkspaceChrome(config: {
  onRefreshQueue: (() => void) | null;
  queueLoading: boolean;
  highlightRefreshQueue?: boolean;
  health: WorkspacePublishingHealth | null;
  headerOverride?: { title: string; subtitle?: string | null; titleTooltip?: string | null } | null;
  clearTopicReviewHeader?: boolean;
  addTopicForm?: AddTopicFormChrome | null;
}) {
  const { setChrome } = useWorkspaceChrome();
  const {
    onRefreshQueue,
    queueLoading,
    highlightRefreshQueue = false,
    health,
    headerOverride = null,
    clearTopicReviewHeader,
    addTopicForm = null,
  } = config;

  useEffect(() => {
    setChrome({
      onRefreshQueue,
      queueLoading,
      highlightRefreshQueue,
      health,
      headerOverride,
      addTopicForm,
      ...(clearTopicReviewHeader ? { topicReviewHeader: null } : {})
    });
  }, [
    setChrome,
    onRefreshQueue,
    queueLoading,
    highlightRefreshQueue,
    health,
    headerOverride,
    clearTopicReviewHeader,
    addTopicForm,
  ]);

  useEffect(() => {
    return () => {
      setChrome({
        onRefreshQueue: null,
        queueLoading: false,
        highlightRefreshQueue: false,
        health: null,
        headerOverride: null,
        topicReviewHeader: null,
      });
    };
  }, [setChrome]);
}

export function useRegisterUnsavedChanges(hasUnsaved: boolean) {
  const { setChrome } = useWorkspaceChrome();

  useEffect(() => {
    setChrome({ hasUnsavedChanges: hasUnsaved });
  }, [setChrome, hasUnsaved]);

  useEffect(() => {
    return () => {
      setChrome({ hasUnsavedChanges: false });
    };
  }, [setChrome]);
}
