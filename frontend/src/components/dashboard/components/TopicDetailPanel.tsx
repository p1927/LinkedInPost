import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SheetRow } from '@/services/sheets';
import { deriveCalendarFieldsFromSheetRow } from '@/features/content-schedule-calendar';

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
          {row && <ScheduleSection row={row} onSave={onSaveSchedule} />}
          {children}
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
    <div className="border-b border-slate-100 px-5 py-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 text-sm"
            disabled={busy}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Time <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-9 text-sm"
            disabled={busy}
          />
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="mt-3 w-full cursor-pointer sm:w-auto"
        disabled={busy || !dirty}
        onClick={() => void handleSave()}
      >
        {busy ? 'Saving…' : 'Update schedule'}
      </Button>
    </div>
  );
}
