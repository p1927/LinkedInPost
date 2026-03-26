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

const actionBtnBase =
  'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45';

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

        <div className="space-y-2">
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
                  data-queue-row-id={queueRowDomId(row)}
                  className="scroll-mt-24 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink" title={row.topic}>
                        {row.topic}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getStatusColor(row.status)}`}
                        >
                          {row.status || 'Pending'}
                        </span>
                        {row.date ? (
                          <span className="text-[11px] tabular-nums text-muted">{row.date}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-start gap-1 sm:justify-end">
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
                        className={`${actionBtnBase} w-8 border border-border bg-canvas p-0 text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-700`}
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
