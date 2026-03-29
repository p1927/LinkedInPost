import { useCallback, useState, type ReactNode } from 'react';
import { googleLogout } from '@react-oauth/google';
import { WorkspaceChromeProvider } from './WorkspaceChromeContext';
import { AppSidebar, readSidebarCollapsed, writeSidebarCollapsed, type WorkspaceNavPage } from './AppSidebar';
import { WorkspaceHeader } from './WorkspaceHeader';
import { type AppSession } from '../../services/backendApi';
import { type GoogleIdTokenProfile } from '../../utils/googleIdTokenProfile';

const STORED_ID_TOKEN_KEY = 'google_id_token';

export function WorkspaceShell({
  session,
  googleProfile,
  workspacePage,
  onLogoutComplete,
  /** When true, main does not scroll; children own scroll (e.g. topic review fills viewport). */
  lockMainScroll = false,
  children,
}: {
  session: AppSession;
  googleProfile?: GoogleIdTokenProfile | null;
  workspacePage: WorkspaceNavPage;
  onLogoutComplete: () => void;
  lockMainScroll?: boolean;
  children: ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readSidebarCollapsed());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      writeSidebarCollapsed(next);
      return next;
    });
  };

  const handleLogout = useCallback(() => {
    googleLogout();
    try {
      localStorage.removeItem(STORED_ID_TOKEN_KEY);
    } catch {
      /* ignore */
    }
    onLogoutComplete();
  }, [onLogoutComplete]);

  return (
    <WorkspaceChromeProvider>
      <a
        href="#workspace-main"
        className="sr-only left-4 top-4 z-[100] rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-primary-fg shadow-lg ring-2 ring-primary/60 focus:fixed focus:not-sr-only focus:outline-none"
      >
        Skip to main content
      </a>
      <div className="flex min-h-screen w-full items-stretch bg-transparent">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleCollapsed}
          session={session}
          googleProfile={googleProfile ?? null}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <WorkspaceHeader
            workspacePage={workspacePage}
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            onLogout={handleLogout}
          />
          <main
            id="workspace-main"
            tabIndex={-1}
            className={
              lockMainScroll
                ? 'flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:px-6'
                : 'custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:px-6'
            }
          >
            {children}
          </main>
        </div>
      </div>
    </WorkspaceChromeProvider>
  );
}
