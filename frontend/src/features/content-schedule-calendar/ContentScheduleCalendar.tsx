import { useEffect, useMemo, useRef, useState } from 'react';
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react';
import { viewWeek, viewMonthGrid, viewDay } from '@schedule-x/calendar';
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop';
import '@schedule-x/theme-default/dist/index.css';
import './content-schedule-calendar.css';
import { mapTopicsToEvents, extractDateFromStart } from './mapTopicsToEvents';
import { STATUS_CALENDARS } from './statusStyles';
import { EventDetailAndEdit } from './EventDetailAndEdit';
import { isLocalScheduleInPast } from './scheduleValidation';
import type { CalendarTopic, TopicRescheduleCommitPayload, TopicScheduleChange } from './types';
import { useAlert } from '@/components/useAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** Schedule-X runtime shape (config is not exposed on public CalendarApp typings). */
type ScheduleXCalendarInternals = {
  $app: {
    config: {
      weekOptions: {
        value: {
          gridHeight: number;
          gridStep: number;
          nDays: number;
          eventWidth: number;
          eventOverlap: boolean;
          timeAxisFormatOptions: Intl.DateTimeFormatOptions;
        };
      };
      monthGridOptions: { value: { nEventsPerDay: number } };
    };
  };
};

function eventsPerDayForWrapperHeight(px: number): number {
  if (px < 340) return 3;
  if (px < 420) return 4;
  if (px < 500) return 5;
  if (px < 580) return 6;
  if (px < 660) return 7;
  if (px < 760) return 8;
  return 9;
}

function resolveRescheduleTopicIds(
  draggedId: string,
  topics: CalendarTopic[],
  selected: ReadonlySet<string> | undefined,
): string[] {
  const id = String(draggedId);
  const movable = (t: CalendarTopic) => (t.status ?? '').toLowerCase() !== 'blocked';
  if (selected?.has(id) && selected.size > 1) {
    return [...selected].filter((tid) => topics.some((t) => String(t.id) === tid && movable(t)));
  }
  if (!topics.some((t) => String(t.id) === id && movable(t))) return [];
  return [id];
}

export type CalendarView = 'week' | 'month-grid' | 'day';

export interface ContentScheduleCalendarProps {
  topics: CalendarTopic[];
  onTopicPatch?: (id: string, patch: Partial<CalendarTopic>) => void;
  onTopicScheduleChange?: (change: TopicScheduleChange) => void;
  initialView?: CalendarView;
  /** Set false to disable drag-and-drop (e.g. for published events). */
  canDrag?: boolean;
  /** HH:MM used when a topic has no `startTime` so it appears in the time grid (week/day drag). */
  fallbackSlotTime?: string;
  /** Topic ids (string) that show a selected outline on the calendar. */
  selectedTopicIds?: ReadonlySet<string>;
  /** ⌘/Ctrl-click toggles selection; plain click still opens the detail dialog. */
  onTopicSelectionToggle?: (id: string) => void;
  onTopicDelete?: (id: string) => void;
  /**
   * Plain click (without modifier) on an event: notify host (e.g. sync list/rail selection)
   * before opening the detail dialog.
   */
  onTopicActivate?: (topic: CalendarTopic) => void;
  /** Block dragging/rescheduling events onto dates before today (local). */
  disablePastDates?: boolean;
  /** Portal the header date-picker to `document.body` so it is not clipped by scroll parents. */
  teleportDatePicker?: boolean;
  className?: string;
  /**
   * When true (Topics queue), drag/resize opens a confirm dialog and calls `onRescheduleCommit`.
   * When false (Campaign), schedule updates apply immediately via `onTopicScheduleChange`.
   */
  rescheduleConfirm?: boolean;
  onRescheduleCommit?: (payload: TopicRescheduleCommitPayload) => Promise<void>;
}

