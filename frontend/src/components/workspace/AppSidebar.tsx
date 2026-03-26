import clsx from 'clsx';
import { type ReactNode, useEffect, useState } from 'react';
import { googleLogout } from '@react-oauth/google';
import { ChevronLeft, ChevronRight, Home, ListOrdered, LogOut, Settings } from 'lucide-react';
import { type AppSession } from '../../services/backendApi';
import { type GoogleIdTokenProfile } from '../../utils/googleIdTokenProfile';
import { useWorkspaceChrome } from './WorkspaceChromeContext';

const STORED_ID_TOKEN_KEY = 'google_id_token';

export type WorkspaceNavPage = 'home' | 'topics' | 'settings';

const SIDEBAR_COLLAPSED_KEY = 'channelbot_sidebar_collapsed';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80';

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

function SidebarUserAvatar({
  email,
  pictureUrl,
  displayName,
  collapsed,
}: {
  email: string;
  pictureUrl?: string | null;
  displayName?: string | null;
  collapsed: boolean;
}) {
  const [pictureFailed, setPictureFailed] = useState(false);

  useEffect(() => {
    setPictureFailed(false);
  }, [pictureUrl]);

  const initials = navEmailInitials(email);
  const showPicture = Boolean(pictureUrl && !pictureFailed);
  const avatarLabel = displayName ? `${displayName} (${email})` : email;
  const imgAlt = displayName ? `${displayName} profile photo` : `Profile photo for ${email}`;

  return (
    <div
      className={clsx(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 ring-2 ring-white/90 shadow-sm',
        collapsed ? 'h-10 w-10' : 'h-9 w-9',
      )}
      title={collapsed ? avatarLabel : undefined}
      {...(collapsed
        ? { role: 'img' as const, 'aria-label': avatarLabel }
        : { 'aria-hidden': true as const })}
    >
      {showPicture ? (
        <img
          src={pictureUrl!}
          alt={collapsed ? '' : imgAlt}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setPictureFailed(true)}
        />
      ) : (
        <span className="text-xs font-bold text-primary" aria-hidden>
          {initials}
        </span>
      )}
    </div>
  );
}

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
  workspacePage,
  onNavigate,
  session,
  googleProfile,
  onLogoutComplete,
  mobileOpen,
  onMobileOpenChange,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  workspacePage: WorkspaceNavPage;
  onNavigate: (page: WorkspaceNavPage) => void;
  session: AppSession;
  googleProfile?: GoogleIdTokenProfile | null;
  onLogoutComplete: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const { health } = useWorkspaceChrome();
  const closeMobile = () => onMobileOpenChange(false);
  const displayName = googleProfile?.name?.trim() || null;
  const pictureUrl = googleProfile?.picture?.trim() || null;

  const handleLogout = () => {
    googleLogout();
    localStorage.removeItem(STORED_ID_TOKEN_KEY);
    onLogoutComplete();
    closeMobile();
  };

  const link = (page: WorkspaceNavPage, icon: ReactNode, label: string) => {
    const active = workspacePage === page;
    return (
      <li key={page}>
        <button
          type="button"
          onClick={() => {
            onNavigate(page);
            closeMobile();
          }}
          aria-current={active ? 'page' : undefined}
          aria-label={collapsed ? label : undefined}
          title={collapsed ? label : undefined}
          className={clsx(
            'flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold transition-colors duration-200',
            focusRing,
            active
              ? 'bg-white/70 text-ink shadow-sm ring-1 ring-white/60 backdrop-blur-md'
              : 'text-muted hover:bg-white/45 hover:text-ink',
            collapsed && 'justify-center gap-0 px-1.5',
          )}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-ink [&>svg]:h-4 [&>svg]:w-4"
            aria-hidden
          >
            {icon}
          </span>
          {!collapsed ? <span className="min-w-0 flex-1 truncate text-left">{label}</span> : null}
        </button>
      </li>
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className={clsx(
          'fixed inset-0 z-40 bg-deep-purple/20 backdrop-blur-sm transition-opacity duration-200 md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={closeMobile}
      />

      <aside
        id="workspace-sidebar"
        data-collapsed={collapsed ? 'true' : 'false'}
        className={clsx(
          'custom-scrollbar glass-sidebar flex min-h-screen w-60 max-w-[85vw] shrink-0 flex-col self-stretch border-r border-white/50 transition-[transform,width] duration-200 ease-out motion-reduce:transition-none',
          collapsed ? 'md:w-[4.5rem]' : 'md:w-60',
          'fixed bottom-0 left-0 top-0 z-50 md:static md:max-w-none',
          mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full md:translate-x-0 md:shadow-none',
        )}
      >
        <div
          className={clsx(
            'shrink-0 border-b border-white/40 px-2 py-2.5',
            collapsed ? 'flex flex-col items-center gap-2' : 'flex h-14 items-center justify-between gap-2',
          )}
        >
          <div className={clsx('flex min-w-0 items-center gap-2', collapsed && 'w-full justify-center')}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary font-heading text-sm font-semibold text-primary-fg shadow-sm">
              CB
            </div>
            {!collapsed ? (
              <span className="truncate font-heading text-sm font-semibold text-ink">Channel Bot</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="workspace-sidebar-nav"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={clsx(
              'glass-inset hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-white/80 hover:text-ink md:flex',
              focusRing,
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-hidden" aria-label="Workspace navigation">
          <ul id="workspace-sidebar-nav" className="custom-scrollbar flex flex-1 list-none flex-col gap-0.5 overflow-y-auto p-2">
            {link('home', <Home aria-hidden />, 'Home')}
            {link('topics', <ListOrdered aria-hidden />, 'Topics')}
            {session.isAdmin ? link('settings', <Settings aria-hidden />, 'Settings') : null}
          </ul>
        </nav>

        {workspacePage === 'settings' && session.isAdmin && health ? (
          <div
            className={clsx(
              'shrink-0 border-t border-white/40 px-2 py-3',
              collapsed ? 'flex flex-col items-center gap-2' : 'px-3',
            )}
            aria-label="Publishing connections"
          >
            {!collapsed ? (
              <>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Connections</p>
                <ul className="list-none space-y-1.5">
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
                      className="glass-inset flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5"
                    >
                      <span className="text-xs font-medium text-ink">{label}</span>
                      <span
                        className={clsx(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          ok ? 'border border-success-border bg-success-surface text-success-ink' : 'bg-surface-muted text-muted',
                        )}
                      >
                        {ok ? 'Connected' : 'Not connected'}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <ul className="flex list-none flex-col items-center gap-2 py-1">
                {(
                  [
                    { id: 'li', label: 'LinkedIn', ok: health.linkedin },
                    { id: 'ig', label: 'Instagram', ok: health.instagram },
                    { id: 'tg', label: 'Telegram', ok: health.telegram },
                    { id: 'wa', label: 'WhatsApp', ok: health.whatsapp },
                  ] as const
                ).map(({ id, label, ok }) => (
                  <li key={id}>
                    <span
                      title={`${label}: ${ok ? 'Connected' : 'Not connected'}`}
                      className={clsx(
                        'block h-2.5 w-2.5 rounded-full border border-border',
                        ok ? 'bg-cta' : 'bg-border-strong',
                      )}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <div className="mt-auto border-t border-white/40 p-2">
          <div
            className={clsx(
              'rounded-xl border border-white/35 bg-white/40 p-2 shadow-sm backdrop-blur-sm',
              collapsed ? 'flex flex-col items-center gap-2' : 'flex flex-row items-center gap-2.5',
            )}
          >
            <SidebarUserAvatar
              email={session.email}
              pictureUrl={pictureUrl}
              displayName={displayName}
              collapsed={collapsed}
            />
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                {displayName ? (
                  <p className="truncate text-xs font-semibold text-ink">{displayName}</p>
                ) : null}
                <p
                  className={clsx(
                    'truncate text-xs font-medium text-ink',
                    displayName ? 'text-muted' : 'font-semibold text-ink',
                  )}
                >
                  {session.email}
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={clsx(
                    'mt-1 inline-flex cursor-pointer items-center gap-1 rounded-md text-xs font-semibold text-muted transition-colors duration-200 hover:bg-white/50 hover:text-ink',
                    focusRing,
                    'px-1 py-0.5 -ml-1',
                  )}
                >
                  <LogOut className="h-3 w-3 shrink-0" aria-hidden />
                  Log out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
                className={clsx(
                  'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-white/60 hover:text-ink',
                  focusRing,
                )}
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
