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
  type PostTemplate,
  isAuthErrorMessage,
} from '@/services/backendApi';
import { type BotConfig, type BotConfigUpdate } from '@/services/configService';
import { Redo2, Undo2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WhoAmISection } from '@/features/who-am-i/WhoAmISection';

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

  const [postTemplates, setPostTemplates] = useState<PostTemplate[]>([]);
  const [postTemplatesLoading, setPostTemplatesLoading] = useState(false);
  const [postTemplatesError, setPostTemplatesError] = useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateFormName, setTemplateFormName] = useState('');
  const [templateFormRules, setTemplateFormRules] = useState('');
  const [savingPostTemplate, setSavingPostTemplate] = useState(false);

  const dirty = value.trim() !== serverText.trim();
  const [authorDirty, setAuthorDirty] = useState(false);
  const handleAuthorDirty = useCallback((d: boolean) => {
    setAuthorDirty(d);
  }, []);
  useRegisterUnsavedChanges(session.isAdmin && (dirty || authorDirty));

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

  const loadPostTemplates = useCallback(async () => {
    if (!session.isAdmin || !session.config.spreadsheetId?.trim()) {
      setPostTemplates([]);
      return;
    }
    setPostTemplatesLoading(true);
    setPostTemplatesError(null);
    try {
      const list = await api.listPostTemplates(idToken);
      setPostTemplates(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load post templates.';
      setPostTemplatesError(msg);
      if (isAuthErrorMessage(msg)) onAuthExpired();
    } finally {
      setPostTemplatesLoading(false);
    }
  }, [session.isAdmin, session.config.spreadsheetId, api, idToken, onAuthExpired]);

  useEffect(() => {
    void loadPostTemplates();
  }, [loadPostTemplates]);

  const openNewTemplateDialog = () => {
    setEditingTemplateId(null);
    setTemplateFormName('');
    setTemplateFormRules('');
    setTemplateDialogOpen(true);
  };

  const openEditTemplateDialog = (t: PostTemplate) => {
    setEditingTemplateId(t.id);
    setTemplateFormName(t.name);
    setTemplateFormRules(t.rules);
    setTemplateDialogOpen(true);
  };

  const handleSavePostTemplate = async () => {
    if (!session.config.spreadsheetId?.trim() || savingPostTemplate) return;
    const name = templateFormName.trim();
    if (!name) {
      void showAlert({ title: 'Name required', description: 'Enter a name for this template.' });
      return;
    }
    setSavingPostTemplate(true);
    try {
      if (editingTemplateId) {
        await api.updatePostTemplate(idToken, editingTemplateId, name, templateFormRules);
        void showAlert({ title: 'Saved', description: 'Template updated.' });
      } else {
        await api.createPostTemplate(idToken, name, templateFormRules);
        void showAlert({ title: 'Created', description: 'New post template added to the sheet.' });
      }
      setTemplateDialogOpen(false);
      await loadPostTemplates();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save template.';
      if (isAuthErrorMessage(message)) onAuthExpired();
      else void showAlert({ title: 'Could not save', description: message });
    } finally {
      setSavingPostTemplate(false);
    }
  };

  const handleDeletePostTemplate = async (t: PostTemplate) => {
    if (!window.confirm(`Delete template “${t.name || t.id}”? Draft rows that still reference this id will fall back to global rules.`)) {
      return;
    }
    try {
      await api.deletePostTemplate(idToken, t.id);
      void showAlert({ title: 'Deleted', description: 'Template removed from the sheet.' });
      await loadPostTemplates();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete template.';
      if (isAuthErrorMessage(message)) onAuthExpired();
      else void showAlert({ title: 'Could not delete', description: message });
    }
  };

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

  const handleSaveAuthorProfile = useCallback(
    async (text: string) => {
      if (!session.isAdmin) return;
      try {
        await onSaveConfig({ authorProfile: text });
        void showAlert({ title: 'Saved', description: 'Author profile was updated.' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save.';
        if (isAuthErrorMessage(message)) onAuthExpired();
        else void showAlert({ title: 'Could not save', description: message });
      }
    },
    [session.isAdmin, onSaveConfig, showAlert, onAuthExpired],
  );

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
      <WhoAmISection
        serverAuthorProfile={session.config.authorProfile || ''}
        isAdmin={session.isAdmin}
        onDirtyChange={handleAuthorDirty}
        onSave={handleSaveAuthorProfile}
      />

      <div className="glass-panel rounded-2xl border border-white/55 p-5 shadow-card sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">Workspace</p>
        <h2 className="mt-1 font-heading text-xl font-semibold text-ink">Global generation rules</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          These apply to Quick Change and 4-variant previews for every topic, unless the topic uses a{' '}
          <strong className="text-ink">post template</strong> or non-empty <strong className="text-ink">Topic rules</strong>{' '}
          in the review sidebar (Draft sheet columns U and S).
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
          <h3 className="font-heading text-lg font-semibold text-ink">Post templates</h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            Reusable instruction blocks stored in the <strong className="text-ink">PostTemplates</strong> sheet. Assign a
            template per topic in the review sidebar to switch styles without editing global rules.
          </p>
          {!session.config.spreadsheetId?.trim() ? (
            <p className="mt-3 text-sm text-muted">Connect a spreadsheet in Settings to create templates.</p>
          ) : postTemplatesError ? (
            <p className="mt-3 text-sm text-destructive">{postTemplatesError}</p>
          ) : null}
          {session.config.spreadsheetId?.trim() ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => openNewTemplateDialog()}>
                  New template
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={postTemplatesLoading} onClick={() => void loadPostTemplates()}>
                  {postTemplatesLoading ? 'Refreshing…' : 'Refresh'}
                </Button>
              </div>
              <ul className="mt-4 space-y-3">
                {postTemplatesLoading && postTemplates.length === 0 ? (
                  <li className="text-sm text-muted">Loading templates…</li>
                ) : postTemplates.length === 0 ? (
                  <li className="text-sm text-muted">No templates yet. Create one to get started.</li>
                ) : (
                  postTemplates.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl border border-border/80 bg-canvas/50 px-4 py-3 text-sm shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink">{t.name || 'Untitled'}</p>
                          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-muted">{t.rules.trim() || '—'}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEditTemplateDialog(t)}>
                            Edit
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => void handleDeletePostTemplate(t)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </>
          ) : null}

          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogContent showCloseButton className="max-h-[min(90vh,640px)] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplateId ? 'Edit template' : 'New template'}</DialogTitle>
                <DialogDescription>
                  Rules are sent to the model like global rules when this template is selected on a topic (and topic rules
                  are empty).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <label className="text-xs font-semibold text-ink">
                  Name
                  <input
                    type="text"
                    value={templateFormName}
                    onChange={(e) => setTemplateFormName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal text-ink"
                    placeholder="e.g. Story-first, Data-heavy"
                  />
                </label>
                <label className="text-xs font-semibold text-ink">
                  Rules
                  <Textarea
                    value={templateFormRules}
                    onChange={(e) => setTemplateFormRules(e.target.value)}
                    placeholder="Instructions for tone, structure, length, hashtags…"
                    className="mt-1 min-h-[200px] w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm leading-6"
                  />
                </label>
              </div>
              <DialogFooter className="border-t-0 bg-transparent p-0 pt-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={savingPostTemplate} onClick={() => void handleSavePostTemplate()}>
                  {savingPostTemplate ? 'Saving…' : editingTemplateId ? 'Save changes' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}

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
