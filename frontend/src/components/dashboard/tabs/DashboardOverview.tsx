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
  onEditDelivery,
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
  onEditDelivery: () => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
      {/* Left column */}
      <div className="space-y-4">
        {/* Stat cards */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Queue snapshot</p>
              <h3 className="mt-0.5 text-sm font-semibold text-slate-900">Status at a glance</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveDashboardTab('queue')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              Go to Queue →
            </button>
          </div>

          <div className="mt-4 grid gap-2 grid-cols-2 sm:grid-cols-5">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setStatusFilter(option.value);
                  setActiveDashboardTab('queue');
                }}
                className={`rounded-xl border px-3 py-3 text-left transition-all cursor-pointer ${statusFilter === option.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'}`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-widest ${statusFilter === option.value ? 'text-slate-400' : 'text-slate-400'}`}>{option.label}</p>
                <p className="mt-1 text-xl font-bold">{queueCounts[option.value]}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Spotlight rows */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Up next</p>
              <h3 className="mt-0.5 text-sm font-semibold text-slate-900">Items needing attention</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {filterOptions.find((option) => option.value === statusFilter)?.label}
            </span>
          </div>
          <div>
            {queueSpotlightRows.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-600">No rows match the current filter.</p>
                <p className="mt-1 text-xs text-slate-400">Switch filters or open the queue tab.</p>
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
                  className="w-full border-t border-slate-100 first:border-t-0 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 cursor-pointer"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{row.topic}</h4>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusColor(row.status)}`}>
                      {row.status || 'Pending'}
                    </span>
                    <span className="text-xs text-slate-400">{row.date}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">{(row.selectedText || row.variant1 || 'No draft content yet.').trim()}</p>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Right column */}
      <div className="space-y-4">
        {/* Delivery target */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Delivery target</p>
              <h3 className="mt-0.5 text-sm font-semibold text-slate-900">{getChannelLabel(selectedChannel)}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Approved posts use this destination.</p>
            </div>
            <button
              type="button"
              onClick={onEditDelivery}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 shrink-0 cursor-pointer"
            >
              Edit
            </button>
          </div>
          <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Destination</p>
            <p className="mt-1 text-xs font-semibold text-slate-800">{deliveryTargetSummary}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{selectedChannelOption.description}</p>
          </div>
        </section>

        {/* Publishing health */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Publishing health</p>
          <div className="mt-3 space-y-1.5">
            {[
              { label: 'LinkedIn', ready: linkedinConfigured },
              { label: 'Instagram', ready: instagramConfigured },
              { label: 'Telegram', ready: telegramConfigured },
              { label: 'WhatsApp', ready: whatsappConfigured },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${item.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {item.ready ? 'Connected' : 'Setup needed'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Last delivery */}
        {lastDeliverySummary ? (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Last delivery</p>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-emerald-200">
                {getChannelLabel(lastDeliverySummary.channel)}
              </span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-emerald-200">
                {lastDeliverySummary.mediaMode === 'image' ? 'Image post' : 'Text post'}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
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
