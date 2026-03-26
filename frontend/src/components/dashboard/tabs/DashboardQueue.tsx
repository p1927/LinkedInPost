import { useEffect } from 'react';
import { Plus, RefreshCw, RotateCw, Send, Eye, Trash2, Bot, PenLine, FileEdit } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { type AppSession } from '../../../services/backendApi';
import { type SheetRow } from '../../../services/sheets';
import { type QueueFilter } from '../types';
import { getNormalizedRowStatus, buildRowActionKey, canPreviewPublishedContent } from '../utils';
import { filterOptions } from '../constants';
import { Badge, type BadgeVariant } from '../../ui/Badge';
import { CalendarDateChip } from '../../ui/CalendarDateChip';
import { ChipToggle } from '../../ui/ChipToggle';

function queueRowDomId(row: SheetRow) {
  return `${row.sourceSheet}-${row.rowIndex}`;
}

/** Primary row CTAs: start pipeline or first publish */
const btnPrimary =
  'inline-flex h-9 min-h-[36px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-[color,background-color,border-color,box-shadow] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-40';

/** Secondary row CTAs: review draft or republish — same shape as primary, outline style */
const btnSecondary =
  'inline-flex h-9 min-h-[36px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-primary/25 bg-white/90 px-3 text-xs font-semibold text-ink shadow-sm transition-[color,background-color,border-color,box-shadow] duration-200 outline-none hover:border-primary/40 hover:bg-white focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-40';

const iconBtn =
  'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors duration-200 outline-none hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-40';

