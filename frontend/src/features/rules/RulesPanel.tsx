interface RulesPanelProps {
  sharedRules: string;
}

export function RulesPanel({ sharedRules }: RulesPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Shared rules</p>
      <h4 className="mt-2 font-heading text-lg font-semibold text-ink">Workspace generation guardrails</h4>
      <p className="mt-2 text-sm leading-6 text-muted">
        These rules are stored centrally and applied to both Quick Change and 4-variant preview requests.
      </p>
      <div className="mt-4 rounded-2xl border border-border bg-canvas px-4 py-4 text-sm leading-6 text-ink">
        {sharedRules.trim() || 'No shared rules are configured yet. Admins can add them in Settings.'}
      </div>
    </section>
  );
}
