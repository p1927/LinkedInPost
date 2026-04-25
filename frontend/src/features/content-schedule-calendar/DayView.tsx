import { useMemo, useRef, useCallback, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { CSC_TOKENS as T } from './tokens';
import type { CalendarTopic } from './types';
import { statusStyle } from './statusStyles';
import { channelStyle } from './channelStyles';
import { parseTimeHm, formatTimeHm, prettyDate } from './calendarTemporal';
import { useTimeGridDrag, type DragEndArg } from './useTimeGridDrag';
import { isLocalScheduleInPastMinutes } from './scheduleValidation';

export interface DayViewProps {
  anchorIso: string;
  todayIso: string;
  topics: CalendarTopic[];
  selectedIds: ReadonlySet<string>;
  onToggleSelect: (id: string, additive: boolean) => void;
  onOpenTopic: (id: string) => void;
  onClearSelection: () => void;
  onBeforeReschedule?: (arg: DragEndArg, isBulk: boolean) => boolean | Promise<boolean>;
  onReschedule: (arg: DragEndArg, isBulk: boolean) => void;
  canDrag: boolean;
  startHour?: number;
  endHour?: number;
}

const HOUR_HEIGHT_PX = 64;
const TIME_GUTTER_PX = 64;

export function DayView(props: DayViewProps) {
  const {
    anchorIso, todayIso, topics, selectedIds, onToggleSelect, onOpenTopic,
    onClearSelection, onBeforeReschedule, onReschedule, canDrag,
    startHour = 7, endHour = 22,
  } = props;

  const dayTopics = useMemo(
    () => topics
      .filter((t) => t.date === anchorIso)
      .sort((a, b) => (parseTimeHm(a.startTime) ?? 0) - (parseTimeHm(b.startTime) ?? 0)),
    [topics, anchorIso],
  );

  const events = useMemo(() => dayTopics.map((t) => {
    const start = parseTimeHm(t.startTime) ?? 9 * 60;
    return {
      topic: t,
      startMinutes: start,
      endMinutes: start + 60,
      isPast: isLocalScheduleInPastMinutes(t.date, start) && t.date <= todayIso,
    };
  }), [dayTopics, todayIso]);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const [dayWidthPx, setDayWidthPx] = useState(0);
  const setGridRef = useCallback((el: HTMLDivElement | null) => {
    gridRef.current = el;
    if (el) {
      const ro = new ResizeObserver(() => setDayWidthPx(el.getBoundingClientRect().width));
      ro.observe(el);
      setDayWidthPx(el.getBoundingClientRect().width);
    }
  }, []);

  const isDraggableForId = useCallback((id: string) => {
    if (!canDrag) return false;
    const t = topics.find((x) => x.id === id);
    return !!t && (t.status ?? '').toLowerCase() !== 'blocked';
  }, [canDrag, topics]);

  const drag = useTimeGridDrag({
    spec: {
      gridHeightPx: (endHour - startHour) * HOUR_HEIGHT_PX,
      dayStartMinutes: startHour * 60,
      dayEndMinutes: endHour * 60,
      snapMinutes: 15,
      dayIsos: [anchorIso],
      dayWidthPx,
      clampHorizontal: true,
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

  return (
    <div style={frameStyle}>
      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.muted }}>
            {anchorIso === todayIso ? 'Today' : 'Day'}
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600, letterSpacing: '-0.025em', color: T.ink }}>
            {prettyDate(anchorIso)}
          </h2>
        </div>
        <div style={{ fontSize: 11.5, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
          {events.length} scheduled
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'auto', position: 'relative' }}>
        <div style={{
          width: TIME_GUTTER_PX, flexShrink: 0,
          borderRight: `1px solid ${T.line}`, background: T.surface,
        }}>
          {Array.from({ length: endHour - startHour }, (_, i) => (
            <div key={i} style={{ height: HOUR_HEIGHT_PX, position: 'relative' }}>
              <span style={{
                position: 'absolute', top: -7, right: 12,
                fontSize: 10.5, color: T.muted, fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
              }}>{String(startHour + i).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>
        <div
          ref={setGridRef}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClearSelection(); }}
          style={{
            position: 'relative', flex: 1,
            background: anchorIso === todayIso ? T.tint : T.surface,
          }}
        >
          {Array.from({ length: endHour - startHour }, (_, i) => (
            <div key={i} style={{
              position: 'absolute', left: 0, right: 0,
              top: i * HOUR_HEIGHT_PX, height: 1,
              background: T.lineSoft, pointerEvents: 'none',
            }}/>
          ))}
          {anchorIso === todayIso && <DayNowLine startHour={startHour} endHour={endHour} hourPx={HOUR_HEIGHT_PX}/>}
          {events.map((ev) => {
            const s = statusStyle(ev.topic.status);
            const cs = ev.topic.channels?.[0] ? channelStyle(ev.topic.channels[0]) : null;
            const top = ((ev.startMinutes - startHour * 60) / 60) * HOUR_HEIGHT_PX;
            const height = ((ev.endMinutes - ev.startMinutes) / 60) * HOUR_HEIGHT_PX;
            const dragging = drag.state.active && drag.state.id === ev.topic.id;
            const selected = selectedIds.has(ev.topic.id);
            const blocked = (ev.topic.status ?? '').toLowerCase() === 'blocked';
            return (
              <div
                key={ev.topic.id}
                data-topic-id={ev.topic.id}
                data-csc-event="true"
                onPointerDown={blocked ? undefined : (e) => drag.onPointerDown(e, {
                  id: ev.topic.id, fromDate: ev.topic.date, fromMinutes: ev.startMinutes,
                })}
                onClick={(e: ReactMouseEvent) => {
                  if (drag.state.active) return;
                  if (e.metaKey || e.ctrlKey || e.shiftKey) onToggleSelect(ev.topic.id, true);
                  else onOpenTopic(ev.topic.id);
                }}
                style={{
                  position: 'absolute',
                  top, height: Math.max(28, height - 2),
                  left: 16, right: 16,
                  transform: dragging ? `translate(${drag.state.dxPx}px, ${drag.state.dyPx}px)` : 'none',
                  zIndex: dragging ? 30 : selected ? 5 : 2,
                  background: ev.isPast ? '#FAFAFB' : s.container,
                  border: `1px solid ${selected ? T.accent : T.line}`,
                  borderLeft: `2px solid ${s.dot}`,
                  borderRadius: 8,
                  boxShadow: dragging
                    ? '0 10px 28px rgba(107, 70, 229, 0.20), 0 0 0 1px rgba(107, 70, 229, 0.35)'
                    : selected
                      ? `0 0 0 2px ${T.accentSoft}` : 'none',
                  padding: '8px 12px',
                  cursor: blocked ? 'not-allowed' : (dragging ? 'grabbing' : 'grab'),
                  userSelect: 'none',
                  opacity: ev.isPast ? 0.7 : 1,
                  display: 'flex', flexDirection: 'column', gap: 2,
                  transition: dragging ? 'none' : 'box-shadow 120ms, border-color 120ms, transform 120ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.onContainer, fontVariantNumeric: 'tabular-nums' }}>
                    {formatTimeHm(ev.startMinutes)}–{formatTimeHm(ev.endMinutes)}
                  </span>
                  {cs && (
                    <span style={{
                      display: 'inline-block', padding: '0 5px',
                      borderRadius: 3, background: cs.color, color: '#fff',
                      fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}>{cs.letter}</span>
                  )}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: T.ink,
                  letterSpacing: '-0.005em', lineHeight: 1.3,
                  overflow: 'hidden',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>{ev.topic.title || '(no title)'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayNowLine({ startHour, endHour, hourPx }: { startHour: number; endHour: number; hourPx: number }) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < startHour * 60 || minutes > endHour * 60) return null;
  const top = ((minutes - startHour * 60) / 60) * hourPx;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top, height: 1.5,
      background: T.accent, pointerEvents: 'none', zIndex: 4,
    }}>
      <span style={{
        position: 'absolute', left: -4, top: -4,
        width: 9, height: 9, borderRadius: 999, background: T.accent,
      }}/>
    </div>
  );
}

const frameStyle: CSSProperties = {
  background: T.surface,
  borderRadius: 16,
  border: `1px solid ${T.line}`,
  overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
  fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
  height: '100%', minHeight: 0,
};

const headerStyle: CSSProperties = {
  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: `1px solid ${T.line}`,
  flexShrink: 0,
};
