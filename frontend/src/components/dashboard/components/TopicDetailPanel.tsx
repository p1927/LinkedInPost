import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { SheetRow } from '@/services/sheets';
import { deriveCalendarFieldsFromSheetRow } from '@/features/content-schedule-calendar';
import { CSC_TOKENS as T } from '@/features/content-schedule-calendar/tokens';

export function TopicDetailPanel({
  row,
  onClose,
  onSaveSchedule,
  children,
}: {
  row: SheetRow | null;
  onClose: () => void;
  onSaveSchedule: (row: SheetRow, postTime: string) => Promise<void>;
  children: React.ReactNode;
}) {
  const [panelWidth, setPanelWidth] = useState(460);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startWRef.current = panelWidth;
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = startXRef.current - ev.clientX;
      setPanelWidth(Math.min(720, Math.max(380, startWRef.current + delta)));
    };
    const onUp = () => {
      resizingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0" style={{ background: 'rgba(17,17,19,0.04)' }} onClick={onClose} />
      <div
        className="absolute top-0 bottom-0 z-10 w-1.5 cursor-ew-resize hover:bg-violet-400/40 transition-colors"
        style={{ right: panelWidth - 3 }}
        onMouseDown={handleResizeMouseDown}
      />
      <div
        className="absolute right-0 top-0 bottom-0 bg-white flex flex-col overflow-hidden"
        style={{
          width: panelWidth,
          borderLeft: '1px solid #D8CEEB',
          borderRadius: '14px 0 0 14px',
          boxShadow: '0 18px 60px rgba(17,17,19,0.10), 0 4px 12px rgba(17,17,19,0.04)',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Topic Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          {children}
          {row && <ScheduleSection row={row} onSave={onSaveSchedule} />}
        </div>
      </div>
    </div>
  );
}

function ScheduleSection({
  row,
  onSave,
}: {
  row: SheetRow;
  onSave: (row: SheetRow, postTime: string) => Promise<void>;
}) {
  const base = deriveCalendarFieldsFromSheetRow(row);
  const [date, setDate] = useState(base.date ?? '');
  const [time, setTime] = useState(base.startTime ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const b = deriveCalendarFieldsFromSheetRow(row);
    setDate(b.date ?? '');
    setTime(b.startTime ?? '');
  }, [row.topicId, row.date, row.postTime]);

  const dirty = date !== (base.date ?? '') || time !== (base.startTime ?? '');

  const handleSave = async () => {
    if (!date.trim()) return;
    setBusy(true);
    try {
      const postTime = time.trim() ? `${date} ${time}` : date;
      await onSave(row, postTime);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ borderTop: `1px solid ${T.line}`, padding: '16px 20px 20px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.muted, marginBottom: 12 }}>
        Schedule
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.muted, marginBottom: 5 }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={busy}
            style={{
              width: '100%', height: 34, padding: '0 10px', fontSize: 13,
              border: `1px solid ${T.lineStrong}`, borderRadius: 8,
              background: T.surface, color: T.ink,
              outline: 'none', fontFamily: 'inherit',
              opacity: busy ? 0.5 : 1,
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.muted, marginBottom: 5 }}>
            Time <span style={{ fontWeight: 400, color: T.mutedSoft }}>(optional)</span>
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={busy}
            style={{
              width: '100%', height: 34, padding: '0 10px', fontSize: 13,
              border: `1px solid ${T.lineStrong}`, borderRadius: 8,
              background: T.surface, color: T.ink,
              outline: 'none', fontFamily: 'inherit',
              opacity: busy ? 0.5 : 1,
            }}
          />
        </div>
      </div>
      <button
        type="button"
        disabled={busy || !dirty}
        onClick={() => void handleSave()}
        style={{
          marginTop: 12, width: '100%', height: 34, borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: busy || !dirty ? 'not-allowed' : 'pointer',
          background: busy || !dirty ? T.accentSoft : T.accent,
          color: busy || !dirty ? T.accent : '#fff',
          border: 'none', transition: 'background 150ms, color 150ms',
          fontFamily: 'inherit',
        }}
      >
        {busy ? 'Saving…' : 'Update schedule'}
      </button>
    </div>
  );
}
