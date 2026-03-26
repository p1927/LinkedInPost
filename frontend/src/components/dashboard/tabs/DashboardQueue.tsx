import { Plus, RefreshCw, Send, Eye, Trash2, Bot, PenLine } from 'lucide-react';
import { type AppSession } from '../../../services/backendApi';
import { type SheetRow } from '../../../services/sheets';
import { type QueueFilter } from '../types';
import { getNormalizedRowStatus, buildRowActionKey, canPreviewPublishedContent } from '../utils';
import { filterOptions } from '../constants';

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
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-surface-muted/80 p-4">
        <form onSubmit={handleAddTopic} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Add a topic for research…"
            className="min-h-[44px] flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newTopic.trim()}
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
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
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === option.value
                  ? 'bg-ink text-primary-fg'
                  : 'border border-border bg-surface text-muted hover:border-border-strong hover:text-ink'
              }`}
            >
              {option.label} ({queueCounts[option.value]})
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-muted/50 px-4 py-12 text-center text-muted">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface">
                <Bot className="h-6 w-6 text-muted" />
              </div>
              <p className="text-sm font-semibold text-ink">
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
                  className="rounded-2xl border border-border bg-surface p-4 shadow-card"
                >
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getStatusColor(row.status)}`}
                        >
                          {row.status || 'Pending'}
                        </span>
                        <span className="text-[11px] text-muted">{row.date}</span>
                      </div>
                      <h4 className="line-clamp-2 font-heading text-base font-semibold text-ink">{row.topic}</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {normalizedStatus === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => void triggerRowGithubAction(row, 'draft')}
                          disabled={actionLoading !== null || !session.config.githubRepo || !session.config.hasGitHubToken}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {actionLoading === buildRowActionKey('draft', row) ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PenLine className="h-3.5 w-3.5" />
                          )}
                          Draft
                        </button>
                      ) : null}

                      {normalizedStatus === 'drafted' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRowForReview(row)}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-primary bg-surface px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-canvas"
                        >
                          Review
                        </button>
                      ) : null}

                      {normalizedStatus === 'approved' ? (
                        <button
                          type="button"
                          onClick={() => void publishRowToSelectedChannel(row)}
                          disabled={actionLoading !== null}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {actionLoading === buildRowActionKey('publish', row) ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Publish
                        </button>
                      ) : null}

                      {normalizedStatus === 'published' ? (
                        <button
                          type="button"
                          onClick={() => void republishRowToSelectedChannel(row)}
                          disabled={actionLoading !== null}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-primary bg-surface px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {actionLoading === buildRowActionKey('publish', row) ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Republish
                        </button>
                      ) : null}

                      {canPreviewPublishedContent(row) ? (
                        <button
                          type="button"
                          onClick={() => setSelectedApprovedRowPreview(row)}
                          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border-strong bg-surface-muted px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/35 hover:bg-canvas"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleDeleteTopic(row)}
                        disabled={deletingRowIndex === row.rowIndex}
                        title="Delete topic"
                        className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-canvas p-2 text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-45"
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
