import { type QueueFilter } from '../types';
import { type SheetRow } from '../../../services/sheets';
import { getNormalizedRowStatus } from '../utils';
import { getChannelLabel } from '../../../integrations/channels';
import { filterOptions } from '../constants';

import { type DeliverySummary } from '../types';
import { type ChannelId, type ChannelOption } from '../../../integrations/channels';

export function DashboardOverview({
  setStatusFilter,
  statusFilter,
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
  setStatusFilter: (filter: QueueFilter) => void;
  statusFilter: QueueFilter;
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
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Up next</p>
              <h3 className="mt-0.5 font-heading text-sm font-semibold text-ink">Needs attention</h3>
            </div>
            <span className="rounded-full border border-border bg-canvas px-2.5 py-1 text-[11px] font-semibold text-muted">
              {filterOptions.find((option) => option.value === statusFilter)?.label}
            </span>
          </div>
          <div>
            {queueSpotlightRows.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-ink">No rows match this filter.</p>
                <p className="mt-1 text-xs text-muted">Change the filter chips above the queue.</p>
              </div>
            ) : (
              queueSpotlightRows.map((row) => (
                <button
                  key={`spotlight-${row.sourceSheet}-${row.rowIndex}`}
                  type="button"
                  onClick={() => {
                    setStatusFilter(getNormalizedRowStatus(row.status) as QueueFilter);
                  }}
                  className="w-full cursor-pointer border-t border-border px-4 py-3.5 text-left transition-colors first:border-t-0 hover:bg-canvas"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-heading text-lg font-semibold text-ink">{row.topic}</h4>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusColor(row.status)}`}>
                      {row.status || 'Pending'}
                    </span>
                    <span className="text-xs text-muted">{row.date}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">
                    {(row.selectedText || row.variant1 || 'No draft content yet.').trim()}
                  </p>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Delivery target</p>
              <h3 className="mt-0.5 font-heading text-base font-semibold text-ink">{getChannelLabel(selectedChannel)}</h3>
              <p className="mt-1 text-xs leading-5 text-muted">Approved posts use this destination.</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-border bg-canvas px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Destination</p>
            <p className="mt-1 text-xs font-semibold text-ink">{deliveryTargetSummary}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-muted">{selectedChannelOption.description}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Publishing health</p>
          <div className="mt-3 space-y-1.5">
            {[
              { label: 'LinkedIn', ready: linkedinConfigured },
              { label: 'Instagram', ready: instagramConfigured },
              { label: 'Telegram', ready: telegramConfigured },
              { label: 'WhatsApp', ready: whatsappConfigured },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-border bg-canvas px-3 py-2">
                <span className="text-xs font-medium text-ink">{item.label}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    item.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {item.ready ? 'Connected' : 'Setup needed'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {lastDeliverySummary ? (
          <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Last delivery</p>
              <span className="rounded-full border border-emerald-200 bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                {getChannelLabel(lastDeliverySummary.channel)}
              </span>
              <span className="rounded-full border border-emerald-200 bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                {lastDeliverySummary.mediaMode === 'image' ? 'Image post' : 'Text post'}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
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
