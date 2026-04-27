# SaaS / Hosted Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-tenant LinkedIn Post app into a multi-tenant SaaS where any invited user logs in with Google, gets their own isolated workspace, and the owner (admin) manages access and monitors usage.

**Architecture:** Auth moves from a hardcoded `ALLOWED_EMAILS` env var to a DB-driven `users` table with a `status` column (`pending` | `active` | `suspended`). New users see a landing page with a waitlist form; admins approve them via an admin panel. The owner pays all LLM costs but each user gets a configurable monthly token budget enforced by the Worker before every generation call.

**Tech Stack:** Cloudflare Workers + D1 (existing), React 19 + Vite (existing), Tailwind + Shadcn/ui (existing), existing `llm_usage_log` table for budget tracking.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `worker/migrations/0021_user_status_budget.sql` | Create | Add `status`, `monthly_token_budget` columns to `users`; new `access_requests` table |
| `worker/src/db/users.ts` | Modify | Add `getUserStatus`, `approveUser`, `suspendUser`, `getMonthlyUsage`, `checkBudget` |
| `worker/src/auth.ts` | Create | Extract auth middleware from index.ts; DB-based status check |
| `worker/src/routes/waitlist.ts` | Create | Public `POST /api/waitlist` endpoint |
| `worker/src/routes/admin.ts` | Create | Admin endpoints: list users, waitlist, approve, suspend, set budget |
| `worker/src/index.ts` | Modify | Wire new auth middleware; remove ALLOWED_EMAILS check; add new routes |
| `frontend/src/pages/Landing.tsx` | Create | Public landing page with product description + waitlist form |
| `frontend/src/pages/AdminPanel.tsx` | Create | Admin UI: user list, waitlist queue, token usage table |
| `frontend/src/components/UsageMeter.tsx` | Create | Header chip showing current month token usage vs budget |
| `frontend/src/App.tsx` | Modify | Add public `/` landing route; `/admin` route (admin-only); pass usage data |
| `frontend/src/services/backendApi.ts` | Modify | Add `submitWaitlist`, `getAdminUsers`, `approveUser`, `suspendUser`, `setBudget` |

---

## Task 1: DB Migration — user status + access requests

**Files:**
- Create: `worker/migrations/0021_user_status_budget.sql`

- [ ] **Step 1: Write the migration**

```sql
-- worker/migrations/0021_user_status_budget.sql
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN monthly_token_budget INTEGER NOT NULL DEFAULT 500000;

CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT
);
```

- [ ] **Step 2: Apply migration locally**

```bash
cd worker && npx wrangler d1 migrations apply linkedin-pipeline-db --local --env local
```

Expected: `✅ Applied 1 migration`

- [ ] **Step 3: Apply to production**

```bash
cd worker && npx wrangler d1 migrations apply linkedin-pipeline-db
```

- [ ] **Step 4: Commit**

```bash
git add worker/migrations/0021_user_status_budget.sql
git commit -m "feat(db): add user status/budget and access_requests table"
```

---

## Task 2: Extend `worker/src/db/users.ts`

**Files:**
- Modify: `worker/src/db/users.ts`

- [ ] **Step 1: Read the existing file** to understand current signatures before editing.

- [ ] **Step 2: Add new DB functions**

Add these functions at the end of `worker/src/db/users.ts`:

```typescript
export async function getUserStatus(db: D1Database, userId: string): Promise<'active' | 'pending' | 'suspended' | null> {
  const row = await db.prepare('SELECT status FROM users WHERE id = ?').bind(userId).first<{ status: string }>();
  return row ? (row.status as 'active' | 'pending' | 'suspended') : null;
}

export async function setUserStatus(db: D1Database, userId: string, status: 'active' | 'suspended'): Promise<void> {
  await db.prepare('UPDATE users SET status = ? WHERE id = ?').bind(status, userId).run();
}

export async function setUserBudget(db: D1Database, userId: string, monthlyTokenBudget: number): Promise<void> {
  await db.prepare('UPDATE users SET monthly_token_budget = ? WHERE id = ?').bind(monthlyTokenBudget, userId).run();
}

export async function getMonthlyTokenUsage(db: D1Database, userId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(total_tokens), 0) as used
       FROM llm_usage_log
       WHERE user_id = ? AND created_at >= ?`
    )
    .bind(userId, start.toISOString())
    .first<{ used: number }>();
  return row?.used ?? 0;
}

