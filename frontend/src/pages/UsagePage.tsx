import { useState, useEffect, useMemo } from 'react';
import { BarChart2, DollarSign, Cpu, Activity, User } from 'lucide-react';
import type { BackendApi, UsageSummaryRow, AppSession } from '../services/backendApi';

function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return '<$0.01';
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const PROVIDER_COLORS: Record<string, string> = {
  gemini: 'bg-blue-400/80',
  grok: 'bg-purple-400/80',
  openrouter: 'bg-orange-400/80',
};

function providerColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] ?? 'bg-primary/70';
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="glass-panel rounded-2xl p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-muted">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-heading text-2xl font-semibold text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

export function UsagePage({
  idToken,
  session,
  api,
}: {
  idToken: string;
  session: AppSession;
  api: BackendApi;
}) {
  const [selectedDays, setSelectedDays] = useState(30);
  const [rows, setRows] = useState<UsageSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    setError(null); // eslint-disable-line react-hooks/set-state-in-effect
    api
      .getUsageSummary(idToken, selectedDays)
      .then((data) => setRows(data ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load usage data.'))
      .finally(() => setLoading(false));
  }, [api, idToken, selectedDays]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (rows.length === 0) {
      return { totalCost: 0, totalTokens: 0, totalCalls: 0, topModel: '—' };
    }
    let totalCost = 0;
    let totalTokens = 0;
    let totalCalls = 0;
    const modelCalls: Record<string, number> = {};
    for (const r of rows) {
      totalCost += r.estimated_cost_usd;
      totalTokens += r.prompt_tokens + r.completion_tokens;
      totalCalls += r.calls;
      modelCalls[r.model] = (modelCalls[r.model] ?? 0) + r.calls;
    }
    const topModel = Object.entries(modelCalls).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    return { totalCost, totalTokens, totalCalls, topModel };
  }, [rows]);

  // Cost by day (aggregate all providers per date)
  const costByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      map[r.date] = (map[r.date] ?? 0) + r.estimated_cost_usd;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date, cost }));
  }, [rows]);

  const maxDayCost = useMemo(
    () => Math.max(...costByDay.map((d) => d.cost), 0.000001),
    [costByDay],
  );

  // Cost by model table
  const byModel = useMemo(() => {
    const map: Record<string, { provider: string; calls: number; tokens: number; cost: number }> =
      {};
    for (const r of rows) {
      if (!map[r.model]) {
        map[r.model] = { provider: r.provider, calls: 0, tokens: 0, cost: 0 };
      }
      map[r.model].calls += r.calls;
      map[r.model].tokens += r.prompt_tokens + r.completion_tokens;
      map[r.model].cost += r.estimated_cost_usd;
    }
    return Object.entries(map)
      .map(([model, v]) => ({ model, ...v }))
      .sort((a, b) => b.cost - a.cost);
  }, [rows]);

  // By tenant (admin only)
  const byTenant = useMemo(() => {
    if (!session.isAdmin) return [];
    const map: Record<string, { calls: number; tokens: number; cost: number }> = {};
    for (const r of rows) {
      if (!map[r.user_id]) {
        map[r.user_id] = { calls: 0, tokens: 0, cost: 0 };
      }
      map[r.user_id].calls += r.calls;
      map[r.user_id].tokens += r.prompt_tokens + r.completion_tokens;
      map[r.user_id].cost += r.estimated_cost_usd;
    }
    return Object.entries(map)
      .map(([userId, v]) => ({ userId, ...v }))
      .sort((a, b) => b.cost - a.cost);
  }, [rows, session.isAdmin]);

  const DAY_OPTIONS = [7, 30, 90] as const;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart2 className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="font-heading text-xl font-semibold text-ink">Usage &amp; Cost</h1>
        </div>
        {/* Day range picker */}
        <div className="flex items-center gap-1 rounded-xl border border-white/40 bg-white/30 p-1 backdrop-blur-sm">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDays(d)}
              className={`rounded-lg px-3 py-1 text-sm font-semibold transition-colors duration-150 ${
                selectedDays === d
                  ? 'bg-primary text-primary-fg shadow-sm'
                  : 'text-muted hover:bg-white/50 hover:text-ink'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-border border-t-primary" />
            <p className="text-sm text-muted">Loading usage data…</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <BarChart2 className="h-10 w-10 text-muted/40" aria-hidden />
          <p className="font-semibold text-ink">No usage data yet</p>
          <p className="text-sm text-muted">
            Usage will appear here once API calls are made in the last {selectedDays} days.
          </p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={<DollarSign className="h-4 w-4" aria-hidden />}
              label="Total cost"
              value={formatCost(stats.totalCost)}
              sub={`Last ${selectedDays} days`}
            />
            <StatCard
              icon={<Cpu className="h-4 w-4" aria-hidden />}
              label="Total tokens"
              value={formatTokens(stats.totalTokens)}
              sub="Input + output"
            />
            <StatCard
              icon={<Activity className="h-4 w-4" aria-hidden />}
              label="Total calls"
              value={stats.totalCalls.toLocaleString()}
            />
            <StatCard
              icon={<BarChart2 className="h-4 w-4" aria-hidden />}
              label="Top model"
              value={stats.topModel}
              sub="By call count"
            />
          </div>

          {/* Cost by day chart */}
          {costByDay.length > 0 ? (
            <div className="glass-panel rounded-2xl p-5 shadow-card">
              <h2 className="mb-4 font-heading text-sm font-semibold text-ink">Cost by day</h2>
              <div className="flex h-36 items-end gap-1 overflow-x-auto pb-1">
                {costByDay.map(({ date, cost }) => {
                  const heightPct = (cost / maxDayCost) * 100;
                  const shortDate = date.slice(5); // MM-DD
                  return (
                    <div
                      key={date}
                      className="group flex min-w-[2rem] flex-1 flex-col items-center gap-1"
                      title={`${date}: ${formatCost(cost)}`}
                    >
                      <div className="relative flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-md bg-primary/60 transition-all duration-200 group-hover:bg-primary"
                          style={{ height: `${Math.max(heightPct, 2)}%` }}
                        />
                      </div>
                      <span className="text-[9px] tabular-nums text-muted">{shortDate}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Cost by model table */}
          {byModel.length > 0 ? (
            <div className="glass-panel rounded-2xl shadow-card">
              <div className="border-b border-white/40 px-5 py-3.5">
                <h2 className="font-heading text-sm font-semibold text-ink">Cost by model</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/30 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <th className="px-5 py-3">Model</th>
                      <th className="px-5 py-3">Provider</th>
                      <th className="px-5 py-3 text-right">Calls</th>
                      <th className="px-5 py-3 text-right">Tokens</th>
                      <th className="px-5 py-3 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byModel.map(({ model, provider, calls, tokens, cost }) => (
                      <tr
                        key={model}
                        className="border-b border-white/20 last:border-0 hover:bg-white/20"
                      >
                        <td className="px-5 py-3 font-medium text-ink">{model}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white ${providerColor(provider)}`}
                          >
                            {provider}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted">
                          {calls.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted">
                          {formatTokens(tokens)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold text-ink">
                          {formatCost(cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* By tenant — admin only */}
          {session.isAdmin && byTenant.length > 0 ? (
            <div className="glass-panel rounded-2xl shadow-card">
              <div className="border-b border-white/40 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted" aria-hidden />
                  <h2 className="font-heading text-sm font-semibold text-ink">By tenant</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/30 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <th className="px-5 py-3">User</th>
                      <th className="px-5 py-3 text-right">Calls</th>
                      <th className="px-5 py-3 text-right">Tokens</th>
                      <th className="px-5 py-3 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byTenant.map(({ userId, calls, tokens, cost }) => (
                      <tr
                        key={userId}
                        className="border-b border-white/20 last:border-0 hover:bg-white/20"
                      >
                        <td className="px-5 py-3 font-medium text-ink">{userId}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted">
                          {calls.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted">
                          {formatTokens(tokens)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold text-ink">
                          {formatCost(cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