export function ContentScheduleCalendar({
  topics,
  onTopicPatch,
  onTopicScheduleChange,
  initialView = 'month-grid',
  canDrag = true,
  fallbackSlotTime = '09:00',
  selectedTopicIds,
  onTopicSelectionToggle,
  onTopicDelete,
  onTopicActivate,
  disablePastDates = false,
  teleportDatePicker = false,
  className,
  rescheduleConfirm = false,
  onRescheduleCommit,
}: ContentScheduleCalendarProps) {
  const { showAlert } = useAlert();

  const topicsRef = useRef(topics);
  const onPatchRef = useRef(onTopicPatch);
  const onScheduleChangeRef = useRef(onTopicScheduleChange);
  const onSelectionToggleRef = useRef(onTopicSelectionToggle);
  const onDeleteRef = useRef(onTopicDelete);
  const onTopicActivateRef = useRef(onTopicActivate);
  const disablePastDatesRef = useRef(disablePastDates);
  const rescheduleConfirmRef = useRef(rescheduleConfirm);
  const onRescheduleCommitRef = useRef(onRescheduleCommit);
  const selectedTopicIdsRef = useRef(selectedTopicIds);
  const fallbackSlotTimeRef = useRef(fallbackSlotTime);
  const rescheduleResolveRef = useRef<((v: boolean) => void) | null>(null);

  useEffect(() => {
    topicsRef.current = topics;
  }, [topics]);
  useEffect(() => {
    onPatchRef.current = onTopicPatch;
  }, [onTopicPatch]);
  useEffect(() => {
    onScheduleChangeRef.current = onTopicScheduleChange;
  }, [onTopicScheduleChange]);
  useEffect(() => {
    onSelectionToggleRef.current = onTopicSelectionToggle;
  }, [onTopicSelectionToggle]);
  useEffect(() => {
    onDeleteRef.current = onTopicDelete;
  }, [onTopicDelete]);
  useEffect(() => {
    onTopicActivateRef.current = onTopicActivate;
  }, [onTopicActivate]);
  useEffect(() => {
    disablePastDatesRef.current = disablePastDates;
  }, [disablePastDates]);
  useEffect(() => {
    rescheduleConfirmRef.current = rescheduleConfirm;
  }, [rescheduleConfirm]);
  useEffect(() => {
    onRescheduleCommitRef.current = onRescheduleCommit;
  }, [onRescheduleCommit]);
  useEffect(() => {
    selectedTopicIdsRef.current = selectedTopicIds;
  }, [selectedTopicIds]);
  useEffect(() => {
    fallbackSlotTimeRef.current = fallbackSlotTime;
  }, [fallbackSlotTime]);

  const [selectedTopic, setSelectedTopic] = useState<CalendarTopic | null>(null);

  const [rescheduleUi, setRescheduleUi] = useState<{
    open: boolean;
    topicIds: string[];
    date: string;
    time: string;
    hasPublished: boolean;
    titles: string[];
  }>({
    open: false,
    topicIds: [],
    date: '',
    time: '09:00',
    hasPublished: false,
    titles: [],
  });
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [rescheduleFieldError, setRescheduleFieldError] = useState<string | null>(null);

  const plugins = canDrag ? [createDragAndDropPlugin(15)] : [];

  const datePickerConfig = useMemo(
    () =>
      teleportDatePicker && typeof document !== 'undefined'
        ? { teleportTo: document.body as HTMLElement }
        : undefined,
    [teleportDatePicker],
  );

  const calendarApp = useCalendarApp(
    {
      views: [viewWeek, viewMonthGrid, viewDay],
      defaultView: initialView,
      events: mapTopicsToEvents(topics, { fallbackSlotTime, selectedTopicIds }),
      calendars: STATUS_CALENDARS,
      dayBoundaries: { start: '07:00', end: '22:00' },
      weekOptions: { gridHeight: 520, gridStep: 60 },
      monthGridOptions: { nEventsPerDay: 5 },
      ...(datePickerConfig ? { datePicker: datePickerConfig } : {}),
      callbacks: {
        onEventClick(calendarEvent, uiEvent) {
          const id = String(calendarEvent.id);
          const mouse = uiEvent as MouseEvent;
          if (mouse.metaKey || mouse.ctrlKey) {
            onSelectionToggleRef.current?.(id);
            return;
          }
          const topic = topicsRef.current.find((t) => String(t.id) === id);
          if (topic) {
            onTopicActivateRef.current?.(topic);
            setSelectedTopic(topic);
          }
        },
        onBeforeEventUpdateAsync: async (_oldEvent, newEvent) => {
          const proposed = extractDateFromStart(newEvent.start);
          const slotTime = proposed.time ?? fallbackSlotTimeRef.current;
          if (disablePastDatesRef.current && isLocalScheduleInPast(proposed.date, slotTime)) {
            return false;
          }
          if (!rescheduleConfirmRef.current) {
            return true;
          }
          return await new Promise<boolean>((resolve) => {
            if (rescheduleResolveRef.current) {
              rescheduleResolveRef.current(false);
              rescheduleResolveRef.current = null;
            }
            rescheduleResolveRef.current = resolve;
            const topicList = topicsRef.current;
            const topicIds = resolveRescheduleTopicIds(
              String(_oldEvent.id),
              topicList,
              selectedTopicIdsRef.current,
            );
            if (topicIds.length === 0) {
              rescheduleResolveRef.current = null;
              resolve(false);
              return;
            }
            const hasPublished = topicIds.some((tid) => {
              const t = topicList.find((x) => String(x.id) === tid);
              return (t?.status ?? '').toLowerCase() === 'published';
            });
            const titles = topicIds
              .map((tid) => topicList.find((x) => String(x.id) === tid)?.title ?? tid)
              .slice(0, 6);
            setRescheduleFieldError(null);
            setRescheduleUi({
              open: true,
              topicIds,
              date: proposed.date,
              time: proposed.time ?? fallbackSlotTimeRef.current,
              hasPublished,
              titles,
            });
          });
        },
        onEventUpdate(event) {
          if (rescheduleConfirmRef.current) return;
          const change = extractDateFromStart(event.start);
          onScheduleChangeRef.current?.({
            id: String(event.id),
            newDate: change.date,
            newStartTime: change.time,
          });
        },
      },
    },
    plugins,
  );

  const finishRescheduleDialog = (result: boolean) => {
    rescheduleResolveRef.current?.(result);
    rescheduleResolveRef.current = null;
    setRescheduleUi((prev) => ({ ...prev, open: false }));
  };

  const handleRescheduleDialogOpenChange = (open: boolean) => {
    if (!open && !rescheduleBusy) {
      finishRescheduleDialog(false);
    }
  };

  const handleRescheduleApply = async () => {
    const { date, time, topicIds } = rescheduleUi;
    if (!date.trim()) {
      setRescheduleFieldError('Choose a date.');
      return;
    }
    const timeNorm = time.trim() || fallbackSlotTimeRef.current;
    if (disablePastDatesRef.current && isLocalScheduleInPast(date, timeNorm)) {
      setRescheduleFieldError('That date and time are in the past.');
      return;
    }
    setRescheduleFieldError(null);
    const commit = onRescheduleCommitRef.current;
    if (!commit) {
      finishRescheduleDialog(false);
      return;
    }
    setRescheduleBusy(true);
    try {
      await commit({ topicIds, date: date.trim(), time: timeNorm });
    } catch (e) {
      void showAlert({
        title: 'Schedule update failed',
        description: e instanceof Error ? e.message : 'Something went wrong. Try again.',
      });
      setRescheduleBusy(false);
      return;
    } finally {
      setRescheduleBusy(false);
    }
    finishRescheduleDialog(false);
  };

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calendarApp) return;
    const root = wrapperRef.current;
    if (!root) return;

    const internal = calendarApp as unknown as ScheduleXCalendarInternals;
    let raf = 0;

    const apply = () => {
      const h = root.getBoundingClientRect().height;
      if (h < 8) return;

      const headerEl = root.querySelector('.sx__calendar-header');
      const headerH =
        headerEl instanceof HTMLElement ? headerEl.getBoundingClientRect().height : 76;
      const gridH = Math.max(200, Math.round(h - headerH - 6));

      const wo = internal.$app.config.weekOptions.value;
      if (wo.gridHeight !== gridH) {
        internal.$app.config.weekOptions.value = { ...wo, gridHeight: gridH };
      }

      const n = eventsPerDayForWrapperHeight(h);
      const mo = internal.$app.config.monthGridOptions.value;
      if (mo.nEventsPerDay !== n) {
        internal.$app.config.monthGridOptions.value = { ...mo, nEventsPerDay: n };
      }
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    schedule();
    const postPaint = requestAnimationFrame(() => {
      requestAnimationFrame(apply);
    });

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(postPaint);
      ro.disconnect();
    };
  }, [calendarApp]);

  useEffect(() => {
    if (!calendarApp) return;
    calendarApp.events.set(
      mapTopicsToEvents(topicsRef.current, { fallbackSlotTime, selectedTopicIds }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarApp, topics, fallbackSlotTime, selectedTopicIds]);

  return (
    <div
      ref={wrapperRef}
      className={`csc-wrapper ${canDrag ? 'csc-draggable' : ''} ${className ?? ''}`.trim()}
    >
      {calendarApp && <ScheduleXCalendar calendarApp={calendarApp} />}

      <Dialog open={rescheduleUi.open} onOpenChange={handleRescheduleDialogOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={!rescheduleBusy}>
          <DialogHeader>
            <DialogTitle>
              Set schedule
              {rescheduleUi.topicIds.length > 1
                ? ` (${rescheduleUi.topicIds.length} topics)`
                : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            {rescheduleUi.hasPublished ? (
              <p className="text-xs leading-relaxed text-slate-600">
                Published posts keep their original schedule on the calendar. A new draft is created at
                the date and time you set below.
              </p>
            ) : null}
            {rescheduleUi.titles.length > 0 ? (
              <ul className="max-h-24 list-inside list-disc overflow-y-auto text-xs text-slate-600">
                {rescheduleUi.titles.map((t, i) => (
                  <li key={`${t}-${i}`} className="truncate">
                    {t}
                  </li>
                ))}
                {rescheduleUi.topicIds.length > rescheduleUi.titles.length ? (
                  <li className="list-none text-slate-500">
                    +{rescheduleUi.topicIds.length - rescheduleUi.titles.length} more
                  </li>
                ) : null}
              </ul>
            ) : null}
            <div>
              <label htmlFor="csc-reschedule-date" className="mb-1 block text-xs font-medium text-slate-700">
                Date
              </label>
              <Input
                id="csc-reschedule-date"
                type="date"
                value={rescheduleUi.date}
                onChange={(e) => setRescheduleUi((p) => ({ ...p, date: e.target.value }))}
                className="h-9"
                disabled={rescheduleBusy}
              />
            </div>
            <div>
              <label htmlFor="csc-reschedule-time" className="mb-1 block text-xs font-medium text-slate-700">
                Time
              </label>
              <Input
                id="csc-reschedule-time"
                type="time"
                value={rescheduleUi.time}
                onChange={(e) => setRescheduleUi((p) => ({ ...p, time: e.target.value }))}
                className="h-9"
                disabled={rescheduleBusy}
              />
            </div>
            {rescheduleFieldError ? (
              <p className="text-xs font-medium text-rose-600">{rescheduleFieldError}</p>
            ) : null}
          </div>
          <DialogFooter className="border-t-0 bg-transparent p-0 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={rescheduleBusy}
              onClick={() => finishRescheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={rescheduleBusy} onClick={() => void handleRescheduleApply()}>
              {rescheduleBusy ? 'Applying…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedTopic && (
        <EventDetailAndEdit
          key={String(selectedTopic.id)}
          topic={selectedTopic}
          defaultSlotTime={fallbackSlotTime}
          minSelectableDateIso={disablePastDates ? Temporal.Now.plainDateISO().toString() : undefined}
          onClose={() => setSelectedTopic(null)}
          onSave={(patch) => {
            onPatchRef.current?.(selectedTopic.id, patch);
            setSelectedTopic(null);
          }}
          onDelete={
            onTopicDelete
              ? () => {
                  onDeleteRef.current?.(selectedTopic.id);
                  setSelectedTopic(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
