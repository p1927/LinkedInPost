import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2, X } from 'lucide-react';
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

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-indigo-50 text-indigo-700 ring-indigo-200/80',
  drafted:   'bg-amber-50 text-amber-700 ring-amber-200/80',
  approved:  'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
  published: 'bg-slate-100 text-slate-600 ring-slate-200/80',
  blocked:   'bg-rose-50 text-rose-700 ring-rose-200/80',
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

export function EventDetailAndEdit({
  topic,
  defaultSlotTime,
  minSelectableDateIso,
  onClose,
  onSave,
  onDelete,
}: {
  topic: CalendarTopic;
  /** Shown when `topic.startTime` is missing (matches calendar fallback slot). */
  defaultSlotTime: string;
  /** When set, date picker cannot go before this `YYYY-MM-DD` (local). */
  minSelectableDateIso?: string;
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
    if (minSelectableDateIso?.trim() && date.trim() && date < minSelectableDateIso.trim()) {
      return;
    }
    const patch: Partial<CalendarTopic> = {};
    if (date !== topic.date) patch.date = date;
    if (startTime !== (topic.startTime ?? '')) patch.startTime = startTime || undefined;
    if (title !== topic.title) patch.title = title;
    onSave(patch);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!editing ? (
          <>
            {/* Header */}
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

            {/* Body */}
            <div className="px-5 py-4">
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
                    {previewOpen
                      ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                      : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    }
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

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
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
            {/* Edit header */}
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

            {/* Edit body */}
            <div className="space-y-4 px-5 py-4">
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
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Time <span className="font-normal text-slate-400">(optional)</span></label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            </div>

            {/* Edit footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave} className="cursor-pointer">
                Save changes
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
