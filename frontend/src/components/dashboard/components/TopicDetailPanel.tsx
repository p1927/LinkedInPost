import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { SheetRow } from '@/services/sheets';
import { deriveCalendarFieldsFromSheetRow } from '@/features/content-schedule-calendar';
import { CSC_TOKENS as T } from '@/features/content-schedule-calendar/tokens';
import { channelStyle } from '@/features/content-schedule-calendar/channelStyles';

export function TopicDetailPanel({
  row,
  onClose,
  onSaveSchedule,
  children,
  renderPreview,
}: {
  row: SheetRow | null;
  onClose: () => void;
  onSaveSchedule: (row: SheetRow, postTime: string) => Promise<void>;
  children: React.ReactNode;
  renderPreview?: (channel: string) => React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0" style={{ background: 'rgba(17,17,19,0.04)' }} onClick={onClose} />
      <div
        className="absolute right-0 top-0 bottom-0 bg-white flex flex-col overflow-hidden"
        style={{
          width: 'min(900px, 100vw)',
          borderLeft: '1px solid #D8CEEB',
          borderRadius: '14px 0 0 14px',
          boxShadow: '0 18px 60px rgba(17,17,19,0.10), 0 4px 12px rgba(17,17,19,0.04)',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${T.line}`, background: 'linear-gradient(180deg, #F3EEFC 0%, #FFFFFF 100%)' }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Topic Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — split when renderPreview provided, single column otherwise */}
        <div style={{ flex: 1, display: 'grid', minHeight: 0, gridTemplateColumns: renderPreview ? '1.5fr 1fr' : '1fr' }}>
          {/* LEFT: scrollable meta + schedule */}
          <div
            className="custom-scrollbar"
            style={{ overflowY: 'auto', minWidth: 0, borderRight: renderPreview ? `1px solid ${T.line}` : 'none' }}
          >
            {children}
            {row && <ScheduleSection row={row} onSave={onSaveSchedule} />}
          </div>

          {/* RIGHT: preview pane (only when renderPreview provided) */}
          {renderPreview && (
            <PreviewPane renderPreview={renderPreview} />
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewPane({ renderPreview }: { renderPreview: (channel: string) => React.ReactNode }) {
  const [activeChannel, setActiveChannel] = React.useState('linkedin');
  const TABS = ['linkedin', 'instagram', 'telegram'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: '#EDE5FB', overflowY: 'auto' }}>
      {/* Sticky tab header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: '#EDE5FB',
          padding: '14px 18px 0',
          borderBottom: `1px solid ${T.line}`,
        }}
      >
        {/* Top row: label + synced indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: T.muted,
            }}
          >
            Live preview
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: T.muted }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#34C759' }} />
            Synced
          </span>
        </div>
        {/* Channel tabs */}
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map((ch) => {
            const active = ch === activeChannel;
            const cs = channelStyle(ch);
            return (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                style={{
                  padding: '7px 12px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: active ? T.surface : 'transparent',
                  border: 'none',
                  borderRadius: '7px 7px 0 0',
                  cursor: 'pointer',
                  borderTop: active ? `1px solid ${T.line}` : '1px solid transparent',
                  borderLeft: active ? `1px solid ${T.line}` : '1px solid transparent',
                  borderRight: active ? `1px solid ${T.line}` : '1px solid transparent',
                  borderBottom: active ? `1px solid ${T.surface}` : '1px solid transparent',
                  marginBottom: active ? -1 : 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: active ? T.ink : T.muted,
                  letterSpacing: '-0.005em',
                  fontFamily: 'inherit',
                }}
              >
                {/* channel badge (small square) */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: cs.color,
                    color: '#fff',
                    fontSize: 7,
                    fontWeight: 700,
                  }}
                >
                  {cs.letter.toUpperCase()}
                </span>
                {cs.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview content */}
      <div
        style={{
          flex: 1,
          padding: '20px 16px 28px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        {renderPreview(activeChannel)}
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
