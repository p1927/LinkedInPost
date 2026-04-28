import { useMemo, useRef, useState, useCallback } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { CSC_TOKENS as T } from './tokens';
import type { CalendarTopic } from './types';
import { statusStyle } from './statusStyles';
import { channelStyle } from './channelStyles';
import {
  type WeekDay,
  parseTimeHm,
  formatTimeHm,
  weekDaysFor,
  isoWeekNumber,
  weekLabel,
} from './calendarTemporal';
import { useTimeGridDrag, type DragEndArg } from './useTimeGridDrag';
import { isLocalScheduleInPastMinutes } from './scheduleValidation';

export interface WeekViewProps {
  /** Day inside the week to display. */
  anchorIso: string;
  /** Today's ISO (so we don't recompute on every render). */
  todayIso: string;
  /** All topics (the view filters to its own week internally). */
  topics: CalendarTopic[];
  /** Selected topic ids. */
  selectedIds: ReadonlySet<string>;
  /** Toggled via meta/ctrl-click on an event. */
  onToggleSelect: (id: string, additive: boolean) => void;
  /** Click on an event tile (no modifier). */
  onOpenTopic: (id: string) => void;
  /** Click on empty space — clears selection. */
  onClearSelection: () => void;
  /** Click on empty time slot (no event under cursor). */
  onEmptySlotClick?: (date: string, time: string) => void;
  /** Drag commit. Returning false reverts. */
  onBeforeReschedule?: (arg: DragEndArg, isBulk: boolean) => boolean | Promise<boolean>;
  /** Apply the schedule change. */
  onReschedule: (arg: DragEndArg, isBulk: boolean) => void;
  /** Disable DND globally (e.g. canDrag prop). */
  canDrag: boolean;
  /** Working hours bounds shown on the time gutter. */
  startHour?: number; // default 7
  endHour?: number;   // default 22
}

const HOUR_HEIGHT_PX = 56;
const TIME_GUTTER_PX = 60;

interface PositionedEvent {
  topic: CalendarTopic;
  startMinutes: number;
  endMinutes: number;
  /** Column index in the day's overlap layout. */
  col: number;
  /** Total columns for this overlap cluster. */
  cols: number;
  isPast: boolean;
}

