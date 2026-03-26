interface RulesPanelProps {
  sharedRules: string;
  compact?: boolean;
}

export function RulesPanel({ sharedRules, compact = false }: RulesPanelProps) {
  return (
    <section className={`rounded-2xl border border-border/80 bg-gradient-to-br from-surface/80 to-canvas/50 shadow-card backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-border ${compact ? 'p-3' : 'p-4'}`}>
      <p className={`font-semibold uppercase tracking-[0.18em] text-muted ${compact ? 'text-[0.65rem]' : 'text-xs'}`}>Shared rules</p>
      <h4 className={`mt-1.5 font-heading font-semibold text-ink ${compact ? 'text-base' : 'text-lg'}`}>Workspace generation guardrails</h4>
      <p className={`mt-1.5 text-muted ${compact ? 'text-xs leading-5' : 'text-sm leading-6'}`}>
        These rules are stored centrally and applied to both Quick Change and 4-variant preview requests.
      </p>
      <div
        className={`mt-3 rounded-xl border border-border/70 bg-canvas/80 text-ink transition-all duration-200 hover:border-border ${compact ? 'max-h-[min(40vh,280px)] overflow-y-auto px-2.5 py-2 text-xs leading-5' : 'px-4 py-4 text-sm leading-6'}`}
      >
        {(sharedRules || '').trim() || 'No shared rules are configured yet. Admins can add them in Settings.'}
      </div>
    </section>
  );
}
