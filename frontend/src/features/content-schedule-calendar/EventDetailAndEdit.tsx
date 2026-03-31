import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CalendarTopic } from './types';

export function EventDetailAndEdit({
  topic,
  onClose,
  onSave,
}: {
  topic: CalendarTopic;
  onClose: () => void;
  onSave: (patch: Partial<CalendarTopic>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(topic.date);
  const [startTime, setStartTime] = useState(topic.startTime ?? '');
  const [title, setTitle] = useState(topic.title);

  function handleSave() {
    const patch: Partial<CalendarTopic> = {};
    if (date !== topic.date) patch.date = date;
    if (startTime !== (topic.startTime ?? '')) patch.startTime = startTime || undefined;
    if (title !== topic.title) patch.title = title;
    onSave(patch);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-violet-200/50 bg-white/95 p-5 shadow-xl backdrop-blur"
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
            <h3 className="mt-1 font-heading text-base font-semibold text-ink">{topic.title}</h3>
            <dl className="mt-3 space-y-1 text-xs text-muted">
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 font-medium text-ink/60">Date</dt>
                <dd>{topic.date}</dd>
              </div>
              {topic.startTime && (
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 font-medium text-ink/60">Time</dt>
                  <dd>{topic.startTime}</dd>
                </div>
              )}
              {topic.channels?.length ? (
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 font-medium text-ink/60">Channels</dt>
                  <dd>{topic.channels.join(', ')}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)} className="cursor-pointer">
                Edit
              </Button>
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
