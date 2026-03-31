import { useEffect, useMemo, useRef, useState } from 'react';
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react';
import { viewWeek, viewMonthGrid, viewDay } from '@schedule-x/calendar';
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop';
import '@schedule-x/theme-default/dist/index.css';
import './content-schedule-calendar.css';
import { mapTopicsToEvents, extractDateFromStart } from './mapTopicsToEvents';
import { STATUS_CALENDARS } from './statusStyles';
import { EventDetailAndEdit } from './EventDetailAndEdit';
import { eventStartToPlainDate } from './calendarTemporal';
import type { CalendarTopic, TopicScheduleChange } from './types';

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
  /** Highlight these event ids (same strings as `CalendarTopic.id`). */
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
}: ContentScheduleCalendarProps) {
  // Use refs so callbacks always see latest values without recreating the app.
  const topicsRef = useRef(topics);
  const onPatchRef = useRef(onTopicPatch);
  const onScheduleChangeRef = useRef(onTopicScheduleChange);
  const onSelectionToggleRef = useRef(onTopicSelectionToggle);
  const onDeleteRef = useRef(onTopicDelete);
  const onTopicActivateRef = useRef(onTopicActivate);
  const disablePastDatesRef = useRef(disablePastDates);
  useEffect(() => { topicsRef.current = topics; }, [topics]);
  useEffect(() => { onPatchRef.current = onTopicPatch; }, [onTopicPatch]);
  useEffect(() => { onScheduleChangeRef.current = onTopicScheduleChange; }, [onTopicScheduleChange]);
  useEffect(() => { onSelectionToggleRef.current = onTopicSelectionToggle; }, [onTopicSelectionToggle]);
  useEffect(() => { onDeleteRef.current = onTopicDelete; }, [onTopicDelete]);
  useEffect(() => { onTopicActivateRef.current = onTopicActivate; }, [onTopicActivate]);
  useEffect(() => { disablePastDatesRef.current = disablePastDates; }, [disablePastDates]);

  const [selectedTopic, setSelectedTopic] = useState<CalendarTopic | null>(null);

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
      /** Initial guess; ResizeObserver below matches grid pixel height to the wrapper (viewport). */
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
        onBeforeEventUpdate(_oldEvent, newEvent) {
          if (!disablePastDatesRef.current) return true;
          const plain = eventStartToPlainDate(newEvent.start);
          if (!plain) return true;
          const today = Temporal.Now.plainDateISO();
          return Temporal.PlainDate.compare(plain, today) >= 0;
        },
        onEventUpdate(event) {
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

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fit week/day time grid and month “N events per day” to the actual wrapper size (vw/vh / panel).
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

  // Sync events whenever topics prop changes (re-parses / edits from host).
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
