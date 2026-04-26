import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { BackendApi, AppSession } from '@/services/backendApi';
import type { SheetRow } from '@/services/sheets';
import type { NewsletterRecord, NewsletterIssueRow } from '../../schema/newsletterTypes';
import { NewsletterListView } from './NewsletterListView';
import { NewsletterDashboard } from './NewsletterDashboard';
import NewsletterCalendarView, { type CalendarIssueEvent } from './NewsletterCalendarView';
import { NewsletterWizard } from './NewsletterWizard';
import { NewsletterConfigDrawer } from './NewsletterConfigDrawer';
import { NewsletterIssuePanel } from './NewsletterIssuePanel';

interface Props {
  idToken: string;
  session: AppSession;
  api: BackendApi;
  onAuthExpired: () => void;
}

export function NewsletterTab({ idToken, session, api }: Props) {
  const [newsletters, setNewsletters] = useState<NewsletterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [subView, setSubView] = useState<'list' | 'calendar'>('list');
  const [activeNewsletterId, setActiveNewsletterId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [configDrawerNewsletterId, setConfigDrawerNewsletterId] = useState<string | null>(null);
  const [allIssues, setAllIssues] = useState<CalendarIssueEvent[]>([]);
  const [topicRows, setTopicRows] = useState<SheetRow[]>([]);
  const [calendarSelectedIssue, setCalendarSelectedIssue] = useState<NewsletterIssueRow | null>(null);
  const [calendarDrawerOpen, setCalendarDrawerOpen] = useState(false);

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
              newsletterIndex: idx,
              newsletterName: n.name,
              issue,
            }))
          )
        )
      );
      setAllIssues(issueArrays.flat());
    } catch {
      // ignore calendar load errors
    }
  };

  const activeNewsletter = newsletters.find(n => n.id === activeNewsletterId) ?? null;
  const configDrawerNewsletter = newsletters.find(n => n.id === configDrawerNewsletterId) ?? null;

  const handleNewsletterCreated = (newsletter: NewsletterRecord) => {
    setNewsletters(prev => [...prev, newsletter]);
    setWizardOpen(false);
    void loadAllIssues([...newsletters, newsletter]);
  };

  const handleNewsletterUpdated = (updated: NewsletterRecord) => {
    setNewsletters(prev => prev.map(n => n.id === updated.id ? updated : n));
  };

  const handleNewsletterToggleActive = async (id: string, active: boolean) => {
    try {
      await api.updateNewsletter(idToken, id, { active });
      setNewsletters(prev => prev.map(n => n.id === id ? { ...n, active } : n));
    } catch (err) {
      console.error('Failed to toggle newsletter:', err);
    }
  };

  const handleNewsletterDelete = async (id: string) => {
    try {
      await api.deleteNewsletter(idToken, id);
      setNewsletters(prev => prev.filter(n => n.id !== id));
      if (activeNewsletterId === id) setActiveNewsletterId(null);
    } catch (err) {
      console.error('Failed to delete newsletter:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (activeNewsletter) {
    return (
      <>
        <NewsletterDashboard
          newsletter={activeNewsletter}
          api={api}
          idToken={idToken}
          onBack={() => setActiveNewsletterId(null)}
          onOpenConfig={(id) => setConfigDrawerNewsletterId(id)}
          onUpdated={handleNewsletterUpdated}
        />
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
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pill toggle */}
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

      {subView === 'list' && (
        <NewsletterListView
          newsletters={newsletters}
          loading={false}
          onViewIssues={(id) => setActiveNewsletterId(id)}
          onConfig={(id) => setConfigDrawerNewsletterId(id)}
          onToggleActive={handleNewsletterToggleActive}
          onDelete={handleNewsletterDelete}
          onCreateNew={() => setWizardOpen(true)}
        />
      )}

      {subView === 'calendar' && (
        <>
          <NewsletterCalendarView
            newsletters={newsletters}
            issueEvents={allIssues}
            topicRows={topicRows}
            onIssueClick={(issue: NewsletterIssueRow) => {
              setCalendarSelectedIssue(issue);
              setCalendarDrawerOpen(true);
            }}
          />
          <NewsletterIssuePanel
            issue={calendarSelectedIssue}
            open={calendarDrawerOpen}
            onClose={() => setCalendarDrawerOpen(false)}
            onApprove={async (issueId) => {
              await api.approveNewsletterIssue(idToken, issueId);
              setCalendarDrawerOpen(false);
              void loadAllIssues(newsletters);
            }}
            onSend={async (issueId) => {
              await api.sendNewsletterIssue(idToken, issueId);
              setCalendarDrawerOpen(false);
              void loadAllIssues(newsletters);
            }}
            idToken={idToken}
            api={api}
          />
        </>
      )}

      {/* Wizard modal */}
      {wizardOpen && (
        <NewsletterWizard
          session={session}
          api={api}
          idToken={idToken}
          onCreated={handleNewsletterCreated}
          onClose={() => setWizardOpen(false)}
        />
      )}

      {/* Config drawer for list view */}
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
  );
}
