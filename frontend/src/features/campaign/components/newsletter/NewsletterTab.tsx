import { useEffect, useState, useMemo } from 'react';
import { Tour } from '@/components/Tour';
import { Loader2, Mail, Plus, X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import type { BackendApi, AppSession } from '@/services/backendApi';
import type { SheetRow } from '@/services/sheets';
import type { NewsletterRecord, NewsletterIssueRow } from '../../schema/newsletterTypes';
import NewsletterCalendarView, { type CalendarIssueEvent } from './NewsletterCalendarView';
import { NewsletterWizard } from './NewsletterWizard';
import { NewsletterConfigDrawer } from './NewsletterConfigDrawer';
import { NewsletterIssuePanel } from './NewsletterIssuePanel';
import { NewsletterSectionCard } from './NewsletterSectionCard';

interface Props {
  idToken: string;
  session: AppSession;
  api: BackendApi;
  onAuthExpired: () => void;
  subView?: 'list' | 'calendar';
  onSubViewChange?: (view: 'list' | 'calendar') => void;
}

export function NewsletterTab({ idToken, session, api, subView: externalSubView, onSubViewChange }: Props) {
  const [newsletters, setNewsletters] = useState<NewsletterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalSubView, setInternalSubView] = useState<'list' | 'calendar'>('list');
  const subView = externalSubView ?? internalSubView;
  const setSubView = (view: 'list' | 'calendar') => {
    if (onSubViewChange) onSubViewChange(view);
    else setInternalSubView(view);
  };
  const [wizardOpen, setWizardOpen] = useState(false);
  const [configDrawerNewsletterId, setConfigDrawerNewsletterId] = useState<string | null>(null);
  const [selectedNewsletter, setSelectedNewsletter] = useState<NewsletterRecord | null>(null);
  const [allIssues, setAllIssues] = useState<CalendarIssueEvent[]>([]);
  const [topicRows, setTopicRows] = useState<SheetRow[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<NewsletterIssueRow | null>(null);
  const [selectedIssueNewsletter, setSelectedIssueNewsletter] = useState<NewsletterRecord | null>(null);
  const [issuePanelOpen, setIssuePanelOpen] = useState(false);
  const [creatingDraftIds, setCreatingDraftIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);

  const showError = (msg: string) => setToast({ kind: 'error', message: msg });
  const showSuccess = (msg: string) => setToast({ kind: 'success', message: msg });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [newsletterList, rows] = await Promise.all([
        api.listNewsletters(idToken),
        api.getRows(idToken),
      ]);
      setNewsletters(newsletterList);
      setTopicRows(rows);
      void loadAllIssues(newsletterList);
    } catch (err) {
      console.error('Failed to load newsletter data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllIssues = async (newsletterList: NewsletterRecord[]) => {
    try {
      const issueArrays = await Promise.all(
        newsletterList.map((n, idx) =>
          api.listNewsletterIssuesByNewsletter(idToken, n.id).then(issues =>
            issues.map(issue => ({
              date: issue.issue_date?.split('T')[0] ?? issue.scheduled_for?.split('T')[0] ?? '',
              newsletterId: n.id,
              newsletterIndex: idx,
              newsletterName: n.name,
              issue,
            }))
          )
        )
      );
      setAllIssues(issueArrays.flat());
    } catch {
      // ignore
    }
  };

  // Group issues by newsletterId for the list view
  const issuesByNewsletterId = useMemo<Record<string, NewsletterIssueRow[]>>(() => {
    const map: Record<string, NewsletterIssueRow[]> = {};
    for (const event of allIssues) {
      if (!map[event.newsletterId]) map[event.newsletterId] = [];
      map[event.newsletterId].push(event.issue);
    }
    return map;
  }, [allIssues]);

  const configDrawerNewsletter = newsletters.find(n => n.id === configDrawerNewsletterId) ?? null;

  const handleNewsletterCreated = (newsletter: NewsletterRecord) => {
    setNewsletters(prev => [...prev, newsletter]);
    setWizardOpen(false);
    void loadAllIssues([...newsletters, newsletter]);
  };

  const handleNewsletterUpdated = (updated: NewsletterRecord) => {
    setNewsletters(prev => prev.map(n => n.id === updated.id ? updated : n));
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await api.updateNewsletter(idToken, id, { active });
      setNewsletters(prev => prev.map(n => n.id === id ? { ...n, active } : n));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to toggle newsletter.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteNewsletter(idToken, id);
      setNewsletters(prev => prev.filter(n => n.id !== id));
      setAllIssues(prev => prev.filter(e => e.newsletterId !== id));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete newsletter.');
    }
  };

  const handleCreateDraft = async (newsletterId: string) => {
    setCreatingDraftIds(prev => new Set(prev).add(newsletterId));
    try {
      const result = await api.createNewsletterDraftByNewsletter(idToken, newsletterId);
      await loadAllIssues(newsletters);
      showSuccess(`Draft created: ${result.subject || 'New issue'}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create draft. Check that you have RSS feeds or news APIs configured.');
    } finally {
      setCreatingDraftIds(prev => {
        const next = new Set(prev);
        next.delete(newsletterId);
        return next;
      });
    }
  };

  const openIssuePanel = (issue: NewsletterIssueRow) => {
    setSelectedIssue(issue);
    const event = allIssues.find(e => e.issue.id === issue.id);
    const nl = event ? newsletters.find(n => n.id === event.newsletterId) ?? null : null;
    setSelectedIssueNewsletter(nl);
    setIssuePanelOpen(true);
  };

  const handleApprove = async (issueId: string) => {
    try {
      await api.approveNewsletterIssue(idToken, issueId);
      void loadAllIssues(newsletters);
      showSuccess('Issue approved.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to approve issue.');
      throw err;
    }
  };

  const handleSend = async (issueId: string) => {
    try {
      await api.sendNewsletterIssue(idToken, issueId);
      setIssuePanelOpen(false);
      void loadAllIssues(newsletters);
      showSuccess('Issue sent.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to send issue.');
      throw err;
    }
  };

  const handleRegenerateIssue = async (issueId: string): Promise<NewsletterIssueRow | null> => {
    try {
      const updated = await api.regenerateNewsletterIssue(idToken, issueId);
      void loadAllIssues(newsletters);
      showSuccess('Issue regenerated.');
      return updated;
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to regenerate issue.');
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // Page mode: render full-page editor when a newsletter is selected
  if (selectedNewsletter) {
    return (
      <NewsletterConfigDrawer
        newsletter={selectedNewsletter}
        session={session}
        api={api}
        idToken={idToken}
        open={true}
        asPage
        onClose={() => setSelectedNewsletter(null)}
        onSaved={(updated) => {
          handleNewsletterUpdated(updated);
          setSelectedNewsletter(updated);
        }}
      />
    );
  }

  return (
    <>
    <Tour
      tourKey="newsletter"
      steps={[
        { title: 'Your newsletters', body: 'Create and manage recurring newsletters here. Each one has its own schedule, audience, and AI editorial voice.' },
        { title: 'Configure before sending', body: 'Click the gear icon on a newsletter to set subject lines, recipients, and tone. A live preview appears on the right so you know what subscribers will see.' },
        { title: 'Schedule issues', body: 'Switch to Calendar view to see upcoming issues by date. Click an issue to approve it, edit it, or send it immediately.' },
      ]}
    />
    <div className="space-y-4">
      {/* Top bar: toggle (only shown when not externally controlled) + create button */}
      <div className="flex items-center justify-between">
        {!externalSubView && (
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {(['list', 'calendar'] as const).map(view => (
              <button
                key={view}
                onClick={() => setSubView(view)}
                className={clsx(
                  'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer',
                  subView === view
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {view === 'list' ? 'Newsletters' : 'Calendar'}
              </button>
            ))}
          </div>
        )}

        {subView === 'list' && (
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New Newsletter
          </button>
        )}
      </div>

      {/* Newsletters list — flat, no drill-in */}
      {subView === 'list' && (
        newsletters.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="text-lg font-semibold text-slate-700">No newsletters yet</p>
            <p className="mb-6 text-sm text-slate-500">
              Create your first newsletter to start sending curated content to your audience.
            </p>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 cursor-pointer"
            >
              + Create Newsletter
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {newsletters.map(newsletter => (
              <NewsletterSectionCard
                key={newsletter.id}
                newsletter={newsletter}
                issues={issuesByNewsletterId[newsletter.id] ?? []}
                creatingDraft={creatingDraftIds.has(newsletter.id)}
                onConfig={(id) => {
                  const nl = newsletters.find(n => n.id === id);
                  if (nl) setSelectedNewsletter(nl);
                }}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                onCreateDraft={handleCreateDraft}
                onIssueClick={openIssuePanel}
                onApprove={handleApprove}
                onSend={handleSend}
              />
            ))}
          </div>
        )
      )}

      {/* Calendar view */}
      {subView === 'calendar' && (
        <NewsletterCalendarView
          newsletters={newsletters}
          issueEvents={allIssues}
          topicRows={topicRows}
          onIssueClick={openIssuePanel}
          onCreateIssueAt={handleCreateDraft}
          onUpdateNewsletterTime={async (newsletterId, newTime) => {
            try {
              await api.updateNewsletter(idToken, newsletterId, { scheduleTimes: [newTime] });
              setNewsletters(prev => prev.map(n => {
                if (n.id !== newsletterId) return n;
                return { ...n, config: { ...n.config, scheduleTimes: [newTime] } };
              }));
              showSuccess('Newsletter schedule updated.');
            } catch (err) {
              showError(err instanceof Error ? err.message : 'Failed to update schedule.');
            }
          }}
        />
      )}

      {/* Issue detail panel — shared across list + calendar */}
      <NewsletterIssuePanel
        issue={selectedIssue}
        newsletter={selectedIssueNewsletter ?? undefined}
        open={issuePanelOpen}
        onClose={() => setIssuePanelOpen(false)}
        onApprove={async (issueId) => {
          await handleApprove(issueId);
          setIssuePanelOpen(false);
        }}
        onSend={handleSend}
        onRegenerate={handleRegenerateIssue}
        idToken={idToken}
        api={api}
      />

      {/* Create newsletter wizard */}
      {wizardOpen && (
        <NewsletterWizard
          session={session}
          api={api}
          idToken={idToken}
          onCreated={handleNewsletterCreated}
          onClose={() => setWizardOpen(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-start gap-2 px-4 py-2.5 rounded-xl shadow-lg max-w-md',
            toast.kind === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          )}
          role="status"
        >
          {toast.kind === 'error' && <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Config drawer */}
      {configDrawerNewsletter && (
        <NewsletterConfigDrawer
          newsletter={configDrawerNewsletter}
          session={session}
          api={api}
          idToken={idToken}
          open={true}
          onClose={() => setConfigDrawerNewsletterId(null)}
          onSaved={(updated) => {
            handleNewsletterUpdated(updated);
            setConfigDrawerNewsletterId(null);
          }}
        />
      )}
    </div>
    </>
  );
}
