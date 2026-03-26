import { Settings } from 'lucide-react';
import { type DashboardTab } from '../types';
import { type AppSession } from '../../../services/backendApi';
import { dashboardTabs } from '../constants';

export function DashboardNavigation({
  activeDashboardTab,
  setActiveDashboardTab,
  setNavigationOpen,
  navigationCounts,
  session,
  setSettingsOpen,
}: {
  activeDashboardTab: DashboardTab;
  setActiveDashboardTab: (tab: DashboardTab) => void;
  setNavigationOpen: (open: boolean) => void;
  navigationCounts: Record<DashboardTab, number>;
  session: AppSession;
  setSettingsOpen: (open: boolean) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200/80 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
        <p className="mt-1 truncate text-sm font-medium text-slate-700">{session.email}</p>
      </div>

      <nav className="flex-1 px-3 py-4">
        <div className="space-y-2">
          {dashboardTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeDashboardTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveDashboardTab(tab.value);
                  setNavigationOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${selected ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${selected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{tab.label}</span>
                  <span className={`block truncate text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>{tab.description}</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {navigationCounts[tab.value]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {session.isAdmin ? (
        <div className="border-t border-slate-200/80 px-4 py-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Admin</p>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(true);
                setNavigationOpen(false);
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Settings className="h-4 w-4" />
              Open settings drawer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
