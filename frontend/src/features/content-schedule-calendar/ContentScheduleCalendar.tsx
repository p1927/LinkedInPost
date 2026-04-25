import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CSC_TOKENS as T } from './tokens';
import './content-schedule-calendar.css';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { MonthView } from './MonthView';
import { EventDetailAndEdit } from './EventDetailAndEdit';
import {
  localDateIsoToday, isoPlusDays,
  weekDaysFor, weekLabel, monthLabel, prettyDate,
  formatTimeHm, firstOfMonth,
} from './calendarTemporal';
import { isLocalScheduleInPast } from './scheduleValidation';
import type {
  CalendarTopic,
  TopicEventModalActions,
  TopicRescheduleCommitPayload,
  TopicScheduleChange,
} from './types';
import type { DragEndArg } from './useTimeGridDrag';
import { useAlert } from '@/components/useAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export type CalendarView = 'week' | 'month-grid' | 'day';

export interface ContentScheduleCalendarProps {
  topics: CalendarTopic[];
  onTopicPatch?: (id: string, patch: Partial<CalendarTopic>) => void;
  onTopicScheduleChange?: (change: TopicScheduleChange) => void;
  initialView?: CalendarView;
  canDrag?: boolean;
  fallbackSlotTime?: string;
  selectedTopicIds?: ReadonlySet<string>;
  onTopicSelectionToggle?: (id: string) => void;
  onTopicDelete?: (id: string) => void;
  onTopicActivate?: (topic: CalendarTopic) => void;
  disablePastDates?: boolean;
  /** No-op (kept for prop compatibility — the new header has no portaled date-picker). */
  teleportDatePicker?: boolean;
  className?: string;
  rescheduleConfirm?: boolean;
  onRescheduleCommit?: (payload: TopicRescheduleCommitPayload) => Promise<void>;
  topicEventModalActions?: TopicEventModalActions;
  renderPreview?: (topic: CalendarTopic) => ReactNode;
  disableInternalDrawer?: boolean;
}

interface RescheduleUi {
  open: boolean;
  topicIds: string[];
  date: string;
  time: string;
  hasPublished: boolean;
  titles: string[];
}

const INITIAL_RESCHEDULE: RescheduleUi = {
  open: false, topicIds: [], date: '', time: '09:00', hasPublished: false, titles: [],
};

