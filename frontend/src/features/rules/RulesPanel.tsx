interface RulesPanelProps {
  sharedRules: string;
}

export function RulesPanel({ sharedRules }: RulesPanelProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Shared rules</p>
      <h4 className="mt-2 text-lg font-semibold text-slate-900">Workspace generation guardrails</h4>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        These rules are stored centrally and applied to both Quick Change and 4-variant preview requests.
      </p>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
        {sharedRules.trim() || 'No shared rules are configured yet. Admins can add them in Settings.'}
      </div>
    </section>
  );
}