export async function getUserBudget(db: D1Database, userId: string): Promise<number> {
  const row = await db.prepare('SELECT monthly_token_budget FROM users WHERE id = ?').bind(userId).first<{ monthly_token_budget: number }>();
  return row?.monthly_token_budget ?? 500000;
}

export async function createAccessRequest(db: D1Database, id: string, email: string, name: string | null, reason: string | null): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO access_requests (id, email, name, reason) VALUES (?, ?, ?, ?)')
    .bind(id, email, name, reason)
    .run();
}

export async function listAccessRequests(db: D1Database, status: 'pending' | 'approved' | 'rejected' = 'pending') {
  return db.prepare('SELECT * FROM access_requests WHERE status = ? ORDER BY created_at DESC').bind(status).all();
}

export async function resolveAccessRequest(db: D1Database, email: string, decision: 'approved' | 'rejected', reviewedBy: string): Promise<void> {
  await db
    .prepare('UPDATE access_requests SET status = ?, reviewed_at = datetime(\'now\'), reviewed_by = ? WHERE email = ?')
    .bind(decision, reviewedBy, email)
    .run();
}

export async function listAllUsers(db: D1Database) {
  return db.prepare('SELECT id, display_name, avatar_url, status, monthly_token_budget, created_at FROM users ORDER BY created_at DESC').all();
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd worker && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add worker/src/db/users.ts
git commit -m "feat(db): add user status/budget/waitlist query functions"
```

---

## Task 3: Extract auth middleware into `worker/src/auth.ts`

**Files:**
- Create: `worker/src/auth.ts`
- Modify: `worker/src/index.ts`

The current `ALLOWED_EMAILS` check lives inside the auth validation section of `index.ts`. This task moves it to a reusable function and replaces the env-var check with a DB lookup.

- [ ] **Step 1: Read current auth code** — search `index.ts` for `ALLOWED_EMAILS` and `idToken` to understand the current flow.

- [ ] **Step 2: Create `worker/src/auth.ts`**

```typescript
// worker/src/auth.ts
import { getUserStatus } from './db/users';

export interface AuthResult {
  ok: true;
  userId: string;
  email: string;
  isAdmin: boolean;
} | {
  ok: false;
  status: 403 | 401 | 429;
  message: string;
}

export async function validateGoogleToken(idToken: string, googleClientId: string): Promise<{ email: string; name: string; picture: string } | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!res.ok) return null;
    const data = await res.json() as { email: string; name: string; picture: string; aud: string };
    if (data.aud !== googleClientId) return null;
    return { email: data.email.toLowerCase(), name: data.name, picture: data.picture };
  } catch {
    return null;
  }
}

export async function checkUserAccess(
  db: D1Database,
  email: string,
  adminEmails: string
): Promise<{ allowed: boolean; suspended: boolean; isAdmin: boolean }> {
  const isAdmin = adminEmails.split(' ').map(e => e.trim().toLowerCase()).includes(email);
  const status = await getUserStatus(db, email);

  if (status === null) {
    // Unknown user — not yet registered
    return { allowed: false, suspended: false, isAdmin };
  }
  if (status === 'suspended') {
    return { allowed: false, suspended: true, isAdmin };
  }
  return { allowed: status === 'active', suspended: false, isAdmin };
}
```

- [ ] **Step 3: Update `worker/src/index.ts`** — replace the existing `ALLOWED_EMAILS` check block with:

```typescript
import { validateGoogleToken, checkUserAccess } from './auth';