export function ContentScheduleCalendar(props: ContentScheduleCalendarProps) {
  const {
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
    className,
    rescheduleConfirm = false,
    onRescheduleCommit,
    topicEventModalActions,
    renderPreview,
    disableInternalDrawer,
  } = props;

  const { showAlert } = useAlert();

  const [view, setView] = useState<CalendarView>(initialView);
  const [anchorIso, setAnchorIso] = useState<string>(localDateIsoToday());
  const [todayIso, setTodayIso] = useState<string>(localDateIsoToday());
  const [selectedTopic, setSelectedTopic] = useState<CalendarTopic | null>(null);
  const [rescheduleUi, setRescheduleUi] = useState<RescheduleUi>(INITIAL_RESCHEDULE);
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [rescheduleFieldError, setRescheduleFieldError] = useState<string | null>(null);
  const rescheduleResolveRef = useRef<((v: boolean) => void) | null>(null);

  // Refresh todayIso at midnight + on focus.
  useEffect(() => {
    const tick = () => setTodayIso(localDateIsoToday());
    const onVis = () => tick();
    window.addEventListener('focus', onVis);
    document.addEventListener('visibilitychange', onVis);
    const id = window.setInterval(tick, 60_000);
    return () => {
      window.removeEventListener('focus', onVis);
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(id);
    };
  }, []);

  // Stable refs (avoid stale closures inside async drag confirms).
  const topicsRef = useRef(topics); topicsRef.current = topics;
  const selectedIdsRef = useRef(selectedTopicIds); selectedIdsRef.current = selectedTopicIds;
  const rescheduleConfirmRef = useRef(rescheduleConfirm); rescheduleConfirmRef.current = rescheduleConfirm;
  const onRescheduleCommitRef = useRef(onRescheduleCommit); onRescheduleCommitRef.current = onRescheduleCommit;
  const onScheduleChangeRef = useRef(onTopicScheduleChange); onScheduleChangeRef.current = onTopicScheduleChange;
  const disablePastRef = useRef(disablePastDates); disablePastRef.current = disablePastDates;
  const fallbackTimeRef = useRef(fallbackSlotTime); fallbackTimeRef.current = fallbackSlotTime;

  /* ─── Selection ─────────────────────────────────────────────────── */
  const handleToggleSelect = useCallback((id: string) => {
    onTopicSelectionToggle?.(id);
  }, [onTopicSelectionToggle]);

  /* ─── Open topic modal ──────────────────────────────────────────── */
  const handleOpenTopic = useCallback((id: string) => {
    const topic = topicsRef.current.find((t) => String(t.id) === String(id));
    if (!topic) return;
    onTopicActivate?.(topic);
    if (!disableInternalDrawer) setSelectedTopic(topic);
  }, [onTopicActivate, disableInternalDrawer]);

  /* ─── Drag confirm flow (matches Schedule-X build 1:1) ──────────── */
  const resolveTopicIds = useCallback((draggedId: string): string[] => {
    const id = String(draggedId);
    const topicList = topicsRef.current;
    const sel = selectedIdsRef.current;
    const movable = (t: CalendarTopic) => (t.status ?? '').toLowerCase() !== 'blocked';
    if (sel?.has(id) && sel.size > 1) {
      return [...sel].filter((tid) => topicList.some((t) => String(t.id) === tid && movable(t)));
    }
    if (!topicList.some((t) => String(t.id) === id && movable(t))) return [];
    return [id];
  }, []);

  const handleBeforeReschedule = useCallback(async (arg: DragEndArg, _isBulk: boolean): Promise<boolean> => {
    const time = formatTimeHm(arg.toMinutes);
    if (disablePastRef.current && isLocalScheduleInPast(arg.toDate, time)) return false;
    if (!rescheduleConfirmRef.current) return true;
    return await new Promise<boolean>((resolve) => {
      rescheduleResolveRef.current?.(false);
      rescheduleResolveRef.current = resolve;
      const topicIds = resolveTopicIds(arg.id);
      if (topicIds.length === 0) {
        rescheduleResolveRef.current = null;
        resolve(false);
        return;
      }
      const list = topicsRef.current;
      const hasPublished = topicIds.some((tid) => {
        const t = list.find((x) => String(x.id) === tid);
        return (t?.status ?? '').toLowerCase() === 'published';
      });
      const titles = topicIds
        .map((tid) => list.find((x) => String(x.id) === tid)?.title ?? tid)
        .slice(0, 6);
      setRescheduleFieldError(null);
      setRescheduleUi({
        open: true, topicIds,
        date: arg.toDate, time,
        hasPublished, titles,
      });
    });
  }, [resolveTopicIds]);

  const handleReschedule = useCallback((arg: DragEndArg, isBulk: boolean) => {
    if (rescheduleConfirmRef.current) return; // applied via dialog
    const newStartTime = formatTimeHm(arg.toMinutes);
    if (isBulk) {
      const ids = resolveTopicIds(arg.id);
      ids.forEach((id) => onScheduleChangeRef.current?.({ id, newDate: arg.toDate, newStartTime }));
    } else {
      onScheduleChangeRef.current?.({ id: String(arg.id), newDate: arg.toDate, newStartTime });
    }
  }, [resolveTopicIds]);

  const finishRescheduleDialog = (result: boolean) => {
    rescheduleResolveRef.current?.(result);
    rescheduleResolveRef.current = null;
    setRescheduleUi((p) => ({ ...p, open: false }));
  };

  const handleRescheduleApply = async () => {
    const { date, time, topicIds } = rescheduleUi;
    if (!date.trim()) {
      setRescheduleFieldError('Choose a date.');
      return;
    }
    const timeNorm = time.trim() || fallbackTimeRef.current;
    if (disablePastRef.current && isLocalScheduleInPast(date, timeNorm)) {
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
      finishRescheduleDialog(true);
    } catch (e) {
      void showAlert({
        title: 'Schedule update failed',
        description: e instanceof Error ? e.message : 'Something went wrong. Try again.',
      });
      finishRescheduleDialog(false);
    } finally {
      setRescheduleBusy(false);
    }
  };

  /* ─── Header navigation ─────────────────────────────────────────── */
  const goPrev = () => {
    if (view === 'day') setAnchorIso(isoPlusDays(anchorIso, -1));
    else if (view === 'week') setAnchorIso(isoPlusDays(anchorIso, -7));
    else {
      const [y, m] = anchorIso.split('-').map(Number) as [number, number];
      const dt = new Date(y, m - 2, 1);
      setAnchorIso(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`);
    }
  };
  const goNext = () => {
    if (view === 'day') setAnchorIso(isoPlusDays(anchorIso, 1));
    else if (view === 'week') setAnchorIso(isoPlusDays(anchorIso, 7));
    else {
      const [y, m] = anchorIso.split('-').map(Number) as [number, number];
      const dt = new Date(y, m, 1);
      setAnchorIso(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`);
    }
  };
  const goToday = () => setAnchorIso(localDateIsoToday());

  /* ─── Keyboard shortcuts (1/2/3 + arrow nav) ────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '1') setView('month-grid');
      else if (e.key === '2') setView('week');
      else if (e.key === '3') setView('day');
      else if (e.key === 't' || e.key === 'T') goToday();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const headerTitle = useMemo(() => {
    if (view === 'day') return prettyDate(anchorIso);
    if (view === 'week') return weekLabel(weekDaysFor(anchorIso, todayIso));
    return monthLabel(firstOfMonth(anchorIso));
  }, [view, anchorIso, todayIso]);

  const selectedSet: ReadonlySet<string> = selectedTopicIds ?? EMPTY_SET;

  return (
    <div className={`csc-wrapper ${className ?? ''}`.trim()} style={wrapperStyle}>
      <CalendarHeader
        title={headerTitle}
        view={view}
        onView={setView}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
      />
      <CalendarStatusLegend/>
      <div style={{ flex: 1, minHeight: 0, padding: 8, background: T.bg }}>
        {view === 'week' && (
          <WeekView
            anchorIso={anchorIso}
            todayIso={todayIso}
            topics={topics}
            selectedIds={selectedSet}
            onToggleSelect={handleToggleSelect}
            onOpenTopic={handleOpenTopic}
            onClearSelection={() => { /* host-controlled */ }}
            canDrag={canDrag}
            onBeforeReschedule={handleBeforeReschedule}
            onReschedule={handleReschedule}
          />
        )}
        {view === 'day' && (
          <DayView
            anchorIso={anchorIso}
            todayIso={todayIso}
            topics={topics}
            selectedIds={selectedSet}
            onToggleSelect={handleToggleSelect}
            onOpenTopic={handleOpenTopic}
            onClearSelection={() => { /* host-controlled */ }}
            canDrag={canDrag}
            onBeforeReschedule={handleBeforeReschedule}
            onReschedule={handleReschedule}
          />
        )}
        {view === 'month-grid' && (
          <MonthView
            anchorIso={firstOfMonth(anchorIso)}
            todayIso={todayIso}
            topics={topics}
            selectedIds={selectedSet}
            onToggleSelect={handleToggleSelect}
            onOpenTopic={handleOpenTopic}
            onClickDay={(iso) => {
              setAnchorIso(iso);
              setView('day');
            }}
            onClickOverflow={(iso) => {
              setAnchorIso(iso);
              setView('day');
            }}
          />
        )}
      </div>

      {/* Reschedule confirm dialog (Topics queue path) */}
      <Dialog
        open={rescheduleUi.open}
        onOpenChange={(open) => {
          if (open || rescheduleBusy) return;
          if (rescheduleResolveRef.current) finishRescheduleDialog(false);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!rescheduleBusy}>
          <DialogHeader>
            <DialogTitle>
              Set schedule
              {rescheduleUi.topicIds.length > 1 ? ` (${rescheduleUi.topicIds.length} topics)` : ''}
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
                  <li key={`${t}-${i}`} className="truncate">{t}</li>
                ))}
                {rescheduleUi.topicIds.length > rescheduleUi.titles.length ? (
                  <li className="list-none text-slate-500">
                    +{rescheduleUi.topicIds.length - rescheduleUi.titles.length} more
                  </li>
                ) : null}
              </ul>
            ) : null}
            <div>
              <label htmlFor="csc-reschedule-date" className="mb-1 block text-xs font-medium text-slate-700">Date</label>
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
              <label htmlFor="csc-reschedule-time" className="mb-1 block text-xs font-medium text-slate-700">Time</label>
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
            <Button type="button" variant="outline" disabled={rescheduleBusy} onClick={() => finishRescheduleDialog(false)}>Cancel</Button>
            <Button type="button" disabled={rescheduleBusy} onClick={() => void handleRescheduleApply()}>
              {rescheduleBusy ? 'Applying…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event detail / edit modal — unchanged component, dropped in. */}
      {selectedTopic && !disableInternalDrawer && (
        <EventDetailAndEdit
          key={String(selectedTopic.id)}
          topic={selectedTopic}
          defaultSlotTime={fallbackSlotTime}
          minSelectableDateIso={disablePastDates ? localDateIsoToday() : undefined}
          onClose={() => setSelectedTopic(null)}
          onSave={(patch) => {
            onTopicPatch?.(selectedTopic.id, patch);
            if (!topicEventModalActions) setSelectedTopic(null);
          }}
          topicQueueModal={topicEventModalActions}
          onDelete={onTopicDelete ? () => { onTopicDelete?.(selectedTopic.id); setSelectedTopic(null); } : undefined}
          previewSlot={topicEventModalActions && renderPreview ? renderPreview(selectedTopic) : undefined}
        />
      )}
    </div>
  );
}

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

const wrapperStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  background: T.bg,
  color: T.ink,
  fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
};

/* ─── Header + view switcher ───────────────────────────────────────── */

function CalendarHeader({ title, view, onView, onPrev, onNext, onToday }: {
  title: string;
  view: CalendarView;
  onView: (v: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px',
      background: T.surface,
      borderBottom: `1px solid ${T.line}`,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" onClick={onPrev} aria-label="Previous" style={iconBtnStyle}>‹</button>
          <button type="button" onClick={onToday} style={{ ...iconBtnStyle, padding: '0 12px', width: 'auto', fontSize: 12, fontWeight: 600 }}>Today</button>
          <button type="button" onClick={onNext} aria-label="Next" style={iconBtnStyle}>›</button>
        </div>
        <h2 style={{
          margin: 0, fontSize: 16, fontWeight: 600, color: T.ink,
          letterSpacing: '-0.025em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{title}</h2>
      </div>
      <ViewSwitcher view={view} onView={onView}/>
    </div>
  );
}

function ViewSwitcher({ view, onView }: { view: CalendarView; onView: (v: CalendarView) => void }) {
  const items: Array<[CalendarView, string]> = [
    ['month-grid', 'Month'],
    ['week', 'Week'],
    ['day', 'Day'],
  ];
  return (
    <div style={{
      display: 'inline-flex', padding: 2,
      borderRadius: 8, background: T.tint,
      border: `1px solid ${T.line}`,
    }}>
      {items.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onView(v)}
          style={{
            padding: '5px 12px',
            border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            letterSpacing: '-0.005em',
            borderRadius: 6,
            background: view === v ? T.surface : 'transparent',
            color: view === v ? T.ink : T.muted,
            boxShadow: view === v ? '0 1px 2px rgba(17,17,19,0.06)' : 'none',
            transition: 'background 120ms, color 120ms',
          }}
        >{label}</button>
      ))}
    </div>
  );
}

const iconBtnStyle: CSSProperties = {
  width: 28, height: 28, borderRadius: 7,
  border: `1px solid ${T.line}`, background: T.surface,
  color: T.ink, fontSize: 14, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: 0,
};

/* ─── Status legend (preserved from original) ─────────────────────── */

function CalendarStatusLegend() {
  const entries = [
    { id: 'pending',   label: 'Pending',   color: '#6366F1' },
    { id: 'drafted',   label: 'Drafted',   color: '#F97316' },
    { id: 'approved',  label: 'Approved',  color: '#22C55E' },
    { id: 'published', label: 'Published', color: '#94A3B8' },
    { id: 'blocked',   label: 'Blocked',   color: '#EF4444' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 text-[0.6875rem] font-medium text-slate-500 border-b border-border/50">
      {entries.map((e) => (
        <span key={e.id} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }}/>
          {e.label}
        </span>
      ))}
    </div>
  );
}
