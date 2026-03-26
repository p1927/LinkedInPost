import { Plus, RefreshCw, Send, Eye, Trash2, Bot } from 'lucide-react';
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
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
        <form onSubmit={handleAddTopic} className="flex flex-col gap-2">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Add a new topic..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary/30 focus:ring-2 focus:ring-primary/50"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newTopic.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-600 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Add topic</span>
          </button>
        </form>
      </div>

      <div className="flex flex-col">
        <div className="flex flex-wrap gap-1.5 px-1 mb-3">
          {filterOptions.map((option) => (
            <button
              key={`chip-${option.value}`}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${statusFilter === option.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {option.label} ({queueCounts[option.value]})
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <Bot className="h-6 w-6 text-purple-300" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {rows.length === 0 ? 'No topics found' : `No ${statusFilter === 'all' ? '' : statusFilter} items`}
              </p>
            </div>
          ) : (
            filteredRows.map((row) => {
              const normalizedStatus = getNormalizedRowStatus(row.status);
              return (
                <div key={`${row.sourceSheet}-${row.rowIndex}-${row.topic}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${getStatusColor(row.status)}`}>
                          {row.status || 'Pending'}
                        </span>
                        <span className="text-[10px] text-slate-500">{row.date}</span>
                      </div>
                      <h4 className="text-base font-semibold text-slate-900 line-clamp-2">{row.topic}</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {normalizedStatus === 'pending' ? (
                        <button
                          onClick={() => void triggerRowGithubAction(row, 'draft')}
                          disabled={actionLoading !== null || !session.config.githubRepo || !session.config.hasGitHubToken}
                          className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
                        >
                          {actionLoading === buildRowActionKey('draft', row) ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          Draft
                        </button>
                      ) : null}

                      {normalizedStatus === 'drafted' ? (
                        <button
                          onClick={() => setSelectedRowForReview(row)}
                          className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-500"
                        >
                          Review
                        </button>
                      ) : null}

                      {normalizedStatus === 'approved' ? (
                        <button
                          onClick={() => void publishRowToSelectedChannel(row)}
                          disabled={actionLoading !== null}
                          className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {actionLoading === buildRowActionKey('publish', row) ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          Publish
                        </button>
                      ) : null}

                      {normalizedStatus === 'published' ? (
                        <button
                          onClick={() => void republishRowToSelectedChannel(row)}
                          disabled={actionLoading !== null}
                          className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {actionLoading === buildRowActionKey('publish', row) ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          Republish
                        </button>
                      ) : null}

                      {canPreviewPublishedContent(row) ? (
                        <button
                          onClick={() => setSelectedApprovedRowPreview(row)}
                          className="inline-flex justify-center items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                      ) : null}

                      <button
                        onClick={() => handleDeleteTopic(row)}
                        disabled={deletingRowIndex === row.rowIndex}
                        title="Delete topic"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
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
