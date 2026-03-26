import { useState, type ReactNode } from 'react';
import { WorkspaceChromeProvider } from './WorkspaceChromeContext';
import { AppSidebar, readSidebarCollapsed, writeSidebarCollapsed, type WorkspaceNavPage } from './AppSidebar';
import { WorkspaceHeader } from './WorkspaceHeader';
import { type AppSession } from '../../services/backendApi';

export function WorkspaceShell({
  session,
  workspacePage,
  onWorkspacePageChange,
  onLogoutComplete,
  children,
}: {
  session: AppSession;
  workspacePage: WorkspaceNavPage;
  onWorkspacePageChange: (page: WorkspaceNavPage) => void;
  onLogoutComplete: () => void;
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

  return (
    <WorkspaceChromeProvider>
      <div className="flex min-h-screen w-full items-stretch bg-canvas">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleCollapsed}
          workspacePage={workspacePage}
          onNavigate={onWorkspacePageChange}
          session={session}
          onLogoutComplete={onLogoutComplete}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <WorkspaceHeader
            workspacePage={workspacePage}
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          />
          <main className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </WorkspaceChromeProvider>
  );
}
