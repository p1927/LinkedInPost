import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface RulesPanelProps {
  sharedRules: string;
  compact?: boolean;
  isAdmin: boolean;
  onSave: (rules: string) => Promise<void>;
  saving: boolean;
}

export function RulesPanel({ sharedRules, compact = false, isAdmin, onSave, saving }: RulesPanelProps) {
  const [draft, setDraft] = useState(sharedRules);

  useEffect(() => {
    setDraft(sharedRules);
  }, [sharedRules]);

  const dirty = draft !== sharedRules;

  return (
    <section
      className={`rounded-2xl border border-border/80 bg-gradient-to-br from-surface/80 to-canvas/50 shadow-card backdrop-blur-sm transition-all duration-300 hover:border-border hover:shadow-md ${compact ? 'p-3' : 'p-4'}`}
    >
      <p className={`font-semibold uppercase tracking-[0.18em] text-muted ${compact ? 'text-[0.65rem]' : 'text-xs'}`}>
        Shared rules
      </p>
      <h4 className={`mt-1.5 font-heading font-semibold text-ink ${compact ? 'text-base' : 'text-lg'}`}>
        Workspace generation guardrails
      </h4>
      <p className={`mt-1.5 text-muted ${compact ? 'text-xs leading-5' : 'text-sm leading-6'}`}>
        These rules are stored centrally and applied to both Quick Change and 4-variant preview requests.
      </p>

      {isAdmin ? (
        <>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Examples: keep the tone crisp, avoid emoji, stay under 180 words, always end with one clear takeaway."
            disabled={saving}
            className={`mt-3 w-full rounded-xl border border-border bg-canvas text-ink transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60 ${compact ? 'min-h-[140px] px-2.5 py-2 text-xs leading-5' : 'min-h-[160px] px-4 py-3 text-sm leading-6'}`}
            aria-label="Shared generation rules"
          />
          <p className={`mt-1.5 text-muted ${compact ? 'text-[0.65rem] leading-4' : 'text-xs leading-5'}`}>
            Applied by the Worker to Quick Change and 4-variant preview runs.
          </p>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size={compact ? 'sm' : 'default'}
              disabled={!dirty || saving}
              onClick={() => void onSave(draft)}
            >
              {saving ? 'Saving…' : 'Save rules'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className={`mt-2 text-muted ${compact ? 'text-xs leading-5' : 'text-sm leading-6'}`}>
            Only workspace admins can edit shared rules. You can still view what is configured below.
          </p>
          <div
            className={`mt-3 rounded-xl border border-border/70 bg-canvas/80 text-ink transition-all duration-200 hover:border-border ${compact ? 'max-h-[min(40vh,280px)] overflow-y-auto px-2.5 py-2 text-xs leading-5' : 'px-4 py-4 text-sm leading-6'}`}
          >
            {(sharedRules || '').trim() || 'No shared rules are configured yet.'}
          </div>
        </>
      )}
    </section>
  );
}
