import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Carousel, CarouselContent } from '@/components/ui/carousel';
import { useAlert } from '@/components/useAlert';
import { useWorkspaceChrome } from '@/components/workspace/WorkspaceChromeContext';
import { type AppSession, type BackendApi, isAuthErrorMessage } from '@/services/backendApi';
import { type BotConfig, type BotConfigUpdate } from '@/services/configService';
import { buildCampaignClaudePrompt } from './prompt/defaultPrompt';
import { parseCampaignPaste } from './validate/parseCampaignDoc';
import { CampaignPostList } from './views/CampaignPostList';
import { ContentScheduleCalendar, campaignPostsToCalendarTopics, applyCalendarPatchToPost } from '@/features/content-schedule-calendar';
import type { CalendarTopic, TopicScheduleChange } from '@/features/content-schedule-calendar';
import type { CampaignPostV1 } from './schema/types';
import clsx from 'clsx';
import { Copy, LayoutList, CalendarDays, Loader2, ArrowRight } from 'lucide-react';

type PreviewTab = 'list' | 'calendar';

const CAMPAIGN_STEPS = [
  { id: 'import', label: 'Import', name: 'Import Campaign JSON' },
  { id: 'preview', label: 'Preview', name: 'Preview & Publish' },
];

export function CampaignPage(props: {
  idToken: string;
  session: AppSession;
  api: BackendApi;
  onSaveConfig: (config: BotConfigUpdate) => Promise<BotConfig>;
  onAuthExpired: () => void;
}) {
  const { idToken, session, api, onAuthExpired } = props;
  const { showAlert } = useAlert();
  const { onRefreshQueue } = useWorkspaceChrome();
  const [topicsIdeas, setTopicsIdeas] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [previewTab, setPreviewTab] = useState<PreviewTab>('calendar');
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const pageTopRef = useRef<HTMLDivElement>(null);

  const promptText = useMemo(() => buildCampaignClaudePrompt(topicsIdeas), [topicsIdeas]);
  const parseResult = useMemo(() => parseCampaignPaste(pasteText), [pasteText]);

  const [editedPosts, setEditedPosts] = useState<CampaignPostV1[]>([]);

  useEffect(() => {
    if (parseResult.ok) setEditedPosts(parseResult.doc.posts);
  }, [parseResult]);

  const calendarTopics = useMemo(
    () => campaignPostsToCalendarTopics(editedPosts),
    [editedPosts],
  );

  const handleTopicPatch = useCallback((id: string, patch: Partial<CalendarTopic>) => {
    const idx = parseInt(id, 10);
    if (isNaN(idx)) return;
    setEditedPosts((prev) => {
      const next = [...prev];
      if (!next[idx]) return prev;
      next[idx] = applyCalendarPatchToPost(next[idx]!, patch);
      return next;
    });
  }, []);

  const handleTopicScheduleChange = useCallback((change: TopicScheduleChange) => {
    const idx = parseInt(change.id, 10);
    if (isNaN(idx)) return;
    setEditedPosts((prev) => {
      const next = [...prev];
      if (!next[idx]) return prev;
      next[idx] = {
        ...next[idx]!,
        date: change.newDate,
        ...(change.newStartTime !== undefined ? { postTime: change.newStartTime } : {}),
      };
      return next;
    });
  }, []);

  const copyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      void showAlert({ title: 'Copied', description: 'Prompt copied to clipboard.' });
    } catch {
      void showAlert({ title: 'Copy failed', description: 'Could not access the clipboard.' });
    }
  }, [promptText, showAlert]);

  const handleCreate = useCallback(async () => {
    if (!parseResult.ok) return;
    if (!session.config.spreadsheetId) {
      void showAlert({
        title: 'Spreadsheet required',
        description: 'Configure a spreadsheet in Settings before importing.',
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.bulkImportCampaign(idToken, parseResult.payloadPosts);
      void showAlert({
        title: 'Campaign imported',
        description: `Added ${res.imported} topic(s) with draft rows.`,
      });
      onRefreshQueue?.();
      setPasteText('');
      setCurrentStep(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed.';
      if (isAuthErrorMessage(msg)) onAuthExpired();
      void showAlert({ title: 'Import failed', description: msg });
    } finally {
      setSubmitting(false);
    }
  }, [api, idToken, onAuthExpired, onRefreshQueue, parseResult, session.config.spreadsheetId, showAlert]);

  const handleStepChange = useCallback((step: number) => {
    // Step 1 (Preview) requires valid JSON
    if (step === 1 && !parseResult.ok) return;
    setCurrentStep(step);
    pageTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [parseResult.ok]);

  const diagnostics = parseResult.ok ? [] : parseResult.diagnostics;
  const errorLines = new Set(diagnostics.map((d) => d.line));

  return (
    <div className="w-full px-0 py-8 sm:py-12" ref={pageTopRef}>
      <div className="mx-auto max-w-5xl px-4 sm:px-8">
        <div className="mb-8 text-center">
          <h2 className="font-heading text-2xl font-semibold text-slate-900 sm:text-3xl">Campaign Import</h2>
          <p className="mt-2 max-w-2xl mx-auto text-sm text-muted">
            Build a prompt with your topic ideas, paste it into Claude, then paste the JSON back here. We validate the
            document, preview posts, and create Topics plus Draft rows in one request.
          </p>
        </div>

        {/* Carousel step nav */}
        <Carousel
          steps={CAMPAIGN_STEPS}
          currentStep={currentStep}
          onStepChange={handleStepChange}
          disabledSteps={parseResult.ok ? [] : [1]}
          className="mb-6"
        />
      </div>

      {/* Animated step content */}
      <CarouselContent currentStep={currentStep}>
        {/* Step 0: Import Campaign JSON */}
        <div className="mx-auto max-w-5xl px-4 sm:px-8">
          <div className="space-y-8">
            <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm sm:p-8">
              <h3 className="font-heading text-base font-semibold text-slate-900">1. Topic ideas</h3>
              <p className="mt-1 text-sm text-muted">Injected into the prompt below (one theme per line is fine).</p>
              <Textarea
                value={topicsIdeas}
                onChange={(e) => setTopicsIdeas(e.target.value)}
                placeholder="e.g. Q2 product launch&#10;Hiring update&#10;Customer story: Acme Corp"
                className="mt-3 min-h-[5rem] font-sans text-sm"
                aria-label="Topic ideas for campaign prompt"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyPrompt()}
                  className={clsx(
                    'flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600',
                    'transition-colors duration-200 hover:bg-indigo-50',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                  )}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Copy Claude prompt
                </button>
              </div>
              <details className="mt-4 rounded-xl border border-indigo-200 bg-white/60 p-3 text-xs backdrop-blur-sm">
                <summary className="cursor-pointer font-semibold text-slate-900">Preview full prompt</summary>
                <pre className="custom-scrollbar mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted">
                  {promptText}
                </pre>
              </details>
            </section>

            <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm sm:p-8">
              <h3 className="font-heading text-base font-semibold text-slate-900">2. Paste campaign JSON</h3>
              <p className="mt-1 text-sm text-muted">JSON or JSONC (comments and trailing commas allowed).</p>
              <div className="mt-3 flex gap-0 overflow-hidden rounded-xl border border-indigo-200 bg-white/70">
                <div
                  className="hidden w-10 shrink-0 select-none border-r border-indigo-100 bg-indigo-50/80 py-2 text-right font-mono text-[10px] leading-5 text-muted sm:block"
                  aria-hidden
                >
                  {pasteText.split('\n').map((_, i) => (
                    <div
                      key={i}
                      className={clsx('pr-1', errorLines.has(i + 1) && 'bg-rose-200/80 font-semibold text-rose-950')}
                    >
                      {i + 1}
                    </div>
                  ))}
                  {pasteText === '' ? <div className="pr-1">1</div> : null}
                </div>
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder='{ "version": 1, "posts": [ … ] }'
                  className="min-h-[14rem] flex-1 resize-y border-0 bg-transparent font-mono text-xs leading-5 shadow-none focus-visible:ring-0 sm:min-h-[18rem]"
                  spellCheck={false}
                  aria-label="Campaign JSON"
                />
              </div>

              {diagnostics.length > 0 ? (
                <ul role="alert" className="mt-3 list-none space-y-1.5 rounded-xl border border-rose-200/80 bg-rose-50/90 p-3 text-xs text-rose-950">
                  {diagnostics.map((d, i) => (
                    <li key={i}>
                      <span className="font-mono font-semibold">
                        Line {d.line}:{d.column}
                      </span>{' '}
                      {d.message}
                    </li>
                  ))}
                </ul>
              ) : pasteText.trim() ? (
                <p className="mt-3 text-xs font-medium text-emerald-700" role="status">Document looks valid.</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!parseResult.ok}
                  onClick={() => handleStepChange(1)}
                  className={clsx(
                    'flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white',
                    'transition-colors duration-200 hover:bg-indigo-700',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                    'disabled:cursor-not-allowed disabled:bg-indigo-300',
                  )}
                >
                  Next: Preview &amp; Publish
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* Step 1: Preview & Publish */}
        <div className="w-full px-4 sm:px-8">
          <div className="space-y-5">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-heading text-base font-semibold text-slate-900">Preview &amp; Publish</h3>
                  {parseResult.ok ? (
                    <p className="mt-0.5 text-sm text-muted">{editedPosts.length} post(s) ready to import.</p>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted">Fix JSON issues to see preview.</p>
                  )}
                </div>
                <div role="tablist" aria-label="Preview view mode" className="flex rounded-lg border border-indigo-200 bg-white/60 p-0.5">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={previewTab === 'list'}
                    onClick={() => setPreviewTab('list')}
                    className={clsx(
                      'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors duration-200 cursor-pointer',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600',
                      previewTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-muted hover:text-slate-900',
                    )}
                  >
                    <LayoutList className="h-3.5 w-3.5" aria-hidden />
                    List
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={previewTab === 'calendar'}
                    onClick={() => setPreviewTab('calendar')}
                    className={clsx(
                      'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors duration-200 cursor-pointer',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600',
                      previewTab === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-muted hover:text-slate-900',
                    )}
                  >
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    Calendar
                  </button>
                </div>
              </div>

              <div className="mt-4 min-h-[16rem]">
                {parseResult.ok ? (
                  previewTab === 'list' ? (
                    <CampaignPostList posts={editedPosts} />
                  ) : (
                    <ContentScheduleCalendar
                      topics={calendarTopics}
                      onTopicPatch={handleTopicPatch}
                      onTopicScheduleChange={handleTopicScheduleChange}
                      initialView="month-grid"
                      className="csc-compact"
                    />
                  )
                ) : (
                  <p className="text-sm text-muted">No preview yet.</p>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-indigo-100 pt-5">
                <button
                  type="button"
                  onClick={() => handleStepChange(0)}
                  className={clsx(
                    'rounded-xl border border-indigo-200 px-5 py-2.5 text-sm font-semibold text-indigo-600',
                    'transition-colors duration-200 hover:bg-indigo-50',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                  )}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!parseResult.ok || submitting}
                  onClick={() => void handleCreate()}
                  className={clsx(
                    'flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white',
                    'transition-colors duration-200 hover:bg-emerald-600',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500',
                    'disabled:cursor-not-allowed disabled:bg-emerald-300',
                  )}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Create campaign in sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      </CarouselContent>
    </div>
  );
}
