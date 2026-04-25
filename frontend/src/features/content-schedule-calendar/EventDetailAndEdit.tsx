import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Bot, ChevronLeft, ChevronRight, Pencil, RefreshCw, RotateCw, Send, Trash2, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CHANNEL_OPTIONS, type ChannelId } from '@/integrations/channels';
import { effectiveChannel } from '@/lib/topicEffectivePrefs';
import type { SheetRow } from '@/services/sheets';
import type { CalendarTopic, TopicEventModalActions } from './types';
import { CSC_TOKENS as T } from './tokens';
import { channelStyle } from './channelStyles';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCalendarDate(isoDate: string): string {
  const parts = isoDate.trim().split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const [y, m, d] = parts as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeHm(hhmm: string): string {
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return hhmm;
  const h = parseInt(match[1]!, 10);
  const min = parseInt(match[2]!, 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return hhmm;
  const date = new Date(2000, 0, 1, h, min);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function getPostPreviewText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const body = typeof p.body === 'string' ? p.body.trim() : '';
  if (body) return body;
  for (const key of ['variant1', 'variant2', 'variant3', 'variant4'] as const) {
    const v = p[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const selected = typeof p.selectedText === 'string' ? p.selectedText.trim() : '';
  if (selected) return selected;
  return null;
}

const KNOWN_CHANNELS = ['linkedin', 'instagram', 'telegram', 'whatsapp', 'gmail'];

// ─── ApprovalRail ────────────────────────────────────────────────────────────

const STAGES = [
  { label: 'Drafting',   helper: 'Draft in progress', status: 'pending',   order: 0 },
  { label: 'In review',  helper: 'Pending review',     status: 'drafted',   order: 1 },
  { label: 'Approved',   helper: 'Ready to publish',   status: 'approved',  order: 2 },
  { label: 'Publish',    helper: 'Scheduled',          status: 'published', order: 3 },
];

function statusOrder(status?: string): number {
  const s = STAGES.find((st) => st.status === (status ?? '').toLowerCase());
  return s ? s.order : 0;
}

function ApprovalRail({ status }: { status?: string }) {
  const current = statusOrder(status);
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, paddingBottom: 14 }}>
      {STAGES.map((stage, i) => {
        const isDone = stage.order < current;
        const isCurrent = stage.order === current;
        return (
          <div
            key={stage.status}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              background: isCurrent ? '#FFFFFF' : 'transparent',
              borderRadius: i === 0 ? '8px 0 0 8px' : i === STAGES.length - 1 ? '0 8px 8px 0' : 0,
              border: isCurrent ? `1px solid ${T.lineStrong}` : '1px solid transparent',
              borderLeft: i === 0 ? undefined : isCurrent ? `1px solid ${T.lineStrong}` : `1px solid ${T.line}`,
              position: 'relative',
            }}
          >
            {/* Circle */}
            <span
              style={{
                flexShrink: 0,
                width: 22,
                height: 22,
                borderRadius: 999,
                background: isDone ? T.ink : isCurrent ? '#fff' : T.tint,
                border: `1.5px solid ${isDone ? T.ink : isCurrent ? T.ink : T.lineStrong}`,
                color: isDone ? '#fff' : isCurrent ? T.ink : T.muted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {isDone ? '✓' : i + 1}
            </span>
            {/* Text */}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: isCurrent || isDone ? T.ink : T.muted, letterSpacing: '-0.005em', whiteSpace: 'nowrap' }}>
                {stage.label}
              </div>
              <div style={{ fontSize: 10.5, color: T.muted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {stage.helper}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ChannelBadge ────────────────────────────────────────────────────────────

function ChannelBadge({ channelId, size = 30 }: { channelId: string; size?: number }) {
  const cs = channelStyle(channelId);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        background: cs.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: Math.round(size * 0.37),
        fontWeight: 700,
        flexShrink: 0,
        textTransform: 'uppercase',
      }}
    >
      {cs.letter}
    </div>
  );
}

// ─── SectionLabel ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: T.muted,
        marginTop: 24,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

// ─── Native field style ───────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  height: 34,
  padding: '0 10px',
  fontSize: 13,
  border: `1px solid ${T.lineStrong}`,
  borderRadius: 8,
  background: T.surface,
  color: T.ink,
  width: '100%',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

// ─── ActionButton ────────────────────────────────────────────────────────────

const btnBase: React.CSSProperties = {
  padding: '0 14px',
  height: 32,
  borderRadius: 8,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};

// ─── LinkedIn preview card ────────────────────────────────────────────────────

function LinkedInPreviewCard({ topic, scheduledDate, scheduledTime }: { topic: CalendarTopic; scheduledDate: string; scheduledTime: string }) {
  const previewText = getPostPreviewText(topic.payload);
  const displayText = previewText ? previewText.slice(0, 400) : topic.title;
  const dateStr = scheduledDate ? `${formatCalendarDate(scheduledDate)}${scheduledTime ? ' · ' + formatTimeHm(scheduledTime) : ''}` : '';

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 360,
        background: '#fff',
        border: '1px solid #E0DFDC',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
      }}
    >
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 10px' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          PM
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Pratyush Mishra</div>
          {dateStr && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{dateStr}</div>}
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: '0 14px 14px', fontSize: 13, color: T.ink, lineHeight: 1.55 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{topic.title}</div>
        {previewText && (
          <div style={{ whiteSpace: 'pre-wrap', color: '#333' }}>
            {displayText}
            {previewText.length > 400 ? '…' : ''}
          </div>
        )}
      </div>
      {/* Footer */}
      <div
        style={{
          display: 'flex',
          borderTop: '1px solid #E0DFDC',
          padding: '6px 4px',
        }}
      >
        {['Like', 'Comment', 'Repost', 'Send'].map((action) => (
          <button
            key={action}
            type="button"
            style={{
              flex: 1,
              border: 'none',
              background: 'none',
              fontSize: 11.5,
              fontWeight: 600,
              color: '#666',
              padding: '5px 2px',
              cursor: 'default',
              borderRadius: 4,
            }}
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── FloatingPanelShell ───────────────────────────────────────────────────────

function FloatingPanelShell({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-50">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(17,17,19,0.05)' }}
        onClick={onClose}
      />
      <div
        className="absolute flex flex-col overflow-hidden"
        style={{
          top: 14,
          right: 14,
          bottom: 14,
          width: 'min(960px, calc(100% - 28px))',
          borderRadius: 14,
          border: '1px solid #D8CEEB',
          boxShadow: '0 32px 96px rgba(17,17,19,0.16), 0 8px 24px rgba(17,17,19,0.06)',
          background: T.bg,
          transform: visible ? 'translateX(0)' : 'translateX(calc(100% + 120px))',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EventDetailAndEdit({
  topic,
  defaultSlotTime,
  minSelectableDateIso,
  onClose,
  onSave,
  onDelete,
  topicQueueModal,
  previewSlot,
}: {
  topic: CalendarTopic;
  defaultSlotTime: string;
  minSelectableDateIso?: string;
  onClose: () => void;
  onSave: (patch: Partial<CalendarTopic>) => void;
  onDelete?: () => void;
  topicQueueModal?: TopicEventModalActions;
  previewSlot?: ReactNode;
}) {
  const [date, setDate] = useState(topic.date);
  const [startTime, setStartTime] = useState(topic.startTime ?? '');
  const [title, setTitle] = useState(topic.title);

  const initialChannel = (): ChannelId => {
    if (!topicQueueModal) return 'linkedin';
    const row = topic.payload as SheetRow | undefined;
    return row ? effectiveChannel(row, topicQueueModal.workspaceChannel) : topicQueueModal.workspaceChannel;
  };
  const [channelChoice, setChannelChoice] = useState<ChannelId>(initialChannel);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [channelBusy, setChannelBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);

  // Slide-in animation
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    setDate(topic.date);
    setStartTime(topic.startTime ?? '');
    setTitle(topic.title);
    if (topicQueueModal) {
      const row = topic.payload as SheetRow | undefined;
      setChannelChoice(row ? effectiveChannel(row, topicQueueModal.workspaceChannel) : topicQueueModal.workspaceChannel);
    }
  }, [topic.id, topic.date, topic.startTime, topic.title, topic.payload, topicQueueModal]);

  function handleSave() {
    if (minSelectableDateIso?.trim() && date.trim() && date < minSelectableDateIso.trim()) {
      return;
    }
    const patch: Partial<CalendarTopic> = {};
    if (date !== topic.date) patch.date = date;
    if (startTime !== (topic.startTime ?? '')) patch.startTime = startTime || undefined;
    if (title !== topic.title) patch.title = title;
    onSave(patch);
  }

  async function handleQueueSaveSchedule() {
    if (minSelectableDateIso?.trim() && date.trim() && date < minSelectableDateIso.trim()) {
      return;
    }
    const patch: Partial<CalendarTopic> = {};
    if (date !== topic.date) patch.date = date;
    if (startTime !== (topic.startTime ?? '')) patch.startTime = startTime || undefined;
    if (Object.keys(patch).length === 0) return;
    setScheduleBusy(true);
    try {
      onSave(patch);
    } finally {
      setScheduleBusy(false);
    }
  }

  async function handleQueueSaveChannel() {
    if (!topicQueueModal) return;
    setChannelBusy(true);
    try {
      await topicQueueModal.onSetChannel(topic, channelChoice);
    } finally {
      setChannelBusy(false);
    }
  }

  async function handleQueuePublish() {
    if (!topicQueueModal) return;
    setPublishBusy(true);
    try {
      await topicQueueModal.onPublish(topic);
    } finally {
      setPublishBusy(false);
    }
  }

  // Channels for tabs
  const rawChannels = topic.channels?.filter((ch) => KNOWN_CHANNELS.includes(ch));
  const channels = rawChannels && rawChannels.length > 0 ? rawChannels : ['linkedin'];
  const [previewChannel, setPreviewChannel] = useState(() => channels[0] ?? 'linkedin');

  // Sync previewChannel when channels list changes
  useEffect(() => {
    const ch = (topic.channels?.filter((c) => KNOWN_CHANNELS.includes(c)) ?? []);
    const list = ch.length > 0 ? ch : ['linkedin'];
    setPreviewChannel(list[0] ?? 'linkedin');
  }, [topic.id, topic.channels]);

  const scheduleDirty = date !== topic.date || startTime !== (topic.startTime ?? '');

  // Queue path publish control
  const pub = topicQueueModal ? topicQueueModal.getPublishControl(topic) : null;

  const rowPayload = topic.payload as SheetRow | undefined;
  const effectiveChannelNow = topicQueueModal
    ? rowPayload
      ? effectiveChannel(rowPayload, topicQueueModal.workspaceChannel)
      : topicQueueModal.workspaceChannel
    : 'linkedin';
  const channelDirty = channelChoice !== effectiveChannelNow;

  // Primary display channel (for header badge)
  const primaryChannel = channels[0] ?? 'linkedin';
  const cs = channelStyle(primaryChannel);

  // ─── Bold Header ──────────────────────────────────────────────────────────

  const iconBtnStyle: React.CSSProperties = {
    width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'transparent', color: T.muted, cursor: 'pointer', borderRadius: 7,
  };

  const boldHeader = (
    <div
      style={{
        background: 'linear-gradient(180deg, #F3EEFC 0%, #FFFFFF 100%)',
        padding: '14px 24px 0',
        borderBottom: `1px solid ${T.line}`,
        flexShrink: 0,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ChannelBadge channelId={primaryChannel} />
          <div>
            <div style={{ fontSize: 10.5, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
              Editing post · {cs.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.005em', marginTop: 2 }}>
              {formatCalendarDate(topic.date)}
              {(topic.startTime || defaultSlotTime) && ' · ' + formatTimeHm(topic.startTime ?? defaultSlotTime)}
            </div>
          </div>
        </div>
        {/* Nav + Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button type="button" style={iconBtnStyle} aria-label="Previous"><ChevronLeft size={14} /></button>
          <button type="button" style={iconBtnStyle} aria-label="Next"><ChevronRight size={14} /></button>
          <span style={{ width: 1, height: 18, background: T.line, margin: '0 6px' }} />
          <button type="button" onClick={onClose} style={iconBtnStyle} aria-label="Close"><X size={13} /></button>
        </div>
      </div>
      {/* Approval rail */}
      <ApprovalRail status={topic.status} />
    </div>
  );

  // ─── Left pane content ────────────────────────────────────────────────────

  const leftPane = (
    <div
      style={{
        padding: '26px 28px 28px',
        borderRight: `1px solid ${T.line}`,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {/* Topic title */}
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.022em', color: T.ink, marginBottom: 4, lineHeight: 1.3 }}>
        {topic.title}
      </div>
      {/* Word/char count */}
      {(() => {
        const text = getPostPreviewText(topic.payload);
        if (!text) return null;
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        return (
          <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 0 }}>
            {words} words · {text.length} chars
          </div>
        );
      })()}

      {/* Schedule section */}
      <SectionLabel>Schedule</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input
          type="date"
          value={date}
          min={minSelectableDateIso?.trim() || undefined}
          onChange={(e) => setDate(e.target.value)}
          disabled={scheduleBusy}
          style={fieldStyle}
        />
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          disabled={scheduleBusy}
          style={fieldStyle}
        />
      </div>
      <button
        type="button"
        disabled={scheduleBusy || !scheduleDirty}
        onClick={() => {
          if (topicQueueModal) {
            void handleQueueSaveSchedule();
          } else {
            handleSave();
          }
        }}
        style={{
          marginTop: 10,
          width: '100%',
          height: 34,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          background: scheduleDirty ? T.accent : T.accentSoft,
          color: scheduleDirty ? '#fff' : T.accent,
          border: 'none',
          cursor: scheduleDirty ? 'pointer' : 'not-allowed',
        }}
      >
        {scheduleBusy ? 'Saving…' : 'Save schedule'}
      </button>

      {/* Channel section — only when topicQueueModal */}
      {topicQueueModal && (
        <>
          <SectionLabel>Channel</SectionLabel>
          <Select
            value={channelChoice}
            onValueChange={(v) => setChannelChoice(v as ChannelId)}
            disabled={channelBusy}
          >
            <SelectTrigger style={{ height: 34, fontSize: 13 }}>
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            disabled={channelBusy || !channelDirty}
            onClick={() => void handleQueueSaveChannel()}
            style={{
              marginTop: 10,
              width: '100%',
              height: 34,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: channelDirty ? T.accent : T.accentSoft,
              color: channelDirty ? '#fff' : T.accent,
              border: 'none',
              cursor: channelDirty ? 'pointer' : 'not-allowed',
            }}
          >
            {channelBusy ? 'Saving…' : 'Update channel'}
          </button>
        </>
      )}

    </div>
  );

  // ─── Right pane ───────────────────────────────────────────────────────────

  const rightPane = (
    <div
      style={{
        overflowY: 'auto',
        background: '#EDE5FB',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {/* Sticky tabs header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: '#EDE5FB',
          borderBottom: `1px solid ${T.line}`,
          padding: '14px 18px 0',
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 10.5, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
            Live preview
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: T.muted }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: '#34C759', display: 'inline-block' }} />
            Synced
          </span>
        </div>
        {/* Channel tabs */}
        <div style={{ display: 'flex', gap: 2 }}>
          {channels.map((ch) => {
            const active = ch === previewChannel;
            const chs = channelStyle(ch);
            return (
              <button
                key={ch}
                type="button"
                onClick={() => setPreviewChannel(ch)}
                style={{
                  padding: '8px 12px 9px',
                  borderRadius: '7px 7px 0 0',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  border: 'none',
                  borderTop: active ? `1px solid ${T.line}` : '1px solid transparent',
                  borderLeft: active ? `1px solid ${T.line}` : '1px solid transparent',
                  borderRight: active ? `1px solid ${T.line}` : '1px solid transparent',
                  borderBottom: active ? `1px solid ${T.surface}` : '1px solid transparent',
                  background: active ? T.surface : 'transparent',
                  color: active ? T.ink : T.muted,
                  marginBottom: active ? -1 : 0,
                  position: 'relative',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 13,
                    height: 13,
                    borderRadius: 3,
                    background: chs.color,
                    color: '#fff',
                    fontSize: 7,
                    fontWeight: 700,
                    flexShrink: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  {chs.letter}
                </span>
                {chs.label}
              </button>
            );
          })}
        </div>
      </div>
      {/* Preview content */}
      <div
        style={{
          flex: 1,
          padding: '22px 18px 30px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        {previewSlot ? (
          previewSlot
        ) : (
          <LinkedInPreviewCard topic={topic} scheduledDate={date} scheduledTime={startTime} />
        )}
      </div>
    </div>
  );

  // ─── Footer ───────────────────────────────────────────────────────────────

  const footer = (
    <div
      style={{
        padding: '12px 18px',
        borderTop: `1px solid ${T.line}`,
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}
    >
      {/* Left: status */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: T.muted }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: '#34C759' }} />
          Auto-saved
        </span>
        <span style={{ fontSize: 11, color: T.mutedSoft }}>· ⌘S to save · Esc to close</span>
      </div>
      {/* Right: action buttons */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          style={{ ...btnBase, background: '#FFF0EE', color: '#C0392B', height: 36, fontSize: 13 }}
        >
          <Trash2 size={13} aria-hidden />
          Delete
        </button>
      )}
      {topicQueueModal && topicQueueModal.onDraft && (topic.status ?? '').toLowerCase() === 'pending' && (
        <button
          type="button"
          onClick={() => { topicQueueModal.onDraft!(topic); onClose(); }}
          style={{ ...btnBase, background: T.surface, color: T.ink2, border: `1px solid ${T.line}`, height: 36, fontSize: 13 }}
        >
          <Bot size={13} aria-hidden />
          AI Draft
        </button>
      )}
      {topicQueueModal ? (
        <button
          type="button"
          onClick={() => { topicQueueModal.onOpenEdit(topic); onClose(); }}
          style={{ ...btnBase, background: T.surface, color: T.ink2, border: `1px solid ${T.line}`, height: 36, fontSize: 13 }}
        >
          <Pencil size={13} aria-hidden />
          Edit post
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          style={{ ...btnBase, background: T.surface, color: T.ink2, border: `1px solid ${T.line}`, height: 36, fontSize: 13 }}
        >
          Save draft
        </button>
      )}
      {pub && pub.visible ? (
        <button
          type="button"
          disabled={pub.disabled || publishBusy}
          title={pub.disabledReason}
          onClick={() => void handleQueuePublish()}
          style={{ ...btnBase, background: T.accent, color: '#fff', border: 'none', height: 36, fontSize: 13, boxShadow: '0 1px 2px rgba(107,70,229,0.25)', opacity: (pub.disabled || publishBusy) ? 0.6 : 1, gap: 7 }}
        >
          {publishBusy || pub.busy ? (
            <RefreshCw size={13} className="animate-spin" aria-hidden />
          ) : pub.mode === 'republish' ? (
            <RotateCw size={13} aria-hidden />
          ) : (
            <Send size={13} aria-hidden />
          )}
          {publishBusy ? 'Working…' : pub.mode === 'republish' ? 'Republish' : 'Send for approval'}
        </button>
      ) : (
        <button
          type="button"
          onClick={topicQueueModal ? () => { topicQueueModal.onOpenEdit(topic); onClose(); } : handleSave}
          style={{ ...btnBase, background: T.accent, color: '#fff', border: 'none', height: 36, fontSize: 13, boxShadow: '0 1px 2px rgba(107,70,229,0.25)', gap: 7 }}
        >
          <Send size={13} aria-hidden />
          Send for approval
        </button>
      )}
    </div>
  );

  return (
    <FloatingPanelShell visible={visible} onClose={onClose}>
      {/* Bold Header */}
      {boldHeader}
      {/* Body: split grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {leftPane}
        {rightPane}
      </div>
      {/* Footer */}
      {footer}
    </FloatingPanelShell>
  );
}