function layoutDayEvents(topics: CalendarTopic[], todayIso: string): PositionedEvent[] {
  /* Sweep-line column packing for overlaps. */
  const items = topics
    .map((t) => {
      const start = parseTimeHm(t.startTime) ?? 9 * 60;
      return {
        topic: t,
        startMinutes: start,
        endMinutes: start + 60,
        col: 0,
        cols: 1,
        isPast: isLocalScheduleInPastMinutes(t.date, start) && t.date <= todayIso,
      };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);

  // Group into clusters of overlapping events; pack columns inside each cluster.
  const clusters: PositionedEvent[][] = [];
  for (const it of items) {
    const last = clusters[clusters.length - 1];
    if (last && last.some((x) => x.endMinutes > it.startMinutes)) {
      last.push(it);
    } else {
      clusters.push([it]);
    }
  }
  for (const cluster of clusters) {
    const colEnds: number[] = [];
    for (const ev of cluster) {
      let placed = false;
      for (let i = 0; i < colEnds.length; i++) {
        if (colEnds[i]! <= ev.startMinutes) {
          ev.col = i;
          colEnds[i] = ev.endMinutes;
          placed = true;
          break;
        }
      }
      if (!placed) {
        ev.col = colEnds.length;
        colEnds.push(ev.endMinutes);
      }
    }
    const cols = Math.max(1, colEnds.length);
    for (const ev of cluster) ev.cols = cols;
  }
  return items;
}

export function WeekView(props: WeekViewProps) {
  const {
    anchorIso, todayIso, topics, selectedIds, onToggleSelect,
    onOpenTopic, onClearSelection, onEmptySlotClick, onBeforeReschedule, onReschedule,
    canDrag,
    startHour = 7, endHour = 22,
  } = props;

  const week = useMemo(() => weekDaysFor(anchorIso, todayIso), [anchorIso, todayIso]);
  const dayIsos = useMemo(() => week.map((d) => d.iso), [week]);

  // Filter topics to this week; group by day.
  const byDay = useMemo(() => {
    const map: Record<string, CalendarTopic[]> = {};
    for (const d of week) map[d.iso] = [];
    for (const t of topics) {
      if (map[t.date]) map[t.date]!.push(t);
    }
    const positioned: Record<string, PositionedEvent[]> = {};
    for (const d of week) positioned[d.iso] = layoutDayEvents(map[d.iso]!, todayIso);
    return positioned;
  }, [topics, week, todayIso]);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const [dayWidthPx, setDayWidthPx] = useState(0);

  // Measure day column width — needed by the drag hook to compute column targets.
  const setGridRef = useCallback((el: HTMLDivElement | null) => {
    gridRef.current = el;
    if (el) {
      const ro = new ResizeObserver(() => {
        const w = el.getBoundingClientRect().width / 7;
        setDayWidthPx(w);
      });
      ro.observe(el);
      const w = el.getBoundingClientRect().width / 7;
      setDayWidthPx(w);
    }
  }, []);

  const isDraggableForId = useCallback((id: string): boolean => {
    if (!canDrag) return false;
    const t = topics.find((x) => x.id === id);
    if (!t) return false;
    return (t.status ?? '').toLowerCase() !== 'blocked';
  }, [canDrag, topics]);

  const drag = useTimeGridDrag({
    spec: {
      gridHeightPx: (endHour - startHour) * HOUR_HEIGHT_PX,
      dayStartMinutes: startHour * 60,
      dayEndMinutes: endHour * 60,
      snapMinutes: 15,
      dayIsos,
      dayWidthPx,
    },
    containerRef: gridRef,
    isDraggableForId,
    onBeforeUpdate: async (arg) => {
      if (isLocalScheduleInPastMinutes(arg.toDate, arg.toMinutes)) return false;
      const isBulk = selectedIds.has(arg.id) && selectedIds.size > 1;
      return onBeforeReschedule ? await onBeforeReschedule(arg, isBulk) : true;
    },
    onUpdate: (arg) => {
      const isBulk = selectedIds.has(arg.id) && selectedIds.size > 1;
      onReschedule(arg, isBulk);
    },
  });

  // Hover-time indicator (a thin lavender line at the cursor).
  const [hoverY, setHoverY] = useState<number | null>(null);
  const onGridMouseMove = (e: ReactMouseEvent) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverY(e.clientY - rect.top);
  };
  const onGridMouseLeave = () => setHoverY(null);

  const minutesPerPx = (endHour - startHour) * 60 / ((endHour - startHour) * HOUR_HEIGHT_PX);
  const hoverMinutes = hoverY != null ? startHour * 60 + Math.round(hoverY * minutesPerPx) : null;

  return (
    <div style={frameStyle}>
      {/* Sticky day header */}
      <div style={dayHeaderStyle}>
        <div style={{ width: TIME_GUTTER_PX, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', color: T.muted, textTransform: 'uppercase' }}>
          W{isoWeekNumber(anchorIso)}
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {week.map((d) => (
            <DayHeaderCell key={d.iso} day={d} count={byDay[d.iso]?.length ?? 0}/>
          ))}
        </div>
      </div>

      {/* Time grid + day columns */}
      <div style={{ flex: 1, display: 'flex', overflow: 'auto', position: 'relative' }}>
        <TimeGutter startHour={startHour} endHour={endHour} hourPx={HOUR_HEIGHT_PX}/>
        <div
          ref={setGridRef}
          onMouseMove={onGridMouseMove}
          onMouseLeave={onGridMouseLeave}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              onClearSelection();
              if (onEmptySlotClick) {
                const rect = gridRef.current?.getBoundingClientRect();
                if (rect && dayWidthPx > 0) {
                  const y = e.clientY - rect.top;
                  const x = e.clientX - rect.left;
                  const rawMinutes = startHour * 60 + y * minutesPerPx;
                  const snapped = Math.round(rawMinutes / 15) * 15;
                  const colIndex = Math.min(6, Math.floor(x / dayWidthPx));
                  const date = week[colIndex]?.iso;
                  if (date && snapped >= startHour * 60 && snapped < endHour * 60) {
                    onEmptySlotClick(date, formatTimeHm(snapped));
                  }
                }
              }
            }
          }}
          style={{
            position: 'relative', flex: 1, display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            background: T.surface,
            cursor: onEmptySlotClick ? 'cell' : 'default',
          }}
        >
          {/* Horizontal hour rules */}
          {Array.from({ length: endHour - startHour }, (_, i) => (
            <div key={i} style={{
              position: 'absolute', left: 0, right: 0,
              top: i * HOUR_HEIGHT_PX,
              height: 1, background: T.lineSoft, pointerEvents: 'none',
            }}/>
          ))}
          {/* Vertical day separators */}
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${((i + 1) / 7) * 100}%`,
              width: 1, background: T.lineSoft, pointerEvents: 'none',
            }}/>
          ))}
          {/* Today column tint */}
          {week.map((d, i) => d.today ? (
            <div key={`today-${d.iso}`} style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${(i / 7) * 100}%`, width: `${(1 / 7) * 100}%`,
              background: T.todayTint, pointerEvents: 'none',
            }}/>
          ) : null)}
          {/* Now line */}
          <NowLine
            week={week}
            startMinutes={startHour * 60}
            hourPx={HOUR_HEIGHT_PX}
            endMinutes={endHour * 60}
          />
          {/* Hover time guide */}
          {hoverY != null && hoverMinutes != null && (
            <div style={{
              position: 'absolute', left: 0, right: 0, top: hoverY,
              height: onEmptySlotClick ? 1.5 : 1,
              background: T.accent,
              opacity: onEmptySlotClick ? 0.55 : 0.18,
              pointerEvents: 'none',
            }}>
              <span style={{
                position: 'absolute', left: 4, top: -9,
                fontSize: 10, fontWeight: 700, color: T.accent,
                background: T.surface, padding: '0 4px', borderRadius: 3,
                fontVariantNumeric: 'tabular-nums',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                {onEmptySlotClick && <span style={{ fontSize: 12, lineHeight: 1 }}>+</span>}
                {formatTimeHm(hoverMinutes)}
              </span>
            </div>
          )}
          {/* Events */}
          {week.map((d, i) => (
            <DayColumn
              key={d.iso}
              colIndex={i}
              day={d}
              events={byDay[d.iso] ?? []}
              startHour={startHour}
              hourPx={HOUR_HEIGHT_PX}
              selectedIds={selectedIds}
              onPointerDownEvent={(ev, e) => {
                drag.onPointerDown(e, {
                  id: ev.topic.id,
                  fromDate: ev.topic.date,
                  fromMinutes: ev.startMinutes,
                });
              }}
              onClickEvent={(ev, e) => {
                if (drag.state.active) return;
                if (e.metaKey || e.ctrlKey || e.shiftKey) {
                  onToggleSelect(ev.topic.id, true);
                } else {
                  onOpenTopic(ev.topic.id);
                }
              }}
              dragId={drag.state.active ? drag.state.id : null}
              dragDxPx={drag.state.dxPx}
              dragDyPx={drag.state.dyPx}
            />
          ))}
        </div>
      </div>

      {/* Footer label */}
      <div style={footerStyle}>{weekLabel(week)}</div>
    </div>
  );
}

