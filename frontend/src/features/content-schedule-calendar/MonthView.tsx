import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { CSC_TOKENS as T } from './tokens';
import type { CalendarTopic } from './types';
import { statusStyle } from './statusStyles';
import { channelStyle } from './channelStyles';
import { monthGridFor, monthLabel, parseTimeHm, formatTimeHm } from './calendarTemporal';
import { isLocalScheduleInPastMinutes } from './scheduleValidation';

/**
 * Month view — Direction A (quiet density, hairline pills, status stripe).
 *
 * Drag-to-reschedule is intentionally not supported in Month view (the
 * previous Schedule-X build also restricted DnD to time grids in practice
 * and matched our spec). Users can click an event to open the modal, then
 * change date/time in the editor.
 */
export interface MonthViewProps {
  anchorIso: string;
  todayIso: string;
  topics: CalendarTopic[];
  selectedIds: ReadonlySet<string>;
  onToggleSelect: (id: string, additive: boolean) => void;
  onOpenTopic: (id: string) => void;
  onClickDay?: (iso: string) => void;
  /** Called when a "+N more" pill is clicked. */
  onClickOverflow?: (iso: string) => void;
}

/**
 * Adaptive max-events-per-cell. Mirrors the original Schedule-X build's
 * `eventsPerDayForWrapperHeight` but measures the actual row height inside
 * the month grid so dense layouts (Topics page) and short ones (queue panel)
 * both look right. Each pill is ~22px tall + 4px gap; 24px is reserved for
 * the date number + "+N more" affordance.
 */
function maxPerCellForRowHeight(rowHeightPx: number): number {
  const usable = Math.max(0, rowHeightPx - 36);
  const per = 22 + 4; // pill height + gap
  const n = Math.floor(usable / per);
  if (n < 1) return 1;
  if (n > 9) return 9;
  return n;
}

