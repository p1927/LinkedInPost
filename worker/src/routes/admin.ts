// worker/src/routes/admin.ts
import { listAllUsers, listAccessRequests, setUserStatus, setUserBudget, resolveAccessRequest, getMonthlyTokenUsage } from '../db/users';

function okJson(data: unknown): Response {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}

export async function handleAdmin(request: Request, db: D1Database, path: string, method: string): Promise<Response> {
  // GET /api/admin/users
  if (path === '/api/admin/users' && method === 'GET') {
    const { results } = await listAllUsers(db);
    const withUsage = await Promise.all(
      (results as Array<Record<string, unknown>>).map(async (u) => ({
        ...u,
        monthly_tokens_used: await getMonthlyTokenUsage(db, String(u.id)),
      }))
    );
    return okJson(withUsage);
  }

  // GET /api/admin/waitlist
  if (path === '/api/admin/waitlist' && method === 'GET') {
    const { results } = await listAccessRequests(db, 'pending');
    return okJson(results);
  }

  // POST /api/admin/users/:id/approve
  const approveMatch = path.match(/^\/api\/admin\/users\/(.+)\/approve$/);
  if (approveMatch && method === 'POST') {
    const userId = decodeURIComponent(approveMatch[1]);
    await setUserStatus(db, userId, 'active');
    await resolveAccessRequest(db, userId, 'approved', 'admin');
    return okJson({ ok: true });
  }

  // POST /api/admin/users/:id/suspend
  const suspendMatch = path.match(/^\/api\/admin\/users\/(.+)\/suspend$/);
  if (suspendMatch && method === 'POST') {
    const userId = decodeURIComponent(suspendMatch[1]);
    await setUserStatus(db, userId, 'suspended');
    return okJson({ ok: true });
  }

  // POST /api/admin/users/:id/budget  { budget: number }
  const budgetMatch = path.match(/^\/api\/admin\/users\/(.+)\/budget$/);
  if (budgetMatch && method === 'POST') {
    const userId = decodeURIComponent(budgetMatch[1]);
    let body: { budget?: number } = {};
    try {
      body = await request.json() as { budget?: number };
    } catch {
      // ignore parse errors
    }
    if (!body.budget || body.budget < 0) {
      return new Response(JSON.stringify({ error: 'budget must be a positive number' }), { status: 400 });
    }
    await setUserBudget(db, userId, body.budget);
    return okJson({ ok: true });
  }

  return new Response('Not Found', { status: 404 });
}
