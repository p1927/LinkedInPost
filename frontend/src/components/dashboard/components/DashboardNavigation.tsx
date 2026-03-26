import { Settings } from 'lucide-react';
import { type DashboardTab, type QueueFilter } from '../types';
import { type AppSession } from '../../../services/backendApi';
import { dashboardTabs, filterOptions } from '../constants';

export function DashboardNavigation({
  activeDashboardTab,
  setActiveDashboardTab,
  setNavigationOpen,
  navigationCounts,
  setStatusFilter,
  queueCounts,
  session,
  setSettingsOpen,
}: {
  activeDashboardTab: DashboardTab;
  setActiveDashboardTab: (tab: DashboardTab) => void;
  setNavigationOpen: (open: boolean) => void;
  navigationCounts: Record<DashboardTab, number>;
  setStatusFilter: (filter: QueueFilter) => void;
  queueCounts: Record<QueueFilter, number>;
  session: AppSession;
  setSettingsOpen: (open: boolean) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200/80 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace navigation</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">Keep the shell compact. Open one workspace at a time.</p>
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

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quick status</p>
          <div className="mt-3 space-y-2">
            {filterOptions.slice(1).map((option) => (
              <button
                key={`nav-filter-${option.value}`}
                type="button"
                onClick={() => {
                  setStatusFilter(option.value);
                  setActiveDashboardTab('queue');
                  setNavigationOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-white"
              >
                <span>{option.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{queueCounts[option.value]}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-slate-200/80 px-4 py-4">
        <div className="rounded-[22px] border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Admin surface</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Configuration and channel setup stay outside the main dashboard canvas.</p>
          {session.isAdmin ? (
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
