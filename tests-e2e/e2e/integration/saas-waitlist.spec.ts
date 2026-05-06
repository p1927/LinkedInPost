import { test, expect } from '@playwright/test';

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';

test.describe('Worker Integration: Waitlist API', () => {
  test.skip(!process.env.PLAYWRIGHT_INTEGRATION, 'Only runs with PLAYWRIGHT_INTEGRATION=1');

  test('POST /api/waitlist rejects invalid email', async ({ request }) => {
    const res = await request.post(`${WORKER_URL}/api/waitlist`, {
      data: { email: 'not-an-email' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('POST /api/waitlist accepts valid email', async ({ request }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const res = await request.post(`${WORKER_URL}/api/waitlist`, {
      data: { email: testEmail, name: 'Test User', reason: 'E2E test' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('POST /api/waitlist rejects empty body', async ({ request }) => {
    const res = await request.post(`${WORKER_URL}/api/waitlist`, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
  });

  test('GET /api/waitlist returns 405 Method Not Allowed', async ({ request }) => {
    const res = await request.get(`${WORKER_URL}/api/waitlist`);
    expect(res.status()).toBe(405);
  });
});
