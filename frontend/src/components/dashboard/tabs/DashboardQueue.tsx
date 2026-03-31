import { useEffect } from 'react';
import { Plus, RefreshCw, RotateCw, Send, Trash2, Bot, PenLine, FileEdit } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { type AppSession } from '../../../services/backendApi';
import { type SheetRow } from '../../../services/sheets';
import { type QueueFilter } from '../types';
import { getNormalizedRowStatus, buildRowActionKey, formatQueueDate } from '../utils';
import { effectiveChannel } from '@/lib/topicEffectivePrefs';
import { topicRowElementId } from '../../../features/topic-navigation/utils/topicRoute';
import { filterOptions } from '../constants';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { ChipToggle } from '@/components/ui/ChipToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { type PendingScheduledPublish, rowMatchesPendingScheduledPublish } from '@/features/scheduled-publish';
import { type ChannelId } from '@/integrations/channels';
import { topicLabelForQueueActions, topicNeedsFullTooltip, truncateTopicForUi } from '../../../lib/topicDisplay';

const rowActionClass =
  'h-8 min-h-8 shrink-0 gap-1 rounded-lg px-2.5 text-xs font-semibold active:translate-y-0 disabled:opacity-40 transition-colors duration-200 cursor-pointer';

const iconBtn =
  'h-8 w-8 shrink-0 cursor-pointer rounded-lg text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors duration-200 focus:ring-2 focus:ring-primary/50 focus:outline-none';

