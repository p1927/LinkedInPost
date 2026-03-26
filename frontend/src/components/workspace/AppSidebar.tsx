import clsx from 'clsx';
import { type ReactNode } from 'react';
import { googleLogout } from '@react-oauth/google';
import { ChevronLeft, ChevronRight, Home, ListOrdered, LogOut, Settings } from 'lucide-react';
import { type AppSession } from '../../services/backendApi';
import { useWorkspaceChrome } from './WorkspaceChromeContext';

const STORED_ID_TOKEN_KEY = 'google_id_token';

export type WorkspaceNavPage = 'home' | 'topics' | 'settings';

const SIDEBAR_COLLAPSED_KEY = 'channelbot_sidebar_collapsed';

export function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function navEmailInitials(email: string): string {
  const part = email.split('@')[0] || email;
  const chunks = part.split(/[._-]+/).filter(Boolean);
  if (chunks.length >= 2) {
    return (chunks[0][0] + chunks[1][0]).toUpperCase();
  }
  return part.slice(0, 2).toUpperCase() || '?';
}

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
  workspacePage,
  onNavigate,
  session,
  onLogoutComplete,
  mobileOpen,
  onMobileOpenChange,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  workspacePage: WorkspaceNavPage;
  onNavigate: (page: WorkspaceNavPage) => void;
  session: AppSession;
  onLogoutComplete: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const { health } = useWorkspaceChrome();
  const closeMobile = () => onMobileOpenChange(false);

  const handleLogout = () => {
    googleLogout();
    localStorage.removeItem(STORED_ID_TOKEN_KEY);
    onLogoutComplete();
    closeMobile();
  };

  const link = (page: WorkspaceNavPage, icon: ReactNode, label: string) => {
    const active = workspacePage === page;
    return (
      <button
        type="button"
        onClick={() => {
          onNavigate(page);
          closeMobile();
        }}
        title={collapsed ? label : undefined}
        className={clsx(
          'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold transition-colors',
          active
            ? 'bg-canvas text-ink shadow-sm ring-1 ring-border'
            : 'text-muted hover:bg-canvas/80 hover:text-ink',
          collapsed && 'justify-center px-0',
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-ink [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
        {!collapsed ? <span className="truncate text-left">{label}</span> : null}
      </button>
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className={clsx(
          'fixed inset-0 z-40 bg-ink/25 backdrop-blur-[1px] transition-opacity md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={closeMobile}
      />

      <aside
        id="workspace-sidebar"
        data-collapsed={collapsed ? 'true' : 'false'}
        className={clsx(
          'custom-scrollbar flex min-h-screen w-60 max-w-[85vw] shrink-0 flex-col self-stretch border-r border-border bg-surface transition-[transform,width] duration-200 ease-out',
          collapsed ? 'md:w-[4.5rem]' : 'md:w-60',
          'fixed bottom-0 left-0 top-0 z-50 md:static md:max-w-none',
          mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full md:translate-x-0 md:shadow-none',
        )}
      >
        <div
          className={clsx(
            'shrink-0 border-b border-border px-2 py-2.5',
            collapsed ? 'flex flex-col items-center gap-2' : 'flex h-14 items-center justify-between gap-2',
          )}
        >
          <div className={clsx('flex min-w-0 items-center gap-2', collapsed && 'justify-center')}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary font-heading text-sm font-semibold text-primary-fg">
              CB
            </div>
            {!collapsed ? (
              <span className="truncate font-heading text-sm font-semibold text-ink">Channel Bot</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-canvas text-muted transition-colors hover:text-ink md:flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" aria-hidden />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Workspace">
          {link('home', <Home aria-hidden />, 'Home')}
          {link('topics', <ListOrdered aria-hidden />, 'Topics')}
          {session.isAdmin ? link('settings', <Settings aria-hidden />, 'Settings') : null}
        </nav>

        {workspacePage === 'settings' && session.isAdmin && health ? (
          <div
            className={clsx(
              'shrink-0 border-t border-border px-2 py-3',
              collapsed ? 'flex flex-col items-center gap-2' : 'px-3',
            )}
            aria-label="Publishing connections"
          >
            {!collapsed ? (
              <>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Connections</p>
                <ul className="space-y-1.5">
                  {(
                    [
                      { id: 'li', label: 'LinkedIn', ok: health.linkedin },
                      { id: 'ig', label: 'Instagram', ok: health.instagram },
                      { id: 'tg', label: 'Telegram', ok: health.telegram },
                      { id: 'wa', label: 'WhatsApp', ok: health.whatsapp },
                    ] as const
                  ).map(({ id, label, ok }) => (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-canvas px-2.5 py-1.5"
                    >
                      <span className="text-xs font-medium text-ink">{label}</span>
                      <span
                        className={clsx(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          ok ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-muted text-muted',
                        )}
                      >
                        {ok ? 'Connected' : 'Not connected'}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-1">
                {(
                  [
                    { id: 'li', label: 'LinkedIn', ok: health.linkedin },
                    { id: 'ig', label: 'Instagram', ok: health.instagram },
                    { id: 'tg', label: 'Telegram', ok: health.telegram },
                    { id: 'wa', label: 'WhatsApp', ok: health.whatsapp },
                  ] as const
                ).map(({ id, label, ok }) => (
                  <span
                    key={id}
                    title={`${label}: ${ok ? 'Connected' : 'Not connected'}`}
                    className={clsx(
                      'h-2.5 w-2.5 rounded-full border border-border',
                      ok ? 'bg-emerald-500' : 'bg-border-strong',
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-auto border-t border-border p-2">
          <div
            className={clsx(
              'flex items-center gap-2 rounded-lg border border-transparent p-1.5',
              collapsed ? 'flex-col' : 'flex-row',
            )}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
              title={session.email}
            >
              {navEmailInitials(session.email)}
            </div>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink">{session.email}</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-ink"
                >
                  <LogOut className="h-3 w-3" aria-hidden />
                  Log out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
