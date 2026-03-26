import clsx from 'clsx';
import { LogOut, Menu, RefreshCw } from 'lucide-react';
import { useWorkspaceChrome } from './WorkspaceChromeContext';
import { type WorkspaceNavPage } from './AppSidebar';
import { Button } from '@/components/ui/button';

const PAGE_TITLES: Record<WorkspaceNavPage, string> = {
  topics: 'Topics',
  settings: 'Settings',
};

export function WorkspaceHeader({
  workspacePage,
  onOpenMobileSidebar,
  onLogout,
}: {
  workspacePage: WorkspaceNavPage;
  onOpenMobileSidebar: () => void;
  onLogout: () => void;
}) {
  const { onRefreshQueue, queueLoading, headerOverride } = useWorkspaceChrome();
  const headerTitle = headerOverride?.title ?? PAGE_TITLES[workspacePage];
  const headerSubtitle =
    headerOverride?.subtitle ??
    (workspacePage === 'topics' ? 'Sheet queue and publish target' : null);

  return (
    <header className="glass-header sticky top-0 z-30 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon-lg"
          onClick={onOpenMobileSidebar}
          className="glass-inset size-9 shrink-0 cursor-pointer rounded-lg text-ink md:hidden"
          aria-label="Open menu"
          aria-controls="workspace-sidebar"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate font-heading text-base font-semibold text-ink sm:text-lg">
            {headerTitle}
          </h1>
          {headerSubtitle ? (
            <p className="truncate text-[11px] text-ink/55">{headerSubtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onRefreshQueue?.()}
          disabled={!onRefreshQueue || queueLoading}
          className="glass-inset h-9 min-h-9 cursor-pointer gap-2 rounded-xl px-3 text-xs font-semibold text-ink hover:bg-white/75 sm:px-4"
        >
          <RefreshCw className={clsx('h-3.5 w-3.5 shrink-0', queueLoading && 'animate-spin')} aria-hidden />
          <span>Refresh</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onLogout}
          className="glass-inset h-9 min-h-9 cursor-pointer gap-2 rounded-xl px-3 text-xs font-semibold text-ink hover:bg-white/75 sm:px-4"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Log out</span>
        </Button>
      </div>
    </header>
  );
}
