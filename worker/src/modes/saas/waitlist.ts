// worker/src/routes/waitlist.ts
import { createAccessRequest } from '../../db/users';

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
  return new Response(
    JSON.stringify({ ok: true, message: 'Request received. You will hear back by email.' }),
    { status: 201, headers: { 'Content-Type': 'application/json' } },
  );
}