const frameStyle: CSSProperties = {
  background: T.surface,
  borderRadius: 16,
  border: `1px solid ${T.line}`,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
  height: '100%',
  minHeight: 0,
  color: T.ink,
};

const dayHeaderStyle: CSSProperties = {
  display: 'flex',
  borderBottom: `1px solid ${T.line}`,
  background: T.surface,
  flexShrink: 0,
};

const footerStyle: CSSProperties = {
  borderTop: `1px solid ${T.line}`,
  padding: '8px 16px',
  fontSize: 11,
  color: T.muted,
  letterSpacing: '-0.005em',
  flexShrink: 0,
};

function DayHeaderCell({ day, count }: { day: WeekDay; count: number }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderLeft: `1px solid ${T.lineSoft}`,
      background: day.today ? T.tint : T.surface,
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: day.weekend ? T.mutedSoft : T.muted,
      }}>{day.dow}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
        <span style={{
          fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em',
          color: day.today ? T.accent : T.ink,
          fontVariantNumeric: 'tabular-nums',
        }}>{day.day}</span>
        {count > 0 && (
          <span style={{
            fontSize: 11, color: T.muted, fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
          }}>{count} scheduled</span>
        )}
      </div>
    </div>
  );
}

function TimeGutter({ startHour, endHour, hourPx }: { startHour: number; endHour: number; hourPx: number }) {
  return (
    <div style={{
      width: TIME_GUTTER_PX, flexShrink: 0,
      borderRight: `1px solid ${T.line}`,
      paddingTop: 0,
      background: T.surface,
    }}>
      {Array.from({ length: endHour - startHour }, (_, i) => {
        const hour = startHour + i;
        return (
          <div key={hour} style={{ height: hourPx, position: 'relative' }}>
            <span style={{
              position: 'absolute', top: -7, right: 10,
              fontSize: 10.5, color: T.muted, fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
            }}>{String(hour).padStart(2, '0')}:00</span>
          </div>
        );
      })}
    </div>
  );
}

