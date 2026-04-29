import { useEffect, useState } from 'react';
import { BackendApi } from '../../services/backendApi';
import { deploymentMode } from '../../generated/features';
import { Users, Clock, AlertTriangle, RefreshCw, ShieldCheck, Loader2 } from 'lucide-react';

interface UserRow {
  id: string;
  display_name: string;
  status: string;
  monthly_token_budget: number;
  monthly_tokens_used: number;
}

interface WaitlistRow {
  email: string;
  name: string;
  reason: string;
  created_at: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

function TokenBar({ used, budget }: { used: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  const color = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary';
  return (
    <div className="mt-2 flex items-center gap-2.5">
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted">
        {(used / 1000).toFixed(0)}k / {(budget / 1000).toFixed(0)}k tokens ({pct}%)
      </span>
    </div>
  );
}

export default function AdminPanel({ idToken, api: apiProp }: { idToken: string; api?: BackendApi }) {
  const api = apiProp ?? new BackendApi();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    setLoading(true);
    try {
      const [u, w] = await Promise.all([
        api.getAdminUsers(idToken),
        api.getAdminWaitlist(idToken),
      ]);
      setUsers(u as unknown as UserRow[]);
      setWaitlist(w as unknown as WaitlistRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleApprove(userId: string) {
    await api.approveUserAccess(idToken, userId);
    await load();
  }

  async function handleSuspend(userId: string) {
    await api.suspendUserAccess(idToken, userId);
    await load();
  }

  async function handleBudget(userId: string, currentBudget: number) {
    const input = prompt(
      `New monthly token budget for ${userId} (in thousands, current: ${(currentBudget / 1000).toFixed(0)}k):`,
    );
    if (!input) return;
    const parsed = parseInt(input, 10);
    if (isNaN(parsed) || parsed <= 0) return;
    await api.setMonthlyTokenBudget(idToken, userId, parsed * 1000);
    await load();
  }

  const isSaas = deploymentMode === 'saas';

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-ink tracking-tight">Admin Panel</h1>
            <p className="text-xs text-muted mt-0.5">Manage users and access</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold ${
            isSaas ? 'bg-primary/8 text-primary border border-primary/15' : 'bg-amber-100 text-amber-700'
          }`}>
            {isSaas ? 'SaaS' : 'Self-Hosted'}
          </span>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white/70 text-muted transition-colors hover:bg-white hover:text-ink disabled:opacity-50 cursor-pointer shadow-sm"
            aria-label="Refresh"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted">Loading admin data…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-800 mb-1">Admin API unavailable</p>
              <p className="text-xs text-rose-700 mb-3 leading-relaxed">
                {isSaas
                  ? `Could not load admin data: ${error}`
                  : 'Admin user management is only available in SaaS deployment. Self-hosted mode does not include the /api/admin/* endpoints.'}
              </p>
              <ul className="space-y-1 font-mono text-[10px] text-rose-600">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  deploymentMode: {deploymentMode}
                </li>
                {isSaas && (
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                    {error}
                  </li>
                )}
              </ul>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 text-xs font-semibold text-rose-700 underline hover:no-underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Waitlist */}
          {waitlist.length > 0 && (
            <section className="glass-panel overflow-hidden rounded-2xl">
              <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-3.5">
                <Clock className="h-4 w-4 text-secondary" />
                <h2 className="text-sm font-semibold text-ink">Waitlist</h2>
                <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  {waitlist.length}
                </span>
              </div>
              <div className="divide-y divide-border/40">
                {waitlist.map((r) => (
                  <div key={r.email} className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-primary/[0.02]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {initials(r.name || r.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {r.name ? `${r.name}` : r.email}
                      </p>
                      <p className="truncate text-xs text-muted mt-0.5">{r.email}</p>
                      {r.reason && <p className="mt-0.5 text-xs text-muted/80 truncate">{r.reason}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleApprove(r.email)}
                      className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 cursor-pointer shrink-0"
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Users */}
          <section className="glass-panel overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-3.5">
              <Users className="h-4 w-4 text-secondary" />
              <h2 className="text-sm font-semibold text-ink">Users</h2>
              <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                {users.length}
              </span>
            </div>
            {users.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-muted">No users found.</p>
                {!isSaas && (
                  <p className="mt-1 text-xs text-muted/70">User management is not available in self-hosted mode.</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {users.map((u) => (
                  <div key={u.id} className="flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-primary/[0.02]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary mt-0.5">
                      {initials(u.display_name || u.id)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{u.display_name || u.id}</p>
                      <p className="text-[10px] text-muted font-mono mt-0.5">{u.id}</p>
                      <TokenBar used={u.monthly_tokens_used} budget={u.monthly_token_budget} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pt-0.5">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        u.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {u.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleBudget(u.id, u.monthly_token_budget)}
                        className="rounded-lg border border-border bg-white/70 px-2.5 py-1.5 text-[10px] font-semibold text-muted hover:bg-white hover:text-ink transition-colors cursor-pointer"
                      >
                        Budget
                      </button>
                      {u.status === 'active' ? (
                        <button
                          type="button"
                          onClick={() => void handleSuspend(u.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-1.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleApprove(u.id)}
                          className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
