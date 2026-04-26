import { useState, useEffect, useRef } from 'react';
import { X, Check, Send, Eye, EyeOff } from 'lucide-react';
import { CSC_TOKENS as T } from '@/features/content-schedule-calendar/tokens';
import type { NewsletterIssueRow } from '../../schema/newsletterTypes';
import type { BackendApi } from '@/services/backendApi';

interface Props {
  issue: NewsletterIssueRow | null;
  open: boolean;
  onClose: () => void;
  onApprove: (issueId: string) => Promise<void>;
  onSend: (issueId: string) => Promise<void>;
  idToken: string;
  api: BackendApi;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>
      {children}
    </p>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    pending_approval: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    sent: 'bg-blue-50 text-blue-700',
    failed: 'bg-rose-50 text-rose-600',
  };
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    sent: 'Sent',
    failed: 'Failed',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function IssueDetailsPane({
  issue,
  onApprove,
  onSend,
}: {
  issue: NewsletterIssueRow;
  onApprove: (id: string) => Promise<void>;
  onSend: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const articles = (() => {
    try {
      return JSON.parse(issue.articles_json || '[]') as Array<{ title?: string; url?: string; source?: string }>;
    } catch {
      return [];
    }
  })();

  const scheduledDate = issue.scheduled_for
    ? new Date(issue.scheduled_for).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : issue.issue_date;

  const handle = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
      {/* Metadata */}
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.line}` }}>
        <SectionLabel>Issue Details</SectionLabel>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Subject</p>
            <p className="text-sm font-medium text-slate-800">{issue.subject || '(untitled)'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Scheduled for</p>
            <p className="text-sm text-slate-700">{scheduledDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Issue ID</p>
            <p className="text-xs font-mono text-slate-400">{issue.id}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(issue.status === 'pending_approval' || issue.status === 'approved') && (
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.line}` }}>
          <SectionLabel>Actions</SectionLabel>
          <div className="flex gap-2 flex-wrap">
            {issue.status === 'pending_approval' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handle(() => onApprove(issue.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                <Check className="h-4 w-4" /> Approve
              </button>
            )}
            {issue.status === 'approved' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handle(() => onSend(issue.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-4 w-4" /> Send now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Articles */}
      <div style={{ padding: '16px 24px 24px' }}>
        <SectionLabel>Articles ({articles.length})</SectionLabel>
        <div className="space-y-2">
          {articles.map((article, i) => (
            <div key={i} className="rounded-lg border border-slate-100 p-3">
              <p className="text-sm font-medium text-slate-700 truncate">{article.title || 'Untitled'}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{article.source || article.url || ''}</p>
            </div>
          ))}
          {articles.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No articles.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewPane({ issue }: { issue: NewsletterIssueRow }) {
  const [showRaw, setShowRaw] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!showRaw && iframeRef.current && issue.rendered_content) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(issue.rendered_content);
        doc.close();
      }
    }
  }, [issue.rendered_content, showRaw]);

  return (
    <div className="h-full flex flex-col" style={{ borderLeft: `1px solid ${T.line}` }}>
      <div
        className="flex items-center justify-between shrink-0 px-5 py-3"
        style={{ borderBottom: `1px solid ${T.line}` }}
      >
        <SectionLabel>Email Preview</SectionLabel>
        <button
          type="button"
          onClick={() => setShowRaw(v => !v)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          {showRaw ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {showRaw ? 'Rendered' : 'Raw HTML'}
        </button>
      </div>
      <div className="flex-1 min-h-0 p-4">
        {showRaw ? (
          <textarea
            readOnly
            value={issue.rendered_content || ''}
            className="w-full h-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono resize-none bg-slate-50"
          />
        ) : (
          <iframe
            ref={iframeRef}
            className="w-full h-full rounded-lg border border-slate-200 bg-white"
            sandbox="allow-same-origin"
            title="Newsletter preview"
          />
        )}
      </div>
    </div>
  );
}

export function NewsletterIssuePanel({ issue, open, onClose, onApprove, onSend }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open || !issue) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(17,17,19,0.04)' }}
        onClick={onClose}
      />

      {/* Panel */}
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
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="shrink-0 flex items-start justify-between gap-4 px-6 py-4"
          style={{
            borderBottom: `1px solid ${T.line}`,
            background: 'linear-gradient(180deg, #F3EEFC 0%, #FFFFFF 100%)',
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="self-start">
              <StatusBadge status={issue.status} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.3, margin: 0 }}>
              {issue.subject || '(untitled issue)'}
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

        {/* Two-panel body */}
        <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <IssueDetailsPane issue={issue} onApprove={onApprove} onSend={onSend} />
          <PreviewPane issue={issue} />
        </div>
      </div>
    </div>
  );
}
