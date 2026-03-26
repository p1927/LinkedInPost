import clsx from 'clsx';
import { Menu, RefreshCw } from 'lucide-react';
import { useWorkspaceChrome } from './WorkspaceChromeContext';
import { type WorkspaceNavPage } from './AppSidebar';

const PAGE_TITLES: Record<WorkspaceNavPage, string> = {
  home: 'Home',
  topics: 'Topics',
  settings: 'Settings',
};

export function WorkspaceHeader({
  workspacePage,
  onOpenMobileSidebar,
}: {
  workspacePage: WorkspaceNavPage;
  onOpenMobileSidebar: () => void;
}) {
  const { onRefreshQueue, queueLoading } = useWorkspaceChrome();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/95 px-3 backdrop-blur-sm sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-canvas text-ink transition-colors hover:bg-surface-muted md:hidden"
          aria-label="Open menu"
          aria-controls="workspace-sidebar"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="truncate font-heading text-base font-semibold text-ink sm:text-lg">
          {PAGE_TITLES[workspacePage]}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => onRefreshQueue?.()}
          disabled={!onRefreshQueue || queueLoading}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-canvas px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45 sm:px-4"
        >
          <RefreshCw className={clsx('h-3.5 w-3.5 shrink-0', queueLoading && 'animate-spin')} aria-hidden />
          <span className="hidden sm:inline">Refresh from Sheets</span>
          <span className="sm:hidden">Refresh</span>
        </button>
      </div>
    </header>
  );
}