function NowLine({ week, startMinutes, hourPx, endMinutes }: { week: WeekDay[]; startMinutes: number; hourPx: number; endMinutes: number }) {
  const todayIdx = week.findIndex((d) => d.today);
  if (todayIdx < 0) return null;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < startMinutes || nowMinutes > endMinutes) return null;
  const top = ((nowMinutes - startMinutes) / 60) * hourPx;
  const left = (todayIdx / 7) * 100;
  const width = (1 / 7) * 100;
  return (
    <div style={{
      position: 'absolute', top, height: 1.5, background: T.accent,
      left: `${left}%`, width: `${width}%`,
      pointerEvents: 'none', zIndex: 4,
    }}>
      <span style={{
        position: 'absolute', left: -4, top: -4, width: 9, height: 9,
        background: T.accent, borderRadius: 999,
      }}/>
    </div>
  );
}

interface DayColumnProps {
  colIndex: number;
  day: WeekDay;
  events: PositionedEvent[];
  startHour: number;
  hourPx: number;
  selectedIds: ReadonlySet<string>;
  onPointerDownEvent: (ev: PositionedEvent, e: React.PointerEvent) => void;
  onClickEvent: (ev: PositionedEvent, e: ReactMouseEvent) => void;
  dragId: string | null;
  dragDxPx: number;
  dragDyPx: number;
}

function DayColumn(props: DayColumnProps) {
  const { day, events, startHour, hourPx, selectedIds, onPointerDownEvent, onClickEvent, dragId, dragDxPx, dragDyPx } = props;
  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      {events.map((ev) => (
        <EventTile
          key={ev.topic.id}
          ev={ev}
          startHour={startHour}
          hourPx={hourPx}
          selected={selectedIds.has(ev.topic.id)}
          dragging={dragId === ev.topic.id}
          dragDxPx={dragDxPx}
          dragDyPx={dragDyPx}
          onPointerDown={(e) => onPointerDownEvent(ev, e)}
          onClick={(e) => onClickEvent(ev, e)}
          weekend={day.weekend}
        />
      ))}
    </div>
  );
}

function EventTile({ ev, startHour, hourPx, selected, dragging, dragDxPx, dragDyPx, onPointerDown, onClick }: {
  ev: PositionedEvent; startHour: number; hourPx: number; selected: boolean;
  dragging: boolean; dragDxPx: number; dragDyPx: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: ReactMouseEvent) => void;
  weekend: boolean;
}) {
  const s = statusStyle(ev.topic.status);
  const ch = ev.topic.channels?.[0];
  const cs = ch ? channelStyle(ch) : null;
  const top = ((ev.startMinutes - startHour * 60) / 60) * hourPx;
  const height = ((ev.endMinutes - ev.startMinutes) / 60) * hourPx;
  const widthPct = 100 / ev.cols;
  const leftPct = ev.col * widthPct;
  const blocked = (ev.topic.status ?? '').toLowerCase() === 'blocked';
  return (
    <div
      data-topic-id={ev.topic.id}
      data-csc-event="true"
      onPointerDown={blocked ? undefined : onPointerDown}
      onClick={onClick}
      style={{
        position: 'absolute',
        top, height: Math.max(20, height - 2),
        left: `calc(${leftPct}% + 3px)`,
        width: `calc(${widthPct}% - 6px)`,
        transform: dragging ? `translate(${dragDxPx}px, ${dragDyPx}px)` : 'none',
        zIndex: dragging ? 30 : selected ? 5 : 2,
        background: ev.isPast ? '#FAFAFB' : s.container,
        border: `1px solid ${selected ? T.accent : T.line}`,
        borderLeft: `2px solid ${s.dot}`,
        borderRadius: 7,
        boxShadow: dragging
          ? '0 8px 24px rgba(107, 70, 229, 0.18), 0 0 0 1px rgba(107, 70, 229, 0.35)'
          : selected
            ? `0 0 0 2px ${T.accentSoft}`
            : 'none',
        padding: '5px 8px',
        cursor: blocked ? 'not-allowed' : (dragging ? 'grabbing' : 'grab'),
        userSelect: 'none',
        opacity: ev.isPast ? 0.7 : 1,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 2,
        transition: dragging ? 'none' : 'box-shadow 120ms, border-color 120ms, transform 120ms',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: s.onContainer,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em',
        }}>{formatTimeHm(ev.startMinutes)}</span>
        {cs && (
          <span style={{
            display: 'inline-block',
            padding: '0 4px',
            borderRadius: 3,
            background: cs.color,
            color: '#FFFFFF',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>{cs.letter}</span>
        )}
      </div>
      <div style={{
        fontSize: 11.5, fontWeight: 600, color: T.ink,
        lineHeight: 1.25,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: height > 38 ? 2 : 1,
        WebkitBoxOrient: 'vertical',
        letterSpacing: '-0.005em',
      }}>{ev.topic.title || '(no title)'}</div>
    </div>
  );
}
