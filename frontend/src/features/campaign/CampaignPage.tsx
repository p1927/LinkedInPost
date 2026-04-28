import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Carousel, CarouselContent } from '@/components/ui/carousel';
import { useAlert } from '@/components/useAlert';
import { useWorkspaceChrome } from '@/components/workspace/WorkspaceChromeContext';
import { type AppSession, type BackendApi, isAuthErrorMessage } from '@/services/backendApi';
import { type BotConfig, type BotConfigUpdate } from '@/services/configService';
import { CHANNEL_OPTIONS, type ChannelId } from '@/integrations/channels';
import { normalizePostTime } from '@/features/content-schedule-calendar/adapters/campaignPostAdapter';
import { ContentScheduleCalendar, campaignPostsToCalendarTopics, applyCalendarPatchToPost } from '@/features/content-schedule-calendar';
import type { CalendarTopic, TopicScheduleChange } from '@/features/content-schedule-calendar';
import { buildCampaignClaudePrompt } from './prompt/defaultPrompt';
import { parseCampaignPaste, campaignPostToImportPayload } from './validate/parseCampaignDoc';
import { CampaignPostList } from './views/CampaignPostList';
import { CampaignPreviewToolbar } from './views/CampaignPreviewToolbar';
import type { CampaignPostV1, CampaignDiagnostic, ParseCampaignResult } from './schema/types';
import { NewsletterTab } from './components/newsletter/NewsletterTab';
import clsx from 'clsx';
import { Copy, LayoutList, CalendarDays, Loader2, ArrowRight, Mail } from 'lucide-react';

type CampaignTab = 'bulk' | 'newsletter';

type PreviewTab = 'list' | 'calendar';

type ImportMode = 'generate' | 'upload' | 'paste';

const CAMPAIGN_STEPS = [
  { id: 'import', label: 'Import', name: 'Import Campaign JSON' },
  { id: 'preview', label: 'Preview', name: 'Preview & Publish' },
];

