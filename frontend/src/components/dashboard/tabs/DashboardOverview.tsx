import { type QueueFilter, type DashboardTab } from '../types';
import { type SheetRow } from '../../../services/sheets';
import { getNormalizedRowStatus } from '../utils';
import { getChannelLabel } from '../../../integrations/channels';
import { filterOptions } from '../constants';

import { type DeliverySummary } from '../types';
import { type ChannelId, type ChannelOption } from '../../../integrations/channels';

export function DashboardOverview({
  setActiveDashboardTab,
  setStatusFilter,
  statusFilter,
  queueCounts,
  queueSpotlightRows,
  getStatusColor,
  selectedChannel,
  deliveryTargetSummary,
  selectedChannelOption,
  linkedinConfigured,
  instagramConfigured,
  telegramConfigured,
  whatsappConfigured,
  lastDeliverySummary,
}: {
  setActiveDashboardTab: (tab: DashboardTab) => void;
  setStatusFilter: (filter: QueueFilter) => void;
  statusFilter: QueueFilter;
  queueCounts: Record<QueueFilter, number>;
  queueSpotlightRows: SheetRow[];
  getStatusColor: (status: string) => string;
  selectedChannel: ChannelId;
  deliveryTargetSummary: string;
  selectedChannelOption: ChannelOption;
  linkedinConfigured: boolean;
  instagramConfigured: boolean;
  telegramConfigured: boolean;
  whatsappConfigured: boolean;
  lastDeliverySummary: DeliverySummary | null;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Queue snapshot</p>
              <h3 className="mt-2 text-2xl font-bold text-deep-indigo font-heading">Status at a glance</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveDashboardTab('queue')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Go to Queue →
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setStatusFilter(option.value);
                  setActiveDashboardTab('queue');
                }}
                className={`rounded-[24px] border px-4 py-4 text-left transition-all ${statusFilter === option.value ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${statusFilter === option.value ? 'text-slate-300' : 'text-slate-400'}`}>{option.label}</p>
                <p className="mt-2 text-2xl font-semibold">{queueCounts[option.value]}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/50 bg-white/85 shadow-xl backdrop-blur-md overflow-hidden">
          <div className="border-b border-slate-200/80 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Up next</p>
                <h3 className="mt-2 text-2xl font-bold text-deep-indigo font-heading">Items needing attention</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {filterOptions.find((option) => option.value === statusFilter)?.label}
              </span>
            </div>
          </div>
          <div className="space-y-0">
            {queueSpotlightRows.length === 0 ? (
              <div className="px-6 py-14 text-center text-slate-500">
                <p className="text-lg font-semibold text-slate-700">No rows match the current filter.</p>
                <p className="mt-1 text-sm text-slate-500">Switch filters or open the queue tab for the full list.</p>
              </div>
            ) : (
              queueSpotlightRows.map((row) => (
                <button
                  key={`spotlight-${row.sourceSheet}-${row.rowIndex}`}
                  type="button"
                  onClick={() => {
                    setActiveDashboardTab('queue');
                    setStatusFilter(getNormalizedRowStatus(row.status) as QueueFilter);
                  }}
                  className="w-full border-t border-slate-100 first:border-t-0 px-6 py-5 text-left transition-colors hover:bg-slate-50/60"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="text-base font-semibold text-slate-900">{row.topic}</h4>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold shadow-sm ${getStatusColor(row.status)}`}>
                      {row.status || 'Pending'}
                    </span>
                    <span className="text-sm text-slate-500">{row.date}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{(row.selectedText || row.variant1 || 'No draft content yet.').trim()}</p>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active delivery target</p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-deep-indigo font-heading">{getChannelLabel(selectedChannel)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Approved posts will use this destination until you change it.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveDashboardTab('delivery')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Edit delivery
            </button>
          </div>
          <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Current destination</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{deliveryTargetSummary}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{selectedChannelOption.description}</p>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Publishing health</p>
          <div className="mt-4 space-y-3">
            {[
              { label: 'LinkedIn', ready: linkedinConfigured },
              { label: 'Instagram', ready: instagramConfigured },
              { label: 'Telegram', ready: telegramConfigured },
              { label: 'WhatsApp', ready: whatsappConfigured },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {item.ready ? 'Connected' : 'Needs setup'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {lastDeliverySummary ? (
          <section className="rounded-[32px] border border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96)_0%,rgba(240,249,255,0.92)_100%)] p-5 shadow-[0_12px_30px_rgba(16,185,129,0.08)]">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700/70">Last delivery</p>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-emerald-200">
                {getChannelLabel(lastDeliverySummary.channel)}
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-emerald-200">
                {lastDeliverySummary.mediaMode === 'image' ? 'Image post' : 'Text post'}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {lastDeliverySummary.channel === 'whatsapp' || lastDeliverySummary.channel === 'telegram'
                ? `Delivered to ${lastDeliverySummary.recipientLabel}.`
                : lastDeliverySummary.channel === 'instagram'
                  ? lastDeliverySummary.recipientLabel === 'connected account'
                    ? 'Published to Instagram using the connected professional account.'
                    : `Published to Instagram as @${lastDeliverySummary.recipientLabel}.`
                  : 'Delivered to LinkedIn using the currently approved text and selected media.'}
            </p>
          </section>
        ) : null}
      </div>
    </section>
  );
}
