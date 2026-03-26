import { useEffect } from 'react';
import { Plus, RefreshCw, Send, Eye, Trash2, Bot, PenLine, Calendar } from 'lucide-react';
import { type AppSession } from '../../../services/backendApi';
import { type SheetRow } from '../../../services/sheets';
import { type QueueFilter } from '../types';
import { getNormalizedRowStatus, buildRowActionKey, canPreviewPublishedContent } from '../utils';
import { filterOptions } from '../constants';

function queueRowDomId(row: SheetRow) {
  return `${row.sourceSheet}-${row.rowIndex}`;
}

const actionBtnBase =
  'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-45';

function statusAccentBarClass(status: string): string {
  switch (getNormalizedRowStatus(status)) {
    case 'published':
      return 'bg-emerald-500';
    case 'drafted':
      return 'bg-teal-500';
    case 'pending':
      return 'bg-amber-400';
    case 'approved':
      return 'bg-orange-400';
    default:
      return 'bg-border-strong';
  }
}

export function DashboardQueue({
  handleAddTopic,
  newTopic,
  setNewTopic,
  loading,
  setStatusFilter,
  statusFilter,
  queueCounts,
  filteredRows,
  rows,
  getStatusColor,
  triggerRowGithubAction,
  actionLoading,
  session,
  setSelectedRowForReview,
  publishRowToSelectedChannel,
  republishRowToSelectedChannel,
  setSelectedApprovedRowPreview,
  handleDeleteTopic,
  deletingRowIndex,
  scrollTargetId,
  onScrollTargetHandled,
}: {
  handleAddTopic: (e: React.FormEvent) => Promise<void>;
  newTopic: string;
  setNewTopic: (val: string) => void;
  loading: boolean;
  setStatusFilter: (filter: QueueFilter) => void;
  statusFilter: QueueFilter;
  queueCounts: Record<QueueFilter, number>;
  filteredRows: SheetRow[];
  rows: SheetRow[];
  getStatusColor: (status: string) => string;
  triggerRowGithubAction: (row: SheetRow, action: 'draft' | 'publish') => Promise<void>;
  actionLoading: string | null;
  session: AppSession;
  setSelectedRowForReview: (row: SheetRow) => void;
  publishRowToSelectedChannel: (row: SheetRow) => Promise<void>;
  republishRowToSelectedChannel: (row: SheetRow) => Promise<void>;
  setSelectedApprovedRowPreview: (row: SheetRow) => void;
  handleDeleteTopic: (row: SheetRow) => Promise<void>;
  deletingRowIndex: number | null;
  scrollTargetId: string | null;
  onScrollTargetHandled: () => void;
}) {
  useEffect(() => {
    if (!scrollTargetId) return;
    const match = filteredRows.some((r) => queueRowDomId(r) === scrollTargetId);
    if (!match) {
      onScrollTargetHandled();
      return;
    }
    const frame = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-queue-row-id="${scrollTargetId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onScrollTargetHandled();
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollTargetId, filteredRows, onScrollTargetHandled]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-border bg-surface/95 p-5 shadow-card ring-1 ring-white/60 backdrop-blur-sm">
        <form onSubmit={handleAddTopic} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Add a topic for research…"
            className="min-h-[44px] flex-1 rounded-xl border border-border bg-canvas/40 px-4 py-2.5 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newTopic.trim()}
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-sm transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus className="h-4 w-4" />
            Add topic
          </button>
        </form>
      </div>

      <div className="flex flex-col">
        <div className="mb-4 flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={`chip-${option.value}`}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`cursor-pointer rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
                statusFilter === option.value
                  ? 'bg-primary text-primary-fg shadow-sm ring-1 ring-primary/20'
                  : 'border border-border bg-surface text-muted shadow-sm hover:border-border-strong hover:bg-surface-muted/80 hover:text-ink'
              }`}
            >
              {option.label}{' '}
              <span className="tabular-nums opacity-90">({queueCounts[option.value]})</span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border-strong/80 bg-gradient-to-b from-surface to-surface-muted/40 px-6 py-14 text-center shadow-card">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-primary/[0.06] text-primary shadow-sm">
                <Bot className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <p className="font-heading text-base font-semibold tracking-tight text-ink">
                {rows.length === 0 ? 'No topics yet' : `No ${statusFilter === 'all' ? '' : statusFilter} rows`}
              </p>
              {rows.length === 0 ? (
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
                  Add a topic above and your queue will show up here.
                </p>
              ) : null}
            </div>
          ) : (
            filteredRows.map((row) => {
              const normalizedStatus = getNormalizedRowStatus(row.status);
              return (
                <div
                  key={`${row.sourceSheet}-${row.rowIndex}-${row.topic}`}
                  data-queue-row-id={queueRowDomId(row)}
                  className="group relative scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-surface py-4 pl-4 pr-3 shadow-card transition-[box-shadow,border-color] duration-200 hover:border-border-strong hover:shadow-lift sm:pl-5 sm:pr-4"
                >
                  <span
                    className={`pointer-events-none absolute left-0 top-3 bottom-3 w-1 rounded-full ${statusAccentBarClass(row.status)}`}
                    aria-hidden
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1 pl-1">
                      <p
                        className="line-clamp-2 font-heading text-[15px] font-semibold leading-snug tracking-tight text-ink sm:truncate sm:line-clamp-none"
                        title={row.topic}
                      >
                        {row.topic}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${getStatusColor(row.status)}`}
                        >
                          {row.status || 'Pending'}
                        </span>
                        {row.date ? (
                          <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-muted">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-border-strong" aria-hidden />
                            {row.date}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-2xl border border-border/70 bg-surface-muted/50 p-1.5 sm:justify-end">
                      {normalizedStatus === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => void triggerRowGithubAction(row, 'draft')}
                          disabled={actionLoading !== null || !session.config.githubRepo || !session.config.hasGitHubToken}
                          title="Generate draft"
                          className={`${actionBtnBase} bg-primary px-2.5 text-primary-fg hover:bg-primary-hover`}
                        >
                          {actionLoading === buildRowActionKey('draft', row) ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PenLine className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">Draft</span>
                        </button>
                      ) : null}

                      {normalizedStatus === 'drafted' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRowForReview(row)}
                          title="Review draft"
                          className={`${actionBtnBase} border-2 border-primary bg-surface px-2.5 text-primary hover:bg-canvas`}
                        >
                          <span className="sm:hidden">Edit</span>
                          <span className="hidden sm:inline">Review</span>
                        </button>
                      ) : null}

                      {normalizedStatus === 'approved' ? (
                        <button
                          type="button"
                          onClick={() => void publishRowToSelectedChannel(row)}
                          disabled={actionLoading !== null}
                          title="Publish"
                          className={`${actionBtnBase} bg-primary px-2.5 text-primary-fg hover:bg-primary-hover`}
                        >
                          {actionLoading === buildRowActionKey('publish', row) ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">Publish</span>
                        </button>
                      ) : null}

                      {normalizedStatus === 'published' ? (
                        <button
                          type="button"
                          onClick={() => void republishRowToSelectedChannel(row)}
                          disabled={actionLoading !== null}
                          title="Republish"
                          className={`${actionBtnBase} border border-primary bg-surface px-2.5 text-primary hover:bg-canvas`}
                        >
                          {actionLoading === buildRowActionKey('publish', row) ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">Republish</span>
                        </button>
                      ) : null}

                      {canPreviewPublishedContent(row) ? (
                        <button
                          type="button"
                          onClick={() => setSelectedApprovedRowPreview(row)}
                          title="Preview"
                          className={`${actionBtnBase} border border-border-strong bg-surface-muted px-2 text-ink hover:border-primary/35 hover:bg-canvas`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Preview</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleDeleteTopic(row)}
                        disabled={deletingRowIndex === row.rowIndex}
                        title="Delete topic"
                        className={`${actionBtnBase} w-9 min-w-9 border border-transparent bg-surface p-0 text-muted hover:border-red-200/90 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-200/80`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
