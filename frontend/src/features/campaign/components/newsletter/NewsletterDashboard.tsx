import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings2, Plus, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { NewsletterRecord, NewsletterIssueRow } from '../../schema/newsletterTypes';
import type { BackendApi } from '@/services/backendApi';
import { IssueDetailDrawer } from './IssueDetailDrawer';

interface Props {
  newsletter: NewsletterRecord;
  api: BackendApi;
  idToken: string;
  onBack: () => void;
  onOpenConfig: (newsletterId: string) => void;
  onUpdated: (newsletter: NewsletterRecord) => void;
}

const DAY_NAME_TO_INDEX: Record<string, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 0,
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function MiniCalendar({ scheduleDays }: { scheduleDays: string[] }) {
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  const scheduledDayIndices = new Set(
    scheduleDays.map(d => DAY_NAME_TO_INDEX[d]).filter(v => v !== undefined)
  );

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 w-56 flex-shrink-0">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-0.5 rounded hover:bg-slate-100 cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
        </button>
        <span className="text-xs font-medium text-slate-700">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-0.5 rounded hover:bg-slate-100 cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-slate-400 py-0.5">
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const dayIndex = i % 7; // 0=Sun
          const isScheduled = day !== null && scheduledDayIndices.has(dayIndex);
          return (
            <div key={i} className="flex flex-col items-center py-0.5">
              {day !== null ? (
                <>
                  <span className="text-[10px] text-slate-600 leading-none">{day}</span>
                  {isScheduled ? (
                    <span className="mt-0.5 w-1 h-1 rounded-full bg-indigo-500" />
                  ) : (
                    <span className="mt-0.5 w-1 h-1" />
                  )}
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: NewsletterIssueRow['status'] }) {
  return (
    <span
      className={clsx(
        'px-2 py-0.5 rounded-full text-[10px] font-medium',
        status === 'draft' && 'bg-slate-100 text-slate-600',
        status === 'pending_approval' && 'bg-amber-100 text-amber-700',
        status === 'approved' && 'bg-blue-100 text-blue-700',
        status === 'sent' && 'bg-emerald-100 text-emerald-700',
        status === 'failed' && 'bg-red-100 text-red-600',
      )}
    >
      {status === 'pending_approval' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatIssueDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function NewsletterDashboard({ newsletter, api, idToken, onBack, onOpenConfig, onUpdated }: Props) {
  const [issues, setIssues] = useState<NewsletterIssueRow[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<NewsletterIssueRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);

  useEffect(() => {
    void loadIssues();
  }, [newsletter.id]);

  const loadIssues = async () => {
    setLoadingIssues(true);
    try {
      const data = await api.listNewsletterIssuesByNewsletter(idToken, newsletter.id);
      setIssues(data);
    } catch {
      /* ignore */
    } finally {
      setLoadingIssues(false);
    }
  };

  const handleCreateDraft = async () => {
    setCreatingDraft(true);
    try {
      await api.createNewsletterDraftByNewsletter(idToken, newsletter.id);
      await loadIssues();
    } catch {
      /* ignore */
    } finally {
      setCreatingDraft(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      await api.updateNewsletter(idToken, newsletter.id, { active: !newsletter.active });
      onUpdated({ ...newsletter, active: !newsletter.active });
    } catch {
      /* ignore */
    }
  };

  const handleApproveIssue = async (issueId: string) => {
    try {
      await api.approveNewsletterIssue(idToken, issueId);
      await loadIssues();
    } catch {
      /* ignore */
    }
  };

  const handleRejectIssue = async (issueId: string) => {
    try {
      await api.rejectNewsletterIssue(idToken, issueId);
      await loadIssues();
    } catch {
      /* ignore */
    }
  };

  const handleSendIssue = async (issueId: string) => {
    try {
      await api.sendNewsletterIssue(idToken, issueId);
      await loadIssues();
    } catch {
      /* ignore */
    }
  };

  const openIssue = (issue: NewsletterIssueRow) => {
    setSelectedIssue(issue);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Newsletters
        </button>
        <span className="text-slate-300 mx-1">/</span>
        <span className="text-sm font-semibold text-slate-800">{newsletter.name}</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => { onOpenConfig(newsletter.id); }}
          className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Config
        </button>
        <button
          type="button"
          disabled={creatingDraft}
          onClick={() => { void handleCreateDraft(); }}
          className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
        >
          {creatingDraft ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Create Draft
        </button>
        <button
          type="button"
          onClick={() => { void handleToggleActive(); }}
          className="flex items-center gap-1.5 text-xs cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-50 border border-slate-200"
        >
          <span
            className={clsx(
              'w-1.5 h-1.5 rounded-full',
              newsletter.active ? 'bg-emerald-500' : 'bg-slate-400'
            )}
          />
          <span className={newsletter.active ? 'text-emerald-700' : 'text-slate-500'}>
            {newsletter.active ? 'Active' : 'Paused'}
          </span>
        </button>
      </div>

      {/* Body: calendar + issues */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* Mini-calendar */}
        <MiniCalendar scheduleDays={newsletter.config.scheduleDays} />

        {/* Issues list */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Issues</h3>

          {loadingIssues ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : issues.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              No issues yet. Click 'Create Draft' to generate your first newsletter.
            </p>
          ) : (
            <div className="space-y-1">
              {issues.map(issue => (
                <div
                  key={issue.id}
                  className="group flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs text-slate-500 w-12 flex-shrink-0">
                    {formatIssueDate(issue.issue_date)}
                  </span>
                  <span className="text-sm text-slate-800 flex-1 truncate">
                    {issue.subject || '(untitled)'}
                  </span>
                  <StatusBadge status={issue.status} />
                  {/* Inline action buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {issue.status === 'pending_approval' && (
                      <>
                        <button
                          type="button"
                          onClick={() => { void handleApproveIssue(issue.id); }}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => { void handleRejectIssue(issue.id); }}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {issue.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => { void handleSendIssue(issue.id); }}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                      >
                        Send now
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { openIssue(issue); }}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <IssueDetailDrawer
        issue={selectedIssue}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); }}
        onSave={() => { void loadIssues(); setDrawerOpen(false); }}
        onApprove={(issueId) => { void handleApproveIssue(issueId); }}
        onSend={(issueId) => { void handleSendIssue(issueId); }}
        idToken={idToken}
        api={api}
      />
    </div>
  );
}
