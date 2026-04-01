import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, RotateCw, Send, Trash2, Bot, PenLine, FileEdit, LayoutList, CalendarDays } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { type AppSession, type ContentPattern, type GenWorkerGenerateRequest } from '../../../services/backendApi';
import { type SheetRow } from '../../../services/sheets';
import { type QueueFilter } from '../types';
import { getNormalizedRowStatus, buildRowActionKey, formatQueueDate, formatQueuePostTime } from '../utils';
import { effectiveChannel } from '@/lib/topicEffectivePrefs';
import { topicRowElementId } from '../../../features/topic-navigation/utils/topicRoute';
import { filterOptions } from '../constants';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { ChipToggle } from '@/components/ui/ChipToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { type PendingScheduledPublish, rowMatchesPendingScheduledPublish } from '@/features/scheduled-publish';
import { type ChannelId, CHANNEL_OPTIONS } from '@/integrations/channels';
import { topicLabelForQueueActions, topicNeedsFullTooltip, truncateTopicForUi } from '../../../lib/topicDisplay';
import {
  ContentScheduleCalendar,
  deriveCalendarFieldsFromSheetRow,
  isLocalScheduleInPast,
  localDateIsoToday,
  sheetRowsToCalendarTopics,
  type CalendarTopic,
  type TopicRescheduleCommitPayload,
} from '@/features/content-schedule-calendar';
import { GenWorkerDraftField } from '@/features/ai-draft/GenWorkerDraftField';
import {
  getAudienceSuggestions,
  getConstraintsSuggestions,
  getCtaSuggestions,
  getToneSuggestions,
  mergeCommaParts,
  mergeConstraintParts,
} from '@/features/ai-draft/genWorkerDraftSuggestions';

const rowActionClass =
  'h-8 min-h-[44px] shrink-0 gap-1 rounded-lg px-2.5 text-xs font-semibold active:translate-y-0 disabled:opacity-50 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

const iconBtn =
  'h-8 w-8 min-h-[44px] min-w-[44px] shrink-0 cursor-pointer rounded-lg text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none';

