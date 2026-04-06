import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTextUndoRedo } from '@/hooks/useTextUndoRedo';
import { Redo2, Undo2 } from 'lucide-react';
import { DEFAULT_AUTHOR_PROFILE_TEMPLATE } from './default-author-profile-template';
import { PreSaveTextDiff } from '@/features/rules/PreSaveTextDiff';

export function WhoAmISection({
  serverAuthorProfile,
  canEdit,
  onDirtyChange,
  onSave,
}: {
  serverAuthorProfile: string;
  canEdit: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onSave: (text: string) => Promise<void>;
}) {
  const { value, setValue, undo, redo, canUndo, canRedo } = useTextUndoRedo(serverAuthorProfile);
  const [saving, setSaving] = useState(false);

  const dirty = value.trim() !== serverAuthorProfile.trim();

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!canEdit) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement;
      if (target?.closest?.('[data-who-am-i-editor]')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit, redo, undo]);

  const insertTemplate = useCallback(() => {
    if (value.trim() !== '') return;
    setValue(DEFAULT_AUTHOR_PROFILE_TEMPLATE);
  }, [setValue, value]);

  const handleSave = async () => {
    if (!canEdit || saving) return;
    setSaving(true);
    try {
      await onSave(value.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-white/55 p-5 shadow-card sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">Personal</p>
      <h2 className="mt-1 font-heading text-xl font-semibold text-ink">Who am I</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Your personal author profile for the model: role, audience, voice, and facts you want reflected in drafts. When
        non-empty, it is included on <strong className="text-ink">every</strong> Quick Change and 4-variant preview, even
        when a topic uses its own rules or a post template.
      </p>

      {canEdit ? (
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
            <Button type="button" variant="outline" size="sm" disabled={value.trim() !== ''} onClick={insertTemplate}>
              Insert template
            </Button>
          </div>
          <Textarea
            data-who-am-i-editor
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={saving}
            placeholder="Optional. Fill in who you are so generations can match your voice and context."
            className="mt-3 min-h-[200px] w-full rounded-xl border border-border bg-canvas px-4 py-3 text-sm leading-6 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Who am I author profile"
          />
          <PreSaveTextDiff baseline={serverAuthorProfile} draft={value} title="Changes vs saved author profile" />
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" disabled={!dirty || saving} onClick={() => void handleSave()}>
              {saving ? 'Saving…' : 'Save author profile'}
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-border/70 bg-canvas/80 px-4 py-4 text-sm leading-6 text-ink whitespace-pre-wrap">
          {serverAuthorProfile.trim() || 'No author profile configured yet.'}
        </div>
      )}
    </div>
  );
}