// Inside the auth handler (where idToken is validated):
const googleUser = await validateGoogleToken(idToken, env.GOOGLE_CLIENT_ID);
if (!googleUser) {
  return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
}

const { allowed, suspended, isAdmin } = await checkUserAccess(env.PIPELINE_DB, googleUser.email, env.ADMIN_EMAILS);
if (suspended) {
  return new Response(JSON.stringify({ error: 'Account suspended. Contact support.' }), { status: 403 });
}
if (!allowed) {
  return new Response(JSON.stringify({ error: 'Access not granted. Request access at the homepage.' }), { status: 403 });
}
```

- [ ] **Step 4: Remove `ALLOWED_EMAILS` from auth logic in `index.ts`** (keep the env var in `wrangler.jsonc` for now as it's referenced by type bindings, but the auth check no longer reads it for access control).

- [ ] **Step 5: Run TypeScript check**

```bash
cd worker && npx tsc --noEmit
```

- [ ] **Step 6: Test locally** — start `npx wrangler dev --env local`, try logging in with an email that has `status = 'active'` in local D1, confirm access. Try an unknown email, confirm 403 with correct message.

- [ ] **Step 7: Commit**

```bash
git add worker/src/auth.ts worker/src/index.ts
git commit -m "feat(auth): replace ALLOWED_EMAILS env check with DB-driven user status"
```

---

## Task 4: Token budget enforcement in Worker

**Files:**
- Modify: `worker/src/index.ts` (generation endpoints)

Every endpoint that triggers LLM generation must check the user's remaining budget before proceeding.

- [ ] **Step 1: Find all generation call sites** in `worker/src/index.ts` and `worker/src/routes/` — search for calls to `generateDraft`, `callLLM`, or similar.

- [ ] **Step 2: Add a budget check helper** to `worker/src/auth.ts`:

```typescript
import { getMonthlyTokenUsage, getUserBudget } from './db/users';

export async function checkTokenBudget(db: D1Database, userId: string): Promise<{ allowed: boolean; used: number; budget: number }> {
  const [used, budget] = await Promise.all([
    getMonthlyTokenUsage(db, userId),
    getUserBudget(db, userId),
  ]);
  return { allowed: used < budget, used, budget };
}
```

- [ ] **Step 3: Add budget check at generation endpoints** — before each LLM call:

```typescript
const budgetCheck = await checkTokenBudget(env.PIPELINE_DB, userId);
if (!budgetCheck.allowed) {
  return new Response(
    JSON.stringify({
      error: 'Monthly token budget exceeded',
      used: budgetCheck.used,
      budget: budgetCheck.budget,
    }),
    { status: 429 }
  );
}
```

- [ ] **Step 4: Add `GET /api/usage` endpoint** for the frontend to display:

```typescript
// In index.ts route handling:
if (path === '/api/usage' && method === 'GET') {
  const [used, budget] = await Promise.all([
    getMonthlyTokenUsage(env.PIPELINE_DB, userId),
    getUserBudget(env.PIPELINE_DB, userId),
  ]);
  return okJson({ used, budget, resetDate: getNextMonthStart() });
}

function getNextMonthStart(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
```

- [ ] **Step 5: TypeScript check + commit**

```bash
cd worker && npx tsc --noEmit
git add worker/src/auth.ts worker/src/index.ts
git commit -m "feat(budget): enforce monthly token budget on generation endpoints"
```

---

## Task 5: Waitlist API endpoint

**Files:**
- Create: `worker/src/routes/waitlist.ts`
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Create `worker/src/routes/waitlist.ts`**

```typescript
import { createId } from '@paralleldrive/cuid2'; // or use crypto.randomUUID()
import { createAccessRequest } from '../db/users';

export async function handleWaitlist(request: Request, db: D1Database): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: { email?: string; name?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const email = (body.email ?? '').toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400 });
  }

  await createAccessRequest(db, crypto.randomUUID(), email, body.name ?? null, body.reason ?? null);
  return new Response(JSON.stringify({ ok: true, message: 'Request received. You will hear back by email.' }), { status: 201 });
}
```

- [ ] **Step 2: Register in `worker/src/index.ts`**:

```typescript
import { handleWaitlist } from './routes/waitlist';