export function DashboardQueue({
  setStatusFilter,
  statusFilter,
  queueCounts,
  filteredRows,
  rows,
  getQueueStatusVariant,
  triggerRowGithubAction,
  actionLoading,
  draftDispatchPendingTopicIds,
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
  availableModels,
  onBulkDelete,
  onBulkSetChannel,
  onBulkSetModel,
  onBulkSetSchedule,
  onUpdatePostSchedule,
  onCalendarRescheduleCommit,
  onGenerationWorkerDraft,
  /** Patterns for the row’s generation template — used to tailor AI Draft quick picks. */
  contentPatterns = [],
}: {
  setStatusFilter: (filter: QueueFilter) => void;
  statusFilter: QueueFilter;
  queueCounts: Record<QueueFilter, number>;
  filteredRows: SheetRow[];
  rows: SheetRow[];
  getQueueStatusVariant: (status: string) => BadgeVariant;
  triggerRowGithubAction: (row: SheetRow, action: 'draft' | 'publish') => Promise<void>;
  actionLoading: string | null;
  /** Topic IDs where draft was dispatched; that row stays disabled with busy UI until status updates. */
  draftDispatchPendingTopicIds: readonly string[];
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
  availableModels: Array<{ value: string; label: string }>;
  onBulkDelete: (rows: SheetRow[]) => Promise<void>;
  onBulkSetChannel: (rows: SheetRow[], channel: string) => Promise<void>;
  onBulkSetModel: (rows: SheetRow[], model: string) => Promise<void>;
  onBulkSetSchedule: (rows: SheetRow[], date: string, time: string) => Promise<void>;
  onUpdatePostSchedule: (row: SheetRow, postTime: string) => Promise<void>;
  onCalendarRescheduleCommit: (payload: TopicRescheduleCommitPayload) => Promise<void>;
  onGenerationWorkerDraft?: (row: SheetRow, request: GenWorkerGenerateRequest) => Promise<void>;
  contentPatterns?: ContentPattern[];
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

  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkChannelOpen, setBulkChannelOpen] = useState(false);
  const [bulkModelOpen, setBulkModelOpen] = useState(false);
  const [bulkScheduleOpen, setBulkScheduleOpen] = useState(false);
  const [bulkChannel, setBulkChannel] = useState('');
  const [bulkModel, setBulkModel] = useState('');
  const [bulkDate, setBulkDate] = useState('');
  const [bulkTime, setBulkTime] = useState('');
  const [topicsViewMode, setTopicsViewMode] = useState<'list' | 'calendar'>('list');

  // Generation worker draft dialog
  const [genWorkerDialogRow, setGenWorkerDialogRow] = useState<SheetRow | null>(null);
  const [genWorkerBusy, setGenWorkerBusy] = useState(false);
  const [gwAudience, setGwAudience] = useState('');
  const [gwTone, setGwTone] = useState('');
  const [gwCta, setGwCta] = useState('');
  const [gwConstraints, setGwConstraints] = useState('');
  const [gwAudienceChips, setGwAudienceChips] = useState<string[]>([]);
  const [gwToneChips, setGwToneChips] = useState<string[]>([]);
  const [gwCtaChips, setGwCtaChips] = useState<string[]>([]);
  const [gwConstraintsChips, setGwConstraintsChips] = useState<string[]>([]);
  const [gwFactual, setGwFactual] = useState(false);

  const resetGenWorkerForm = useCallback(() => {
    setGwAudienceChips([]);
    setGwToneChips([]);
    setGwCtaChips([]);
    setGwConstraintsChips([]);
    setGwAudience('');
    setGwTone('');
    setGwCta('');
    setGwConstraints('');
    setGwFactual(false);
  }, []);

  const genWorkerSuggestionCtx = useMemo(() => {
    if (!genWorkerDialogRow) return null;
    const channel = effectiveChannel(genWorkerDialogRow, selectedChannel);
    const tid = (genWorkerDialogRow.generationTemplateId ?? '').trim();
    const pattern = tid ? contentPatterns.find((p) => p.id === tid) ?? null : null;
    return { channel, pattern };
  }, [genWorkerDialogRow, selectedChannel, contentPatterns]);

  const audienceSuggestions = useMemo(
    () => (genWorkerSuggestionCtx ? getAudienceSuggestions(genWorkerSuggestionCtx) : []),
    [genWorkerSuggestionCtx],
  );
  const toneSuggestions = useMemo(
    () => (genWorkerSuggestionCtx ? getToneSuggestions(genWorkerSuggestionCtx) : []),
    [genWorkerSuggestionCtx],
  );
  const ctaSuggestions = useMemo(
    () => (genWorkerSuggestionCtx ? getCtaSuggestions(genWorkerSuggestionCtx) : []),
    [genWorkerSuggestionCtx],
  );
  const constraintsSuggestions = useMemo(
    () => (genWorkerSuggestionCtx ? getConstraintsSuggestions(genWorkerSuggestionCtx) : []),
    [genWorkerSuggestionCtx],
  );

  const handleGenWorkerSubmit = useCallback(async () => {
    if (!genWorkerDialogRow || !onGenerationWorkerDraft) return;
    const audienceMerged = mergeCommaParts(gwAudienceChips, gwAudience);
    const toneMerged = mergeCommaParts(gwToneChips, gwTone);
    const ctaMerged = mergeCommaParts(gwCtaChips, gwCta);
    const constraintsMerged = mergeConstraintParts(gwConstraintsChips, gwConstraints);
    setGenWorkerBusy(true);
    try {
      await onGenerationWorkerDraft(genWorkerDialogRow, {
        topicId: genWorkerDialogRow.topicId,
        topic: genWorkerDialogRow.topic,
        channel: effectiveChannel(genWorkerDialogRow, selectedChannel),
        ...(audienceMerged ? { audience: audienceMerged } : {}),
        ...(toneMerged ? { tone: toneMerged } : {}),
        ...(ctaMerged ? { cta: ctaMerged } : {}),
        ...(constraintsMerged ? { constraints: constraintsMerged } : {}),
        ...(gwFactual ? { factual: true } : {}),
      });
      setGenWorkerDialogRow(null);
      resetGenWorkerForm();
    } finally {
      setGenWorkerBusy(false);
    }
  }, [
    genWorkerDialogRow,
    onGenerationWorkerDraft,
    selectedChannel,
    gwAudience,
    gwTone,
    gwCta,
    gwConstraints,
    gwAudienceChips,
    gwToneChips,
    gwCtaChips,
    gwConstraintsChips,
    gwFactual,
    resetGenWorkerForm,
  ]);

  const getTopicId = (row: SheetRow) => String(row.topicId).trim();
  const selectedRows = filteredRows.filter((r) => selectedTopicIds.has(getTopicId(r)));
  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selectedTopicIds.has(getTopicId(r)));

  const toggleRow = (row: SheetRow) => {
    const id = getTopicId(row);
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedTopicIds((prev) => {
        const next = new Set(prev);
        filteredRows.forEach((r) => next.delete(getTopicId(r)));
        return next;
      });
    } else {
      setSelectedTopicIds((prev) => {
        const next = new Set(prev);
        filteredRows.forEach((r) => next.add(getTopicId(r)));
        return next;
      });
    }
  };

  const calendarTopics = useMemo(
    () =>
      sheetRowsToCalendarTopics(filteredRows, {
        channelLabelForRow: (r) => effectiveChannel(r, selectedChannel),
      }),
    [filteredRows, selectedChannel],
  );

  const topicsWithCalendarDate = useMemo(
    () => calendarTopics.filter((t) => t.date.trim()),
    [calendarTopics],
  );

  const handleCalendarTopicPatch = useCallback(
    (id: string, patch: Partial<CalendarTopic>) => {
      void (async () => {
        const row = rows.find((r) => String(r.topicId).trim() === id.trim());
        if (!row) return;
        const base = deriveCalendarFieldsFromSheetRow(row);
        const nextDate = patch.date !== undefined ? patch.date.trim() : base.date;
        const nextTime =
          patch.startTime !== undefined ? patch.startTime.trim() : (base.startTime ?? '');
        if (patch.date !== undefined || patch.startTime !== undefined) {
          if (!nextDate) return;
          if (nextDate < localDateIsoToday()) return;
          if (nextTime && isLocalScheduleInPast(nextDate, nextTime)) return;
          const postTime = nextTime ? `${nextDate} ${nextTime}` : nextDate;
          await onUpdatePostSchedule(row, postTime);
        }
        if (patch.title !== undefined && patch.title.trim() !== row.topic.trim()) {
          onOpenTopicReview(row);
        }
      })();
    },
    [rows, onUpdatePostSchedule, onOpenTopicReview],
  );

  const handleCalendarDelete = useCallback(
    (id: string) => {
      const row = rows.find((r) => String(r.topicId).trim() === id.trim());
      if (row) void handleDeleteTopic(row);
    },
    [rows, handleDeleteTopic],
  );

  const toggleTopicSelectionById = useCallback((id: string) => {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <div
          role="tablist"
          aria-label="Topics layout"
          className="flex shrink-0 rounded-lg border border-violet-200/70 bg-white/60 p-0.5 shadow-sm"
        >
          <button
            type="button"
            role="tab"
            aria-selected={topicsViewMode === 'list'}
            onClick={() => setTopicsViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/50',
              topicsViewMode === 'list'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-ink',
            )}
          >
            <LayoutList className="h-3.5 w-3.5" aria-hidden />
            List
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={topicsViewMode === 'calendar'}
            onClick={() => setTopicsViewMode('calendar')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/50',
              topicsViewMode === 'calendar'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-ink',
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Calendar
          </button>
        </div>
      </div>

      {selectedTopicIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2">
          <span className="text-xs font-semibold text-violet-800">{selectedTopicIds.size} selected</span>
          <button
            type="button"
            onClick={() => setSelectedTopicIds(new Set())}
            aria-label="Clear selection"
            className="min-h-[44px] min-w-[44px] px-2 text-xs text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
          >
            Clear
          </button>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="secondary"
              disabled={bulkBusy}
              onClick={() => { setBulkDate(''); setBulkTime('09:00'); setBulkScheduleOpen(true); }}
              className="h-7 gap-1 rounded-lg px-2.5 text-xs font-semibold"
            >
              Set schedule
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={bulkBusy}
              onClick={() => { setBulkChannel(''); setBulkChannelOpen(true); }}
              className="h-7 gap-1 rounded-lg px-2.5 text-xs font-semibold"
            >
              Set channel
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={bulkBusy}
              onClick={() => { setBulkModel(''); setBulkModelOpen(true); }}
              className="h-7 gap-1 rounded-lg px-2.5 text-xs font-semibold"
            >
              Set AI model
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={bulkBusy}
              onClick={async () => {
                if (!window.confirm(`Delete ${selectedRows.length} topic(s)? This cannot be undone.`)) return;
                setBulkBusy(true);
                try {
                  await onBulkDelete(selectedRows);
                  setSelectedTopicIds(new Set());
                } finally {
                  setBulkBusy(false);
                }
              }}
              className="h-7 gap-1 rounded-lg px-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete
            </Button>
          </div>
        </div>
      )}

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
        ) : topicsViewMode === 'calendar' ? (
          topicsWithCalendarDate.length === 0 ? (
            <div className="glass-panel rounded-2xl border border-dashed border-violet-200/50 px-6 py-14 text-center">
              <div className="glass-inset mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-muted">
                <CalendarDays className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <p className="text-base font-semibold text-ink">Nothing scheduled on the calendar yet</p>
              <p className="mt-2 text-sm text-muted">
                Switch to list view and set a date and post time for topics, or relax your status filter.
              </p>
            </div>
          ) : (
            <div className="glass-inset overflow-visible rounded-2xl border border-violet-200/50 shadow-sm">
              <ContentScheduleCalendar
                topics={calendarTopics}
                rescheduleConfirm
                onRescheduleCommit={onCalendarRescheduleCommit}
                onTopicPatch={handleCalendarTopicPatch}
                onTopicDelete={handleCalendarDelete}
                onTopicActivate={(topic) => {
                  const payload = topic.payload as SheetRow | undefined;
                  if (payload) onSelectTopicRow(payload);
                }}
                selectedTopicIds={selectedTopicIds}
                onTopicSelectionToggle={toggleTopicSelectionById}
                initialView="month-grid"
                disablePastDates
                teleportDatePicker
                className="csc-compact csc-topics-queue"
              />
            </div>
          )
        ) : (
          <div
            className="glass-inset custom-scrollbar scroll-mt-24 overflow-x-hidden rounded-2xl border border-violet-200/50 shadow-sm"
            role="list"
            aria-label="Topics list"
          >
            {/* Column header */}
            <div
              className="flex items-center gap-x-2 border-b border-violet-200/60 bg-slate-50/70 px-4 py-2 sm:gap-x-3"
            >
              <div className="w-6 shrink-0">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  aria-label="Select all topics"
                />
              </div>
              <div className="w-[88px] shrink-0 pr-1" aria-hidden="true">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/70">Status</span>
              </div>
              <div className="min-w-0 flex-1 px-1" aria-hidden="true">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/70">Topic</span>
              </div>
              <div className="hidden w-[7.25rem] shrink-0 pr-3 text-right sm:block sm:w-[8.5rem]" aria-hidden="true">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/70">Date</span>
              </div>
              <div className="w-[152px] shrink-0 pl-2" aria-hidden="true" />
              <div className="w-9 shrink-0 pl-0.5" aria-hidden="true" />
            </div>

            {filteredRows.map((row, rowIndex) => {
              const normalizedStatus = getNormalizedRowStatus(row.status);
              const dateRaw = row.date?.trim() ?? '';
              const dateLabel = formatQueueDate(dateRaw);
              const actionTopic = topicLabelForQueueActions(row.topic);
              const topicIdKey = String(row.topicId ?? '').trim();
              const draftDispatchSentBusy = topicIdKey !== '' && draftDispatchPendingTopicIds.includes(topicIdKey);
              const draftActionKey = buildRowActionKey('draft', row);
              const draftButtonBusy = actionLoading === draftActionKey || draftDispatchSentBusy;
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
                    'group relative flex cursor-pointer items-center gap-x-2 border-b border-violet-100/60 px-4 py-2.5 transition-all duration-200 last:border-b-0 sm:gap-x-3',
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
                  {/* Checkbox column */}
                  <div className="flex w-6 shrink-0 items-center">
                    <input
                      type="checkbox"
                      checked={selectedTopicIds.has(getTopicId(row))}
                      onChange={(e) => { e.stopPropagation(); toggleRow(row); }}
                      onClick={(e) => e.stopPropagation()}
                      className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      aria-label={`Select ${row.topic}`}
                    />
                  </div>

                  {/* Status column */}
                  <div className="flex w-[88px] shrink-0 items-center pr-1">
                    <Badge variant={getQueueStatusVariant(row.status)} size="sm">
                      {row.status || 'Pending'}
                    </Badge>
                  </div>

                  {/* Topic column */}
                  <div className="flex min-w-0 flex-1 items-center px-1">
                    <p
                      className="truncate text-sm font-medium leading-snug text-ink"
                      title={topicNeedsFullTooltip(row.topic) ? row.topic.trim() : undefined}
                    >
                      {truncateTopicForUi(row.topic)}
                    </p>
                  </div>

                  {/* Date column — right-aligned within a fixed width so text sits left of action buttons with column gap */}
                  <div className="hidden w-[7.25rem] shrink-0 flex-col items-end justify-center gap-0.5 pr-3 text-right sm:flex sm:w-[8.5rem]">
                    {dateRaw.trim() ? (
                      <span
                        className="max-w-full truncate text-xs tabular-nums text-muted"
                        title={dateRaw || undefined}
                      >
                        {dateLabel}
                      </span>
                    ) : row.postTime?.trim() ? null : (
                      <span className="text-xs tabular-nums text-muted">—</span>
                    )}
                    {row.postTime?.trim() ? (
                      <span
                        className="max-w-full truncate text-[11px] tabular-nums text-muted/85"
                        title={row.postTime.trim()}
                      >
                        {dateRaw.trim()
                          ? formatQueuePostTime(row.postTime.trim())
                          : row.postTime.trim()}
                      </span>
                    ) : null}
                  </div>

                  {/* Actions column — always visible for selected row, revealed on hover for others */}
                  <div className={cn(
                    'flex w-[152px] shrink-0 items-center justify-end gap-1.5 pl-2 transition-opacity duration-150',
                    isSelected ? 'opacity-100' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto',
                  )}>
                    {normalizedStatus === 'pending' ? (
                      <>
                        {session.config.hasGenerationWorker && onGenerationWorkerDraft ? (
                          <Button
                            type="button"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              resetGenWorkerForm();
                              setGenWorkerDialogRow(row);
                            }}
                            disabled={actionLoading !== null || genWorkerBusy}
                            aria-label={`AI generate draft for ${actionTopic}`}
                            title="Generate draft with AI generation worker"
                            className={rowActionClass}
                          >
                            <Bot className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span>AI Draft</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              void triggerRowGithubAction(row, 'draft');
                            }}
                            disabled={
                              actionLoading !== null ||
                              draftDispatchSentBusy ||
                              !session.config.githubRepo ||
                              !session.config.hasGitHubToken
                            }
                            aria-busy={draftButtonBusy}
                            title={
                              !session.config.githubRepo || !session.config.hasGitHubToken
                                ? 'Configure GitHub repo and token in Settings to enable drafting'
                                : draftDispatchSentBusy
                                  ? 'Draft job sent — GitHub is generating; use Refresh until this row shows Drafted'
                                  : actionLoading === draftActionKey
                                    ? 'Sending draft request…'
                                    : 'Generate draft'
                            }
                            aria-label={`Generate draft for ${actionTopic}`}
                            className={rowActionClass}
                          >
                            {draftButtonBusy ? (
                              <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                            ) : (
                              <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            <span>{draftButtonBusy ? 'Drafting…' : 'Draft'}</span>
                          </Button>
                        )}
                      </>
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
                    'flex w-9 shrink-0 items-center justify-end pl-0.5 transition-opacity duration-150',
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

      {/* Bulk: Set Schedule */}
      <Dialog open={bulkScheduleOpen} onOpenChange={setBulkScheduleOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton>
          <DialogHeader>
            <DialogTitle>Set schedule for {selectedRows.length} topic(s)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div>
              <label htmlFor="bulk-schedule-date" className="mb-1 block text-xs font-medium text-slate-700">Date</label>
              <Input id="bulk-schedule-date" type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <label htmlFor="bulk-schedule-time" className="mb-1 block text-xs font-medium text-slate-700">Time</label>
              <Input id="bulk-schedule-time" type="time" value={bulkTime} onChange={(e) => setBulkTime(e.target.value)} className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkScheduleOpen(false)}>Cancel</Button>
            <Button
              disabled={bulkBusy || !bulkDate}
              onClick={async () => {
                setBulkBusy(true);
                try {
                  await onBulkSetSchedule(selectedRows, bulkDate, bulkTime);
                  setSelectedTopicIds(new Set());
                  setBulkScheduleOpen(false);
                } finally {
                  setBulkBusy(false);
                }
              }}
            >
              {bulkBusy ? 'Applying…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk: Set Channel */}
      <Dialog open={bulkChannelOpen} onOpenChange={setBulkChannelOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton>
          <DialogHeader>
            <DialogTitle>Set channel for {selectedRows.length} topic(s)</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <Select value={bulkChannel} onValueChange={(v) => setBulkChannel(v ?? '')}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Choose channel…" />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkChannelOpen(false)}>Cancel</Button>
            <Button
              disabled={bulkBusy || !bulkChannel}
              onClick={async () => {
                setBulkBusy(true);
                try {
                  await onBulkSetChannel(selectedRows, bulkChannel);
                  setSelectedTopicIds(new Set());
                  setBulkChannelOpen(false);
                } finally {
                  setBulkBusy(false);
                }
              }}
            >
              {bulkBusy ? 'Applying…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk: Set AI Model */}
      <Dialog open={bulkModelOpen} onOpenChange={setBulkModelOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton>
          <DialogHeader>
            <DialogTitle>Set AI model for {selectedRows.length} topic(s)</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <Select value={bulkModel} onValueChange={(v) => setBulkModel(v ?? '')}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Choose model…" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(100vw-1.5rem,28rem)]">
                {availableModels.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="items-start py-2">
                    <span className="whitespace-normal leading-snug">{m.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkModelOpen(false)}>Cancel</Button>
            <Button
              disabled={bulkBusy || !bulkModel}
              onClick={async () => {
                setBulkBusy(true);
                try {
                  await onBulkSetModel(selectedRows, bulkModel);
                  setSelectedTopicIds(new Set());
                  setBulkModelOpen(false);
                } finally {
                  setBulkBusy(false);
                }
              }}
            >
              {bulkBusy ? 'Applying…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generation worker draft dialog */}
      <Dialog
        open={genWorkerDialogRow !== null}
        onOpenChange={(open) => {
          if (!open && !genWorkerBusy) {
            resetGenWorkerForm();
            setGenWorkerDialogRow(null);
          }
        }}
      >
        <DialogContent aria-describedby="gen-worker-dialog-desc" className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
          {/* Header */}
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold leading-tight text-ink">
                  Generate AI Draft
                </DialogTitle>
                {genWorkerDialogRow?.topic && (
                  <p className="mt-0.5 truncate text-xs text-muted" title={genWorkerDialogRow.topic}>
                    {genWorkerDialogRow.topic}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4">
            <p id="gen-worker-dialog-desc" className="mb-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              All fields are optional. Use the tags under each field or type your own. Leave everything blank
              for workspace defaults.
            </p>
            <div className="flex flex-col gap-4">
              <GenWorkerDraftField
                label="Audience"
                placeholder="e.g. senior engineers, startup founders"
                chips={gwAudienceChips}
                onAddChip={(v) => setGwAudienceChips((prev) => (prev.includes(v) ? prev : [...prev, v]))}
                onRemoveChip={(v) => setGwAudienceChips((prev) => prev.filter((x) => x !== v))}
                freeValue={gwAudience}
                onFreeChange={setGwAudience}
                suggestions={audienceSuggestions}
                disabled={genWorkerBusy}
              />
              <GenWorkerDraftField
                label="Tone"
                placeholder="e.g. conversational, authoritative, witty"
                chips={gwToneChips}
                onAddChip={(v) => setGwToneChips((prev) => (prev.includes(v) ? prev : [...prev, v]))}
                onRemoveChip={(v) => setGwToneChips((prev) => prev.filter((x) => x !== v))}
                freeValue={gwTone}
                onFreeChange={setGwTone}
                suggestions={toneSuggestions}
                disabled={genWorkerBusy}
              />
              <GenWorkerDraftField
                label="Call to action"
                placeholder="e.g. follow for more, share your thoughts"
                chips={gwCtaChips}
                onAddChip={(v) => setGwCtaChips((prev) => (prev.includes(v) ? prev : [...prev, v]))}
                onRemoveChip={(v) => setGwCtaChips((prev) => prev.filter((x) => x !== v))}
                freeValue={gwCta}
                onFreeChange={setGwCta}
                suggestions={ctaSuggestions}
                disabled={genWorkerBusy}
              />
              <GenWorkerDraftField
                label="Additional constraints"
                placeholder="e.g. keep under 300 words, include a statistic"
                chips={gwConstraintsChips}
                onAddChip={(v) => setGwConstraintsChips((prev) => (prev.includes(v) ? prev : [...prev, v]))}
                onRemoveChip={(v) => setGwConstraintsChips((prev) => prev.filter((x) => x !== v))}
                freeValue={gwConstraints}
                onFreeChange={setGwConstraints}
                suggestions={constraintsSuggestions}
                disabled={genWorkerBusy}
                multiline
                freeRows={2}
              />
            </div>

            {/* Factual checkbox */}
            <div className="mt-4 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
              <label
                className="flex cursor-pointer select-none items-center gap-2.5 text-sm font-medium text-ink transition-colors hover:text-ink/80"
                htmlFor="factual-checkbox"
              >
                <input
                  id="factual-checkbox"
                  type="checkbox"
                  checked={gwFactual}
                  onChange={(e) => setGwFactual(e.target.checked)}
                  disabled={genWorkerBusy}
                  className="h-4 w-4 shrink-0 cursor-pointer rounded border border-input bg-background accent-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span>Factual / data-driven post</span>
              </label>
              <p className="mt-1.5 pl-[1.375rem] text-[11px] leading-relaxed text-muted sm:text-xs">
                Instructs the AI to prioritise accuracy and cite sources or data points where relevant.
              </p>
            </div>
          </div>

          {/* Footer: reset DialogFooter negative margins when content uses p-0 */}
          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 flex-row items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-5 py-3.5 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetGenWorkerForm();
                setGenWorkerDialogRow(null);
              }}
              disabled={genWorkerBusy}
              className="h-9 min-w-[5.5rem] px-4"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={genWorkerBusy}
              onClick={() => void handleGenWorkerSubmit()}
              className="h-9 min-w-[10.5rem] gap-1.5 px-4"
            >
              {genWorkerBusy ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Generating…
                </>
              ) : (
                <>
                  <Bot className="h-3.5 w-3.5" aria-hidden />
                  Generate Draft
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
