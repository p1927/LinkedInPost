import clsx from 'clsx';
import { type ReactNode, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart2, ChevronLeft, ChevronRight, GitBranch, ListOrdered, Megaphone, PlusCircle, PlugZap, ScrollText, Settings, TrendingUp, Wrench, Zap } from 'lucide-react';
import { type AppSession } from '../../services/backendApi';
import { WORKSPACE_PATHS } from '../../features/topic-navigation/utils/workspaceRoutes';
import { type GoogleIdTokenProfile } from '../../utils/googleIdTokenProfile';
import { useWorkspaceChrome } from './WorkspaceChromeContext';
import { Button } from '@/components/ui/button';
import { getAppBuildLabel } from '@/lib/appBuildLabel';
import { FEATURE_CAMPAIGN } from '@/generated/features';

export type WorkspaceNavPage = 'topics' | 'add-topic' | 'settings' | 'rules' | 'campaign' | 'usage' | 'connections' | 'enrichment' | 'trending' | 'automations' | 'setup';

const SIDEBAR_COLLAPSED_KEY = 'channelbot_sidebar_collapsed';

/** One module for square rail controls (collapsed + expanded icon cells). */
const RAIL_TILE = 'h-10 w-10 min-h-10 min-w-10 shrink-0';
const RAIL_RADIUS = 'rounded-xl';
const RAIL_ICON = '[&>svg]:h-[1.125rem] [&>svg]:w-[1.125rem]';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

const navButtonBase =
  'relative flex w-full min-h-10 cursor-pointer items-center text-sm font-semibold transition-[background-color,border-color,box-shadow,color] duration-200';

const navInactive =
  'border border-white/40 bg-white/30 text-muted hover:border-white/55 hover:bg-white/45 hover:text-ink';

