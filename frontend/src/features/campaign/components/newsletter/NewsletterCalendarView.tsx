import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { NewsletterRecord, NewsletterIssueRow } from '../../schema/newsletterTypes';
import type { SheetRow } from '@/services/sheets';

export interface CalendarIssueEvent {
  date: string; // YYYY-MM-DD (derived from issue_date)
  newsletterIndex: number; // index in newsletters array → determines color
  newsletterName: string;
  issue: NewsletterIssueRow;
}

interface Props {
  newsletters: NewsletterRecord[];
  issueEvents: CalendarIssueEvent[];
  topicRows: SheetRow[];
  onIssueClick: (issue: NewsletterIssueRow) => void;
}

const NEWSLETTER_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
] as const;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function NewsletterCalendarView({
  newsletters,
  issueEvents,
  topicRows,
  onIssueClick,
}: Props) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [filterKey, setFilterKey] = useState<string>('all');

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    viewDate.getMonth() === today.getMonth() &&
    viewDate.getFullYear() === today.getFullYear();

  const filtered = useMemo(() => {
    const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

    const issues =
      filterKey === 'topics'
        ? []
        : issueEvents.filter(e => {
            const d = new Date(e.date);
            if (d < monthStart || d > monthEnd) return false;
            if (filterKey !== 'all') {
              return newsletters[e.newsletterIndex]?.id === filterKey;
            }
            return true;
          });

    const topics =
      filterKey !== 'all' && filterKey !== 'topics'
        ? []
        : topicRows.filter(row => {
            if (!row.postTime) return false;
            const d = new Date(row.postTime);
            return (
              d.getFullYear() === viewDate.getFullYear() &&
              d.getMonth() === viewDate.getMonth()
            );
          });

    return { issues, topics };
  }, [issueEvents, topicRows, viewDate, filterKey, newsletters]);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, { issues: CalendarIssueEvent[]; topics: SheetRow[] }>();

    for (const issue of filtered.issues) {
      const day = new Date(issue.date).getDate();
      if (!map.has(day)) map.set(day, { issues: [], topics: [] });
      map.get(day)!.issues.push(issue);
    }

    for (const row of filtered.topics) {
      const day = new Date(row.postTime).getDate();
      if (!map.has(day)) map.set(day, { issues: [], topics: [] });
      map.get(day)!.topics.push(row);
    }

    return map;
  }, [filtered]);

  const hasAnyEvents = eventsByDay.size > 0;

  // Build calendar cells
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();
  const totalCells = Math.ceil((startPad + totalDays) / 7) * 7;

  const cells: Array<number | null> = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
    ...Array(totalCells - startPad - totalDays).fill(null),
  ];

  const prevMonth = () =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div>
      {/* Controls row */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-slate-100 text-slate-500"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-slate-700">
          {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-slate-100 text-slate-500"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        <select
          value={filterKey}
          onChange={e => setFilterKey(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">All events</option>
          <option value="topics">Topics only</option>
          {newsletters.map(n => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Day headers */}
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="text-xs text-slate-400 text-center py-2">
            {d}
          </div>
        ))}

        {/* Cells */}
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`pad-${idx}`} className="border-t border-slate-100 p-1 min-h-16" />;
          }

          const dayEvents = eventsByDay.get(day);
          const issueChips = dayEvents?.issues ?? [];
          const topicChips = dayEvents?.topics ?? [];
          const allChips = [
            ...issueChips.map(e => ({ type: 'issue' as const, event: e })),
            ...topicChips.map(r => ({ type: 'topic' as const, row: r })),
          ];
          const visible = allChips.slice(0, 3);
          const overflow = allChips.length - visible.length;

          return (
            <div key={day} className="border-t border-slate-100 p-1 min-h-16 relative">
              {/* Day number */}
              <div className="flex justify-end mb-0.5">
                {isToday(day) ? (
                  <span className="text-xs bg-indigo-600 text-white rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                    {day}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">{day}</span>
                )}
              </div>

              {/* Event chips */}
              <div className="flex flex-col gap-0.5">
                {visible.map((chip, ci) => {
                  if (chip.type === 'issue') {
                    const colorClass = NEWSLETTER_COLORS[chip.event.newsletterIndex % 6];
                    const label = chip.event.issue.subject || chip.event.newsletterName;
                    return (
                      <button
                        key={`issue-${ci}`}
                        onClick={() => onIssueClick(chip.event.issue)}
                        className={clsx(
                          'text-xs rounded px-1.5 py-0.5 truncate max-w-full cursor-pointer text-left',
                          colorClass
                        )}
                        title={label}
                      >
                        {label}
                      </button>
                    );
                  } else {
                    const label = chip.row.topic;
                    return (
                      <span
                        key={`topic-${ci}`}
                        className="text-xs rounded px-1.5 py-0.5 truncate max-w-full bg-slate-100 text-slate-600"
                        title={label}
                      >
                        {label}
                      </span>
                    );
                  }
                })}
                {overflow > 0 && (
                  <span className="text-xs text-slate-400">+{overflow} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {!hasAnyEvents && (
        <div className="text-sm text-slate-400 py-8 text-center">
          No events this month.
        </div>
      )}
    </div>
  );
}
