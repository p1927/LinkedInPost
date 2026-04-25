import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Bot, ChevronDown, ChevronRight, Pencil, RefreshCw, RotateCw, Send, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CHANNEL_OPTIONS, type ChannelId } from '@/integrations/channels';
import { effectiveChannel } from '@/lib/topicEffectivePrefs';
import type { SheetRow } from '@/services/sheets';
import type { CalendarTopic, TopicEventModalActions } from './types';

const PANEL_WIDTH = 440;

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
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhmm;
  const h = parseInt(m[1]!, 10);
  const min = parseInt(m[2]!, 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return hhmm;
  const date = new Date(2000, 0, 1, h, min);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function channelLabel(id: string): string {
  return CHANNEL_OPTIONS.find((c) => c.value === id)?.label ?? id;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-indigo-50 text-indigo-700 ring-indigo-200/80',
  drafted: 'bg-amber-50 text-amber-700 ring-amber-200/80',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
  published: 'bg-slate-100 text-slate-600 ring-slate-200/80',
  blocked: 'bg-rose-50 text-rose-700 ring-rose-200/80',
};

function statusBadgeClass(status?: string): string {
  return STATUS_BADGE[(status ?? '').toLowerCase()] ?? 'bg-slate-100 text-slate-600 ring-slate-200/80';
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

/** Shared floating panel wrapper — positions absolutely within the calendar container. */
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
      {/* Very light backdrop — design uses rgba(17,17,19,0.04) */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(17,17,19,0.05)' }}
        onClick={onClose}
      />
      {/* Floating panel */}
      <div
        className="absolute flex flex-col overflow-hidden bg-white"
        style={{
          top: 20,
          right: 20,
          bottom: 20,
          width: PANEL_WIDTH,
          borderRadius: 14,
          border: '1px solid #D8CEEB',
          boxShadow: '0 18px 60px rgba(17,17,19,0.10), 0 4px 12px rgba(17,17,19,0.04)',
          transform: visible ? 'translateX(0)' : `translateX(calc(100% + ${PANEL_WIDTH + 40}px))`,
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

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
  /** Shown when `topic.startTime` is missing (matches calendar fallback slot). */
  defaultSlotTime: string;
  /** When set, date picker cannot go before this `YYYY-MM-DD` (local). */
  minSelectableDateIso?: string;
  onClose: () => void;
  onSave: (patch: Partial<CalendarTopic>) => void;
  onDelete?: () => void;
  /** Topics queue: schedule + channel + edit/publish in-modal; hides post preview. */
  topicQueueModal?: TopicEventModalActions;
  previewSlot?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(topic.date);
  const [startTime, setStartTime] = useState(topic.startTime ?? '');
  const [title, setTitle] = useState(topic.title);
  const [previewOpen, setPreviewOpen] = useState(false);
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

  const effectiveTime = topic.startTime ?? defaultSlotTime;
  const usingDefaultSlot = !topic.startTime?.trim();
  const previewText = getPostPreviewText(topic.payload);

  useEffect(() => {
    setDate(topic.date);
    setStartTime(topic.startTime ?? '');
    setTitle(topic.title);
    setPreviewOpen(false);
    setEditing(false);
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

  if (topicQueueModal) {
    const pub = topicQueueModal.getPublishControl(topic);
    const scheduleDirty =
      date !== topic.date || startTime !== (topic.startTime ?? '');
    const rowPayload = topic.payload as SheetRow | undefined;
    const effectiveChannelNow = rowPayload
      ? effectiveChannel(rowPayload, topicQueueModal.workspaceChannel)
      : topicQueueModal.workspaceChannel;
    const channelDirty = channelChoice !== effectiveChannelNow;

    return (
      <FloatingPanelShell visible={visible} onClose={onClose}>
        <div className="shrink-0 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${statusBadgeClass(topic.status)}`}
              >
                {topic.status ?? 'pending'}
              </span>
              <h3 className="mt-2 text-base font-semibold leading-snug text-slate-900">{topic.title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-0.5 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-5">
            {previewSlot && (
              <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</h4>
                {previewSlot}
              </section>
            )}
            <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="eqm-date" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Date
                  </label>
                  <Input
                    id="eqm-date"
                    type="date"
                    value={date}
                    min={minSelectableDateIso?.trim() || undefined}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-9 text-sm"
                    disabled={scheduleBusy}
                  />
                </div>
                <div>
                  <label htmlFor="eqm-time" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Time <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <Input
                    id="eqm-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-9 text-sm"
                    disabled={scheduleBusy}
                  />
                </div>
              </div>
              {!topic.startTime?.trim() && (
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  No time set — calendar uses {formatTimeHm(defaultSlotTime)} until you save a time here or drag the
                  event in Week/Day view.
                </p>
              )}
              <Button
                type="button"
                size="sm"
                className="mt-3 w-full cursor-pointer sm:w-auto"
                disabled={scheduleBusy || !scheduleDirty}
                onClick={() => void handleQueueSaveSchedule()}
              >
                {scheduleBusy ? 'Saving…' : 'Update schedule'}
              </Button>
            </section>

            <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Channel</h4>
              <Select
                value={channelChoice}
                onValueChange={(v) => setChannelChoice(v as ChannelId)}
                disabled={channelBusy}
              >
                <SelectTrigger className="h-9 w-full text-sm">
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
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3 w-full cursor-pointer sm:w-auto"
                disabled={channelBusy || !channelDirty}
                onClick={() => void handleQueueSaveChannel()}
              >
                {channelBusy ? 'Saving…' : 'Update channel'}
              </Button>
            </section>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="cursor-pointer text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Delete
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="cursor-pointer"
              >
                Close
              </Button>
              {topicQueueModal.onDraft && (topic.status ?? '').toLowerCase() === 'pending' ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="cursor-pointer gap-1.5"
                  onClick={() => {
                    topicQueueModal.onDraft!(topic);
                    onClose();
                  }}
                >
                  <Bot className="h-3.5 w-3.5" aria-hidden />
                  AI Draft
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() => {
                  topicQueueModal.onOpenEdit(topic);
                  onClose();
                }}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit
              </Button>
              {pub.visible ? (
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer gap-1.5"
                  disabled={pub.disabled || publishBusy}
                  title={pub.disabledReason}
                  onClick={() => void handleQueuePublish()}
                >
                  {publishBusy || pub.busy ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : pub.mode === 'republish' ? (
                    <RotateCw className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Send className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {publishBusy ? 'Working…' : pub.mode === 'republish' ? 'Republish' : 'Publish'}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </FloatingPanelShell>
    );
  }

  return (
    <FloatingPanelShell visible={visible} onClose={onClose}>
      {!editing ? (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0 flex-1">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${statusBadgeClass(topic.status)}`}
              >
                {topic.status ?? 'pending'}
              </span>
              <h3 className="mt-1.5 text-sm font-semibold leading-snug text-slate-900">{topic.title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-0.5 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <dl className="grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="self-start pt-px font-medium text-slate-500">Date</dt>
              <dd className="text-slate-800">{formatCalendarDate(topic.date)}</dd>

              <dt className="self-start pt-px font-medium text-slate-500">Time</dt>
              <dd className="text-slate-800">
                {formatTimeHm(effectiveTime)}
                {usingDefaultSlot && (
                  <span className="ml-1.5 text-xs text-slate-400">
                    (default — drag in Week/Day to set)
                  </span>
                )}
              </dd>

              <dt className="self-start pt-px font-medium text-slate-500">Channels</dt>
              <dd className="flex flex-wrap gap-1.5">
                {topic.channels?.length ? (
                  topic.channels.map((ch) => (
                    <span
                      key={ch}
                      className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200/80"
                    >
                      {channelLabel(ch)}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">None selected</span>
                )}
              </dd>
            </dl>

            {previewText && (
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80">
                <button
                  type="button"
                  onClick={() => setPreviewOpen((o) => !o)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 cursor-pointer"
                >
                  {previewOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  )}
                  Post preview
                </button>
                {previewOpen && (
                  <div className="max-h-44 overflow-y-auto border-t border-slate-100 px-3 py-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {previewText}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
            <Button
              type="button"
              size="sm"
              onClick={() => setEditing(true)}
              className="cursor-pointer gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
            <div className="flex items-center gap-1.5">
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="cursor-pointer text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">Delete</span>
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="cursor-pointer text-slate-600">
                Close
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Edit event</h3>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              aria-label="Cancel editing"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto space-y-4 px-5 py-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Date</label>
                <Input
                  type="date"
                  value={date}
                  min={minSelectableDateIso?.trim() || undefined}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Time <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} className="cursor-pointer">
              Save changes
            </Button>
          </div>
        </>
      )}
    </FloatingPanelShell>
  );
}