function JsonPasteEditor({
  pasteText,
  setPasteText,
  errorLines,
  diagnostics,
  parseResult,
  onNext,
}: {
  pasteText: string;
  setPasteText: (v: string) => void;
  errorLines: ReadonlySet<number>;
  diagnostics: CampaignDiagnostic[];
  parseResult: ParseCampaignResult;
  onNext: () => void;
}) {
  return (
    <>
      <div className="flex flex-1 gap-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50">
        <div
          className="hidden w-10 shrink-0 select-none border-r border-slate-200 bg-slate-100/60 py-2 text-right font-mono text-[10px] leading-5 text-slate-400 sm:block"
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
          className="min-h-[14rem] flex-1 resize-y border-0 bg-transparent font-mono text-xs leading-5 shadow-none focus-visible:ring-0 md:min-h-[24rem]"
          spellCheck={false}
          aria-label="Campaign JSON"
        />
      </div>

      {diagnostics.length > 0 ? (
        <ul role="alert" className="mt-3 list-none space-y-1.5 rounded-xl border border-rose-200/80 bg-rose-50/90 p-3 text-xs text-rose-950">
          {diagnostics.map((d, i) => (
            <li key={i}>
              <span className="font-mono font-semibold">Line {d.line}:{d.column}</span>{' '}
              {d.message}
            </li>
          ))}
        </ul>
      ) : pasteText.trim() ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700" role="status">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Document looks valid
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          disabled={!parseResult.ok}
          onClick={onNext}
          className={clsx(
            'flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white',
            'transition-colors duration-150 hover:bg-indigo-700',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
            'disabled:cursor-not-allowed disabled:bg-indigo-300 cursor-pointer',
          )}
        >
          Preview &amp; Publish
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        {!parseResult.ok && pasteText.trim() && (
          <p className="text-xs text-slate-400">Fix JSON errors above to continue.</p>
        )}
      </div>
    </>
  );
}

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
  const DRAFT_KEY = 'campaign_bulk_draft';
  const [topicsIdeas, setTopicsIdeas] = useState('');
  const [pasteText, setPasteText] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY) ?? ''; } catch { return ''; }
  });

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, pasteText); } catch { /* quota exceeded */ }
  }, [pasteText]);
  const [importMode, setImportMode] = useState<ImportMode>('generate');
  const [previewTab, setPreviewTab] = useState<PreviewTab>('calendar');
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [campaignTab, setCampaignTab] = useState<CampaignTab>('bulk');
  const pageTopRef = useRef<HTMLDivElement>(null);

  const promptText = useMemo(() => buildCampaignClaudePrompt(topicsIdeas), [topicsIdeas]);
  const parseResult = useMemo(() => parseCampaignPaste(pasteText), [pasteText]);

  const [editedPosts, setEditedPosts] = useState<CampaignPostV1[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkTime, setBulkTime] = useState('');
  const [channelsDialogOpen, setChannelsDialogOpen] = useState(false);
  const [bulkChannels, setBulkChannels] = useState<Set<ChannelId>>(new Set());

  useEffect(() => {
    if (parseResult.ok) {
      setEditedPosts(parseResult.doc.posts.map((p) => ({ ...p, _rowId: crypto.randomUUID() })));
      setSelectedIndices(new Set());
    }
  }, [parseResult]);

  const selectedTopicIds = useMemo(() => {
    const s = new Set<string>();
    selectedIndices.forEach((i) => s.add(String(i)));
    return s;
  }, [selectedIndices]);

  const selectedCount = selectedIndices.size;

  const toggleSelect = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const toggleSelectByTopicId = useCallback((id: string) => {
    const idx = parseInt(id, 10);
    if (!Number.isNaN(idx)) toggleSelect(idx);
  }, [toggleSelect]);

  const selectAllPosts = useCallback(() => {
    setSelectedIndices(new Set(editedPosts.map((_, i) => i)));
  }, [editedPosts]);

  const clearSelection = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const deletePostAt = useCallback((index: number) => {
    setEditedPosts((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndices((prev) => {
      const next = new Set<number>();
      for (const j of prev) {
        if (j === index) continue;
        next.add(j > index ? j - 1 : j);
      }
      return next;
    });
  }, []);

  const updatePostAt = useCallback((index: number, patch: Partial<CampaignPostV1>) => {
    setEditedPosts((prev) => prev.map((p, i) => i === index ? { ...p, ...patch } : p));
  }, []);

  const draftAllPosts = useCallback(() => {
    setEditedPosts((prev) => prev.map((p) => ({ ...p, status: 'draft' })));
  }, []);

  const deleteAllPosts = useCallback(() => {
    if (editedPosts.length === 0) return;
    if (!window.confirm(`Remove all ${editedPosts.length} post(s) from this preview?`)) return;
    setEditedPosts([]);
    setSelectedIndices(new Set());
  }, [editedPosts.length]);

  const openBulkSchedule = useCallback(() => {
    if (selectedIndices.size === 0) return;
    const idx = Math.min(...selectedIndices);
    const p = editedPosts[idx];
    setBulkDate(p?.date ?? '');
    setBulkTime(normalizePostTime(p?.postTime) ?? '09:00');
    setScheduleDialogOpen(true);
  }, [editedPosts, selectedIndices]);

  const applyBulkSchedule = useCallback(() => {
    if (selectedIndices.size === 0) return;
    setEditedPosts((prev) => {
      const next = [...prev];
      for (const i of selectedIndices) {
        if (next[i]) {
          next[i] = {
            ...next[i]!,
            date: bulkDate,
            postTime: bulkTime.trim() || undefined,
          };
        }
      }
      return next;
    });
    setScheduleDialogOpen(false);
  }, [bulkDate, bulkTime, selectedIndices]);

  const openBulkChannels = useCallback(() => {
    if (selectedIndices.size === 0) return;
    const idx = Math.min(...selectedIndices);
    const ch = editedPosts[idx]?.channels ?? [];
    setBulkChannels(new Set(ch));
    setChannelsDialogOpen(true);
  }, [editedPosts, selectedIndices]);

  const toggleBulkChannel = useCallback((c: ChannelId) => {
    setBulkChannels((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  const applyBulkChannels = useCallback(() => {
    if (selectedIndices.size === 0) return;
    const channels = bulkChannels.size > 0 ? [...bulkChannels] : undefined;
    setEditedPosts((prev) => {
      const next = [...prev];
      for (const i of selectedIndices) {
        if (next[i]) next[i] = { ...next[i]!, channels };
      }
      return next;
    });
    setChannelsDialogOpen(false);
  }, [bulkChannels, selectedIndices]);

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

  const handleTopicDelete = useCallback((id: string) => {
    const idx = parseInt(id, 10);
    if (Number.isNaN(idx)) return;
    deletePostAt(idx);
  }, [deletePostAt]);

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
    if (editedPosts.length === 0) {
      void showAlert({
        title: 'No posts',
        description: 'Add at least one post in your campaign JSON, or undo deletions.',
      });
      return;
    }
    if (!session.config.spreadsheetId) {
      void showAlert({
        title: 'Spreadsheet required',
        description: 'Configure a spreadsheet in Settings before importing.',
      });
      return;
    }
    setSubmitting(true);
    try {
      const posts = editedPosts.map(campaignPostToImportPayload);
      const res = await api.bulkImportCampaign(idToken, posts);
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
  }, [
    api,
    editedPosts,
    idToken,
    onAuthExpired,
    onRefreshQueue,
    parseResult.ok,
    session.config.spreadsheetId,
    showAlert,
  ]);

  const handleStepChange = useCallback((step: number) => {
    // Step 1 (Preview) requires valid JSON
    if (step === 1 && !parseResult.ok) return;
    setCurrentStep(step);
    pageTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [parseResult.ok]);

  const diagnostics = parseResult.ok ? [] : parseResult.diagnostics;
  const errorLines = new Set(diagnostics.map((d) => d.line));

  return (
    <div className="w-full px-0 py-4 sm:py-6" ref={pageTopRef}>
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {/* Campaign tab switcher */}
        <div className="flex gap-1 border-b border-slate-200 mb-5">
          <button
            type="button"
            onClick={() => setCampaignTab('bulk')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer',
              campaignTab === 'bulk'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            Bulk Posts
          </button>
          <button
            type="button"
            onClick={() => setCampaignTab('newsletter')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer',
              campaignTab === 'newsletter'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <Mail className="h-4 w-4" />
            Newsletter
          </button>
        </div>

        {/* Newsletter tab */}
        {campaignTab === 'newsletter' ? (
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <NewsletterTab
              idToken={idToken}
              session={session}
              api={api}
              onAuthExpired={onAuthExpired}
            />
          </div>
        ) : (
          <>
            {/* Carousel step nav — page title lives in workspace header */}
            <Carousel
              steps={CAMPAIGN_STEPS}
              currentStep={currentStep}
              onStepChange={handleStepChange}
              disabledSteps={parseResult.ok ? [] : [1]}
              className="mb-5"
            />
          </>
        )}
      </div>

      {/* Animated step content */}
      {campaignTab === 'bulk' && (
        <>
        <CarouselContent currentStep={currentStep}>
          {/* Step 0: Import — three modes */}
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="flex flex-col gap-5">

            {/* Mode switcher tabs */}
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1 w-fit">
              {([
                { id: 'generate', label: 'Generate with Claude' },
                { id: 'upload',   label: 'Upload file' },
                { id: 'paste',    label: 'Paste JSON' },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setImportMode(id)}
                  className={clsx(
                    'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                    importMode === id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Generate mode ─────────────────────────────────────── */}
            {importMode === 'generate' && (
              <>
              {/* Section 1: Topic ideas */}
              <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">1</span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Topic ideas</h3>
                    <p className="text-xs text-slate-500">One theme per line — woven into the prompt below.</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <Textarea
                    value={topicsIdeas}
                    onChange={(e) => setTopicsIdeas(e.target.value)}
                    placeholder={'e.g. Q2 product launch\nHiring update\nCustomer story: Acme Corp'}
                    className="flex-1 resize-none font-sans text-sm md:min-h-[8rem]"
                    aria-label="Topic ideas for campaign prompt"
                  />
                </div>
              </section>

              {/* Section 2: Claude prompt */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">2</span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Claude prompt</h3>
                    <p className="text-xs text-slate-500">Copy into Claude, or expand to preview the full prompt.</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => void copyPrompt()}
                      className={clsx(
                        'flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-600',
                        'transition-colors duration-150 hover:bg-indigo-100 cursor-pointer',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                      )}
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                      Copy Claude prompt
                    </button>
                    <details className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                        Preview prompt
                      </summary>
                      <pre className="custom-scrollbar mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-500">
                        {promptText}
                      </pre>
                    </details>
                  </div>
                </div>
              </section>

              {/* Section 3: paste response */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">3</span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Paste Claude's response</h3>
                    <p className="text-xs text-slate-500">Paste the JSON returned by Claude here.</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <JsonPasteEditor pasteText={pasteText} setPasteText={setPasteText} errorLines={errorLines} diagnostics={diagnostics} parseResult={parseResult} onNext={() => handleStepChange(1)} />
                </div>
              </section>
              </>
            )}

            {/* ── Upload mode ────────────────────────────────────────── */}
            {importMode === 'upload' && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Upload JSON or CSV</h3>
                    <p className="text-xs text-slate-500">CSV: columns topic, date, channels (comma-separated), body. JSON: same schema as the Generate mode.</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5 gap-4">
                  <label
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 py-14 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                  >
                    <input
                      type="file"
                      accept=".json,.jsonc,.csv"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const text = ev.target?.result as string;
                          if (file.name.endsWith('.csv')) {
                            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                            const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase()) ?? [];
                            const posts = lines.slice(1).map(line => {
                              const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                              const obj: Record<string, string> = {};
                              headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
                              return {
                                topic: obj['topic'] ?? '',
                                date: obj['date'] ?? '',
                                channels: obj['channels'] ? obj['channels'].split('|').map(s => s.trim()) : [],
                                body: obj['body'] ?? '',
                              };
                            }).filter(p => p.topic);
                            setPasteText(JSON.stringify({ version: 1, posts }, null, 2));
                          } else {
                            setPasteText(text);
                          }
                          setImportMode('paste');
                        };
                        reader.readAsText(file);
                      }}
                    />
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                      <ArrowRight className="h-5 w-5 text-indigo-600 -rotate-90" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700">Drop a file or click to browse</p>
                      <p className="text-xs text-slate-400 mt-0.5">.json, .jsonc, .csv</p>
                    </div>
                  </label>
                  <a
                    href="data:text/csv;charset=utf-8,topic%2Cdate%2Cchannels%2Cbody%0AExample+topic%2C2025-02-01%2Clinkedin%2CSample+body+text"
                    download="campaign-template.csv"
                    className="self-start text-xs text-indigo-600 hover:underline"
                  >
                    Download CSV template
                  </a>
                </div>
              </section>
            )}

            {/* ── Paste mode ─────────────────────────────────────────── */}
            {importMode === 'paste' && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Paste campaign JSON</h3>
                    <p className="text-xs text-slate-500">JSON or JSONC (comments and trailing commas allowed).</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <JsonPasteEditor pasteText={pasteText} setPasteText={setPasteText} errorLines={errorLines} diagnostics={diagnostics} parseResult={parseResult} onNext={() => handleStepChange(1)} />
                </div>
              </section>
            )}

          </div>
        </div>

        {/* Step 1: Preview & Publish */}
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* Card header: tab switcher + post count */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
              <div className="flex items-center gap-2">
                {parseResult.ok ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    {editedPosts.length} post{editedPosts.length !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Fix JSON to see preview</span>
                )}
              </div>
              <div role="tablist" aria-label="Preview view mode" className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewTab === 'list'}
                  onClick={() => setPreviewTab('list')}
                  className={clsx(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600',
                    previewTab === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800',
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
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600',
                    previewTab === 'calendar' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  Calendar
                </button>
              </div>
            </div>

            {/* Toolbar */}
            {parseResult.ok && (
              <div className="border-b border-slate-100 px-5 py-3">
                <CampaignPreviewToolbar
                  postCount={editedPosts.length}
                  selectedCount={selectedCount}
                  onSelectAll={selectAllPosts}
                  onClearSelection={clearSelection}
                  onDraftAll={draftAllPosts}
                  onDeleteAll={deleteAllPosts}
                  onOpenSetSchedule={openBulkSchedule}
                  onOpenSetChannels={openBulkChannels}
                />
              </div>
            )}

            {/* Preview content */}
            <div className="p-4 sm:p-5">
              {parseResult.ok ? (
                previewTab === 'list' ? (
                  <div className="overflow-x-auto">
                  <CampaignPostList
                    posts={editedPosts}
                    selectedIndices={selectedIndices}
                    onToggleSelect={toggleSelect}
                    onDeletePost={deletePostAt}
                    onUpdatePost={updatePostAt}
                  />
                  </div>
                ) : (
                  <ContentScheduleCalendar
                    topics={calendarTopics}
                    onTopicPatch={handleTopicPatch}
                    onTopicScheduleChange={handleTopicScheduleChange}
                    onTopicDelete={handleTopicDelete}
                    selectedTopicIds={selectedTopicIds}
                    onTopicSelectionToggle={toggleSelectByTopicId}
                    initialView="month-grid"
                    className="csc-compact"
                  />
                )
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-400">No preview yet — go back and paste valid JSON.</p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => handleStepChange(0)}
                className={clsx(
                  'rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700',
                  'transition-colors duration-150 hover:bg-slate-50 cursor-pointer',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                )}
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={!parseResult.ok || submitting || editedPosts.length === 0}
                onClick={() => void handleCreate()}
                className={clsx(
                  'flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white',
                  'transition-colors duration-150 hover:bg-emerald-700',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600',
                  'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
                )}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Create campaign
              </button>
            </div>
          </div>
        </div>
      </CarouselContent>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Set schedule for selected</DialogTitle>
            <DialogDescription>
              Applies the same date and time to {selectedCount} selected post(s). The calendar updates immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div>
              <label htmlFor="bulk-schedule-date" className="mb-1 block text-xs font-medium text-slate-700">
                Date
              </label>
              <Input
                id="bulk-schedule-date"
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <label htmlFor="bulk-schedule-time" className="mb-1 block text-xs font-medium text-slate-700">
                Time
              </label>
              <Input
                id="bulk-schedule-time"
                type="time"
                value={bulkTime}
                onChange={(e) => setBulkTime(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void applyBulkSchedule()}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={channelsDialogOpen} onOpenChange={setChannelsDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Set channels for selected</DialogTitle>
            <DialogDescription>
              Choose channels for {selectedCount} selected post(s). Uncheck all and apply to clear channels.
            </DialogDescription>
          </DialogHeader>
          <div className="custom-scrollbar flex max-h-64 flex-col gap-2 overflow-y-auto py-1">
            {CHANNEL_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-1 py-1 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={bulkChannels.has(opt.value)}
                  onChange={() => toggleBulkChannel(opt.value)}
                  className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setChannelsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void applyBulkChannels()}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
