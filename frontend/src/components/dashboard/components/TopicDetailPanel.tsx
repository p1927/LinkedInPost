import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { SheetRow } from '@/services/sheets';
import { deriveCalendarFieldsFromSheetRow } from '@/features/content-schedule-calendar';
import { CSC_TOKENS as T } from '@/features/content-schedule-calendar/tokens';
import { channelStyle } from '@/features/content-schedule-calendar/channelStyles';
import { TopicDetailView } from '@/features/add-topic/TopicDetailView';
import { StatusPill, deriveStatus } from '@/components/ui/StatusPill';
import { WORKSPACE_PATHS } from '@/features/topic-navigation/utils/workspaceRoutes';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: T.muted,
        marginBottom: 10,
      }}
    >
      {children}
    </p>
  );
}

export function TopicDetailPanel({
  row,
  onClose,
  onSaveSchedule,
  children,
  renderPreview,
  renderFooterActions,
}: {
  row: SheetRow | null;
  onClose: () => void;
  onSaveSchedule: (row: SheetRow, postTime: string) => Promise<void>;
  children: React.ReactNode;
  renderPreview?: (channel: string) => React.ReactNode;
  renderFooterActions?: () => React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(17,17,19,0.04)' }}
        onClick={onClose}
      />
      <div
        className="absolute right-0 top-0 bottom-0 flex flex-col overflow-hidden"
        style={{
          width: 'min(980px, 100vw)',
          background: T.bg,
          borderLeft: '1px solid #D8CEEB',
          borderRadius: '14px 0 0 14px',
          boxShadow: '0 18px 60px rgba(17,17,19,0.10), 0 4px 12px rgba(17,17,19,0.04)',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: status chip + topic title + close */}
        <div
          className="shrink-0 flex items-start justify-between gap-4 px-6 py-4"
          style={{
            borderBottom: `1px solid ${T.line}`,
            background: 'linear-gradient(180deg, #F3EEFC 0%, #FFFFFF 100%)',
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {row && (
              <div className="self-start">
                <StatusPill status={deriveStatus(row.status)} size="sm" />
              </div>
            )}
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: T.ink,
                letterSpacing: '-0.02em',
                lineHeight: 1.3,
                margin: 0,
              }}
            >
              {row?.topic ?? 'Topic'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            minHeight: 0,
            gridTemplateColumns: renderPreview ? '1fr 1fr' : '1fr',
          }}
        >
          {/* LEFT: topic details → schedule → settings */}
          <div
            className="[&::-webkit-scrollbar]:hidden"
            style={{
              overflowY: 'auto',
              scrollbarWidth: 'none',
              minWidth: 0,
              borderRight: renderPreview ? `1px solid ${T.line}` : 'none',
            }}
          >
            {/* Topic Details */}
            {row && (
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.line}` }}>
                <SectionLabel>Topic Details</SectionLabel>
                <TopicDetailView row={row} editPath={WORKSPACE_PATHS.addTopic} compact />
              </div>
            )}

            {/* Schedule */}
            {row && (
              <ScheduleSection
                row={row}
                onSave={onSaveSchedule}
                showBottomBorder={Boolean(children)}
              />
            )}

            {/* Settings */}
            {children && (
              <div style={{ padding: '16px 24px 24px' }}>
                <SectionLabel>Settings</SectionLabel>
                {children}
              </div>
            )}
          </div>

          {/* RIGHT: preview pane */}
          {renderPreview && (
            <PreviewPane
              renderPreview={renderPreview}
              initialChannel={row?.topicDeliveryChannel || 'linkedin'}
            />
          )}
        </div>

        {/* Footer: action buttons */}
        {renderFooterActions && (
          <div
            className="shrink-0 flex items-center justify-end gap-2 px-6 py-3"
            style={{ borderTop: `1px solid ${T.line}`, background: T.surface }}
          >
            {renderFooterActions()}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewPane({
  renderPreview,
  initialChannel = 'linkedin',
}: {
  renderPreview: (channel: string) => React.ReactNode;
  initialChannel?: string;
}) {
  const ALL_TABS = ['linkedin', 'instagram', 'telegram', 'gmail', 'whatsapp'];
  const [activeChannel, setActiveChannel] = React.useState(
    ALL_TABS.includes(initialChannel) ? initialChannel : 'linkedin',
  );
  const TABS = ALL_TABS;

  return (
    <div
      className="[&::-webkit-scrollbar]:hidden"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: '#EDE5FB',
        overflowY: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {/* Sticky channel tabs */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: '#EDE5FB',
          padding: '12px 16px',
          borderBottom: `1px solid ${T.line}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: 'rgba(255,255,255,0.55)',
            borderRadius: 10,
            padding: 3,
            border: `1px solid ${T.line}`,
          }}
        >
          {TABS.map((ch) => {
            const active = ch === activeChannel;
            const cs = channelStyle(ch);
            return (
              <button
                key={ch}
                type="button"
                onClick={() => setActiveChannel(ch)}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: 7,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  fontFamily: 'inherit',
                  transition: 'all 150ms ease',
                  background: active ? '#fff' : 'transparent',
                  color: active ? T.ink : T.muted,
                  boxShadow: active ? '0 1px 3px rgba(17,17,19,0.10), 0 0 0 1px rgba(216,206,235,0.6)' : 'none',
                }}
              >
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
          padding: '20px 18px 32px',
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
  showBottomBorder = false,
}: {
  row: SheetRow;
  onSave: (row: SheetRow, postTime: string) => Promise<void>;
  showBottomBorder?: boolean;
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
    <div
      style={{
        padding: '16px 24px 20px',
        borderBottom: showBottomBorder ? `1px solid ${T.line}` : 'none',
      }}
    >
      <SectionLabel>Schedule</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label
            style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.muted, marginBottom: 5 }}
          >
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={busy}
            style={{
              width: '100%',
              height: 34,
              padding: '0 10px',
              fontSize: 13,
              border: `1px solid ${T.lineStrong}`,
              borderRadius: 8,
              background: T.surface,
              color: T.ink,
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              opacity: busy ? 0.5 : 1,
            }}
          />
        </div>
        <div>
          <label
            style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.muted, marginBottom: 5 }}
          >
            Time{' '}
            <span style={{ fontWeight: 400, color: T.mutedSoft }}>(optional)</span>
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={busy}
            style={{
              width: '100%',
              height: 34,
              padding: '0 10px',
              fontSize: 13,
              border: `1px solid ${T.lineStrong}`,
              borderRadius: 8,
              background: T.surface,
              color: T.ink,
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
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
          marginTop: 12,
          width: '100%',
          height: 34,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: busy || !dirty ? 'not-allowed' : 'pointer',
          background: busy || !dirty ? T.accentSoft : T.accent,
          color: busy || !dirty ? T.accent : '#fff',
          border: 'none',
          transition: 'background 150ms, color 150ms',
          fontFamily: 'inherit',
        }}
      >
        {busy ? 'Saving…' : 'Update schedule'}
      </button>
    </div>
  );
}
