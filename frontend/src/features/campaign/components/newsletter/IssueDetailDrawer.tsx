import { useState, useEffect, useRef } from 'react';
import type { NewsletterIssueRow } from '../../schema/newsletterTypes';
import type { BackendApi } from '@/services/backendApi';
import { Loader2, X, Check, Send, Eye, EyeOff, GripVertical } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  issue: NewsletterIssueRow | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  onApprove: (issueId: string) => void;
  onSend: (issueId: string) => void;
  idToken: string;
  api: BackendApi;
}

export function IssueDetailDrawer({ issue, open, onClose, onSave, onApprove, onSend, idToken, api }: Props) {
  const [showRawHtml, setShowRawHtml] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (issue) {
      setHtmlContent(issue.rendered_content || '');
      setSubject(issue.subject || '');
    }
  }, [issue]);

  // Write HTML into iframe when content changes
  useEffect(() => {
    if (!showRawHtml && iframeRef.current && htmlContent) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
      }
    }
  }, [htmlContent, showRawHtml]);

  if (!open || !issue) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      void onSave();
    } finally {
      setSaving(false);
    }
  };

  const articles = (() => {
    try {
      return JSON.parse(issue.articles_json || '[]') as Array<{ title?: string; url?: string; source?: string }>;
    } catch {
      return [];
    }
  })();

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Issue Details</h2>
            <p className="text-xs text-slate-400 mt-0.5">{issue.issue_date} — {issue.id.slice(0, 8)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Status + quick actions */}
          <div className="flex items-center justify-between">
            <span className={clsx(
              'px-3 py-1 rounded-full text-sm font-medium',
              issue.status === 'pending_approval' && 'bg-amber-50 text-amber-600',
              issue.status === 'approved' && 'bg-emerald-50 text-emerald-600',
              issue.status === 'sent' && 'bg-blue-50 text-blue-600',
              issue.status === 'failed' && 'bg-rose-50 text-rose-600',
            )}>
              {issue.status}
            </span>
            <div className="flex gap-2">
              {issue.status === 'pending_approval' && (
                <button
                  type="button"
                  onClick={() => onApprove(issue.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Approve
                </button>
              )}
              {issue.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => onSend(issue.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  <Send className="h-4 w-4" /> Send now
                </button>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm"
            />
          </div>

          {/* Articles */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Articles ({articles.length})
            </label>
            <div className="space-y-2">
              {articles.map((article, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-100 p-3">
                  <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                  <span className="size-6 rounded bg-slate-100 text-xs text-slate-500 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{article.title || 'Untitled'}</p>
                    <p className="text-xs text-slate-400 truncate">{article.source || article.url}</p>
                  </div>
                </div>
              ))}
              {articles.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No articles in this issue.</p>
              )}
            </div>
          </div>

          {/* Content preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Content preview</label>
              <button
                type="button"
                onClick={() => setShowRawHtml(v => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {showRawHtml ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {showRawHtml ? 'Preview HTML' : 'Edit raw HTML'}
              </button>
            </div>
            {showRawHtml ? (
              <textarea
                value={htmlContent}
                onChange={e => setHtmlContent(e.target.value)}
                className="w-full h-96 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono resize-none"
              />
            ) : (
              <iframe
                ref={iframeRef}
                className="w-full h-96 rounded-lg border border-slate-200 bg-white"
                sandbox="allow-same-origin"
                title="Newsletter preview"
              />
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </>
  );
}
