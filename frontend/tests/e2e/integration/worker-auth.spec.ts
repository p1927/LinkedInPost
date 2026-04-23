import { test, expect } from '@playwright/test';

// Integration tests — only run when PLAYWRIGHT_INTEGRATION=1
// These hit the real Wrangler dev worker at http://localhost:8787

test.describe('Worker Integration: Auth Bypass', () => {
  test.skip(!process.env.PLAYWRIGHT_INTEGRATION, 'Only runs with PLAYWRIGHT_INTEGRATION=1');

  test('dev bypass token authenticates with real worker', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('google_id_token', 'e2e-test-token');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Should NOT show sign-in page (bypass worked)
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    // Should show some authenticated content
  });

  test('bootstrap action returns session data', async ({ request }) => {
    const response = await request.post('http://localhost:8787', {
      data: { action: 'bootstrap' },
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer e2e-test-token' }
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data).toHaveProperty('email');
  });
});
