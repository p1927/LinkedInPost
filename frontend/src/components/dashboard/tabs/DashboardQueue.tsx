import { useEffect } from 'react';
import { Plus, RefreshCw, RotateCw, Send, Eye, Trash2, Bot, PenLine, FileEdit } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { type AppSession } from '../../../services/backendApi';
import { type SheetRow } from '../../../services/sheets';
import { type QueueFilter } from '../types';
import { getNormalizedRowStatus, buildRowActionKey, canPreviewPublishedContent, formatQueueDate } from '../utils';
import { filterOptions } from '../constants';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { ChipToggle } from '@/components/ui/ChipToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function queueRowDomId(row: SheetRow) {
  return `${row.sourceSheet}-${row.rowIndex}`;
}

const rowActionClass =
  'h-8 min-h-8 shrink-0 gap-1 rounded-lg px-2.5 text-xs font-semibold active:translate-y-0 disabled:opacity-40';

const iconBtn =
  'h-8 w-8 shrink-0 cursor-pointer rounded-lg text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors duration-200';

const iconBtnMuted =
  'h-8 w-8 shrink-0 cursor-pointer rounded-lg text-muted hover:bg-white/60 hover:text-ink disabled:opacity-40 transition-colors duration-200';

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
      <section
        aria-label="Add topic"
        className={cn('glass-panel rounded-2xl border border-violet-200/50', hasTopics ? 'p-3' : 'p-5')}
      >
        <form
          onSubmit={handleAddTopic}
          className={cn('flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3', hasTopics && 'sm:items-center')}
        >
          <Input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Add a topic for research…"
            className={cn(
              'flex-1 rounded-xl border border-violet-200/55 bg-white/70 px-3.5 py-2 text-sm text-ink outline-none transition-[colors,border-color,background-color,box-shadow] duration-200 placeholder:text-muted hover:border-violet-200/70 hover:bg-white/85 focus:border-primary focus:ring-2 focus:ring-primary/25',
              hasTopics ? 'min-h-10' : 'min-h-[44px]',
            )}
            disabled={loading}
          />
          <Button
            type="submit"
            variant="primary"
            size={hasTopics ? 'sm' : 'md'}
            disabled={loading || !newTopic.trim()}
            className={cn(
              'w-full shrink-0 cursor-pointer rounded-xl sm:w-auto',
              hasTopics ? 'min-h-10 gap-1.5 px-3 text-xs' : 'min-h-[44px] gap-2',
            )}
          >
            <Plus className={hasTopics ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
            <span>Add topic</span>
          </Button>
        </form>
      </section>

      <div className="flex flex-col gap-4">
        <div className="space-y-2.5">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/70">Status Filter</p>
            <p id="queue-filter-hint" className="text-xs leading-snug text-muted">
              Filter by status; counts follow the sheet.
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter topics by status"
            aria-describedby="queue-filter-hint"
          >
            {filterOptions.map((option) => (
              <ChipToggle
                key={`chip-${option.value}`}
                type="button"
                selected={statusFilter === option.value}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label} ({queueCounts[option.value]})
              </ChipToggle>
            ))}
          </div>
        </div>

        <div>
          {filteredRows.length === 0 ? (
            <div className="glass-panel rounded-2xl border border-dashed border-violet-200/50 px-6 py-16 text-center">
              <div className="glass-inset mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-muted">
                <Bot className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <p className="text-base font-semibold text-ink">
                {rows.length === 0 ? 'No topics yet' : `No ${statusFilter === 'all' ? '' : statusFilter} rows`}
              </p>
              {rows.length === 0 ? <p className="mt-2 text-sm text-muted">Add a topic above to start.</p> : null}
            </div>
          ) : (
            <div
              className="glass-inset custom-scrollbar scroll-mt-24 overflow-x-auto rounded-2xl border border-violet-200/50 shadow-sm"
              role="table"
              aria-label="Topics: title, status, date, and actions per row"
            >
              <div className="min-w-[540px]">
                <div role="rowgroup">
                  <div
                    role="row"
                    className="flex items-center gap-4 border-b border-violet-200/60 bg-white/90 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink/60 backdrop-blur-md"
                  >
                    <div role="columnheader" className="min-w-0 flex-1 text-left">
                      Topic
                    </div>
                    <div
                      role="columnheader"
                      className="flex shrink-0 items-center justify-end gap-3 text-ink/60"
                    >
                      <span className="w-[100px] text-right">Status</span>
                      <span className="w-[110px] text-right">Date</span>
                      <span className="min-w-[110px] text-right">Action</span>
                      <div className="flex w-[80px] shrink-0 items-center justify-end gap-1">
                        <span className="sr-only">Preview and delete</span>
                        <Eye className="h-4 w-4 text-ink/45" aria-hidden />
                        <Trash2 className="h-4 w-4 text-ink/45" aria-hidden />
                      </div>
                    </div>
                  </div>
                </div>
                <div role="rowgroup" className="text-sm">
                  {filteredRows.map((row, rowIndex) => {
                    const normalizedStatus = getNormalizedRowStatus(row.status);
                    const showPreview = canPreviewPublishedContent(row);
                    const dateRaw = row.date?.trim() ?? '';
                    const dateLabel = formatQueueDate(dateRaw);
                    return (
                      <div
                        key={`${row.sourceSheet}-${row.rowIndex}-${row.topic}`}
                        role="row"
                        data-queue-row-id={queueRowDomId(row)}
                        className={cn(
                          'flex items-center gap-4 border-b border-violet-100/60 px-5 py-3 transition-colors duration-200 last:border-b-0 hover:bg-white/70',
                          rowIndex % 2 === 1 && 'bg-violet-50/40',
                        )}
                      >
                        <div role="cell" className="min-w-0 flex-1">
                          <p
                            className="line-clamp-2 font-medium leading-snug text-ink transition-colors duration-200"
                            title={row.topic.length > 80 ? row.topic : undefined}
                          >
                            {row.topic}
                          </p>
                        </div>
                        <div role="cell" className="flex shrink-0 items-center justify-end gap-3">
                          <div className="flex w-[100px] shrink-0 justify-end">
                            <Badge variant={getQueueStatusVariant(row.status)} size="sm">
                              {row.status || 'Pending'}
                            </Badge>
                          </div>
                          <div
                            className="w-[110px] shrink-0 truncate text-right text-xs tabular-nums text-muted"
                            title={dateRaw || undefined}
                          >
                            {dateLabel}
                          </div>
                          <div className="flex min-w-[110px] shrink-0 justify-end gap-2">
                            {normalizedStatus === 'pending' ? (
                              <Button
                                type="button"
                                variant="primary"
                                onClick={() => void triggerRowGithubAction(row, 'draft')}
                                disabled={
                                  actionLoading !== null || !session.config.githubRepo || !session.config.hasGitHubToken
                                }
                                title="Generate draft"
                                className={rowActionClass}
                              >
                                {actionLoading === buildRowActionKey('draft', row) ? (
                                  <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                ) : (
                                  <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                )}
                                <span className="hidden sm:inline">Draft</span>
                              </Button>
                            ) : null}

                            {normalizedStatus === 'drafted' ? (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setSelectedRowForReview(row)}
                                title="Review draft"
                                className={cn(rowActionClass, 'border-primary/25 shadow-sm')}
                              >
                                <FileEdit className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                <span className="sm:hidden">Edit</span>
                                <span className="hidden sm:inline">Review</span>
                              </Button>
                            ) : null}

                            {normalizedStatus === 'approved' ? (
                              <Button
                                type="button"
                                variant="primary"
                                onClick={() => void publishRowToSelectedChannel(row)}
                                disabled={actionLoading !== null}
                                title="Publish"
                                className={rowActionClass}
                              >
                                {actionLoading === buildRowActionKey('publish', row) ? (
                                  <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                ) : (
                                  <Send className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                )}
                                <span className="hidden sm:inline">Publish</span>
                              </Button>
                            ) : null}

                            {normalizedStatus === 'published' ? (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => void republishRowToSelectedChannel(row)}
                                disabled={actionLoading !== null}
                                title="Republish to channel"
                                className={cn(rowActionClass, 'border-primary/25 shadow-sm')}
                              >
                                {actionLoading === buildRowActionKey('publish', row) ? (
                                  <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                ) : (
                                  <RotateCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                )}
                                <span className="hidden sm:inline">Republish</span>
                              </Button>
                            ) : null}
                          </div>
                          <div className="flex w-[80px] shrink-0 items-center justify-end gap-1">
                            {showPreview ? (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setSelectedApprovedRowPreview(row)}
                                title="Preview"
                                aria-label="Preview post"
                                className={iconBtnMuted}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="inline-block h-8 w-8 shrink-0" aria-hidden />
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => handleDeleteTopic(row)}
                              disabled={deletingRowIndex === row.rowIndex}
                              title="Delete topic"
                              aria-label="Delete topic"
                              className={iconBtn}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
