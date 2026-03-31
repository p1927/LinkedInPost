import { useEffect, useRef, useState } from 'react';
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react';
import { viewWeek, viewMonthGrid, viewDay } from '@schedule-x/calendar';
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop';
import '@schedule-x/theme-default/dist/index.css';
import './content-schedule-calendar.css';
import { mapTopicsToEvents, extractDateFromStart } from './mapTopicsToEvents';
import { STATUS_CALENDARS } from './statusStyles';
import { EventDetailAndEdit } from './EventDetailAndEdit';
import type { CalendarTopic, TopicScheduleChange } from './types';

export type CalendarView = 'week' | 'month-grid' | 'day';

export interface ContentScheduleCalendarProps {
  topics: CalendarTopic[];
  onTopicPatch?: (id: string, patch: Partial<CalendarTopic>) => void;
  onTopicScheduleChange?: (change: TopicScheduleChange) => void;
  initialView?: CalendarView;
  /** Set false to disable drag-and-drop (e.g. for published events). */
  canDrag?: boolean;
  className?: string;
}

export function ContentScheduleCalendar({
  topics,
  onTopicPatch,
  onTopicScheduleChange,
  initialView = 'week',
  canDrag = true,
  className,
}: ContentScheduleCalendarProps) {
  // Use refs so callbacks always see latest values without recreating the app.
  const topicsRef = useRef(topics);
  const onPatchRef = useRef(onTopicPatch);
  const onScheduleChangeRef = useRef(onTopicScheduleChange);
  useEffect(() => { topicsRef.current = topics; }, [topics]);
  useEffect(() => { onPatchRef.current = onTopicPatch; }, [onTopicPatch]);
  useEffect(() => { onScheduleChangeRef.current = onTopicScheduleChange; }, [onTopicScheduleChange]);

  const [selectedTopic, setSelectedTopic] = useState<CalendarTopic | null>(null);

  const plugins = canDrag ? [createDragAndDropPlugin(15)] : [];

  const calendarApp = useCalendarApp(
    {
      views: [viewWeek, viewMonthGrid, viewDay],
      defaultView: initialView,
      events: mapTopicsToEvents(topics),
      calendars: STATUS_CALENDARS,
      dayBoundaries: { start: '07:00', end: '22:00' },
      callbacks: {
        onEventClick(event) {
          const topic = topicsRef.current.find((t) => String(t.id) === String(event.id));
          if (topic) setSelectedTopic(topic);
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

  // Sync events whenever topics prop changes (re-parses / edits from host).
  useEffect(() => {
    if (!calendarApp) return;
    calendarApp.events.set(mapTopicsToEvents(topicsRef.current));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarApp, topics]);

  return (
    <div className={`csc-wrapper ${className ?? ''}`.trim()}>
      {calendarApp && <ScheduleXCalendar calendarApp={calendarApp} />}

      {selectedTopic && (
        <EventDetailAndEdit
          topic={selectedTopic}
          onClose={() => setSelectedTopic(null)}
          onSave={(patch) => {
            onPatchRef.current?.(selectedTopic.id, patch);
            setSelectedTopic(null);
          }}
        />
      )}
    </div>
  );
}
