interface RulesPanelProps {
  sharedRules: string;
  compact?: boolean;
}

export function RulesPanel({ sharedRules, compact = false }: RulesPanelProps) {
  return (
    <section className={`rounded-2xl border border-border bg-surface shadow-card ${compact ? 'p-3' : 'p-4'}`}>
      <p className={`font-semibold uppercase tracking-[0.18em] text-muted ${compact ? 'text-[0.65rem]' : 'text-xs'}`}>Shared rules</p>
      <h4 className={`mt-1.5 font-heading font-semibold text-ink ${compact ? 'text-base' : 'text-lg'}`}>Workspace generation guardrails</h4>
      <p className={`mt-1.5 text-muted ${compact ? 'text-xs leading-5' : 'text-sm leading-6'}`}>
        These rules are stored centrally and applied to both Quick Change and 4-variant preview requests.
      </p>
      <div
        className={`mt-3 rounded-xl border border-border bg-canvas text-ink ${compact ? 'max-h-[min(40vh,280px)] overflow-y-auto px-2.5 py-2 text-xs leading-5' : 'px-4 py-4 text-sm leading-6'}`}
      >
        {sharedRules.trim() || 'No shared rules are configured yet. Admins can add them in Settings.'}
      </div>
    </section>
  );
}
