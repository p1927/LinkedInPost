import { useEffect, useState } from 'react';
import { BackendApi } from '../../services/backendApi';

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

export default function AdminPanel({ idToken }: { idToken: string }) {
  const api = new BackendApi();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const [u, w] = await Promise.all([
        api.getAdminUsers(idToken),
        api.getAdminWaitlist(idToken),
      ]);
      setUsers(u as UserRow[]);
      setWaitlist(w as WaitlistRow[]);
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

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;

  if (error) {
    return (
      <div className="p-8 text-destructive">
        <p>Error: {error}</p>
        <button onClick={() => { setLoading(true); void load(); }} className="mt-2 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      {waitlist.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Waitlist ({waitlist.length})</h2>
          <div className="border rounded-xl divide-y">
            {waitlist.map(r => (
              <div key={r.email} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{r.name ? `${r.name} (${r.email})` : r.email}</p>
                  {r.reason && <p className="text-muted-foreground">{r.reason}</p>}
                </div>
                <button
                  onClick={() => void handleApprove(r.email)}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium"
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Users ({users.length})</h2>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-sm">No users found.</p>
        ) : (
          <div className="border rounded-xl divide-y">
            {users.map(u => {
              const pct = u.monthly_token_budget > 0
                ? Math.round((u.monthly_tokens_used / u.monthly_token_budget) * 100)
                : 0;
              return (
                <div key={u.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{u.display_name || u.id}</p>
                    <p className="text-muted-foreground text-xs">{u.id} · {u.status}</p>
                    <p className="text-muted-foreground text-xs">
                      {(u.monthly_tokens_used / 1000).toFixed(0)}k / {(u.monthly_token_budget / 1000).toFixed(0)}k tokens ({pct}%)
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => void handleBudget(u.id, u.monthly_token_budget)}
                      className="px-2 py-1 border rounded text-xs"
                    >
                      Budget
                    </button>
                    {u.status === 'active' ? (
                      <button
                        onClick={() => void handleSuspend(u.id)}
                        className="px-2 py-1 border rounded text-xs text-destructive"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => void handleApprove(u.id)}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
