import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTextUndoRedo } from '@/hooks/useTextUndoRedo';
import { diffLines } from '@/utils/lineDiff';
import { useRegisterUnsavedChanges } from '@/components/workspace/WorkspaceChromeContext';
import { useAlert } from '@/components/useAlert';
import {
  type AppSession,
  type BackendApi,
  type GenerationRulesVersion,
  type PostTemplate,
  type TenantSettingsRow,
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
import { PreSaveTextDiff } from '@/features/rules/PreSaveTextDiff';
import { cn } from '@/lib/cn';

type RulesTabId = 'author' | 'my-rules' | 'global-rules' | 'post-templates' | 'tenant-overview';

const ALL_RULES_TABS: { id: RulesTabId; label: string }[] = [
  { id: 'author', label: 'Who am I' },
  { id: 'my-rules', label: 'My rules' },
  { id: 'global-rules', label: 'Global rules' },
  { id: 'post-templates', label: 'Post templates' },
  { id: 'tenant-overview', label: 'All tenants' },
];

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
  // Global rules (admin-managed workspace-wide fallback)
  const serverText = session.config.generationRules || '';
  const { value, setValue, undo, redo, canUndo, canRedo } = useTextUndoRedo(serverText);
  const { showAlert } = useAlert();
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<GenerationRulesVersion[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [diffLeft, setDiffLeft] = useState<'current' | number>('current');
  const [diffRight, setDiffRight] = useState<'current' | number>(0);

  // My rules (per-user)
  const myRulesServerText = session.config.userRules || '';
  const {
    value: myRulesValue,
    setValue: setMyRulesValue,
    undo: myRulesUndo,
    redo: myRulesRedo,
    canUndo: myRulesCanUndo,
    canRedo: myRulesCanRedo,
  } = useTextUndoRedo(myRulesServerText);
  const [savingMyRules, setSavingMyRules] = useState(false);
  const myRulesDirty = myRulesValue.trim() !== myRulesServerText.trim();

  // Post templates
  const [postTemplates, setPostTemplates] = useState<PostTemplate[]>([]);
  const [postTemplatesLoading, setPostTemplatesLoading] = useState(false);
  const [postTemplatesError, setPostTemplatesError] = useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateFormName, setTemplateFormName] = useState('');
  const [templateFormRules, setTemplateFormRules] = useState('');
  const [templateRulesBaseline, setTemplateRulesBaseline] = useState('');
  const [savingPostTemplate, setSavingPostTemplate] = useState(false);

  // Tenant overview (admin)
  const [tenantSettings, setTenantSettings] = useState<TenantSettingsRow[]>([]);
  const [tenantSettingsLoading, setTenantSettingsLoading] = useState(false);
  const [tenantSettingsError, setTenantSettingsError] = useState<string | null>(null);

  const visibleTabs = useMemo(() => {
    return ALL_RULES_TABS.filter((t) => {
      if (t.id === 'post-templates') return session.isAdmin;
      if (t.id === 'tenant-overview') return session.isAdmin;
      return true;
    });
  }, [session.isAdmin]);

  const [activeTab, setActiveTab] = useState<RulesTabId>('author');

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? 'author');
    }
  }, [visibleTabs, activeTab]);

  const dirty = value.trim() !== serverText.trim();
  const [authorDirty, setAuthorDirty] = useState(false);
  const handleAuthorDirty = useCallback((d: boolean) => {
    setAuthorDirty(d);
  }, []);
  useRegisterUnsavedChanges(dirty || authorDirty || myRulesDirty);

  // Load global rules history (admin only)
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

  // Load tenant settings when admin opens that tab
  useEffect(() => {
    if (activeTab !== 'tenant-overview' || !session.isAdmin) return;
    setTenantSettingsLoading(true);
    setTenantSettingsError(null);
    let cancelled = false;
    void (async () => {
      try {
        const result = await api.adminListTenantSettings(idToken);
        if (cancelled) return;
        setTenantSettings(result.tenants);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load tenant settings.';
        setTenantSettingsError(msg);
        if (isAuthErrorMessage(msg)) onAuthExpired();
      } finally {
        if (!cancelled) setTenantSettingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, session.isAdmin, api, idToken, onAuthExpired]);

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
    setTemplateRulesBaseline('');
    setTemplateDialogOpen(true);
  };

  const openEditTemplateDialog = (t: PostTemplate) => {
    setEditingTemplateId(t.id);
    setTemplateFormName(t.name);
    setTemplateFormRules(t.rules);
    setTemplateRulesBaseline(t.rules);
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
    if (!window.confirm(`Delete template "${t.name || t.id}"? Draft rows that still reference this id will fall back to global rules.`)) {
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement;
      if (target?.closest?.('[data-my-rules-editor]')) {
        e.preventDefault();
        if (e.shiftKey) myRulesRedo();
        else myRulesUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [myRulesRedo, myRulesUndo]);

  // Save per-user "who am I"
  const handleSaveAuthorProfile = useCallback(
    async (text: string) => {
      try {
        await api.saveUserSettings(idToken, { userWhoAmI: text });
        void showAlert({ title: 'Saved', description: 'Author profile was updated.' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save.';
        if (isAuthErrorMessage(message)) onAuthExpired();
        else void showAlert({ title: 'Could not save', description: message });
      }
    },
    [api, idToken, showAlert, onAuthExpired],
  );

  // Save per-user rules
  const handleSaveMyRules = async () => {
    if (savingMyRules) return;
    setSavingMyRules(true);
    try {
      await api.saveUserSettings(idToken, { userRules: myRulesValue.trim() });
      void showAlert({ title: 'Saved', description: 'Your rules were updated.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save.';
      if (isAuthErrorMessage(message)) onAuthExpired();
      else void showAlert({ title: 'Could not save', description: message });
    } finally {
      setSavingMyRules(false);
    }
  };

  // Save workspace global rules (admin only)
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

  const versionHistorySection =
    session.isAdmin ? (
      <div className="glass-panel mt-6 rounded-2xl border border-white/55 p-5 shadow-card sm:p-6">
        <h3 className="font-heading text-lg font-semibold text-ink">Saved version history</h3>
        <p className="mt-1 text-sm text-muted">
          Compare past snapshots of global rules (stored when an admin saves). This is separate from the unsaved-changes diff
          above.
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
    ) : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
      <div className="flex min-h-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <aside className="sticky top-4 z-20 shrink-0 rounded-xl border border-border/60 bg-surface/95 p-3 shadow-sm backdrop-blur-md lg:w-52 lg:max-w-[13rem] lg:self-start">
          <nav
            role="tablist"
            aria-label="Rules sections"
            className="flex flex-row gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0 lg:pr-1"
          >
            <p className="mb-2 hidden text-xs font-bold uppercase tracking-[0.14em] text-muted lg:block">Sections</p>
            {visibleTabs.map(({ id, label }) => (
              <Button
                key={id}
                type="button"
                role="tab"
                id={`rules-tab-trigger-${id}`}
                aria-selected={activeTab === id}
                aria-controls={`rules-tabpanel-${id}`}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'w-full shrink-0 justify-start rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  activeTab === id
                    ? 'bg-primary/12 font-semibold text-ink'
                    : 'text-muted hover:bg-white/60 hover:text-ink',
                )}
              >
                {label}
              </Button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Who am I — per-user, editable by all */}
          {activeTab === 'author' ? (
            <div
              role="tabpanel"
              id="rules-tabpanel-author"
              aria-labelledby="rules-tab-trigger-author"
              className="min-w-0"
            >
              <WhoAmISection
                serverAuthorProfile={session.config.userWhoAmI || ''}
                canEdit={true}
                onDirtyChange={handleAuthorDirty}
                onSave={handleSaveAuthorProfile}
              />
            </div>
          ) : null}

          {/* My rules — per-user, editable by all */}
          {activeTab === 'my-rules' ? (
            <div
              role="tabpanel"
              id="rules-tabpanel-my-rules"
              aria-labelledby="rules-tab-trigger-my-rules"
              className="min-w-0"
            >
              <div className="glass-panel rounded-2xl border border-white/55 p-5 shadow-card sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">Personal</p>
                <h2 className="mt-1 font-heading text-xl font-semibold text-ink">My rules</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Your personal generation rules. When set, these override the workspace{' '}
                  <strong className="text-ink">Global rules</strong> for your account. Topic rules and post templates still
                  take precedence.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!myRulesCanUndo}
                    onClick={() => myRulesUndo()}
                    className="gap-1.5"
                  >
                    <Undo2 className="size-4" aria-hidden />
                    Undo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!myRulesCanRedo}
                    onClick={() => myRulesRedo()}
                    className="gap-1.5"
                  >
                    <Redo2 className="size-4" aria-hidden />
                    Redo
                  </Button>
                  <span className="text-xs text-muted">⌘/Ctrl+Z · Shift+⌘/Ctrl+Z in the editor</span>
                </div>
                <Textarea
                  data-my-rules-editor
                  value={myRulesValue}
                  onChange={(e) => setMyRulesValue(e.target.value)}
                  disabled={savingMyRules}
                  placeholder="Examples: keep the tone crisp, avoid emoji, stay under 180 words…"
                  className="mt-3 min-h-[220px] w-full rounded-xl border border-border bg-canvas px-4 py-3 text-sm leading-6 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label="My generation rules"
                />
                <PreSaveTextDiff baseline={myRulesServerText} draft={myRulesValue} title="Changes vs saved rules" />
                <div className="mt-3 flex justify-end gap-2">
                  <Button type="button" disabled={!myRulesDirty || savingMyRules} onClick={() => void handleSaveMyRules()}>
                    {savingMyRules ? 'Saving…' : 'Save my rules'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Global rules — workspace-wide fallback, admin editable */}
          {activeTab === 'global-rules' ? (
            <div
              role="tabpanel"
              id="rules-tabpanel-global-rules"
              aria-labelledby="rules-tab-trigger-global-rules"
              className="min-w-0"
            >
              <div className="glass-panel rounded-2xl border border-white/55 p-5 shadow-card sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">Workspace</p>
                <h2 className="mt-1 font-heading text-xl font-semibold text-ink">Global generation rules</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Workspace-wide fallback rules. These apply when a user has no{' '}
                  <strong className="text-ink">My rules</strong>, a topic has no{' '}
                  <strong className="text-ink">post template</strong>, and no{' '}
                  <strong className="text-ink">Topic rules</strong> are set in the review sidebar.
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
                    <PreSaveTextDiff baseline={serverText} draft={value} title="Changes vs saved global rules" />
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
              {versionHistorySection}
            </div>
          ) : null}

          {/* Post templates — admin only */}
          {activeTab === 'post-templates' && session.isAdmin ? (
            <div
              role="tabpanel"
              id="rules-tabpanel-post-templates"
              aria-labelledby="rules-tab-trigger-post-templates"
              className="min-w-0"
            >
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
              </div>
            </div>
          ) : null}

          {/* All tenants — admin only */}
          {activeTab === 'tenant-overview' && session.isAdmin ? (
            <div
              role="tabpanel"
              id="rules-tabpanel-tenant-overview"
              aria-labelledby="rules-tab-trigger-tenant-overview"
              className="min-w-0"
            >
              <div className="glass-panel rounded-2xl border border-white/55 p-5 shadow-card sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">Admin</p>
                <h2 className="mt-1 font-heading text-xl font-semibold text-ink">All tenants</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Read-only view of every user's personal rules and author profile.
                </p>
                {tenantSettingsError ? (
                  <p className="mt-3 text-sm text-destructive">{tenantSettingsError}</p>
                ) : tenantSettingsLoading ? (
                  <p className="mt-4 text-sm text-muted">Loading…</p>
                ) : tenantSettings.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">No users found.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {tenantSettings.map((t) => (
                      <li key={t.id} className="rounded-xl border border-border/80 bg-canvas/50 px-4 py-4 text-sm shadow-sm">
                        <div className="flex items-center gap-3">
                          {t.avatar_url ? (
                            <img src={t.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                              {(t.display_name || t.id).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{t.display_name || t.id}</p>
                            <p className="text-xs text-muted">{t.id}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Who am I</p>
                            <div className="mt-1 rounded-lg border border-border/60 bg-white/50 px-3 py-2 text-xs leading-5 text-ink whitespace-pre-wrap">
                              {t.user_who_am_i.trim() || <span className="text-muted/60 italic">Not set</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">My rules</p>
                            <div className="mt-1 rounded-lg border border-border/60 bg-white/50 px-3 py-2 text-xs leading-5 text-ink whitespace-pre-wrap">
                              {t.user_rules.trim() || <span className="text-muted/60 italic">Not set</span>}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {session.isAdmin ? (
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent showCloseButton className="max-h-[min(90vh,640px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplateId ? 'Edit template' : 'New template'}</DialogTitle>
              <DialogDescription>
                Rules are sent to the model like global rules when this template is selected on a topic (and topic rules are
                empty).
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
              <PreSaveTextDiff
                baseline={templateRulesBaseline}
                draft={templateFormRules}
                title="Changes vs template rules on open"
                treatTrimAsNoChanges={false}
              />
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
      ) : null}
    </div>
  );
}
