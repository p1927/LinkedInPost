import { test, expect } from '@playwright/test';

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';

test.describe('Worker Integration: Usage API', () => {
  test.skip(!process.env.PLAYWRIGHT_INTEGRATION, 'Only runs with PLAYWRIGHT_INTEGRATION=1');

  test('GET /api/usage returns 401 without auth', async ({ request }) => {
    const res = await request.get(`${WORKER_URL}/api/usage`);
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/usage returns usage data for authenticated user', async ({ request }) => {
    test.skip(!process.env.E2E_AUTH_TOKEN, 'Requires E2E_AUTH_TOKEN');
    const res = await request.get(`${WORKER_URL}/api/usage`, {
      headers: { 'Authorization': `Bearer ${process.env.E2E_AUTH_TOKEN}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('used');
    expect(body).toHaveProperty('budget');
    expect(body).toHaveProperty('resetDate');
    expect(typeof body.used).toBe('number');
    expect(typeof body.budget).toBe('number');
  });
});