export function DashboardQueue({
  handleAddTopic,
  newTopic,
  setNewTopic,
  loading,
  addingTopic,
  setStatusFilter,
  statusFilter,
  queueCounts,
  filteredRows,
  rows,
  getQueueStatusVariant,
  triggerRowGithubAction,
  actionLoading,
  session,
  onOpenTopicReview,
  selectedTopicId,
  onSelectTopicRow,
  publishRowToSelectedChannel,
  republishRowToSelectedChannel,
  handleDeleteTopic,
  deletingRowIndex,
  scrollTargetId,
  onScrollTargetHandled,
  pendingScheduledPublish,
  selectedChannel,
}: {
  handleAddTopic: (e: React.FormEvent) => Promise<void>;
  newTopic: string;
  setNewTopic: (val: string) => void;
  loading: boolean;
  /** Shown as overlay on the add-topic field while the add request runs. */
  addingTopic: boolean;
  setStatusFilter: (filter: QueueFilter) => void;
  statusFilter: QueueFilter;
  queueCounts: Record<QueueFilter, number>;
  filteredRows: SheetRow[];
  rows: SheetRow[];
  getQueueStatusVariant: (status: string) => BadgeVariant;
  triggerRowGithubAction: (row: SheetRow, action: 'draft' | 'publish') => Promise<void>;
  actionLoading: string | null;
  session: AppSession;
  onOpenTopicReview: (row: SheetRow) => void;
  selectedTopicId: string | null;
  onSelectTopicRow: (row: SheetRow) => void;
  publishRowToSelectedChannel: (row: SheetRow) => Promise<void>;
  republishRowToSelectedChannel: (row: SheetRow) => Promise<void>;
  handleDeleteTopic: (row: SheetRow) => void;
  deletingRowIndex: number | null;
  scrollTargetId: string | null;
  onScrollTargetHandled: () => void;
  pendingScheduledPublish: PendingScheduledPublish | null;
  selectedChannel: ChannelId;
}) {
  useEffect(() => {
    if (!scrollTargetId) return;
    const match = filteredRows.some((r) => topicRowElementId(r) === scrollTargetId);
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

  const rowHasActiveScheduledPublish = (row: SheetRow) =>
    rowMatchesPendingScheduledPublish(row, pendingScheduledPublish, effectiveChannel(row, selectedChannel));

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="Add topic"
        className={cn('glass-panel rounded-2xl border border-violet-200/50', hasTopics ? 'p-3' : 'p-5')}
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl',
            'bg-gradient-to-br from-white/95 via-white/80 to-violet-50/35',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(91,33,182,0.04)]',
            'ring-1 ring-violet-200/35',
          )}
        >
          <form
            onSubmit={handleAddTopic}
            aria-busy={addingTopic}
            className={cn(
              'relative z-0 flex flex-col gap-2.5 p-1 sm:flex-row sm:items-stretch sm:gap-2 sm:p-1.5',
              hasTopics && 'sm:items-center',
              addingTopic && 'pointer-events-none select-none',
            )}
          >
            <Input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Add a topic…"
              aria-label="New topic title"
              className={cn(
                'flex-1 rounded-xl border-violet-200/50 bg-white/90 px-3.5 py-2 text-sm text-ink shadow-sm outline-none transition-[colors,border-color,background-color,box-shadow] duration-200 placeholder:text-muted/80 hover:border-violet-300/55 hover:bg-white hover:shadow-md focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md',
                hasTopics ? 'min-h-10' : 'min-h-[44px]',
              )}
              disabled={loading && !addingTopic}
            />
            <Button
              type="submit"
              variant="primary"
              size={hasTopics ? 'sm' : 'md'}
              disabled={(loading && !addingTopic) || !newTopic.trim()}
              className={cn(
                'w-full shrink-0 cursor-pointer rounded-xl sm:w-auto sm:self-center',
                hasTopics ? 'min-h-10 gap-1.5 px-3 text-xs' : 'min-h-[44px] gap-2',
              )}
            >
              <Plus className={hasTopics ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
              <span>Add topic</span>
            </Button>
          </form>
          {addingTopic ? (
            <div
              className="absolute inset-0 z-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
              role="status"
              aria-live="polite"
            >
              <span className="sr-only">Adding topic</span>
              <div
                className="pointer-events-none absolute inset-0 bg-white/80 backdrop-blur-md"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.07] via-transparent to-fuchsia-500/[0.08]"
                aria-hidden
              />
              <div className="absolute inset-0 flex items-center justify-center p-3">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div
                    className="relative box-border flex size-12 shrink-0 items-center justify-center"
                    aria-hidden
                  >
                    <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-400/25 to-fuchsia-400/20 blur-md motion-safe:animate-pulse" />
                    <span className="absolute inset-[3px] box-border rounded-full border-2 border-violet-100" />
                    <span className="absolute inset-[3px] box-border rounded-full border-2 border-transparent border-t-violet-600 border-r-violet-500/45 motion-safe:animate-spin" />
                  </div>
                  <div
                    className="flex h-1 w-28 shrink-0 justify-center overflow-hidden rounded-full bg-violet-100/90"
                    aria-hidden
                  >
                    <div className="h-full w-2/3 shrink-0 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 opacity-90 motion-safe:animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex flex-col gap-4">
        <div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter topics by status"
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
              className="glass-inset custom-scrollbar scroll-mt-24 overflow-x-hidden rounded-2xl border border-violet-200/50 shadow-sm"
              role="list"
              aria-label="Topics list"
            >
              {filteredRows.map((row, rowIndex) => {
                const normalizedStatus = getNormalizedRowStatus(row.status);
                const dateRaw = row.date?.trim() ?? '';
                const dateLabel = formatQueueDate(dateRaw);
                const actionTopic = topicLabelForQueueActions(row.topic);
                const isSelected =
                  selectedTopicId !== null && String(row.topicId).trim() === String(selectedTopicId).trim();
                return (
                  <div
                    key={`${row.sourceSheet}-${row.rowIndex}-${row.topic}`}
                    role="listitem"
                    data-queue-row-id={topicRowElementId(row)}
                    tabIndex={0}
                    aria-label={`Topic: ${row.topic}`}
                    aria-selected={isSelected}
                    className={cn(
                      'group relative flex cursor-pointer items-center gap-3 border-b border-violet-100/60 px-4 py-3.5 transition-all duration-200 last:border-b-0',
                      'hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-inset',
                      rowIndex % 2 === 1 && !isSelected && 'bg-violet-50/30',
                      isSelected
                        ? 'bg-primary/[0.06] hover:bg-primary/[0.08] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-r-full before:bg-primary'
                        : '',
                    )}
                    onClick={() => onSelectTopicRow(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectTopicRow(row);
                      }
                    }}
                  >
                    {/* Left: topic title + metadata second line */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium leading-snug text-ink"
                        title={topicNeedsFullTooltip(row.topic) ? row.topic.trim() : undefined}
                      >
                        {truncateTopicForUi(row.topic)}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant={getQueueStatusVariant(row.status)} size="sm">
                          {row.status || 'Pending'}
                        </Badge>
                        {dateLabel ? (
                          <span
                            className="truncate text-xs tabular-nums text-muted"
                            title={dateRaw || undefined}
                          >
                            {dateLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Right: action buttons — always visible for selected row, revealed on hover for others */}
                    <div className={cn(
                      'flex shrink-0 items-center gap-1.5 transition-opacity duration-150',
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
                    )}>
                      {normalizedStatus === 'pending' ? (
                        <Button
                          type="button"
                          variant="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            void triggerRowGithubAction(row, 'draft');
                          }}
                          disabled={
                            actionLoading !== null || !session.config.githubRepo || !session.config.hasGitHubToken
                          }
                          title="Generate draft"
                          aria-label={`Generate draft for ${actionTopic}`}
                          className={rowActionClass}
                        >
                          {actionLoading === buildRowActionKey('draft', row) ? (
                            <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          )}
                          <span>Draft</span>
                        </Button>
                      ) : null}

                      {normalizedStatus === 'drafted' ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTopicReview(row);
                            }}
                            title="Edit draft — updates this row (published topics get a new sheet copy when edited)"
                            aria-label={`Edit draft: ${actionTopic}`}
                            className={cn(rowActionClass, 'border-primary/25 shadow-sm')}
                          >
                            <FileEdit className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span>Edit</span>
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              void publishRowToSelectedChannel(row);
                            }}
                            disabled={actionLoading !== null || rowHasActiveScheduledPublish(row)}
                            title={
                              rowHasActiveScheduledPublish(row)
                                ? 'Already scheduled for this time — cancel in the delivery panel or change the schedule in Edit.'
                                : 'Publish to the selected channel (approve in the editor first if you have not yet)'
                            }
                            aria-label={`Publish ${actionTopic} to channel`}
                            className={rowActionClass}
                          >
                            {actionLoading === buildRowActionKey('publish', row) ? (
                              <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                            ) : (
                              <Send className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            <span>Publish</span>
                          </Button>
                        </>
                      ) : null}

                      {normalizedStatus === 'approved' || normalizedStatus === 'published' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTopicReview(row);
                          }}
                          title="Edit schedule or content"
                          aria-label={`Edit schedule or content: ${actionTopic}`}
                          className={cn(rowActionClass, 'border-primary/25 shadow-sm')}
                        >
                          <FileEdit className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span>Edit</span>
                        </Button>
                      ) : null}

                      {normalizedStatus === 'approved' ? (
                        <Button
                          type="button"
                          variant="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            void publishRowToSelectedChannel(row);
                          }}
                          disabled={actionLoading !== null || rowHasActiveScheduledPublish(row)}
                          title={
                            rowHasActiveScheduledPublish(row)
                              ? 'Already scheduled for this time — cancel in the delivery panel or change the schedule in Edit.'
                              : 'Publish'
                          }
                          aria-label={`Publish ${actionTopic} to channel`}
                          className={rowActionClass}
                        >
                          {actionLoading === buildRowActionKey('publish', row) ? (
                            <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <Send className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          )}
                          <span>Publish</span>
                        </Button>
                      ) : null}

                      {normalizedStatus === 'published' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            void republishRowToSelectedChannel(row);
                          }}
                          disabled={actionLoading !== null}
                          title="Republish to channel"
                          aria-label={`Republish ${actionTopic} to channel`}
                          className={cn(rowActionClass, 'border-primary/25 shadow-sm')}
                        >
                          {actionLoading === buildRowActionKey('publish', row) ? (
                            <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <RotateCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          )}
                          <span>Republish</span>
                        </Button>
                      ) : null}
                    </div>

                    {/* Delete — always visible for discoverability */}
                    <div className="flex shrink-0 items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTopic(row);
                        }}
                        disabled={deletingRowIndex === row.rowIndex}
                        title="Delete topic"
                        aria-label={`Delete topic: ${actionTopic}`}
                        className={iconBtn}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
