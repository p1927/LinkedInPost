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

type WorkspaceChromeState = {
  onRefreshQueue: (() => void) | null;
  queueLoading: boolean;
  health: WorkspacePublishingHealth | null;
};

const defaultState: WorkspaceChromeState = {
  onRefreshQueue: null,
  queueLoading: false,
  health: null,
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
}) {
  const { setChrome } = useWorkspaceChrome();
  const { onRefreshQueue, queueLoading, health } = config;

  useEffect(() => {
    setChrome({ onRefreshQueue, queueLoading, health });
  }, [setChrome, onRefreshQueue, queueLoading, health]);

  useEffect(() => {
    return () => {
      setChrome({ onRefreshQueue: null, queueLoading: false, health: null });
    };
  }, [setChrome]);
}
