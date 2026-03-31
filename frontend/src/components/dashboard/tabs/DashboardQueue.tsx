import { useEffect } from 'react';
import { RefreshCw, RotateCw, Send, Trash2, Bot, PenLine, FileEdit } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { type PendingScheduledPublish, rowMatchesPendingScheduledPublish } from '@/features/scheduled-publish';
import { type ChannelId } from '@/integrations/channels';
import { topicLabelForQueueActions, topicNeedsFullTooltip, truncateTopicForUi } from '../../../lib/topicDisplay';

const rowActionClass =
  'h-8 min-h-8 shrink-0 gap-1 rounded-lg px-2.5 text-xs font-semibold active:translate-y-0 disabled:opacity-50 transition-colors duration-200 cursor-pointer';

const iconBtn =
  'h-8 w-8 shrink-0 cursor-pointer rounded-lg text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors duration-200 focus:ring-2 focus:ring-primary/50 focus:outline-none';

export function DashboardQueue({
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

  const rowHasActiveScheduledPublish = (row: SheetRow) =>
    rowMatchesPendingScheduledPublish(row, pendingScheduledPublish, effectiveChannel(row, selectedChannel));

  return (
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
              {option.label}
              {queueCounts[option.value] > 0 && (
                <span className="ml-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-violet-700 leading-none">
                  {queueCounts[option.value]}
                </span>
              )}
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
              {rows.length === 0 ? 'No topics yet' : `No ${statusFilter === 'all' ? '' : statusFilter} topics`}
            </p>
            {rows.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Use the bar at the top to add your first topic.</p>
            ) : null}
          </div>
        ) : (
          <div
            className="glass-inset custom-scrollbar scroll-mt-24 overflow-x-hidden rounded-2xl border border-violet-200/50 shadow-sm"
            role="list"
            aria-label="Topics list"
          >
            {/* Column header */}
            <div className="flex items-center border-b border-violet-200/60 bg-slate-50/70 px-4 py-2" aria-hidden>
              <div className="w-[88px] shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/70">Status</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/70">Topic</span>
              </div>
              <div className="hidden w-24 shrink-0 text-right sm:block">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/70">Date</span>
              </div>
              <div className="w-[152px] shrink-0" />
              <div className="w-9 shrink-0" />
            </div>

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
                    'group relative flex cursor-pointer items-center border-b border-violet-100/60 px-4 py-2.5 transition-all duration-200 last:border-b-0',
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
                  {/* Status column */}
                  <div className="flex w-[88px] shrink-0 items-center">
                    <Badge variant={getQueueStatusVariant(row.status)} size="sm">
                      {row.status || 'Pending'}
                    </Badge>
                  </div>

                  {/* Topic column */}
                  <div className="flex min-w-0 flex-1 items-center">
                    <p
                      className="truncate text-sm font-medium leading-snug text-ink"
                      title={topicNeedsFullTooltip(row.topic) ? row.topic.trim() : undefined}
                    >
                      {truncateTopicForUi(row.topic)}
                    </p>
                  </div>

                  {/* Date column */}
                  <div className="hidden w-24 shrink-0 items-center justify-end sm:flex">
                    {dateLabel ? (
                      <span
                        className="truncate text-xs tabular-nums text-muted"
                        title={dateRaw || undefined}
                      >
                        {dateLabel}
                      </span>
                    ) : null}
                  </div>

                  {/* Actions column — always visible for selected row, revealed on hover for others */}
                  <div className={cn(
                    'flex w-[152px] shrink-0 items-center justify-end gap-1.5 transition-opacity duration-150',
                    isSelected ? 'opacity-100' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto',
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
                        title={
                          !session.config.githubRepo || !session.config.hasGitHubToken
                            ? 'Configure GitHub repo and token in Settings to enable drafting'
                            : 'Generate draft'
                        }
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

                  {/* Delete column */}
                  <div className={cn(
                    'flex w-9 shrink-0 items-center justify-end transition-opacity duration-150',
                    isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-100',
                  )}>
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
  );
}
