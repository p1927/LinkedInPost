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
    <div className="w-full px-0 py-8 sm:py-12" ref={pageTopRef}>
      <div className="mx-auto max-w-5xl px-4 sm:px-8">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-muted">Campaign Import</p>

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
        <div className="mx-auto max-w-5xl px-4 sm:px-8">
          <div className="space-y-5">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">
                  {parseResult.ok ? `${editedPosts.length} post(s) ready` : 'Fix JSON issues to see preview'}
                </span>
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

              {parseResult.ok ? (
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
              ) : null}

              <div className="mt-4">
                {parseResult.ok ? (
                  previewTab === 'list' ? (
                    <CampaignPostList
                      posts={editedPosts}
                      selectedIndices={selectedIndices}
                      onToggleSelect={toggleSelect}
                      onDeletePost={deletePostAt}
                    />
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
                  disabled={!parseResult.ok || submitting || editedPosts.length === 0}
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
    </div>
  );
}
