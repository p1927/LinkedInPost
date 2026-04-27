import { describe, it, expect, vi } from 'vitest';
import { handleWaitlist } from '../waitlist';

function makeRequest(method: string, body?: unknown): Request {
  return new Request('https://example.com/api/waitlist', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeDb(): D1Database {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) }),
    }),
  } as unknown as D1Database;
}

describe('handleWaitlist', () => {
  it('returns 405 for GET request', async () => {
    const res = await handleWaitlist(makeRequest('GET'), makeDb());
    expect(res.status).toBe(405);
  });

  it('returns 405 for PUT request', async () => {
    const res = await handleWaitlist(makeRequest('PUT', {}), makeDb());
    expect(res.status).toBe(405);
  });

  it('returns 400 when body is not valid JSON', async () => {
    const req = new Request('https://example.com/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await handleWaitlist(req, makeDb());
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const res = await handleWaitlist(makeRequest('POST', { name: 'Alice' }), makeDb());
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/email/i);
  });

  it('returns 400 when email has no @ symbol', async () => {
    const res = await handleWaitlist(makeRequest('POST', { email: 'notanemail' }), makeDb());
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/email/i);
  });

  it('returns 400 when email is an empty string', async () => {
    const res = await handleWaitlist(makeRequest('POST', { email: '' }), makeDb());
    expect(res.status).toBe(400);
  });

  it('returns 201 with ok:true for valid email', async () => {
    const db = makeDb();
    const res = await handleWaitlist(makeRequest('POST', { email: 'user@example.com' }), db);
    expect(res.status).toBe(201);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it('calls db.prepare when email is valid', async () => {
    const db = makeDb();
    await handleWaitlist(makeRequest('POST', { email: 'user@example.com' }), db);
    expect(db.prepare).toHaveBeenCalled();
  });

  it('returns 201 when valid email, name and reason are provided', async () => {
    const db = makeDb();
    const res = await handleWaitlist(
      makeRequest('POST', { email: 'alice@example.com', name: 'Alice', reason: 'To grow my network' }),
      db,
    );
    expect(res.status).toBe(201);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });
});
