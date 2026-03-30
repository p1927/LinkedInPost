import clsx from 'clsx';
import { ChevronLeft, ChevronRight, LogOut, Menu, RefreshCw } from 'lucide-react';
import { useWorkspaceChrome } from './WorkspaceChromeContext';
import { type WorkspaceNavPage } from './AppSidebar';
import { Button } from '@/components/ui/button';

const PAGE_TITLES: Record<WorkspaceNavPage, string> = {
  topics: 'Topics',
  settings: 'Settings',
  rules: 'Global rules',
  campaign: 'Campaign',
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
  const { onRefreshQueue, queueLoading, headerOverride, topicReviewHeader } = useWorkspaceChrome();
  const headerTitle = headerOverride?.title ?? PAGE_TITLES[workspacePage];
  const headerSubtitle = headerOverride?.subtitle ?? null;

  const titleBlock = (
    <div className="min-w-0 flex-1 leading-tight">
      {topicReviewHeader?.crumbs.length ? (
        <nav aria-label="Breadcrumb" className="mb-2.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink/50">
          {topicReviewHeader.crumbs.map((c, i) => (
            <span key={c.key} className="flex min-w-0 max-w-full items-center gap-1.5">
              {i > 0 ? (
                <ChevronRight className="size-3.5 shrink-0 text-ink/40 transition-colors duration-200" aria-hidden />
              ) : null}
              {c.onPress ? (
                <button
                  type="button"
                  onClick={c.onPress}
                  className="min-w-0 truncate text-left font-medium text-indigo-600 underline-offset-2 transition-colors duration-200 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 cursor-pointer"
                  aria-label={`Navigate to ${c.label}`}
                  title={c.labelTitle}
                >
                  {c.label}
                </button>
              ) : (
                <span
                  className={clsx(
                    'min-w-0 truncate font-medium transition-colors duration-200',
                    c.current ? 'font-semibold text-ink/80' : 'text-ink/60',
                  )}
                  aria-current={c.current ? 'page' : undefined}
                  title={c.labelTitle}
                >
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <h1
        className={clsx(
          'min-w-0 font-heading font-bold text-ink',
          headerOverride ? 'truncate text-lg leading-tight sm:text-xl' : 'truncate text-base sm:text-lg',
        )}
        title={headerOverride?.titleTooltip ?? undefined}
      >
        {headerTitle}
      </h1>
      {headerSubtitle ? (
        <p
          className={clsx(
            'mt-1 line-clamp-2 text-xs font-medium text-ink/60 transition-colors duration-200',
            headerOverride ? 'uppercase tracking-widest' : 'font-normal tracking-normal',
          )}
        >
          {headerSubtitle}
        </p>
      ) : null}
    </div>
  );

  return (
    <header
      className={clsx(
        'glass-header sticky top-0 z-30 flex min-h-[4.25rem] shrink-0 flex-col justify-center gap-2 border-b px-3 py-2.5 sm:min-h-[4.75rem] sm:flex-row sm:justify-between sm:gap-4 sm:px-4 sm:py-3',
        topicReviewHeader ? 'sm:items-start' : 'sm:items-center',
      )}
    >
      {topicReviewHeader ? (
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          <div className="flex min-w-0 flex-wrap items-start gap-2 pt-0.5">
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
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              onClick={topicReviewHeader.onBackToVariants || topicReviewHeader.onBackToTopics}
              className="h-10 w-10 shrink-0 rounded-lg text-slate-700 transition-all duration-200 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
              aria-label={topicReviewHeader.onBackToVariants ? "Back to variants" : "Back to topics list"}
              title={topicReviewHeader.onBackToVariants ? "Back to variants" : "Back to topics"}
            >
              <ChevronLeft className="size-5 shrink-0" aria-hidden />
            </Button>
          </div>
          {titleBlock}
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
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
          {titleBlock}
        </div>
      )}

      <div
        className={clsx(
          'flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3',
          topicReviewHeader && 'self-start pt-0.5',
        )}
      >
        {topicReviewHeader?.pickToolbar ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => topicReviewHeader.pickToolbar?.onMedia()}
              className="h-9 min-h-9 gap-1.5 px-3.5 text-xs font-semibold transition-all duration-200 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
              aria-label="Open media panel"
            >
              Media
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => topicReviewHeader.pickToolbar?.onOpenEditor()}
              className="h-9 min-h-9 gap-1.5 px-3.5 text-xs font-semibold bg-indigo-600 text-white transition-all duration-200 hover:bg-indigo-700 active:bg-indigo-800 shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 cursor-pointer"
              aria-label="Open draft in editor"
            >
              Open in editor
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onRefreshQueue?.()}
          disabled={!onRefreshQueue || queueLoading}
          className="h-9 min-h-9 gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer sm:px-4"
          aria-label="Refresh queue"
        >
          <RefreshCw className={clsx('h-3.5 w-3.5 shrink-0', queueLoading && 'animate-spin')} aria-hidden />
          <span>Refresh</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onLogout}
          className="h-9 min-h-9 gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer sm:px-4"
          aria-label="Log out"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Log out</span>
        </Button>
      </div>
    </header>
  );
}
