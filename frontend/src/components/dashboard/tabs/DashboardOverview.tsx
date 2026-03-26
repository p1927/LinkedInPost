import { type QueueFilter } from '../types';
import { type SheetRow } from '../../../services/sheets';
import { filterOptions } from '../constants';

export function DashboardOverview({
  statusFilter,
  queueSpotlightRows,
  getStatusColor,
  onSpotlightRowActivate,
}: {
  statusFilter: QueueFilter;
  queueSpotlightRows: SheetRow[];
  getStatusColor: (status: string) => string;
  onSpotlightRowActivate: (row: SheetRow) => void;
}) {
  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
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
              <p className="mt-1 text-xs text-muted">
                Use the status filters in the queue below, or adjust the channel and destination in the sidebar.
              </p>
            </div>
          ) : (
            queueSpotlightRows.map((row) => (
              <button
                key={`spotlight-${row.sourceSheet}-${row.rowIndex}`}
                type="button"
                onClick={() => onSpotlightRowActivate(row)}
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
                <p className="mt-2 text-[11px] font-medium text-primary">Jump to row in queue</p>
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