const navActive =
  'border border-primary/25 bg-white/65 text-ink shadow-sm before:pointer-events-none before:absolute before:left-0 before:top-1/2 before:h-7 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-primary';

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
    setPictureFailed(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pictureUrl]);

  const initials = navEmailInitials(email);
  const showPicture = Boolean(pictureUrl && !pictureFailed);
  const avatarLabel = displayName ? `${displayName} (${email})` : email;
  const imgAlt = displayName ? `${displayName} profile photo` : `Profile photo for ${email}`;

  return (
    <div
      className={clsx(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 ring-2 ring-white/90 shadow-sm',
        RAIL_TILE,
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
  session,
  googleProfile,
  mobileOpen,
  onMobileOpenChange,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  session: AppSession;
  googleProfile?: GoogleIdTokenProfile | null;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const { hasUnsavedChanges } = useWorkspaceChrome();
  const closeMobile = () => onMobileOpenChange(false);
  const displayName = googleProfile?.name?.trim() || null;
  const pictureUrl = googleProfile?.picture?.trim() || null;
  const buildLabel = getAppBuildLabel();

  const link = (page: WorkspaceNavPage, icon: ReactNode, label: string) => {
    const to =
      page === 'topics'
        ? WORKSPACE_PATHS.topics
        : page === 'add-topic'
          ? WORKSPACE_PATHS.addTopic
          : page === 'rules'
            ? WORKSPACE_PATHS.rules
            : page === 'campaign'
              ? WORKSPACE_PATHS.campaign
              : page === 'usage'
                ? WORKSPACE_PATHS.usage
                : page === 'connections'
                  ? WORKSPACE_PATHS.connections
                  : page === 'enrichment'
                    ? WORKSPACE_PATHS.enrichment
                    : page === 'trending'
                      ? WORKSPACE_PATHS.trending
                      : page === 'settings'
                        ? WORKSPACE_PATHS.settings
                        : page === 'setup'
                          ? WORKSPACE_PATHS.setup
                          : WORKSPACE_PATHS.automations; // explicit — not a fallthrough
    return (
      <li key={page}>
        <NavLink
          to={to}
          end={page === 'topics'}
          onClick={(e) => {
            if (hasUnsavedChanges) {
              if (!window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                e.preventDefault();
                return;
              }
            }
            closeMobile();
          }}
          aria-label={collapsed ? label : undefined}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            clsx(
              navButtonBase,
              RAIL_RADIUS,
              focusRing,
              'overflow-hidden backdrop-blur-sm no-underline',
              isActive ? navActive : navInactive,
              collapsed ? 'h-10 justify-center gap-0 px-2 py-0' : 'gap-3 px-2 py-2',
            )
          }
        >
          <span
            className={clsx(
              'flex shrink-0 items-center justify-center text-ink',
              RAIL_ICON,
              collapsed ? 'h-6 w-6' : clsx(RAIL_TILE, RAIL_RADIUS),
            )}
            aria-hidden
          >
            {icon}
          </span>
          {!collapsed ? <span className="min-w-0 flex-1 truncate text-left">{label}</span> : null}
        </NavLink>
      </li>
    );
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        aria-label="Close menu"
        className={clsx(
          'fixed inset-0 z-40 min-h-0 rounded-none border-0 bg-deep-purple/20 p-0 backdrop-blur-sm transition-opacity duration-200 md:hidden',
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
            collapsed ? 'flex flex-col items-center gap-1.5' : 'flex h-14 items-center justify-between gap-2',
          )}
        >
          {!collapsed ? (
            <div className="flex min-w-0 items-center gap-2">
              <div
                className={clsx(
                  'flex shrink-0 items-center justify-center bg-primary font-heading text-sm font-semibold text-primary-fg shadow-sm',
                  RAIL_TILE,
                  RAIL_RADIUS,
                )}
              >
                CB
              </div>
              <span className="truncate font-heading text-sm font-semibold text-ink">Channel Bot</span>
            </div>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="workspace-sidebar-nav"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={clsx(
              'glass-inset hidden cursor-pointer items-center justify-center border border-white/45 text-muted transition-colors duration-200 hover:bg-white/80 hover:text-ink md:flex',
              RAIL_TILE,
              RAIL_RADIUS,
              focusRing,
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" />}
            <span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          </Button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-label="Workspace navigation">
          <ul
            id="workspace-sidebar-nav"
            className="custom-scrollbar shrink-0 list-none flex flex-col gap-1.5 overflow-y-auto p-2"
          >
            {link('topics', <ListOrdered aria-hidden />, 'Topics')}
            {link('add-topic', <PlusCircle aria-hidden />, 'New Topic')}
            {FEATURE_CAMPAIGN ? link('campaign', <Megaphone aria-hidden />, 'Campaign') : null}
            {link('rules', <ScrollText aria-hidden />, 'Rules')}
            {link('usage', <BarChart2 aria-hidden />, 'Usage')}
            {link('connections', <PlugZap aria-hidden />, 'Connections')}
            {session.isAdmin ? link('enrichment', <GitBranch aria-hidden />, 'Enrichment') : null}
            {link('trending', <TrendingUp aria-hidden />, 'Trending')}
            {session.isAdmin ? link('settings', <Settings aria-hidden />, 'Settings') : null}
            {session.isAdmin ? link('automations', <Zap aria-hidden />, 'Automations') : null}
            {session.isAdmin ? link('setup', <Wrench aria-hidden />, 'Setup') : null}
          </ul>
        </nav>

        <div className="mt-auto shrink-0 border-t border-white/40 p-2">
          <div
            className={clsx(
              'rounded-xl border border-white/40 bg-white/35 shadow-sm backdrop-blur-sm',
              collapsed ? 'flex flex-col items-center px-2 py-3' : 'flex flex-row items-center gap-2.5 p-2.5',
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
              </div>
            ) : null}
          </div>
          <p
            className={clsx(
              'mt-2 min-w-0 text-[10px] leading-tight tracking-tight text-muted/70 tabular-nums',
              collapsed ? 'truncate text-center' : 'px-0.5',
            )}
            title={buildLabel}
          >
            {buildLabel}
          </p>
        </div>
      </aside>
    </>
  );
}
