import { useMemo, useState } from 'react';
import { ContentScheduleCalendar } from '@/features/content-schedule-calendar';
import type { CalendarTopic, TopicScheduleChange } from '@/features/content-schedule-calendar';
import type { NewsletterRecord, NewsletterIssueRow } from '../../schema/newsletterTypes';
import type { SheetRow } from '@/services/sheets';

export interface CalendarIssueEvent {
  date: string; // YYYY-MM-DD
  newsletterId: string;
  newsletterIndex: number;
  newsletterName: string;
  issue: NewsletterIssueRow;
}

interface Props {
  newsletters: NewsletterRecord[];
  issueEvents: CalendarIssueEvent[];
  topicRows: SheetRow[];
  onIssueClick: (issue: NewsletterIssueRow) => void;
  onCreateIssueAt: (newsletterId: string) => Promise<void>;
  onUpdateNewsletterTime: (newsletterId: string, newTime: string) => Promise<void>;
}

interface CreateDialogState {
  open: boolean;
  date: string;
  time: string;
  selectedNewsletterId: string;
}

interface RescheduleDialogState {
  open: boolean;
  issue: NewsletterIssueRow | null;
  newsletterId: string;
  newsletterName: string;
  newTime: string;
}

const ISSUE_STATUS_MAP: Record<string, string> = {
  draft: 'pending',
  pending_approval: 'drafted',
  approved: 'approved',
  sent: 'published',
  failed: 'failed',
};

export default function NewsletterCalendarView({
  newsletters,
  issueEvents,
  topicRows,
  onIssueClick,
  onCreateIssueAt,
  onUpdateNewsletterTime,
}: Props) {
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({
    open: false, date: '', time: '', selectedNewsletterId: '',
  });
  const [rescheduleDialog, setRescheduleDialog] = useState<RescheduleDialogState>({
    open: false, issue: null, newsletterId: '', newsletterName: '', newTime: '',
  });
  const [busy, setBusy] = useState(false);

  const topics = useMemo<CalendarTopic[]>(() => {
    const issueTops: CalendarTopic[] = issueEvents
      .filter(e => Boolean(e.date))
      .map(e => ({
        id: e.issue.id,
        title: e.issue.subject || e.newsletterName || 'Newsletter Issue',
        date: e.date,
        startTime: e.issue.scheduled_for
          ? new Date(e.issue.scheduled_for).toTimeString().slice(0, 5)
          : undefined,
        status: ISSUE_STATUS_MAP[e.issue.status] ?? 'pending',
        channels: ['email'],
        payload: { __type: 'newsletter_issue', issue: e.issue, newsletterId: e.newsletterId, newsletterName: e.newsletterName },
      }));

    const topicTops: CalendarTopic[] = topicRows
      .filter(r => Boolean(r.postTime))
      .map(r => ({
        id: r.topicId || r.topic,
        title: r.topic,
        date: new Date(r.postTime).toISOString().slice(0, 10),
        startTime: new Date(r.postTime).toTimeString().slice(0, 5),
        status: (r.status as string) ?? 'pending',
        channels: r.topicDeliveryChannel ? [r.topicDeliveryChannel] : [],
        payload: { __type: 'topic', row: r },
      }));

    return [...issueTops, ...topicTops];
  }, [issueEvents, topicRows]);

  const handleEmptySlotClick = (date: string, time: string) => {
    if (newsletters.length === 0) return;
    setCreateDialog({
      open: true,
      date,
      time,
      selectedNewsletterId: newsletters[0]!.id,
    });
  };

  const handleTopicScheduleChange = (change: TopicScheduleChange) => {
    // Find the issue event this change belongs to
    const event = issueEvents.find(e => e.issue.id === change.id);
    if (!event || !change.newStartTime) return;
    setRescheduleDialog({
      open: true,
      issue: event.issue,
      newsletterId: event.newsletterId,
      newsletterName: event.newsletterName,
      newTime: change.newStartTime,
    });
  };

  const handleCreateConfirm = async () => {
    if (!createDialog.selectedNewsletterId || busy) return;
    setBusy(true);
    try {
      await onCreateIssueAt(createDialog.selectedNewsletterId);
      setCreateDialog(d => ({ ...d, open: false }));
    } finally {
      setBusy(false);
    }
  };

  const handleRescheduleConfirm = async () => {
    if (!rescheduleDialog.newsletterId || !rescheduleDialog.newTime || busy) return;
    setBusy(true);
    try {
      await onUpdateNewsletterTime(rescheduleDialog.newsletterId, rescheduleDialog.newTime);
      setRescheduleDialog(d => ({ ...d, open: false }));
    } finally {
      setBusy(false);
    }
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = (h ?? 0) >= 12 ? 'pm' : 'am';
    const hour12 = (h ?? 0) % 12 === 0 ? 12 : (h ?? 0) % 12;
    return `${hour12}:${String(m ?? 0).padStart(2, '0')}${period}`;
  };

  return (
    <>
      <ContentScheduleCalendar
        topics={topics}
        canDrag={true}
        disableInternalDrawer
        initialView="week"
        onTopicActivate={(topic) => {
          if (topic.payload?.__type === 'newsletter_issue') {
            onIssueClick(topic.payload.issue as NewsletterIssueRow);
          }
        }}
        onTopicScheduleChange={handleTopicScheduleChange}
        onEmptySlotClick={handleEmptySlotClick}
      />

      {/* Create issue dialog */}
      {createDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setCreateDialog(d => ({ ...d, open: false }))} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-5">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Create newsletter issue</h3>
            <p className="text-sm text-slate-500 mb-4">
              Create a draft issue for {createDialog.date} at {formatTime(createDialog.time)}.
            </p>

            {newsletters.length > 1 && (
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Newsletter</label>
                <select
                  value={createDialog.selectedNewsletterId}
                  onChange={e => setCreateDialog(d => ({ ...d, selectedNewsletterId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {newsletters.map(nl => (
                    <option key={nl.id} value={nl.id}>{nl.name}</option>
                  ))}
                </select>
              </div>
            )}

            {newsletters.length === 1 && (
              <p className="text-sm font-medium text-slate-700 mb-4">
                Newsletter: <span className="text-indigo-600">{newsletters[0]!.name}</span>
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setCreateDialog(d => ({ ...d, open: false }))}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCreateConfirm()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Creating…' : 'Create draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule scope dialog */}
      {rescheduleDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setRescheduleDialog(d => ({ ...d, open: false }))} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-5">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Update send time</h3>
            <p className="text-sm text-slate-500 mb-1">
              Move <span className="font-medium text-slate-700">{rescheduleDialog.issue?.subject || 'this issue'}</span> to{' '}
              <span className="font-medium text-slate-700">{formatTime(rescheduleDialog.newTime)}</span>.
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Apply to all future issues of <span className="font-medium text-slate-700">{rescheduleDialog.newsletterName}</span>?
            </p>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRescheduleDialog(d => ({ ...d, open: false }))}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRescheduleConfirm()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Updating…' : 'Update schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
