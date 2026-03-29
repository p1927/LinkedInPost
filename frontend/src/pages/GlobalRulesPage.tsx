import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTextUndoRedo } from '@/hooks/useTextUndoRedo';
import { diffLines } from '@/utils/lineDiff';
import { useRegisterUnsavedChanges } from '@/components/workspace/WorkspaceChromeContext';
import { useAlert } from '@/components/AlertProvider';
import {
  type AppSession,
  type BackendApi,
  type GenerationRulesVersion,
  isAuthErrorMessage,
} from '@/services/backendApi';
import { type BotConfig, type BotConfigUpdate } from '@/services/configService';
import { Redo2, Undo2 } from 'lucide-react';

export function GlobalRulesPage({
  idToken,
  session,
  api,
  onSaveConfig,
  onAuthExpired,
}: {
  idToken: string;
  session: AppSession;
  api: BackendApi;
  onSaveConfig: (config: BotConfigUpdate) => Promise<BotConfig>;
  onAuthExpired: () => void;
}) {
  const serverText = session.config.generationRules || '';
  const { value, setValue, undo, redo, canUndo, canRedo } = useTextUndoRedo(serverText);
  const { showAlert } = useAlert();
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<GenerationRulesVersion[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [diffLeft, setDiffLeft] = useState<'current' | number>('current');
  const [diffRight, setDiffRight] = useState<'current' | number>(0);

  const dirty = value.trim() !== serverText.trim();
  useRegisterUnsavedChanges(session.isAdmin && dirty);

  useEffect(() => {
    if (!session.isAdmin) {
      setVersions([]);
      setHistoryError(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.getGenerationRulesHistory(idToken);
        if (cancelled) return;
        setVersions(res.versions);
        setHistoryError(null);
        if (res.versions.length > 0) {
          setDiffRight(0);
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load version history.';
        setHistoryError(msg);
        if (isAuthErrorMessage(msg)) onAuthExpired();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, idToken, session.isAdmin, onAuthExpired]);

  const textForDiff = useCallback(
    (which: 'current' | number): string => {
      if (which === 'current') return serverText;
      const v = versions[which];
      return v?.text ?? '';
    },
    [serverText, versions],
  );

  const diffRows = diffLines(textForDiff(diffLeft), textForDiff(diffRight));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!session.isAdmin) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement;
      if (target?.closest?.('[data-global-rules-editor]')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session.isAdmin, redo, undo]);

  const handleSave = async () => {
    if (!session.isAdmin || saving) return;
    setSaving(true);
    try {
      await onSaveConfig({ generationRules: value.trim() });
      void showAlert({ title: 'Saved', description: 'Global generation rules were updated.' });
      try {
        const res = await api.getGenerationRulesHistory(idToken);
        setVersions(res.versions);
      } catch {
        /* ignore */
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save.';
      if (isAuthErrorMessage(message)) onAuthExpired();
      else void showAlert({ title: 'Could not save', description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-10">
      <div className="glass-panel rounded-2xl border border-white/55 p-5 shadow-card sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">Workspace</p>
        <h2 className="mt-1 font-heading text-xl font-semibold text-ink">Global generation rules</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          These apply to Quick Change and 4-variant previews for every topic, unless a topic has its own non-empty rules
          in the review sidebar (column <strong className="text-ink">Topic rules</strong> in the Draft sheet).
        </p>

        {session.isAdmin ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canUndo}
                onClick={() => undo()}
                className="gap-1.5"
              >
                <Undo2 className="size-4" aria-hidden />
                Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canRedo}
                onClick={() => redo()}
                className="gap-1.5"
              >
                <Redo2 className="size-4" aria-hidden />
                Redo
              </Button>
              <span className="text-xs text-muted">⌘/Ctrl+Z · Shift+⌘/Ctrl+Z in the editor</span>
            </div>
            <Textarea
              data-global-rules-editor
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={saving}
              placeholder="Examples: keep the tone crisp, avoid emoji, stay under 180 words…"
              className="mt-3 min-h-[220px] w-full rounded-xl border border-border bg-canvas px-4 py-3 text-sm leading-6 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Global generation rules"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" disabled={!dirty || saving} onClick={() => void handleSave()}>
                {saving ? 'Saving…' : 'Save global rules'}
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-xl border border-border/70 bg-canvas/80 px-4 py-4 text-sm leading-6 text-ink whitespace-pre-wrap">
            {serverText.trim() || 'No global rules configured yet.'}
          </div>
        )}
      </div>

      {session.isAdmin ? (
        <div className="glass-panel rounded-2xl border border-white/55 p-5 shadow-card sm:p-6">
          <h3 className="font-heading text-lg font-semibold text-ink">Version diff</h3>
          <p className="mt-1 text-sm text-muted">
            Compare the live saved rules with previous snapshots (stored when an admin saves changes).
          </p>
          {historyError ? <p className="mt-2 text-sm text-destructive">{historyError}</p> : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-semibold text-ink">
              Base
              <select
                className="rounded-lg border border-border bg-white px-2 py-2 text-sm font-normal text-ink"
                value={diffLeft === 'current' ? 'current' : `v:${diffLeft}`}
                onChange={(e) => {
                  const v = e.target.value;
                  setDiffLeft(v === 'current' ? 'current' : Number(v.slice(2)));
                }}
              >
                <option value="current">Current (saved)</option>
                {versions.map((v, i) => (
                  <option key={`l-${v.savedAt}`} value={`v:${i}`}>
                    {new Date(v.savedAt).toLocaleString()} — {v.savedBy}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-semibold text-ink">
              Compare
              <select
                className="rounded-lg border border-border bg-white px-2 py-2 text-sm font-normal text-ink"
                value={diffRight === 'current' ? 'current' : `v:${diffRight}`}
                onChange={(e) => {
                  const v = e.target.value;
                  setDiffRight(v === 'current' ? 'current' : Number(v.slice(2)));
                }}
              >
                <option value="current">Current (saved)</option>
                {versions.map((v, i) => (
                  <option key={`r-${v.savedAt}`} value={`v:${i}`}>
                    {new Date(v.savedAt).toLocaleString()} — {v.savedBy}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="custom-scrollbar mt-4 max-h-[min(50vh,420px)] overflow-auto rounded-xl border border-border bg-ink/[0.03] p-3 font-mono text-xs leading-5">
            {diffRows.length === 0 ? (
              <p className="text-muted">No differences.</p>
            ) : (
              diffRows.map((row, i) => (
                <div
                  key={i}
                  className={
                    row.kind === 'same'
                      ? 'text-ink/80'
                      : row.kind === 'add'
                        ? 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-100'
                        : 'bg-rose-500/15 text-rose-900 dark:text-rose-100'
                  }
                >
                  <span className="select-none pr-2 text-muted">
                    {row.kind === 'same' ? ' ' : row.kind === 'add' ? '+' : '-'}
                  </span>
                  {row.line || ' '}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
