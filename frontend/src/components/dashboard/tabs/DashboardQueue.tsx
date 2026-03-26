import { useEffect } from 'react';
import { Plus, RefreshCw, Send, Eye, Trash2, Bot, PenLine } from 'lucide-react';
import { type AppSession } from '../../../services/backendApi';
import { type SheetRow } from '../../../services/sheets';
import { type QueueFilter } from '../types';
import { getNormalizedRowStatus, buildRowActionKey, canPreviewPublishedContent } from '../utils';
import { filterOptions } from '../constants';

function queueRowDomId(row: SheetRow) {
  return `${row.sourceSheet}-${row.rowIndex}`;
}

/** Distill: one height, light borders, primary only for main actions — see design-system/content-queue-theme.md */
const btn =
  'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-40';

const iconBtn =
  'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-150 outline-none hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-200/60 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-40';

const iconBtnMuted =
  'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors duration-150 outline-none hover:bg-white/70 hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-40';

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
  handleDeleteTopic: (row: SheetRow) => void;
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
    <div className="flex flex-col gap-5">
      <div className="glass-panel rounded-xl p-4">
        <form onSubmit={handleAddTopic} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Add a topic for research…"
            className="glass-inset min-h-[44px] flex-1 rounded-lg px-3.5 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary/20"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newTopic.trim()}
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add topic
          </button>
        </form>
      </div>

      <div className="flex flex-col">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {filterOptions.map((option) => (
            <button
              key={`chip-${option.value}`}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent ${
                statusFilter === option.value
                  ? 'bg-ink text-white'
                  : 'text-muted hover:bg-white/55 hover:text-ink'
              }`}
            >
              {option.label} ({queueCounts[option.value]})
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filteredRows.length === 0 ? (
            <div className="glass-panel rounded-xl border-dashed border-violet-200/50 px-4 py-12 text-center">
              <div className="glass-inset mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full text-muted">
                <Bot className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-ink">
                {rows.length === 0 ? 'No topics yet' : `No ${statusFilter === 'all' ? '' : statusFilter} rows`}
              </p>
              {rows.length === 0 ? <p className="mt-1 text-xs text-muted">Add a topic above to start.</p> : null}
            </div>
          ) : (
            filteredRows.map((row) => {
              const normalizedStatus = getNormalizedRowStatus(row.status);
              return (
                <div
                  key={`${row.sourceSheet}-${row.rowIndex}-${row.topic}`}
                  data-queue-row-id={queueRowDomId(row)}
                  className="glass-inset scroll-mt-24 rounded-xl px-4 py-3 transition-colors hover:border-violet-300/70 hover:bg-white/70"
                >
                  <div className="flex min-h-9 items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink" title={row.topic}>
                        {row.topic}
                      </p>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusColor(row.status)}`}
                      >
                        {row.status || 'Pending'}
                      </span>
                      {row.date ? (
                        <span className="shrink-0 text-xs tabular-nums text-muted">{row.date}</span>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:flex-nowrap">
                      {normalizedStatus === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => void triggerRowGithubAction(row, 'draft')}
                          disabled={actionLoading !== null || !session.config.githubRepo || !session.config.hasGitHubToken}
                          title="Generate draft"
                          className={`${btn} bg-primary text-primary-fg hover:bg-primary-hover`}
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
                          className={`${btn} border border-white/50 bg-white/35 text-ink backdrop-blur-sm hover:bg-white/65`}
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
                          className={`${btn} bg-primary text-primary-fg hover:bg-primary-hover`}
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
                          className={`${btn} border border-white/50 bg-white/35 text-ink backdrop-blur-sm hover:bg-white/65`}
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
                          aria-label="Preview post"
                          className={iconBtnMuted}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleDeleteTopic(row)}
                        disabled={deletingRowIndex === row.rowIndex}
                        title="Delete topic"
                        className={iconBtn}
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
