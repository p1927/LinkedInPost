import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, Send, Eye, EyeOff, FileText, Newspaper } from 'lucide-react';
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

function EditPane({
  issue,
  idToken,
  api,
  onUpdated,
}: {
  issue: NewsletterIssueRow;
  idToken: string;
  api: BackendApi;
  onUpdated: (patch: Partial<NewsletterIssueRow>) => void;
}) {
  const [subject, setSubject] = useState(issue.subject || '');
  const [content, setContent] = useState(issue.rendered_content || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSavedFlag] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSubject(issue.subject || '');
    setContent(issue.rendered_content || '');
  }, [issue.id]);

  const scheduleSave = useCallback(
    (patch: { subject?: string; rendered_content?: string }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await api.updateNewsletterIssue(idToken, issue.id, patch);
          onUpdated(patch);
          setSavedFlag(true);
          setTimeout(() => setSavedFlag(false), 1500);
        } catch {
          // silent
        } finally {
          setSaving(false);
        }
      }, 600);
    },
    [api, idToken, issue.id, onUpdated],
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 py-4" style={{ borderBottom: `1px solid ${T.line}` }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>
          Edit Issue
        </p>
        <div className="space-y-1.5">
          <label className="text-xs text-slate-500 font-medium">Subject line</label>
          <input
            type="text"
            value={subject}
            onChange={e => {
              setSubject(e.target.value);
              scheduleSave({ subject: e.target.value, rendered_content: content });
            }}
            placeholder="Newsletter subject…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-6 py-4 gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500 font-medium">HTML content</label>
          {saving && <span className="text-[10px] text-slate-400">Saving…</span>}
          {!saving && saved && <span className="text-[10px] text-emerald-500">Saved</span>}
        </div>
        <textarea
          value={content}
          onChange={e => {
            setContent(e.target.value);
            scheduleSave({ subject, rendered_content: e.target.value });
          }}
          placeholder="Paste or edit HTML content…"
          className="flex-1 min-h-0 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none"
        />
      </div>

      <div className="shrink-0 px-6 py-3" style={{ borderTop: `1px solid ${T.line}` }}>
        <div className="space-y-1">
          <p className="text-xs text-slate-400">Scheduled for</p>
          <p className="text-sm text-slate-700 font-medium">
            {issue.scheduled_for
              ? new Date(issue.scheduled_for).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : issue.issue_date || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

type RightTab = 'preview' | 'articles';

function RightPane({ issue }: { issue: NewsletterIssueRow }) {
  const [tab, setTab] = useState<RightTab>('preview');
  const [showRaw, setShowRaw] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (tab === 'preview' && !showRaw && iframeRef.current && issue.rendered_content) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(issue.rendered_content);
        doc.close();
      }
    }
  }, [issue.rendered_content, showRaw, tab]);

  const articles = (() => {
    try {
      return JSON.parse(issue.articles_json || '[]') as Array<{ title?: string; url?: string; source?: string }>;
    } catch {
      return [];
    }
  })();

  return (
    <div className="h-full flex flex-col" style={{ borderLeft: `1px solid ${T.line}` }}>
      {/* Tabs */}
      <div className="shrink-0 flex items-center gap-1 px-4 pt-3 pb-0" style={{ borderBottom: `1px solid ${T.line}` }}>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer ${
            tab === 'preview'
              ? 'border-indigo-500 text-indigo-700 bg-indigo-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
        <button
          type="button"
          onClick={() => setTab('articles')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer ${
            tab === 'articles'
              ? 'border-indigo-500 text-indigo-700 bg-indigo-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Newspaper className="h-3.5 w-3.5" />
          Articles ({articles.length})
        </button>

        {tab === 'preview' && (
          <button
            type="button"
            onClick={() => setShowRaw(v => !v)}
            className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer pb-2"
          >
            {showRaw ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {showRaw ? 'Rendered' : 'Raw HTML'}
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 p-4 overflow-hidden">
        {tab === 'preview' && (
          showRaw ? (
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
          )
        )}

        {tab === 'articles' && (
          <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden space-y-2">
            {articles.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <FileText className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">No articles attached to this issue.</p>
              </div>
            )}
            {articles.map((article, i) => (
              <div key={i} className="rounded-lg border border-slate-100 p-3 bg-white hover:border-slate-200 transition-colors">
                <p className="text-sm font-medium text-slate-700 truncate">{article.title || 'Untitled'}</p>
                {(article.source || article.url) && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{article.source || article.url}</p>
                )}
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-500 hover:text-indigo-700 truncate block mt-1"
                  >
                    {article.url}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function NewsletterIssuePanel({ issue, open, onClose, onApprove, onSend, idToken, api }: Props) {
  const [visible, setVisible] = useState(false);
  const [localIssue, setLocalIssue] = useState<NewsletterIssueRow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (issue) setLocalIssue(issue);
  }, [issue]);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open || !localIssue) return null;

  const handle = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

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
          width: 'min(1040px, 100vw)',
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
          className="shrink-0 flex items-center gap-4 px-6 py-4"
          style={{
            borderBottom: `1px solid ${T.line}`,
            background: 'linear-gradient(180deg, #F3EEFC 0%, #FFFFFF 100%)',
          }}
        >
          <StatusBadge status={localIssue.status} />
          <h2 className="min-w-0 flex-1 truncate" style={{ fontSize: 16, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', margin: 0 }}>
            {localIssue.subject || '(untitled issue)'}
          </h2>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {localIssue.status === 'pending_approval' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handle(() => onApprove(localIssue.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                <Check className="h-4 w-4" /> Approve
              </button>
            )}
            {localIssue.status === 'approved' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handle(() => onSend(localIssue.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-4 w-4" /> Send now
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Two-panel body */}
        <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <EditPane
            issue={localIssue}
            idToken={idToken}
            api={api}
            onUpdated={patch => setLocalIssue(prev => prev ? { ...prev, ...patch } : prev)}
          />
          <RightPane issue={localIssue} />
        </div>
      </div>
    </div>
  );
}
