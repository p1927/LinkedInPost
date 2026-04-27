import { test, expect } from '@playwright/test';

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';

test.describe('Worker Integration: Admin API', () => {
  test.skip(!process.env.PLAYWRIGHT_INTEGRATION, 'Only runs with PLAYWRIGHT_INTEGRATION=1');

  test('GET /api/admin/users returns 401 without auth token', async ({ request }) => {
    const res = await request.get(`${WORKER_URL}/api/admin/users`);
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/admin/users returns 401 or 403 for invalid bearer token', async ({ request }) => {
    const res = await request.get(`${WORKER_URL}/api/admin/users`, {
      headers: { 'Authorization': 'Bearer invalid-token' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/admin/waitlist returns 401 without auth', async ({ request }) => {
    const res = await request.get(`${WORKER_URL}/api/admin/waitlist`);
    expect([401, 403]).toContain(res.status());
  });

  test('admin token can list users', async ({ request }) => {
    test.skip(!process.env.E2E_ADMIN_TOKEN, 'Requires E2E_ADMIN_TOKEN');
    const res = await request.get(`${WORKER_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${process.env.E2E_ADMIN_TOKEN}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
