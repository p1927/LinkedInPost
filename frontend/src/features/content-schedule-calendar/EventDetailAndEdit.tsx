import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CHANNEL_OPTIONS } from '@/integrations/channels';
import type { CalendarTopic } from './types';

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

export function EventDetailAndEdit({
  topic,
  defaultSlotTime,
  onClose,
  onSave,
  onDelete,
}: {
  topic: CalendarTopic;
  /** Shown when `topic.startTime` is missing (matches calendar fallback slot). */
  defaultSlotTime: string;
  onClose: () => void;
  onSave: (patch: Partial<CalendarTopic>) => void;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(topic.date);
  const [startTime, setStartTime] = useState(topic.startTime ?? '');
  const [title, setTitle] = useState(topic.title);
  const [previewOpen, setPreviewOpen] = useState(false);

  const effectiveTime = topic.startTime ?? defaultSlotTime;
  const usingDefaultSlot = !topic.startTime?.trim();
  const previewText = getPostPreviewText(topic.payload);

  function handleSave() {
    const patch: Partial<CalendarTopic> = {};
    if (date !== topic.date) patch.date = date;
    if (startTime !== (topic.startTime ?? '')) patch.startTime = startTime || undefined;
    if (title !== topic.title) patch.title = title;
    onSave(patch);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-violet-200/50 bg-white/95 p-5 shadow-xl backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1 text-muted hover:bg-slate-100 hover:text-ink cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {!editing ? (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted/70">
              {topic.status ?? 'pending'}
            </p>
            <h3 className="mt-1 pr-8 font-heading text-base font-semibold text-ink">{topic.title}</h3>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex gap-3 border-b border-slate-100 pb-2">
                <dt className="w-24 shrink-0 font-medium text-ink/70">Date</dt>
                <dd className="text-ink">{formatCalendarDate(topic.date)}</dd>
              </div>
              <div className="flex gap-3 border-b border-slate-100 pb-2">
                <dt className="w-24 shrink-0 font-medium text-ink/70">Time</dt>
                <dd className="text-ink">
                  {formatTimeHm(effectiveTime)}
                  {usingDefaultSlot ? (
                    <span className="ml-1.5 text-xs font-normal text-muted">
                      (default slot — set a time or drag in Week/Day view)
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="flex gap-3 border-b border-slate-100 pb-2">
                <dt className="w-24 shrink-0 font-medium text-ink/70">Channels</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {topic.channels?.length ? (
                    topic.channels.map((ch) => (
                      <span
                        key={ch}
                        className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800 ring-1 ring-indigo-200/80"
                      >
                        {channelLabel(ch)}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted">None selected</span>
                  )}
                </dd>
              </div>
            </dl>

            {previewText ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setPreviewOpen((o) => !o)}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-slate-100 cursor-pointer"
                >
                  {previewOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  )}
                  Post preview
                </button>
                {previewOpen ? (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-ink/90 whitespace-pre-wrap">
                    {previewText}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)} className="cursor-pointer">
                Edit
              </Button>
              {onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="cursor-pointer text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Delete
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="cursor-pointer">
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-heading text-base font-semibold text-ink">Edit occurrence</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/70">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/70">Date (YYYY-MM-DD)</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/70">Time (HH:MM, optional)</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" size="sm" onClick={handleSave} className="cursor-pointer">
                Save
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} className="cursor-pointer">
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
