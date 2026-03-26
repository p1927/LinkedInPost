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
    <>
      <div className="rounded-2xl border border-white/50 bg-white/85 px-4 py-3 shadow-md backdrop-blur-md">
        <form onSubmit={handleAddTopic} className="flex gap-3">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Add a new topic for research..."
            className="flex-1 rounded-xl border border-slate-200/60 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary/30 focus:ring-2 focus:ring-primary/50"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newTopic.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add topic</span>
          </button>
        </form>
      </div>

      <section className="rounded-[32px] border border-white/50 bg-white/85 shadow-xl backdrop-blur-md overflow-hidden">
        <div className="border-b border-slate-200/80 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Queue</p>
              <h3 className="mt-2 text-2xl font-bold text-deep-indigo font-heading">Focus on the next action, not the whole system</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Every row surfaces one primary next step based on status. Filter the queue when you want a narrower working set.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={`chip-${option.value}`}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${statusFilter === option.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {option.label} ({queueCounts[option.value]})
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-0">
          {filteredRows.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm">
                <Bot className="h-8 w-8 text-indigo-300" />
              </div>
              <p className="text-lg font-semibold text-slate-700">
                {rows.length === 0 ? 'No topics found' : `No ${statusFilter === 'all' ? '' : statusFilter} items right now`}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {rows.length === 0 ? 'Add one above to get started with research.' : 'Try another filter or refresh the queue.'}
              </p>
            </div>
          ) : (
            filteredRows.map((row) => {
              const normalizedStatus = getNormalizedRowStatus(row.status);
              const previewText = (row.selectedText || row.variant1 || 'No draft content yet.').trim();
              return (
                <div key={`${row.sourceSheet}-${row.rowIndex}-${row.topic}`} className="border-t border-slate-100 first:border-t-0 px-6 py-5">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] xl:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-lg font-semibold text-slate-900">{row.topic}</h4>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold shadow-sm ${getStatusColor(row.status)}`}>
                          {row.status || 'Pending'}
                        </span>
                        <span className="text-sm text-slate-500">{row.date}</span>
                      </div>
                      <p className="mt-3 max-w-3xl line-clamp-2 text-sm leading-6 text-slate-600">
                        {previewText}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                      {normalizedStatus === 'pending' ? (
                        <button
                          onClick={() => void triggerRowGithubAction(row, 'draft')}
                          disabled={actionLoading !== null || !session.config.githubRepo || !session.config.hasGitHubToken}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
                        >
                          {actionLoading === buildRowActionKey('draft', row) ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          Generate draft
                        </button>
                      ) : null}

                      {normalizedStatus === 'drafted' ? (
                        <button
                          onClick={() => setSelectedRowForReview(row)}
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                        >
                          Review draft
                        </button>
                      ) : null}

                      {normalizedStatus === 'approved' ? (
                        <button
                          onClick={() => void publishRowToSelectedChannel(row)}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {actionLoading === buildRowActionKey('publish', row) ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Publish approved post
                        </button>
                      ) : null}

                      {normalizedStatus === 'published' ? (
                        <button
                          onClick={() => void republishRowToSelectedChannel(row)}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {actionLoading === buildRowActionKey('publish', row) ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Publish again
                        </button>
                      ) : null}

                      {canPreviewPublishedContent(row) ? (
                        <button
                          onClick={() => setSelectedApprovedRowPreview(row)}
                          className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </button>
                      ) : null}

                      <button
                        onClick={() => handleDeleteTopic(row)}
                        disabled={deletingRowIndex === row.rowIndex}
                        title="Delete topic"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-100 bg-white p-2.5 text-slate-300 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