export function MonthView(props: MonthViewProps) {
  const { anchorIso, todayIso, topics, selectedIds, onToggleSelect, onOpenTopic, onClickDay, onClickOverflow } = props;

  const cells = useMemo(() => monthGridFor(anchorIso, todayIso), [anchorIso, todayIso]);
  const rows = Math.ceil(cells.length / 7);

  const byDate = useMemo(() => {
    const map: Record<string, CalendarTopic[]> = {};
    for (const t of topics) {
      if (!t.date) continue;
      (map[t.date] ||= []).push(t);
    }
    for (const k of Object.keys(map)) {
      map[k]!.sort((a, b) => (parseTimeHm(a.startTime) ?? 0) - (parseTimeHm(b.startTime) ?? 0));
    }
    return map;
  }, [topics]);

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [maxPerCell, setMaxPerCell] = useState<number>(3);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Adaptive density — re-measure row height on resize.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      const h = el.getBoundingClientRect().height;
      if (h <= 0 || rows <= 0) return;
      setMaxPerCell(maxPerCellForRowHeight(h / rows));
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [rows]);

  return (
    <div style={frameStyle}>
      <div style={dowRowStyle}>
        {DOW.map((d, i) => (
          <div key={d} style={{
            padding: '12px 14px',
            fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: i >= 5 ? T.mutedSoft : T.muted,
            borderLeft: i === 0 ? 'none' : `1px solid ${T.lineSoft}`,
          }}>{d}</div>
        ))}
      </div>
      <div ref={gridRef} style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        minHeight: 0,
      }}>
        {cells.map((cell) => {
          const events = (byDate[cell.iso] || []);
          const visible = events.slice(0, maxPerCell);
          const overflow = events.length - visible.length;
          const isHover = hoveredDate === cell.iso;
          return (
            <div
              key={cell.iso}
              onMouseEnter={() => setHoveredDate(cell.iso)}
              onMouseLeave={() => setHoveredDate((h) => (h === cell.iso ? null : h))}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-csc-event]')) return;
                onClickDay?.(cell.iso);
              }}
              style={{
                position: 'relative',
                padding: '8px 10px 6px',
                display: 'flex', flexDirection: 'column', gap: 4,
                minWidth: 0, overflow: 'hidden',
                background: cell.outside
                  ? T.tintWarm
                  : cell.today ? T.tint : T.surface,
                borderTop: cell.row > 0 ? `1px solid ${T.lineSoft}` : 'none',
                borderLeft: cell.dow > 0 ? `1px solid ${T.lineSoft}` : 'none',
                cursor: onClickDay ? 'pointer' : 'default',
                transition: 'background 120ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 22, height: 22,
                  fontSize: 12, fontWeight: cell.today ? 700 : 600,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.005em',
                  borderRadius: 999,
                  padding: cell.today ? '0 7px' : 0,
                  color: cell.outside ? T.mutedSoft : (cell.today ? '#FFFFFF' : T.ink),
                  background: cell.today ? T.accent : 'transparent',
                }}>{cell.day}</span>
              </div>
              {visible.map((t) => (
                <MonthEventPill
                  key={t.id}
                  topic={t}
                  todayIso={todayIso}
                  selected={selectedIds.has(t.id)}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey) {
                      onToggleSelect(t.id, true);
                    } else {
                      onOpenTopic(t.id);
                    }
                  }}
                />
              ))}
              {overflow > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onClickOverflow?.(cell.iso); }}
                  data-csc-event="true"
                  style={overflowBtnStyle}
                >+{overflow} more</button>
              )}
              {isHover && onClickDay && (
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  fontSize: 10, color: T.accent, fontWeight: 600,
                  background: T.surface, border: `1px solid ${T.line}`,
                  borderRadius: 4, padding: '1px 6px',
                  pointerEvents: 'none',
                }}>Open</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthEventPill({ topic, todayIso, selected, onClick }: {
  topic: CalendarTopic; todayIso: string; selected: boolean;
  onClick: (e: ReactMouseEvent) => void;
}) {
  const s = statusStyle(topic.status);
  const ch = topic.channels?.[0];
  const cs = ch ? channelStyle(ch) : null;
  const startMin = parseTimeHm(topic.startTime) ?? null;
  const isPast = topic.date < todayIso || (topic.date === todayIso && startMin != null && isLocalScheduleInPastMinutes(topic.date, startMin));
  return (
    <div
      data-topic-id={topic.id}
      data-csc-event="true"
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      title={topic.title}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 6px 3px 8px',
        background: isPast ? '#FAFAFB' : s.container,
        border: `1px solid ${selected ? T.accent : 'transparent'}`,
        borderLeft: `2px solid ${s.dot}`,
        borderRadius: 5,
        minWidth: 0,
        cursor: 'pointer',
        opacity: isPast ? 0.7 : 1,
        transition: 'border-color 120ms',
        boxShadow: selected ? `0 0 0 2px ${T.accentSoft}` : 'none',
      }}
    >
      {startMin != null && (
        <span style={{
          fontSize: 9.5, fontWeight: 700, color: s.onContainer,
          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        }}>{formatTimeHm(startMin)}</span>
      )}
      {cs && (
        <span style={{
          width: 6, height: 6, borderRadius: 999, background: cs.color, flexShrink: 0,
        }}/>
      )}
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 10.5, fontWeight: 500, color: T.ink,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        letterSpacing: '-0.005em',
      }}>{topic.title || '(no title)'}</span>
    </div>
  );
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const frameStyle: CSSProperties = {
  background: T.surface,
  borderRadius: 16,
  border: `1px solid ${T.line}`,
  overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
  fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
  height: '100%', minHeight: 0,
};

const dowRowStyle: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
  borderBottom: `1px solid ${T.line}`, background: T.surface,
  flexShrink: 0,
};

const overflowBtnStyle: CSSProperties = {
  alignSelf: 'flex-start',
  background: 'transparent', border: 'none',
  fontSize: 10.5, color: T.accent, fontWeight: 600,
  padding: '2px 6px',
  cursor: 'pointer', borderRadius: 4,
  letterSpacing: '-0.005em',
};

export { monthLabel };
