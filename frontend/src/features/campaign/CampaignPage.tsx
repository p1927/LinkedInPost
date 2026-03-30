import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAlert } from '@/components/AlertProvider';
import { useWorkspaceChrome } from '@/components/workspace/WorkspaceChromeContext';
import { type AppSession, type BackendApi, isAuthErrorMessage } from '@/services/backendApi';
import { type BotConfig, type BotConfigUpdate } from '@/services/configService';
import { buildCampaignClaudePrompt } from './prompt/defaultPrompt';
import { parseCampaignPaste } from './validate/parseCampaignDoc';
import { CampaignPostList } from './views/CampaignPostList';
import { CampaignCalendar } from './views/CampaignCalendar';
import clsx from 'clsx';
import { Copy, LayoutList, CalendarDays, Loader2 } from 'lucide-react';

type PreviewTab = 'list' | 'calendar';

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
  const [previewTab, setPreviewTab] = useState<PreviewTab>('list');
  const [submitting, setSubmitting] = useState(false);

  const promptText = useMemo(() => buildCampaignClaudePrompt(topicsIdeas), [topicsIdeas]);
  const parseResult = useMemo(() => parseCampaignPaste(pasteText), [pasteText]);

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
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed.';
      if (isAuthErrorMessage(msg)) onAuthExpired();
      void showAlert({ title: 'Import failed', description: msg });
    } finally {
      setSubmitting(false);
    }
  }, [api, idToken, onAuthExpired, onRefreshQueue, parseResult, session.config.spreadsheetId, showAlert]);

  const diagnostics = parseResult.ok ? [] : parseResult.diagnostics;
  const errorLines = new Set(diagnostics.map((d) => d.line));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-ink">Campaign import</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Build a prompt with your topic ideas, paste it into Claude, then paste the JSON back here. We validate the
          document, preview posts, and create Topics plus Draft rows in one request.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <div className="space-y-5">
          <section className="glass-panel rounded-2xl p-4 shadow-card sm:p-5">
            <h2 className="text-sm font-semibold text-ink">1. Topic ideas</h2>
            <p className="mt-1 text-xs text-muted">Injected into the prompt below (one theme per line is fine).</p>
            <Textarea
              value={topicsIdeas}
              onChange={(e) => setTopicsIdeas(e.target.value)}
              placeholder="e.g. Q2 product launch&#10;Hiring update&#10;Customer story: Acme Corp"
              className="mt-3 min-h-[5rem] font-sans text-sm"
              aria-label="Topic ideas for campaign prompt"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => void copyPrompt()}>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy Claude prompt
              </Button>
            </div>
            <details className="mt-4 rounded-xl border border-white/50 bg-white/30 p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-ink">Preview full prompt</summary>
              <pre className="custom-scrollbar mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted">
                {promptText}
              </pre>
            </details>
          </section>

          <section className="glass-panel rounded-2xl p-4 shadow-card sm:p-5">
            <h2 className="text-sm font-semibold text-ink">2. Paste campaign JSON</h2>
            <p className="mt-1 text-xs text-muted">JSON or JSONC (comments and trailing commas allowed).</p>
            <div className="mt-3 flex gap-0 overflow-hidden rounded-xl border border-white/50 bg-deep-purple/[0.03]">
              <div
                className="hidden w-10 shrink-0 select-none border-r border-white/40 bg-white/20 py-2 text-right font-mono text-[10px] leading-5 text-muted sm:block"
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
              <ul className="mt-3 list-none space-y-1.5 rounded-xl border border-rose-200/80 bg-rose-50/90 p-3 text-xs text-rose-950">
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
              <p className="mt-3 text-xs font-medium text-emerald-800">Document looks valid.</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!parseResult.ok || submitting}
                onClick={() => void handleCreate()}
                className="gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Create campaign in sheet
              </Button>
            </div>
          </section>
        </div>

        <aside className="glass-panel flex flex-col rounded-2xl p-4 shadow-card sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Preview</h2>
            <div className="flex rounded-lg border border-white/50 bg-white/40 p-0.5">
              <button
                type="button"
                onClick={() => setPreviewTab('list')}
                className={clsx(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                  previewTab === 'list' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                <LayoutList className="h-3.5 w-3.5" aria-hidden />
                List
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('calendar')}
                className={clsx(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                  previewTab === 'calendar' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                Calendar
              </button>
            </div>
          </div>
          {parseResult.ok ? (
            <p className="mt-1 text-xs text-muted">{parseResult.doc.posts.length} post(s)</p>
          ) : (
            <p className="mt-1 text-xs text-muted">Fix JSON issues to see preview.</p>
          )}

          <div className="mt-3 min-h-0 flex-1">
            {parseResult.ok ? (
              previewTab === 'list' ? (
                <CampaignPostList posts={parseResult.doc.posts} />
              ) : (
                <CampaignCalendar posts={parseResult.doc.posts} />
              )
            ) : (
              <p className="text-sm text-muted">No preview yet.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