const iconBtnMuted =
  'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors duration-200 outline-none hover:bg-white/80 hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-40';

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
  getQueueStatusVariant,
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
  getQueueStatusVariant: (status: string) => BadgeVariant;
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

  const hasTopics = rows.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Add topic" className={cn('glass-panel rounded-xl', hasTopics ? 'p-2.5' : 'p-4')}>
        <form
          onSubmit={handleAddTopic}
          className={cn('flex flex-col gap-2 sm:flex-row sm:items-stretch', hasTopics && 'sm:items-center')}
        >
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Add a topic for research…"
            className={cn(
              'glass-inset flex-1 rounded-lg px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary/20',
              hasTopics ? 'min-h-10' : 'min-h-[44px] px-3.5',
            )}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newTopic.trim()}
            className={cn(
              'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary font-semibold text-primary-fg transition-[color,background-color,box-shadow] duration-200 hover:border-primary-hover hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-40',
              hasTopics ? 'min-h-10 px-3 text-xs' : 'min-h-[44px] gap-2 px-4 py-2 text-sm shadow-card',
            )}
          >
            <Plus className={hasTopics ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
            Add topic
          </button>
        </form>
      </section>

      <div className="flex flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="w-full text-[10px] font-semibold uppercase tracking-wider text-ink/70">Queue</p>
          <div className="flex flex-wrap gap-1.5">
          {filterOptions.map((option) => (
            <ChipToggle
              key={`chip-${option.value}`}
              type="button"
              selected={statusFilter === option.value}
              onClick={() => setStatusFilter(option.value)}
              className="min-h-[36px] px-3 py-1.5 text-xs font-semibold"
            >
              {option.label} ({queueCounts[option.value]})
            </ChipToggle>
          ))}
          </div>
        </div>

        <div>
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
            <div className="glass-inset scroll-mt-24 overflow-x-auto rounded-xl border-violet-200/40 shadow-sm">
              <table className="w-full min-w-[600px] border-separate border-spacing-0 text-sm">
                <caption className="sr-only">Topic queue: title, status, date, and actions per row</caption>
                <colgroup>
                  <col className="min-w-[8rem]" />
                  <col className="w-[1%]" />
                  <col className="w-[1%]" />
                  <col className="w-[1%]" />
                  <col className="w-10" />
                  <col className="w-10" />
                </colgroup>
                <thead>
                  <tr className="border-b border-violet-200/80 bg-white/85 text-left text-xs font-semibold uppercase tracking-wide text-ink/80 backdrop-blur-md">
                    <th scope="col" className="px-4 py-3 pl-4">
                      Topic
                    </th>
                    <th scope="col" className="whitespace-nowrap px-3 py-3">
                      Status
                    </th>
                    <th scope="col" className="whitespace-nowrap px-3 py-3">
                      Date
                    </th>
                    <th scope="col" className="whitespace-nowrap px-3 py-3 text-right">
                      Action
                    </th>
                    <th scope="col" className="px-1 py-3 text-center">
                      <span className="sr-only">Preview</span>
                      <Eye className="mx-auto h-4 w-4 text-ink/55" aria-hidden />
                    </th>
                    <th scope="col" className="px-1 py-3 text-center">
                      <span className="sr-only">Delete</span>
                      <Trash2 className="mx-auto h-4 w-4 text-ink/55" aria-hidden />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const normalizedStatus = getNormalizedRowStatus(row.status);
                    const showPreview = canPreviewPublishedContent(row);
                    return (
                      <tr
                        key={`${row.sourceSheet}-${row.rowIndex}-${row.topic}`}
                        data-queue-row-id={queueRowDomId(row)}
                        className="border-b border-violet-100/50 transition-colors last:border-b-0 hover:bg-white/65"
                      >
                        <td className="max-w-0 px-4 py-2.5 align-middle">
                          <p
                            className="line-clamp-2 font-medium leading-snug text-ink"
                            title={row.topic.length > 80 ? row.topic : undefined}
                          >
                            {row.topic}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                          <Badge variant={getQueueStatusVariant(row.status)} size="xs">
                            {row.status || 'Pending'}
                          </Badge>
                        </td>
                        <td className="max-w-[10rem] px-3 py-2.5 align-middle">
                          <CalendarDateChip date={row.date ?? ''} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-middle text-right">
                          <div className="flex justify-end gap-1.5">
                            {normalizedStatus === 'pending' ? (
                              <button
                                type="button"
                                onClick={() => void triggerRowGithubAction(row, 'draft')}
                                disabled={
                                  actionLoading !== null || !session.config.githubRepo || !session.config.hasGitHubToken
                                }
                                title="Generate draft"
                                className={`${btnPrimary} bg-primary text-primary-fg hover:bg-primary-hover`}
                              >
                                {actionLoading === buildRowActionKey('draft', row) ? (
                                  <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                ) : (
                                  <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                )}
                                <span className="hidden sm:inline">Draft</span>
                              </button>
                            ) : null}

                            {normalizedStatus === 'drafted' ? (
                              <button
                                type="button"
                                onClick={() => setSelectedRowForReview(row)}
                                title="Review draft"
                                className={btnSecondary}
                              >
                                <FileEdit className="h-3.5 w-3.5 shrink-0" aria-hidden />
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
                                className={`${btnPrimary} bg-primary text-primary-fg hover:bg-primary-hover`}
                              >
                                {actionLoading === buildRowActionKey('publish', row) ? (
                                  <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                ) : (
                                  <Send className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                )}
                                <span className="hidden sm:inline">Publish</span>
                              </button>
                            ) : null}

                            {normalizedStatus === 'published' ? (
                              <button
                                type="button"
                                onClick={() => void republishRowToSelectedChannel(row)}
                                disabled={actionLoading !== null}
                                title="Republish to channel"
                                className={btnSecondary}
                              >
                                {actionLoading === buildRowActionKey('publish', row) ? (
                                  <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                ) : (
                                  <RotateCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                )}
                                <span className="hidden sm:inline">Republish</span>
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-1 py-2.5 align-middle text-center">
                          {showPreview ? (
                            <button
                              type="button"
                              onClick={() => setSelectedApprovedRowPreview(row)}
                              title="Preview"
                              aria-label="Preview post"
                              className={iconBtnMuted}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="inline-block h-9 w-9" aria-hidden />
                          )}
                        </td>
                        <td className="px-1 py-2.5 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteTopic(row)}
                            disabled={deletingRowIndex === row.rowIndex}
                            title="Delete topic"
                            aria-label="Delete topic"
                            className={iconBtn}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
