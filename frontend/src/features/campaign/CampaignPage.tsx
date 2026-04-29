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
import { useAlert } from '@/components/useAlert';
import { useWorkspaceChrome } from '@/components/workspace/WorkspaceChromeContext';
import { type AppSession, type BackendApi, isAuthErrorMessage } from '@/services/backendApi';
import { type BotConfig, type BotConfigUpdate } from '@/services/configService';
import { CHANNEL_OPTIONS, type ChannelId } from '@/integrations/channels';
import { normalizePostTime } from '@/features/content-schedule-calendar/adapters/campaignPostAdapter';
import {
  ContentScheduleCalendar,
  campaignPostsToCalendarTopics,
  applyCalendarPatchToPost,
} from '@/features/content-schedule-calendar';
import type { CalendarTopic, TopicScheduleChange } from '@/features/content-schedule-calendar';
import { buildCampaignClaudePrompt } from './prompt/defaultPrompt';
import { parseCampaignPaste, campaignPostToImportPayload } from './validate/parseCampaignDoc';
import { CampaignPostList } from './views/CampaignPostList';
import { CampaignPreviewToolbar } from './views/CampaignPreviewToolbar';
import type { CampaignPostV1, CampaignDiagnostic, ParseCampaignResult } from './schema/types';
import { NewsletterTab } from './components/newsletter/NewsletterTab';
import clsx from 'clsx';
import {
  Copy,
  LayoutList,
  CalendarDays,
  Loader2,
  ArrowRight,
  Mail,
  Upload,
  Sparkles,
  ClipboardPaste,
  CheckCircle2,
} from 'lucide-react';

type CampaignTab = 'bulk' | 'newsletter';
type PreviewTab = 'list' | 'calendar';
type ImportMethod = 'generate' | 'upload' | 'paste';
type StepDir = 'fwd' | 'bwd';

interface StepDef {
  id: string;
  label: string;
}

const METHOD_STEPS: Record<ImportMethod, StepDef[]> = {
  generate: [
    { id: 'method', label: 'Choose method' },
    { id: 'ideas', label: 'Topic ideas' },
    { id: 'prompt', label: 'Copy prompt' },
    { id: 'paste', label: 'Paste response' },
    { id: 'preview', label: 'Preview & Publish' },
  ],
  upload: [
    { id: 'method', label: 'Choose method' },
    { id: 'upload', label: 'Upload file' },
    { id: 'preview', label: 'Preview & Publish' },
  ],
  paste: [
    { id: 'method', label: 'Choose method' },
    { id: 'paste', label: 'Paste JSON' },
    { id: 'preview', label: 'Preview & Publish' },
  ],
};

const INITIAL_STEPS: StepDef[] = [{ id: 'method', label: 'Choose method' }];

function JsonPasteEditor({
  pasteText,
  setPasteText,
  errorLines,
  diagnostics,
  parseResult,
  onNext,
  onBack,
  nextLabel = 'Preview & Publish',
}: {
  pasteText: string;
  setPasteText: (v: string) => void;
  errorLines: ReadonlySet<number>;
  diagnostics: CampaignDiagnostic[];
  parseResult: ParseCampaignResult;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
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
          className="min-h-[14rem] flex-1 resize-y border-0 bg-transparent font-mono text-xs leading-5 shadow-none focus-visible:ring-0 md:min-h-[20rem]"
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
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
          >
            ← Back
          </button>
        )}
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
          {nextLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        {!parseResult.ok && pasteText.trim() && (
          <p className="text-xs text-slate-400">Fix JSON errors above to continue.</p>
        )}
      </div>
    </>
  );
}

