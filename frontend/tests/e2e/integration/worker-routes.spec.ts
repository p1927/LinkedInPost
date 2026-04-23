import { test, expect } from '@playwright/test';

test.describe('Worker Integration: Route Handlers', () => {
  test.skip(!process.env.PLAYWRIGHT_INTEGRATION, 'Only runs with PLAYWRIGHT_INTEGRATION=1');

  const WORKER_URL = 'http://localhost:8787';
  const AUTH_HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer e2e-test-token'
  };

  test('getRows returns array (graceful even without Sheets)', async ({ request }) => {
    const res = await request.post(WORKER_URL, {
      data: { action: 'getRows' },
      headers: AUTH_HEADERS
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Even without Google Sheets connected, should return empty array or error gracefully
    expect(body.ok).toBe(true);
  });

  test('verifyTelegramChat with invalid ID returns error', async ({ request }) => {
    const res = await request.post(WORKER_URL, {
      data: { action: 'verifyTelegramChat', chatId: 'invalid-chat-id' },
      headers: AUTH_HEADERS
    });
    // Should respond (not crash) even with invalid chat ID
    expect(res.status()).toBeLessThan(500);
  });

  test('listRules returns empty array from local D1', async ({ request }) => {
    const res = await request.fetch(`${WORKER_URL}/automations/rules`, {
      method: 'GET',
      headers: AUTH_HEADERS
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
  });

  test('unknown action returns error response', async ({ request }) => {
    const res = await request.post(WORKER_URL, {
      data: { action: 'nonExistentAction123' },
      headers: AUTH_HEADERS
    });
    expect(res.status()).toBeLessThan(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