// In route handling (before auth check, public endpoint):
if (path === '/api/waitlist') {
  return handleWaitlist(request, env.PIPELINE_DB);
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
cd worker && npx tsc --noEmit
git add worker/src/routes/waitlist.ts worker/src/index.ts
git commit -m "feat(waitlist): add public POST /api/waitlist endpoint"
```

---

## Task 6: Admin API endpoints

**Files:**
- Create: `worker/src/routes/admin.ts`
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Create `worker/src/routes/admin.ts`**

```typescript
import { listAllUsers, listAccessRequests, setUserStatus, setUserBudget, resolveAccessRequest, getMonthlyTokenUsage } from '../db/users';

export async function handleAdmin(request: Request, db: D1Database, path: string, method: string): Promise<Response> {
  // GET /api/admin/users
  if (path === '/api/admin/users' && method === 'GET') {
    const { results } = await listAllUsers(db);
    const withUsage = await Promise.all(
      (results as any[]).map(async (u) => ({
        ...u,
        monthly_tokens_used: await getMonthlyTokenUsage(db, u.id),
      }))
    );
    return okJson(withUsage);
  }

  // GET /api/admin/waitlist
  if (path === '/api/admin/waitlist' && method === 'GET') {
    const { results } = await listAccessRequests(db, 'pending');
    return okJson(results);
  }

  // POST /api/admin/users/:email/approve
  const approveMatch = path.match(/^\/api\/admin\/users\/(.+)\/approve$/);
  if (approveMatch && method === 'POST') {
    const email = decodeURIComponent(approveMatch[1]);
    await setUserStatus(db, email, 'active');
    await resolveAccessRequest(db, email, 'approved', 'admin');
    return okJson({ ok: true });
  }

  // POST /api/admin/users/:email/suspend
  const suspendMatch = path.match(/^\/api\/admin\/users\/(.+)\/suspend$/);
  if (suspendMatch && method === 'POST') {
    const email = decodeURIComponent(suspendMatch[1]);
    await setUserStatus(db, email, 'suspended');
    return okJson({ ok: true });
  }

  // POST /api/admin/users/:email/budget  { budget: number }
  const budgetMatch = path.match(/^\/api\/admin\/users\/(.+)\/budget$/);
  if (budgetMatch && method === 'POST') {
    const email = decodeURIComponent(budgetMatch[1]);
    const body = await request.json() as { budget?: number };
    if (!body.budget || body.budget < 0) {
      return new Response(JSON.stringify({ error: 'budget must be a positive number' }), { status: 400 });
    }
    await setUserBudget(db, email, body.budget);
    return okJson({ ok: true });
  }

  return new Response('Not Found', { status: 404 });
}

function okJson(data: unknown): Response {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
```

- [ ] **Step 2: Register in `worker/src/index.ts`** — after auth is confirmed and `isAdmin` is true:

```typescript
import { handleAdmin } from './routes/admin';

// Inside authenticated request handling:
if (path.startsWith('/api/admin/')) {
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
  }
  return handleAdmin(request, env.PIPELINE_DB, path, method);
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
cd worker && npx tsc --noEmit
git add worker/src/routes/admin.ts worker/src/index.ts
git commit -m "feat(admin): add user management and waitlist admin endpoints"
```

---

## Task 7: Frontend API client additions

**Files:**
- Modify: `frontend/src/services/backendApi.ts`

- [ ] **Step 1: Read the existing `backendApi.ts`** to understand current call patterns (base URL, auth headers).

- [ ] **Step 2: Add new functions** at the end of `backendApi.ts`:

```typescript
export async function submitWaitlist(email: string, name?: string, reason?: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, reason }),
  });
  return res.json();
}

