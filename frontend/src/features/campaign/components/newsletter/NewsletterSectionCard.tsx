import { useState, useRef, useEffect } from 'react';
import { Settings2, Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import type { NewsletterRecord, NewsletterIssueRow } from '../../schema/newsletterTypes';

interface Props {
  newsletter: NewsletterRecord;
  issues: NewsletterIssueRow[];
  creatingDraft: boolean;
  onConfig: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onCreateDraft: (id: string) => Promise<void>;
  onIssueClick: (issue: NewsletterIssueRow) => void;
  onApprove: (issueId: string) => Promise<void>;
  onSend: (issueId: string) => Promise<void>;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

function buildScheduleSummary(days: string[], times: string[]): string {
  if (!days?.length) return 'No schedule set';
  const dayStr = days.map(d => DAY_LABELS[d.toLowerCase()] ?? d).join(', ');
  if (!times?.length) return `Every ${dayStr}`;
  const [h, m] = times[0].split(':');
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `Every ${dayStr} · ${hour12}:${m ?? '00'}${period}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function IssueBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    pending_approval: 'bg-amber-50 text-amber-700',
    approved: 'bg-blue-50 text-blue-700',
    sent: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-rose-50 text-rose-600',
  };
  const label: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'Pending',
    approved: 'Approved',
    sent: 'Sent',
    failed: 'Failed',
  };
  return (
    <span className={clsx('shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium', cls[status] ?? 'bg-slate-100 text-slate-600')}>
      {label[status] ?? status}
    </span>
  );
}

export function NewsletterSectionCard({
  newsletter,
  issues,
  creatingDraft,
  onConfig,
  onToggleActive,
  onDelete,
  onCreateDraft,
  onIssueClick,
  onApprove,
  onSend,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [busyIssueId, setBusyIssueId] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleAction = async (issueId: string, fn: () => Promise<void>) => {
    setBusyIssueId(issueId);
    try { await fn(); } finally { setBusyIssueId(null); }
  };

  const sorted = [...issues].sort((a, b) => {
    const da = a.issue_date || a.scheduled_for || '';
    const db = b.issue_date || b.scheduled_for || '';
    return db.localeCompare(da);
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="shrink-0 text-slate-400 hover:text-slate-600 cursor-pointer"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Name + status */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-semibold text-slate-800 truncate">{newsletter.name}</span>
          {newsletter.active ? (
            <span className="shrink-0 flex items-center gap-1 text-xs text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
            </span>
          ) : (
            <span className="shrink-0 flex items-center gap-1 text-xs text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Paused
            </span>
          )}
        </div>

        {/* Schedule summary */}
        <span className="hidden sm:block text-xs text-slate-400 shrink-0">
          {buildScheduleSummary(newsletter.config.scheduleDays, newsletter.config.scheduleTimes)}
        </span>

        {/* Issue count chip */}
        <span className="shrink-0 text-xs text-slate-400 tabular-nums">
          {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={creatingDraft}
            onClick={() => void onCreateDraft(newsletter.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
          >
            {creatingDraft ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Draft
          </button>

          <button
            type="button"
            onClick={() => onConfig(newsletter.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer"
            aria-label="Configure"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer text-sm leading-none"
              aria-label="More"
            >
              ···
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-10 min-w-[120px] rounded-lg border border-slate-200 bg-white py-1 shadow-md">
                <button
                  type="button"
                  onClick={() => { onToggleActive(newsletter.id, !newsletter.active); setMenuOpen(false); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {newsletter.active ? 'Pause' : 'Resume'}
                </button>
                <button
                  type="button"
                  onClick={() => { onDelete(newsletter.id); setMenuOpen(false); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-rose-500 hover:bg-slate-50 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Issues list */}
      {expanded && (
        <div>
          {sorted.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No issues yet — click <strong>Draft</strong> to generate the first one.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {sorted.map(issue => (
                <div
                  key={issue.id}
                  className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => onIssueClick(issue)}
                >
                  <span className="text-xs text-slate-400 w-24 shrink-0">
                    {formatDate(issue.issue_date || issue.scheduled_for)}
                  </span>
                  <span className="text-sm text-slate-700 flex-1 truncate">
                    {issue.subject || '(untitled)'}
                  </span>
                  <IssueBadge status={issue.status} />

                  {/* Inline quick actions */}
                  <div
                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                  >
                    {issue.status === 'pending_approval' && (
                      <button
                        type="button"
                        disabled={busyIssueId === issue.id}
                        onClick={() => void handleAction(issue.id, () => onApprove(issue.id))}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
                      >
                        Approve
                      </button>
                    )}
                    {issue.status === 'approved' && (
                      <button
                        type="button"
                        disabled={busyIssueId === issue.id}
                        onClick={() => void handleAction(issue.id, () => onSend(issue.id))}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 cursor-pointer"
                      >
                        Send
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
