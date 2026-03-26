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
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
        <p className="mt-0.5 truncate text-xs font-medium text-slate-600">{session.email}</p>
      </div>

      <nav className="flex-1 px-2 py-3">
        <div className="space-y-0.5">
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
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${selected ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${selected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">{tab.label}</span>
                  <span className={`block truncate text-[11px] ${selected ? 'text-slate-400' : 'text-slate-400'}`}>{tab.description}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${selected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {navigationCounts[tab.value]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {session.isAdmin ? (
        <div className="border-t border-slate-100 px-3 py-3">
          <button
            type="button"
            onClick={() => {
              setSettingsOpen(true);
              setNavigationOpen(false);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            Settings
          </button>
        </div>
      ) : null}
    </div>
  );
}