export async function getUsage(idToken: string): Promise<{ used: number; budget: number; resetDate: string }> {
  const res = await authFetch('/api/usage', idToken);
  return res.json();
}

export async function getAdminUsers(idToken: string): Promise<any[]> {
  const res = await authFetch('/api/admin/users', idToken);
  return res.json();
}

export async function getAdminWaitlist(idToken: string): Promise<any[]> {
  const res = await authFetch('/api/admin/waitlist', idToken);
  return res.json();
}

export async function approveUser(idToken: string, email: string): Promise<void> {
  await authFetch(`/api/admin/users/${encodeURIComponent(email)}/approve`, idToken, 'POST');
}

export async function suspendUser(idToken: string, email: string): Promise<void> {
  await authFetch(`/api/admin/users/${encodeURIComponent(email)}/suspend`, idToken, 'POST');
}

export async function setUserBudget(idToken: string, email: string, budget: number): Promise<void> {
  await authFetch(`/api/admin/users/${encodeURIComponent(email)}/budget`, idToken, 'POST', { budget });
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/backendApi.ts
git commit -m "feat(api): add usage, waitlist, and admin API client functions"
```

---

## Task 8: Landing page with waitlist form

**Files:**
- Create: `frontend/src/pages/Landing.tsx`

- [ ] **Step 1: Create `frontend/src/pages/Landing.tsx`**

```tsx
import { useState } from 'react';
import { submitWaitlist } from '../services/backendApi';

export default function Landing({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await submitWaitlist(email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">LinkedIn Post Studio</h1>
        <p className="text-muted-foreground text-lg">
          AI-powered content calendar for LinkedIn, Instagram, and more. Write once, publish everywhere.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onLogin}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
          >
            Sign in with Google
          </button>
        </div>

        <div className="border rounded-xl p-6 text-left space-y-4">
          <h2 className="font-semibold text-lg">Request access</h2>
          {submitted ? (
            <p className="text-green-600 dark:text-green-400">
              Done! You are on the list. Expect an email within a few days.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition"
              >
                Join waitlist
              </button>
            </form>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat(landing): add public landing page with waitlist form"
```

---

## Task 9: Usage meter component

**Files:**
- Create: `frontend/src/components/UsageMeter.tsx`

- [ ] **Step 1: Create `frontend/src/components/UsageMeter.tsx`**

```tsx
interface UsageMeterProps {
  used: number;
  budget: number;
  resetDate: string;
}

export default function UsageMeter({ used, budget, resetDate }: UsageMeterProps) {
  const pct = Math.min(100, Math.round((used / budget) * 100));
  const color = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';
  const formattedUsed = (used / 1000).toFixed(0);
  const formattedBudget = (budget / 1000).toFixed(0);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" title={`Resets ${new Date(resetDate).toLocaleDateString()}`}>
      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span>{formattedUsed}k / {formattedBudget}k tokens</span>
    </div>
  );
}
```

- [ ] **Step 2: Wire into the app header** — find the header/navbar component in `frontend/src/`, fetch usage on mount, pass to `<UsageMeter />`.

- [ ] **Step 3: TypeScript check + commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/UsageMeter.tsx
git commit -m "feat(ui): add token usage meter to header"
```

---

## Task 10: Admin panel page

**Files:**
- Create: `frontend/src/pages/AdminPanel.tsx`

- [ ] **Step 1: Create `frontend/src/pages/AdminPanel.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { getAdminUsers, getAdminWaitlist, approveUser, suspendUser, setUserBudget } from '../services/backendApi';

interface UserRow { id: string; display_name: string; status: string; monthly_token_budget: number; monthly_tokens_used: number; }
interface WaitlistRow { email: string; name: string; reason: string; created_at: string; }

export default function AdminPanel({ idToken }: { idToken: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [u, w] = await Promise.all([getAdminUsers(idToken), getAdminWaitlist(idToken)]);
    setUsers(u);
    setWaitlist(w);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(email: string) {
    await approveUser(idToken, email);
    await load();
  }

  async function handleSuspend(email: string) {
    await suspendUser(idToken, email);
    await load();
  }

  async function handleBudget(email: string) {
    const input = prompt(`New monthly token budget for ${email} (current in thousands):`);
    if (!input) return;
    await setUserBudget(idToken, email, parseInt(input) * 1000);
    await load();
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;

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
                  <p className="font-medium">{r.email}</p>
                  {r.reason && <p className="text-muted-foreground">{r.reason}</p>}
                </div>
                <button
                  onClick={() => handleApprove(r.email)}
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
        <div className="border rounded-xl divide-y">
          {users.map(u => {
            const pct = Math.round((u.monthly_tokens_used / u.monthly_token_budget) * 100);
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
                  <button onClick={() => handleBudget(u.id)} className="px-2 py-1 border rounded text-xs">Budget</button>
                  {u.status === 'active'
                    ? <button onClick={() => handleSuspend(u.id)} className="px-2 py-1 border rounded text-xs text-destructive">Suspend</button>
                    : <button onClick={() => handleApprove(u.id)} className="px-2 py-1 border rounded text-xs">Activate</button>
                  }
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check + commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/pages/AdminPanel.tsx
git commit -m "feat(admin): add admin panel for user and waitlist management"
```

---

## Task 11: Wire routes in `frontend/src/App.tsx`

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Read `App.tsx`** to understand current routing structure.

- [ ] **Step 2: Add public landing route** — if user is not authenticated, show `<Landing>` instead of login redirect. Wire `/admin` route for admin users.

```tsx
// Inside App routing:
// Unauthenticated root
<Route path="/" element={!isAuthenticated ? <Landing onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />

// Admin route (inside authenticated routes):
{isAdmin && <Route path="/admin" element={<AdminPanel idToken={idToken} />} />}
```

- [ ] **Step 3: Add admin nav link** — in the sidebar/header, show "Admin" link when `isAdmin` is true.

- [ ] **Step 4: Handle 403 "Access not granted"** — when the worker returns this error on login, show a message: "Your access request is pending. You'll receive an email when approved."

- [ ] **Step 5: TypeScript check + commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/App.tsx
git commit -m "feat(routing): add landing page route and admin panel route"
```

---

## Task 12: Seed existing users as `active` in D1

The migration defaults new users to `active`, but existing users created before this migration will have `status = NULL` in older rows if the DEFAULT wasn't applied retroactively. Backfill them.

- [ ] **Step 1: Run backfill on production D1**

```bash
cd worker && npx wrangler d1 execute linkedin-pipeline-db \
  --command "UPDATE users SET status = 'active' WHERE status IS NULL OR status = ''"
```

Expected output: `Success`

- [ ] **Step 2: Verify**

```bash
cd worker && npx wrangler d1 execute linkedin-pipeline-db \
  --command "SELECT id, status FROM users"
```

Confirm all existing users show `status = 'active'`.

---

## Verification

- [ ] **Local E2E**: Start `npx wrangler dev --env local` + `npm run dev` in frontend. 
  - Visit `/` — see landing page.
  - Submit waitlist form with a test email — check D1 `access_requests` table.
  - Log in with an active user — confirm redirect to dashboard.
  - Log in with an unknown email — see "access pending" message.
  - As admin user, visit `/admin` — see waitlist and user list.
  - Approve waitlist user — confirm they can now log in.
  - Run a generation — confirm token usage increments in the meter.
  - Set a budget of 1 token on a user — confirm next generation returns 429.
- [ ] **Playwright tests**: Run `npm run test:e2e` in frontend and confirm no regressions.
- [ ] **TypeScript**: `cd worker && npx tsc --noEmit` + `cd frontend && npx tsc --noEmit` — zero errors.
- [ ] **Deploy to production**: `python setup.py --deploy-worker` then push frontend to GitHub Pages.
