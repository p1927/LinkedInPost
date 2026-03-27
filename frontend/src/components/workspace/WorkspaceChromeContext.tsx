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
};

/** Breadcrumb segment in the sticky workspace header (topic review routes). */
export type TopicReviewCrumb = {
  key: string;
  label: string;
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

type WorkspaceChromeState = {
  onRefreshQueue: (() => void) | null;
  queueLoading: boolean;
  health: WorkspacePublishingHealth | null;
  /** When set, the workspace header shows this instead of the nav page title. */
  headerOverride: { title: string; subtitle?: string | null } | null;
  /** Topic draft review: back, breadcrumb, optional pick-phase actions. */
  topicReviewHeader: TopicReviewHeaderChrome | null;
  hasUnsavedChanges: boolean;
};

const defaultState: WorkspaceChromeState = {
  onRefreshQueue: null,
  queueLoading: false,
  health: null,
  headerOverride: null,
  topicReviewHeader: null,
  hasUnsavedChanges: false,
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
  health: WorkspacePublishingHealth | null;
  headerOverride?: { title: string; subtitle?: string | null } | null;
  clearTopicReviewHeader?: boolean;
}) {
  const { setChrome } = useWorkspaceChrome();
  const { onRefreshQueue, queueLoading, health, headerOverride = null, clearTopicReviewHeader } = config;

  useEffect(() => {
    setChrome({ 
      onRefreshQueue, 
      queueLoading, 
      health, 
      headerOverride,
      ...(clearTopicReviewHeader ? { topicReviewHeader: null } : {})
    });
  }, [setChrome, onRefreshQueue, queueLoading, health, headerOverride, clearTopicReviewHeader]);

  useEffect(() => {
    return () => {
      setChrome({
        onRefreshQueue: null,
        queueLoading: false,
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
