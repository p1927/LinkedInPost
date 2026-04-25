/**
 * Drag-and-drop hook for the Week / Day time grid.
 *
 * Captures pointer movement, computes the target { date, minutes } per frame,
 * snaps to a step (default 15 min), and exposes a callback flow that mirrors
 * the previous Schedule-X integration:
 *
 *   onBeforeUpdate({ id, fromDate, fromMinutes, toDate, toMinutes }) → boolean | Promise<boolean>
 *     Return false to revert. Used by past-date guard and the reschedule
 *     confirm dialog.
 *
 *   onUpdate({ id, toDate, toMinutes }) — fires only after onBeforeUpdate resolves true
 *
 * Single-select drag moves one event. When `selectedIds` includes the dragged
 * id and has size > 1, the host should treat the drag as a bulk move (the
 * caller decides — the hook only reports the dragged event).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface TimeGridDragSpec {
  /** Pixel height of one full day column. */
  gridHeightPx: number;
  /** Day boundary start in minutes (e.g. 7*60). */
  dayStartMinutes: number;
  /** Day boundary end in minutes (e.g. 22*60). */
  dayEndMinutes: number;
  /** Snap step in minutes. */
  snapMinutes?: number;
  /** ISO date for each visible day column, left → right. */
  dayIsos: string[];
  /** Pixel width of one day column. */
  dayWidthPx: number;
  /** Optional clamp: don't allow drop at indices outside [0, dayIsos.length). */
  clampHorizontal?: boolean;
}

export interface DragStartArg {
  id: string;
  /** Source ISO date the event currently lives on. */
  fromDate: string;
  /** Source start minutes (relative to midnight). */
  fromMinutes: number;
}

export interface DragEndArg extends DragStartArg {
  toDate: string;
  toMinutes: number;
}

export interface UseTimeGridDragOptions {
  spec: TimeGridDragSpec;
  /** Container with `position: relative` covering the time grid (rows × cols). */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Async confirm hook (past-date guard, reschedule dialog). Return false to revert. */
  onBeforeUpdate?: (arg: DragEndArg) => boolean | Promise<boolean>;
  onUpdate: (arg: DragEndArg) => void;
  /** Disable drag entirely (e.g. canDrag=false or topic.status === 'blocked'). */
  isDraggableForId?: (id: string) => boolean;
}

export interface DragState {
  active: boolean;
  id: string | null;
  fromDate: string;
  fromMinutes: number;
  toDate: string;
  toMinutes: number;
  /** Live pixel offset from drag origin — for visual transform. */
  dxPx: number;
  dyPx: number;
}

const IDLE: DragState = {
  active: false,
  id: null,
  fromDate: '',
  fromMinutes: 0,
  toDate: '',
  toMinutes: 0,
  dxPx: 0,
  dyPx: 0,
};

export function useTimeGridDrag({ spec, containerRef, onBeforeUpdate, onUpdate, isDraggableForId }: UseTimeGridDragOptions) {
  const [state, setState] = useState<DragState>(IDLE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const specRef = useRef(spec);
  specRef.current = spec;

  const onBeforeRef = useRef(onBeforeUpdate);
  onBeforeRef.current = onBeforeUpdate;

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const originRef = useRef<{ x: number; y: number } | null>(null);

  const compute = useCallback((clientX: number, clientY: number): { date: string; minutes: number } | null => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const sp = specRef.current;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let col = Math.floor(x / sp.dayWidthPx);
    if (sp.clampHorizontal !== false) {
      col = Math.max(0, Math.min(sp.dayIsos.length - 1, col));
    } else if (col < 0 || col >= sp.dayIsos.length) {
      return null;
    }
    const minutesPerPx = (sp.dayEndMinutes - sp.dayStartMinutes) / sp.gridHeightPx;
    const rawMinutes = sp.dayStartMinutes + y * minutesPerPx;
    const step = sp.snapMinutes ?? 15;
    const snapped = Math.round(rawMinutes / step) * step;
    const clamped = Math.max(sp.dayStartMinutes, Math.min(sp.dayEndMinutes - step, snapped));
    return { date: sp.dayIsos[col]!, minutes: clamped };
  }, [containerRef]);

  const onPointerDown = useCallback((
    e: React.PointerEvent,
    arg: DragStartArg,
  ) => {
    if (e.button !== 0) return;
    if (isDraggableForId && !isDraggableForId(arg.id)) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    originRef.current = { x: e.clientX, y: e.clientY };
    setState({
      active: true,
      id: arg.id,
      fromDate: arg.fromDate,
      fromMinutes: arg.fromMinutes,
      toDate: arg.fromDate,
      toMinutes: arg.fromMinutes,
      dxPx: 0,
      dyPx: 0,
    });
  }, [isDraggableForId]);

  // Pointer move / up — listened on window so users can drag past the grid.
  useEffect(() => {
    if (!state.active) return;
    const onMove = (e: PointerEvent) => {
      const target = compute(e.clientX, e.clientY);
      if (!target) return;
      const origin = originRef.current;
      const dx = origin ? e.clientX - origin.x : 0;
      const dy = origin ? e.clientY - origin.y : 0;
      setState((prev) => ({
        ...prev,
        toDate: target.date,
        toMinutes: target.minutes,
        dxPx: dx,
        dyPx: dy,
      }));
    };
    const onUp = async (e: PointerEvent) => {
      const target = compute(e.clientX, e.clientY) ?? {
        date: stateRef.current.toDate,
        minutes: stateRef.current.toMinutes,
      };
      const id = stateRef.current.id;
      const fromDate = stateRef.current.fromDate;
      const fromMinutes = stateRef.current.fromMinutes;
      // Reset visual state immediately so the transform clears.
      setState(IDLE);
      originRef.current = null;
      if (!id) return;
      const sameSlot = target.date === fromDate && target.minutes === fromMinutes;
      if (sameSlot) return;
      const arg: DragEndArg = {
        id,
        fromDate,
        fromMinutes,
        toDate: target.date,
        toMinutes: target.minutes,
      };
      const ok = onBeforeRef.current ? await onBeforeRef.current(arg) : true;
      if (ok) onUpdateRef.current(arg);
    };
    const onCancel = () => {
      setState(IDLE);
      originRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [state.active, compute]);

  return { state, onPointerDown };
}
