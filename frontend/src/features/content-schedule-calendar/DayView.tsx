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
const TIME_GUTTER_PX = 56;

function getDayName(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' });
}

function getWeekNumber(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  const jan4 = new Date(y, 0, 4);
  const wk1Start = jan4.getTime() - ((jan4.getDay() || 7) - 1) * 86400000;
  return Math.max(1, Math.ceil((dt.getTime() - wk1Start) / (7 * 86400000)) + 1);
}

function getPostPreviewText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const body = typeof p.body === 'string' ? p.body.trim() : '';
  if (body) return body;
  for (const key of ['selectedText', 'variant1', 'variant2', 'variant3'] as const) {
    const v = p[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

export function DayView(props: DayViewProps) {
  const {
    anchorIso, todayIso, topics, selectedIds, onToggleSelect, onOpenTopic,
    onClearSelection, onBeforeReschedule, onReschedule, canDrag,
    startHour = 7, endHour = 22,
  } = props;

  const [inlineSelectedId, setInlineSelectedId] = useState<string | null>(null);

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

  // Auto-select first event when day changes
  const prevAnchorRef = useRef(anchorIso);
  if (prevAnchorRef.current !== anchorIso) {
    prevAnchorRef.current = anchorIso;
    // reset selection on day change — handled via useEffect pattern is not needed
    // because setInlineSelectedId would cause re-render; just derive it
  }

  const inlineSelectedTopic = useMemo(() => {
    if (!inlineSelectedId) return events[0]?.topic ?? null;
    return events.find((e) => e.topic.id === inlineSelectedId)?.topic ?? events[0]?.topic ?? null;
  }, [inlineSelectedId, events]);

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

  const dayName = getDayName(anchorIso);
  const weekNum = getWeekNumber(anchorIso);
  const isToday = anchorIso === todayIso;

  return (
    <div style={frameStyle}>
      {/* Header — full width, larger per design */}
      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: isToday ? T.accent : T.muted }}>
            {isToday ? 'Today · ' : ''}{dayName}
          </div>
          <h2 style={{ margin: '2px 0 0', fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', color: T.ink, lineHeight: 1.1 }}>
            {prettyDate(anchorIso)}
          </h2>
          <div style={{ marginTop: 3, fontSize: 12, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
            {String(events.length).padStart(2, '0')} scheduled · Week {weekNum}
          </div>
        </div>
      </div>

      {/* Dual-column body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(280px, 400px) 1fr', minHeight: 0 }}>

        {/* LEFT: hour timeline */}
        <div style={{
          borderRight: `1px solid ${T.line}`,
          display: 'flex', overflow: 'hidden',
          background: '#FCFAFF',
        }}>
          {/* Time gutter */}
          <div style={{
            width: TIME_GUTTER_PX, flexShrink: 0,
            borderRight: `1px solid ${T.lineSoft}`, background: '#FCFAFF',
            overflowY: 'hidden',
          }}>
            {Array.from({ length: endHour - startHour }, (_, i) => (
              <div key={i} style={{ height: HOUR_HEIGHT_PX, position: 'relative' }}>
                <span style={{
                  position: 'absolute', top: -7, right: 10,
                  fontSize: 10.5, color: T.mutedSoft, fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums',
                }}>{String(startHour + i).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* Event grid */}
          <div
            ref={setGridRef}
            onMouseDown={(e) => { if (e.target === e.currentTarget) { onClearSelection(); setInlineSelectedId(null); } }}
            style={{
              position: 'relative', flex: 1, overflowY: 'auto',
              background: isToday ? T.todayTint : '#FCFAFF',
            }}
          >
            {Array.from({ length: endHour - startHour }, (_, i) => (
              <div key={i} style={{
                position: 'absolute', left: 0, right: 0,
                top: i * HOUR_HEIGHT_PX, height: 1,
                background: T.lineSoft, pointerEvents: 'none',
              }}/>
            ))}
            {isToday && <DayNowLine startHour={startHour} endHour={endHour} hourPx={HOUR_HEIGHT_PX}/>}
            {events.map((ev) => {
              const s = statusStyle(ev.topic.status);
              const cs = ev.topic.channels?.[0] ? channelStyle(ev.topic.channels[0]) : null;
              const top = ((ev.startMinutes - startHour * 60) / 60) * HOUR_HEIGHT_PX;
              const height = ((ev.endMinutes - ev.startMinutes) / 60) * HOUR_HEIGHT_PX;
              const dragging = drag.state.active && drag.state.id === ev.topic.id;
              const multiSelected = selectedIds.has(ev.topic.id);
              const inlineSel = inlineSelectedTopic?.id === ev.topic.id;
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
                    if (e.metaKey || e.ctrlKey || e.shiftKey) {
                      onToggleSelect(ev.topic.id, true);
                    } else {
                      setInlineSelectedId(ev.topic.id);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top, height: Math.max(28, height - 2),
                    left: 8, right: 8,
                    transform: dragging ? `translate(${drag.state.dxPx}px, ${drag.state.dyPx}px)` : 'none',
                    zIndex: dragging ? 30 : inlineSel ? 5 : 2,
                    background: ev.isPast ? '#FAFAFB' : inlineSel ? T.accent : s.container,
                    border: `1px solid ${multiSelected ? T.accent : inlineSel ? T.accent : T.line}`,
                    borderLeft: inlineSel ? `3px solid ${T.accent}` : `3px solid ${s.dot}`,
                    borderRadius: 9,
                    boxShadow: dragging
                      ? '0 10px 28px rgba(107, 70, 229, 0.20), 0 0 0 1px rgba(107, 70, 229, 0.35)'
                      : inlineSel
                        ? `0 0 0 3px ${T.accentSoft}`
                        : multiSelected ? `0 0 0 2px ${T.accentSoft}` : 'none',
                    padding: '8px 10px 8px 12px',
                    cursor: blocked ? 'not-allowed' : (dragging ? 'grabbing' : 'grab'),
                    userSelect: 'none',
                    opacity: ev.isPast ? 0.7 : 1,
                    display: 'flex', flexDirection: 'column', gap: 3,
                    transition: dragging ? 'none' : 'box-shadow 120ms, border-color 120ms, transform 120ms, background 140ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: inlineSel ? 'rgba(255,255,255,0.9)' : s.onContainer,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {formatTimeHm(ev.startMinutes)}–{formatTimeHm(ev.endMinutes)}
                    </span>
                    {cs && (
                      <span style={{
                        display: 'inline-block', padding: '0 5px',
                        borderRadius: 3,
                        background: inlineSel ? 'rgba(255,255,255,0.25)' : cs.color,
                        color: '#fff',
                        fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}>{cs.letter}</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 12.5, fontWeight: 500,
                    color: inlineSel ? '#fff' : T.ink,
                    letterSpacing: '-0.005em', lineHeight: 1.3,
                    overflow: 'hidden',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>{ev.topic.title || '(no title)'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: inline detail panel */}
        <div style={{ overflow: 'auto', minHeight: 0, background: T.surface }}>
          {inlineSelectedTopic ? (
            <DayInlineDetail topic={inlineSelectedTopic} onOpenEditor={() => onOpenTopic(inlineSelectedTopic.id)} />
          ) : (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 8,
              color: T.muted, fontSize: 13,
            }}>
              <div style={{ fontSize: 32, opacity: 0.25 }}>◷</div>
              <div>Select a post to view details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Day inline detail panel (right column) ─────────────────────── */

function DayInlineDetail({ topic, onOpenEditor }: { topic: CalendarTopic; onOpenEditor: () => void }) {
  const s = statusStyle(topic.status);
  const ch = topic.channels?.[0] ? channelStyle(topic.channels[0]) : null;
  const previewText = getPostPreviewText(topic.payload);
  const [previewExpanded, setPreviewExpanded] = useState(true);

  const timeStr = topic.startTime
    ? formatDisplayTime(topic.startTime)
    : '—';

  const dateStr = formatDisplayDate(topic.date);

  return (
    <div style={{ padding: '26px 28px 36px' }}>
      {/* Channel + time + status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {ch && (
          <>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 5,
              background: ch.color, color: '#fff',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase',
            }}>{ch.letter}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: T.ink }}>{ch.label}</span>
            <span style={{ fontSize: 11, color: T.mutedSoft }}>·</span>
          </>
        )}
        <span style={{ fontSize: 11.5, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 999,
            background: s.container, color: s.onContainer,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot, display: 'inline-block' }}/>
            {s.label}
          </span>
        </div>
      </div>

      {/* Title */}
      <h2 style={{
        margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.25,
        color: T.ink,
      }}>{topic.title || '(no title)'}</h2>

      {/* Preview section */}
      {previewText && (
        <div style={{ marginTop: 22 }}>
          <button
            type="button"
            onClick={() => setPreviewExpanded((v) => !v)}
            style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10.5, fontWeight: 600, color: T.muted,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            <span style={{
              display: 'inline-block', width: 12, height: 12,
              borderRadius: 2, border: `1.5px solid ${T.muted}`,
              textAlign: 'center', lineHeight: '9px', fontSize: 10,
              flexShrink: 0,
            }}>{previewExpanded ? '−' : '+'}</span>
            Preview
          </button>
          {previewExpanded && (
            <div style={{
              padding: '14px 16px',
              background: T.tint, border: `1px solid ${T.line}`, borderRadius: 10,
              fontSize: 13, lineHeight: 1.6, color: T.ink2,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: 200, overflowY: 'auto',
            }}>
              {previewText}
            </div>
          )}
        </div>
      )}

      {/* Schedule fields */}
      <div style={{ marginTop: 22 }}>
        <div style={{
          fontSize: 10.5, fontWeight: 600, color: T.muted,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
        }}>Schedule</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <DvField label="Date" value={dateStr} />
          <DvField label="Time" value={timeStr} />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onOpenEditor}
          style={{
            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '10px 16px',
            background: T.accent, color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(107,70,229,0.25)',
            transition: 'opacity 140ms',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        >
          Open editor
        </button>
      </div>
    </div>
  );
}

function DvField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '10px 12px',
      border: `1px solid ${T.line}`, borderRadius: 9,
      background: T.tint,
    }}>
      <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: T.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.005em' }}>{value}</div>
    </div>
  );
}

function formatDisplayTime(hhmm: string): string {
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhmm;
  const h = parseInt(m[1]!, 10);
  const min = parseInt(m[2]!, 10);
  const date = new Date(2000, 0, 1, h, min);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDisplayDate(isoDate: string): string {
  const parts = isoDate.trim().split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const [y, m, d] = parts as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── Now line ────────────────────────────────────────────────────── */

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

/* ─── Styles ─────────────────────────────────────────────────────── */

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
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  padding: '20px 24px 16px',
  borderBottom: `1px solid ${T.line}`,
  flexShrink: 0,
  background: T.surface,
};
