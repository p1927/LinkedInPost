import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { type PostTemplate } from '@/services/backendApi';
import { WORKSPACE_PATHS } from '../topic-navigation/utils/workspaceRoutes';

interface RulesPanelProps {
  /** Workspace-wide rules from config (used when topic rules are empty). */
  globalGenerationRules: string;
  /** Topic column S — when non-empty, replaces global (and template) for LLM on this topic only. */
  topicGenerationRules: string;
  /** Draft column U — used when column S is empty. */
  generationTemplateId: string;
  /** Effective text sent with prompts (topic if set, else template body, else global). */
  effectiveGenerationRules: string;
  postTemplates: PostTemplate[];
  compact?: boolean;
  onSaveTopic: (rules: string) => Promise<void>;
  savingTopic: boolean;
  onSaveGenerationTemplate: (templateId: string) => Promise<void>;
  savingGenerationTemplate: boolean;
}

export function RulesPanel({
  globalGenerationRules,
  topicGenerationRules,
  generationTemplateId,
  effectiveGenerationRules,
  postTemplates,
  compact = false,
  onSaveTopic,
  savingTopic,
  onSaveGenerationTemplate,
  savingGenerationTemplate,
}: RulesPanelProps) {
  const [draft, setDraft] = useState(topicGenerationRules || '');
  const [draftTemplateId, setDraftTemplateId] = useState(generationTemplateId || '');

  useEffect(() => {
    setDraft(topicGenerationRules || ''); // eslint-disable-line react-hooks/set-state-in-effect
  }, [topicGenerationRules]);

  useEffect(() => {
    setDraftTemplateId(generationTemplateId || ''); // eslint-disable-line react-hooks/set-state-in-effect
  }, [generationTemplateId]);

  const dirty = draft !== (topicGenerationRules || '');
  const topicOverrides = Boolean((topicGenerationRules || '').trim());
  const templateDirty = draftTemplateId !== (generationTemplateId || '').trim();
  const activeTemplateName = postTemplates.find((t) => t.id === (generationTemplateId || '').trim())?.name;

  const rulesSourceLabel = topicOverrides
    ? 'Using topic rules'
    : (generationTemplateId || '').trim()
      ? `Using post template${activeTemplateName ? `: ${activeTemplateName}` : ''}`
      : 'Using global rules';

  return (
    <section
      className={`rounded-2xl border border-border/80 bg-gradient-to-br from-surface/80 to-canvas/50 shadow-card backdrop-blur-sm transition-all duration-300 hover:border-border hover:shadow-md ${compact ? 'p-3' : 'p-4'}`}
    >
      <p className={`font-semibold uppercase tracking-[0.18em] text-muted ${compact ? 'text-[0.65rem]' : 'text-xs'}`}>
        Generation rules
      </p>
      <h4 className={`mt-1.5 font-heading font-semibold text-ink ${compact ? 'text-base' : 'text-lg'}`}>
        Topic vs workspace
      </h4>
      <p className={`mt-1.5 text-muted ${compact ? 'text-xs leading-5' : 'text-sm leading-6'}`}>
        <strong className="text-ink">Topic rules</strong> (below) win over everything. If they are empty, a{' '}
        <strong className="text-ink">post template</strong> replaces global rules. Otherwise{' '}
        <strong className="text-ink">global rules</strong> apply. Manage templates on the{' '}
        <Link to={WORKSPACE_PATHS.rules} className="font-semibold text-primary underline-offset-2 hover:underline">
          Rules
        </Link>{' '}
        page.
      </p>

      <div
        className={`mt-3 rounded-xl border px-2.5 py-2 ${compact ? 'text-xs leading-5' : 'text-sm leading-6'} ${
          topicOverrides
            ? 'border-amber-200/80 bg-amber-50/50 text-ink'
            : (generationTemplateId || '').trim()
              ? 'border-sky-200/80 bg-sky-50/50 text-ink'
              : 'border-border/70 bg-canvas/60 text-muted'
        }`}
      >
        <span className="font-semibold text-ink">{rulesSourceLabel}</span>
        <span className="mx-1 text-muted">·</span>
        <span className="line-clamp-4 whitespace-pre-wrap">
          {(effectiveGenerationRules || '').trim() || 'No rules configured for this topic yet.'}
        </span>
      </div>

      <p className={`mt-3 text-muted ${compact ? 'text-[0.65rem] leading-4' : 'text-xs leading-5'}`}>
        Global rules are edited on the{' '}
        <Link to={WORKSPACE_PATHS.rules} className="font-semibold text-primary underline-offset-2 hover:underline">
          Rules
        </Link>{' '}
        page (sidebar).
      </p>

      <p className={`mt-2 font-medium text-ink ${compact ? 'text-[0.65rem] uppercase tracking-wide' : 'text-xs'}`}>
        Post template (saved to sheet column U)
      </p>
      <div className={`mt-1 flex flex-col gap-2 ${compact ? '' : ''}`}>
        <select
          className={`w-full rounded-xl border border-border bg-canvas text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60 ${compact ? 'px-2.5 py-2 text-xs' : 'px-3 py-2 text-sm'}`}
          value={draftTemplateId}
          onChange={(e) => setDraftTemplateId(e.target.value)}
          disabled={savingGenerationTemplate || topicOverrides}
          aria-label="Post generation template"
        >
          <option value="">None — use global rules</option>
          {postTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || t.id}
            </option>
          ))}
        </select>
        {topicOverrides ? (
          <p className={`text-muted ${compact ? 'text-[0.65rem] leading-4' : 'text-xs'}`}>
            Clear topic rules below to use a template or global rules.
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size={compact ? 'sm' : 'default'}
            disabled={savingGenerationTemplate || !(generationTemplateId || '').trim() || topicOverrides}
            onClick={() => void onSaveGenerationTemplate('')}
          >
            Clear template
          </Button>
          <Button
            type="button"
            size={compact ? 'sm' : 'default'}
            disabled={!templateDirty || savingGenerationTemplate}
            onClick={() => void onSaveGenerationTemplate(draftTemplateId)}
          >
            {savingGenerationTemplate ? 'Saving…' : 'Save template'}
          </Button>
        </div>
      </div>

      <p className={`mt-3 font-medium text-ink ${compact ? 'text-[0.65rem] uppercase tracking-wide' : 'text-xs'}`}>
        Workspace global (read-only here)
      </p>
      <div
        className={`mt-1 rounded-lg border border-border/60 bg-white/40 text-ink/90 ${compact ? 'max-h-24 overflow-y-auto px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'} whitespace-pre-wrap`}
      >
        {(globalGenerationRules || '').trim() || '—'}
      </div>

      <p className={`mt-3 font-medium text-ink ${compact ? 'text-[0.65rem] uppercase tracking-wide' : 'text-xs'}`}>
        Topic rules (saved to sheet column S)
      </p>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Optional: rules for this topic only. Leave blank to use a template or global rules."
        disabled={savingTopic}
        className={`mt-1 w-full rounded-xl border border-border bg-canvas text-ink transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60 ${compact ? 'min-h-[120px] px-2.5 py-2 text-xs leading-5' : 'min-h-[140px] px-4 py-3 text-sm leading-6'}`}
        aria-label="Topic generation rules"
      />

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size={compact ? 'sm' : 'default'}
          disabled={savingTopic || !(topicGenerationRules || '').trim()}
          onClick={() => void onSaveTopic('')}
        >
          Clear topic rules
        </Button>
        <Button type="button" size={compact ? 'sm' : 'default'} disabled={!dirty || savingTopic} onClick={() => void onSaveTopic(draft)}>
          {savingTopic ? 'Saving…' : 'Save topic rules'}
        </Button>
      </div>
    </section>
  );
}