function StepRail({
  steps,
  currentStep,
  onGoTo,
}: {
  steps: StepDef[];
  currentStep: number;
  onGoTo: (idx: number) => void;
}) {
  return (
    <div className="hidden w-52 shrink-0 flex-col border-r border-slate-200 bg-slate-50/60 sm:flex">
      <div className="border-b border-slate-100 px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bulk Post Import</p>
      </div>
      <nav className="flex-1 py-2" aria-label="Import steps">
        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isActive = idx === currentStep;
          const isLocked = idx > currentStep;
          return (
            <button
              key={`${step.id}-${idx}`}
              type="button"
              disabled={isLocked}
              onClick={() => { if (isDone) onGoTo(idx); }}
              className={clsx(
                'flex w-full items-center gap-2.5 border-r-2 px-4 py-2.5 text-left text-[13px] transition-all duration-150',
                isActive && 'border-r-indigo-600 bg-white font-semibold text-indigo-700',
                isDone && 'border-r-transparent font-medium text-emerald-600 hover:bg-white/70 cursor-pointer',
                isLocked && 'border-r-transparent font-medium text-slate-300 cursor-default',
              )}
            >
              <span
                className={clsx(
                  'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
                  isActive && 'border-indigo-600 bg-indigo-600',
                  isDone && 'border-emerald-500 bg-emerald-500',
                  isLocked && 'border-slate-300',
                )}
                aria-hidden
              >
                {isDone ? (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                ) : (
                  <span className={clsx('text-[9px] font-bold leading-none', isActive ? 'text-white' : 'text-slate-300')}>
                    {idx + 1}
                  </span>
                )}
              </span>
              <span className="truncate">{step.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
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
  const pageTopRef = useRef<HTMLDivElement>(null);

  // ── Import content state ──────────────────────────────────────────────────
  const [topicsIdeas, setTopicsIdeas] = useState('');
  const [pasteText, setPasteText] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY) ?? ''; } catch { return ''; }
  });

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, pasteText); } catch { /* quota exceeded */ }
  }, [pasteText]);

  // ── Stepper state ─────────────────────────────────────────────────────────
  const [importMethod, setImportMethod] = useState<ImportMethod | null>(null);
  const [bulkStep, setBulkStep] = useState(0);
  const [contentVisible, setContentVisible] = useState(true);
  const [stepDir, setStepDir] = useState<StepDir>('fwd');

  const steps = useMemo(
    () => (importMethod ? METHOD_STEPS[importMethod] : INITIAL_STEPS),
    [importMethod],
  );

  const goToStep = useCallback((target: number, dir?: StepDir) => {
    const d = dir ?? (target > bulkStep ? 'fwd' : 'bwd');
    setStepDir(d);
    setContentVisible(false);
    pageTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      setBulkStep(target);
      setContentVisible(true);
    }, 120);
  }, [bulkStep]);

  const goNext = useCallback(() => {
    if (bulkStep < steps.length - 1) goToStep(bulkStep + 1, 'fwd');
  }, [bulkStep, steps.length, goToStep]);

  const goBack = useCallback(() => {
    if (bulkStep === 0) return;
    if (bulkStep === 1) {
      setStepDir('bwd');
      setContentVisible(false);
      setTimeout(() => {
        setBulkStep(0);
        setImportMethod(null);
        setContentVisible(true);
      }, 120);
    } else {
      goToStep(bulkStep - 1, 'bwd');
    }
  }, [bulkStep, goToStep]);

  // ── Preview state ─────────────────────────────────────────────────────────
  const [previewTab, setPreviewTab] = useState<PreviewTab>('calendar');
  const [submitting, setSubmitting] = useState(false);
  const [campaignTab, setCampaignTab] = useState<CampaignTab>('bulk');

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

  const clearSelection = useCallback(() => setSelectedIndices(new Set()), []);

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
        if (next[i]) next[i] = { ...next[i]!, date: bulkDate, postTime: bulkTime.trim() || undefined };
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
      if (next.has(c)) next.delete(c); else next.add(c);
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

  const calendarTopics = useMemo(() => campaignPostsToCalendarTopics(editedPosts), [editedPosts]);

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
      void showAlert({ title: 'No posts', description: 'Add at least one post in your campaign JSON, or undo deletions.' });
      return;
    }
    if (!session.config.spreadsheetId) {
      void showAlert({ title: 'Spreadsheet required', description: 'Configure a spreadsheet in Settings before importing.' });
      return;
    }
    setSubmitting(true);
    try {
      const posts = editedPosts.map(campaignPostToImportPayload);
      const res = await api.bulkImportCampaign(idToken, posts);
      void showAlert({ title: 'Campaign imported', description: `Added ${res.imported} topic(s) with draft rows.` });
      onRefreshQueue?.();
      setPasteText('');
      setBulkStep(0);
      setImportMethod(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed.';
      if (isAuthErrorMessage(msg)) onAuthExpired();
      void showAlert({ title: 'Import failed', description: msg });
    } finally {
      setSubmitting(false);
    }
  }, [api, editedPosts, idToken, onAuthExpired, onRefreshQueue, parseResult.ok, session.config.spreadsheetId, showAlert]);

  const diagnostics = parseResult.ok ? [] : parseResult.diagnostics;
  const errorLines = new Set(diagnostics.map((d) => d.line));
  const currentStepId = steps[bulkStep]?.id ?? 'method';

  const handleFileRead = useCallback((text: string, isCsv: boolean) => {
    if (isCsv) {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const headers = lines[0]?.split(',').map((h) => h.trim().toLowerCase()) ?? [];
      const posts = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
        return {
          topic: obj['topic'] ?? '',
          date: obj['date'] ?? '',
          channels: obj['channels'] ? obj['channels'].split('|').map((s) => s.trim()) : [],
          body: obj['body'] ?? '',
        };
      }).filter((p) => p.topic);
      setPasteText(JSON.stringify({ version: 1, posts }, null, 2));
    } else {
      setPasteText(text);
    }
    // advance to preview (step 2 in upload flow)
    setStepDir('fwd');
    setContentVisible(false);
    setTimeout(() => {
      setBulkStep(2);
      setContentVisible(true);
    }, 120);
  }, []);

  return (
    <div className="w-full px-0 py-4 sm:py-6" ref={pageTopRef}>
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {/* Campaign tab switcher */}
        <div className="mb-5 flex gap-1 border-b border-slate-200">
          {([
            { id: 'bulk' as CampaignTab, label: 'Bulk Posts' },
            { id: 'newsletter' as CampaignTab, label: 'Newsletter', icon: <Mail className="h-4 w-4" aria-hidden /> },
          ] as const).map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCampaignTab(id)}
              className={clsx(
                'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors -mb-px cursor-pointer',
                campaignTab === id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              {icon ?? null}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Newsletter tab */}
      {campaignTab === 'newsletter' ? (
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <NewsletterTab idToken={idToken} session={session} api={api} onAuthExpired={onAuthExpired} />
        </div>
      ) : (
        /* Bulk tab — stepper */
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="flex min-h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* Left Rail */}
            <StepRail steps={steps} currentStep={bulkStep} onGoTo={(idx) => goToStep(idx)} />

            {/* Animated Content Panel */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div
                className={clsx(
                  'flex min-h-0 flex-1 flex-col p-5 sm:p-6 transition-all duration-[120ms] ease-out',
                  contentVisible
                    ? 'translate-x-0 opacity-100'
                    : stepDir === 'fwd'
                      ? 'translate-x-3 opacity-0'
                      : '-translate-x-3 opacity-0',
                )}
              >
                {/* ── Step: Choose method ───────────────────────── */}
                {currentStepId === 'method' && (
                  <>
                    <div className="mb-6">
                      <h2 className="text-base font-bold text-slate-900">How would you like to import?</h2>
                      <p className="mt-1 text-xs text-slate-500">Choose a method — each takes just a few focused steps.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {([
                        {
                          id: 'generate' as ImportMethod,
                          icon: <Sparkles />,
                          name: 'Generate with Claude',
                          desc: 'Enter topics, copy a prompt, paste Claude\'s JSON response.',
                        },
                        {
                          id: 'upload' as ImportMethod,
                          icon: <Upload />,
                          name: 'Upload file',
                          desc: 'Import from a .json, .jsonc, or .csv file.',
                        },
                        {
                          id: 'paste' as ImportMethod,
                          icon: <ClipboardPaste />,
                          name: 'Paste JSON',
                          desc: 'Paste a campaign JSON document directly.',
                        },
                      ] as const).map(({ id, icon, name, desc }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setImportMethod(id)}
                          className={clsx(
                            'relative flex flex-col gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150 cursor-pointer',
                            importMethod === id
                              ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-200'
                              : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50/60',
                          )}
                        >
                          <div className={clsx(
                            'flex h-9 w-9 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4',
                            importMethod === id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500',
                          )}>
                            {icon}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{name}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{desc}</p>
                          </div>
                          {importMethod === id && (
                            <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-indigo-600" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="mt-auto pt-6">
                      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-xs text-slate-400">
                          Step 1 of {importMethod ? METHOD_STEPS[importMethod].length : '–'}
                        </span>
                        <button
                          type="button"
                          disabled={!importMethod}
                          onClick={() => { if (importMethod) goToStep(1, 'fwd'); }}
                          className={clsx(
                            'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors',
                            importMethod
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                              : 'cursor-not-allowed bg-slate-100 text-slate-400',
                          )}
                        >
                          Continue
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Step: Topic ideas (Generate) ──────────────── */}
                {currentStepId === 'ideas' && (
                  <>
                    <div className="mb-5">
                      <h2 className="text-base font-bold text-slate-900">Enter your topic ideas</h2>
                      <p className="mt-1 text-xs text-slate-500">One theme per line — these will be woven into the Claude prompt.</p>
                    </div>
                    <Textarea
                      value={topicsIdeas}
                      onChange={(e) => setTopicsIdeas(e.target.value)}
                      placeholder={'e.g. Q2 product launch\nHiring update\nCustomer story: Acme Corp'}
                      className="flex-1 resize-none font-sans text-sm min-h-[180px]"
                      aria-label="Topic ideas for campaign prompt"
                    />
                    <div className="mt-auto border-t border-slate-100 pt-4 flex items-center justify-between">
                      <button type="button" onClick={goBack} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                        ← Back
                      </button>
                      <button type="button" onClick={goNext} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer">
                        Copy prompt <ArrowRight className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </>
                )}

                {/* ── Step: Copy prompt (Generate) ──────────────── */}
                {currentStepId === 'prompt' && (
                  <>
                    <div className="mb-5">
                      <h2 className="text-base font-bold text-slate-900">Copy the Claude prompt</h2>
                      <p className="mt-1 text-xs text-slate-500">Open Claude.ai, paste this prompt, and run it. Then paste Claude's JSON response in the next step.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => void copyPrompt()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      >
                        <Copy className="h-4 w-4" aria-hidden />
                        Copy Claude prompt
                      </button>
                      <details className="rounded-xl border border-slate-200 bg-slate-50/60">
                        <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                          Preview full prompt
                        </summary>
                        <pre className="custom-scrollbar max-h-48 overflow-auto px-4 pb-4 pt-1 font-mono text-[11px] leading-relaxed text-slate-400 whitespace-pre-wrap">
                          {promptText}
                        </pre>
                      </details>
                    </div>
                    <div className="mt-auto border-t border-slate-100 pt-4 flex items-center justify-between">
                      <button type="button" onClick={goBack} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                        ← Back
                      </button>
                      <button type="button" onClick={goNext} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer">
                        Paste response <ArrowRight className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </>
                )}

                {/* ── Step: Paste JSON / Paste response ─────────── */}
                {currentStepId === 'paste' && (
                  <>
                    <div className="mb-5">
                      <h2 className="text-base font-bold text-slate-900">
                        {importMethod === 'generate' ? "Paste Claude's response" : 'Paste campaign JSON'}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {importMethod === 'generate'
                          ? 'Copy the JSON block Claude returned and paste it below.'
                          : 'JSON or JSONC — comments and trailing commas are allowed.'}
                      </p>
                    </div>
                    <JsonPasteEditor
                      pasteText={pasteText}
                      setPasteText={setPasteText}
                      errorLines={errorLines}
                      diagnostics={diagnostics}
                      parseResult={parseResult}
                      onNext={goNext}
                      onBack={goBack}
                      nextLabel="Preview & Publish"
                    />
                  </>
                )}

                {/* ── Step: Upload file ─────────────────────────── */}
                {currentStepId === 'upload' && (
                  <>
                    <div className="mb-5">
                      <h2 className="text-base font-bold text-slate-900">Upload your file</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        CSV columns: topic, date, channels (pipe-separated), body.
                        JSON: same schema as the Generate mode.
                      </p>
                    </div>
                    <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 py-16 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                      <input
                        type="file"
                        accept=".json,.jsonc,.csv"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            handleFileRead(ev.target?.result as string, file.name.endsWith('.csv'));
                          };
                          reader.readAsText(file);
                        }}
                      />
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                        <Upload className="h-5 w-5 text-indigo-600" aria-hidden />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">Drop a file or click to browse</p>
                        <p className="mt-0.5 text-xs text-slate-400">.json · .jsonc · .csv</p>
                      </div>
                    </label>
                    <div className="mt-3">
                      <a
                        href="data:text/csv;charset=utf-8,topic%2Cdate%2Cchannels%2Cbody%0AExample+topic%2C2025-02-01%2Clinkedin%2CSample+body+text"
                        download="campaign-template.csv"
                        className="text-xs text-indigo-600 hover:underline cursor-pointer"
                      >
                        Download CSV template
                      </a>
                    </div>
                    <div className="mt-auto border-t border-slate-100 pt-4">
                      <button type="button" onClick={goBack} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                        ← Back
                      </button>
                    </div>
                  </>
                )}

                {/* ── Step: Preview & Publish ───────────────────── */}
                {currentStepId === 'preview' && (
                  <>
                    {/* View mode + post count */}
                    <div className="mb-4 flex items-center justify-between gap-3">
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
                        {([
                          { id: 'list' as PreviewTab, label: 'List', icon: <LayoutList className="h-3.5 w-3.5" aria-hidden /> },
                          { id: 'calendar' as PreviewTab, label: 'Calendar', icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden /> },
                        ] as const).map(({ id, label, icon }) => (
                          <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={previewTab === id}
                            onClick={() => setPreviewTab(id)}
                            className={clsx(
                              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer',
                              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600',
                              previewTab === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800',
                            )}
                          >
                            {icon}
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bulk action toolbar */}
                    {parseResult.ok && (
                      <div className="mb-3 border-b border-slate-100 pb-3">
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
                    <div className="min-h-0 flex-1">
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
                          <p className="text-sm text-slate-400">No preview yet — go back and add valid JSON.</p>
                        </div>
                      )}
                    </div>

                    {/* Footer actions */}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={goBack}
                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        disabled={!parseResult.ok || submitting || editedPosts.length === 0}
                        onClick={() => void handleCreate()}
                        className={clsx(
                          'flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white',
                          'transition-colors hover:bg-emerald-700',
                          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600',
                          'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
                        )}
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                        Create campaign
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk schedule dialog */}
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
              <label htmlFor="bulk-schedule-date" className="mb-1 block text-xs font-medium text-slate-700">Date</label>
              <Input id="bulk-schedule-date" type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <label htmlFor="bulk-schedule-time" className="mb-1 block text-xs font-medium text-slate-700">Time</label>
              <Input id="bulk-schedule-time" type="time" value={bulkTime} onChange={(e) => setBulkTime(e.target.value)} className="h-9" />
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void applyBulkSchedule()}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk channels dialog */}
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
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-1 py-1 text-sm hover:bg-slate-50">
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
            <Button type="button" variant="outline" onClick={() => setChannelsDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void applyBulkChannels()}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
