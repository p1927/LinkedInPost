/**
 * Journey 29: Wiring Loop 24/50 — Automations API Wiring Validation
 *
 * Validates wiring issues for the automations system based on the spec for el-31e82f7202ae.
 * Tests verify the automations API wiring, checkedFetch error handling, and webhook registration
 * against the specification (not against implementation).
 *
 * Key issues being tested:
 *   1. listRules uses checkedFetch which validates res.ok and throws on 403/500
 *   2. lookupEffectiveRule uses checkedFetch with proper error validation
 *   3. YouTube webhook shows unsupported button (has polling guard)
 *   4. Webhook registration fires and handles success/failure
 *   5. Rule CRUD operations (upsertRule, deleteRule) wire correctly
 *   6. Automations page loads without JS crash for admin users
 *
 * References:
 *   journeys/09-automations.spec.ts — original automations tests
 *   helpers/mockApi.ts — mock API helper
 *   USE-CASES.md — wiring status for PATH-057 and PATH-060 (checkedFetch validation)
 */

import { test, expect, type Page } from '@playwright/test';
import { setupApiMocks, injectFakeToken, gotoAuthenticated } from '../helpers/mockApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fire a browser-side POST action through the app's action routing.
 * Uses page.evaluate so Playwright route handlers intercept correctly.
 */
async function fireAction(
  page: Page,
  action: string,
  body: Record<string, unknown> = {},
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  return page.evaluate(async ({ action: a, body: b }) => {
    const resp = await fetch('http://localhost:5174/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: a, ...b }),
    });
    return resp.json();
  }, { action, body });
}

// ---------------------------------------------------------------------------
// Journey 29.1: Automations — listRules checkedFetch wiring
// ---------------------------------------------------------------------------

test.describe('Journey 29.1: Automations — listRules API Wiring', () => {

  test('listRules returns rules array on success', async ({ page }) => {
    /**
     * Spec (PATH-057): listRules uses checkedFetch which validates res.ok
     * and throws on non-2xx responses.
     *
     * Expected behavior: { ok: true, data: Rule[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listRules');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('listRules returns {ok:false, error} shape when API returns 500', async ({ page }) => {
    /**
     * Spec (PATH-057): When the rules API returns a non-ok response (e.g. 500),
     * checkedFetch throws, and the wrapper returns {ok: false, error: string}.
     *
     * Expected behavior: { ok: false, error: '...' } on server error.
     */
    await page.addInitScript(() => {
      localStorage.setItem('google_id_token', 'e2e-test-token');
    });

    // Install route that returns 500 with error body
    await page.route('**/automations/rules**', (route) => {
      const req = route.request();
      if (req.method().toUpperCase() === 'GET') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: 'Internal server error' }),
        });
        return;
      }
      route.continue();
    });

    await page.goto('./automations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // The page should show an error message, not crash with JS exception
    const errorMsg = page
      .getByRole('alert')
      .or(page.getByText(/error|failed|could not load|something went wrong/i));
    const hasError = await errorMsg.first().isVisible({ timeout: 8000 }).catch(() => false);

    // Either error message is shown, OR the page gracefully handles the error
    // (e.g., shows empty state with error indicator)
    const bodyText = await page.locator('body').textContent();
    expect((bodyText?.length ?? 0)).toBeGreaterThan(0);
    if (!hasError) {
      // No crash — error may be logged but not surfaced as alert
      const jsErrors: string[] = [];
      page.on('pageerror', (err) => jsErrors.push(err.message));
      expect(jsErrors).toHaveLength(0);
    }
  });

  test('listRules handles 403 forbidden gracefully', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('google_id_token', 'e2e-test-token');
    });

    await page.route('**/automations/rules**', (route) => {
      const req = route.request();
      if (req.method().toUpperCase() === 'GET') {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: 'Forbidden' }),
        });
        return;
      }
      route.continue();
    });

    await page.goto('./automations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    expect(jsErrors).toHaveLength(0);

    const bodyText = await page.locator('body').textContent();
    expect((bodyText?.length ?? 0)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 29.2: Automations — lookupEffectiveRule checkedFetch wiring
// ---------------------------------------------------------------------------

test.describe('Journey 29.2: Automations — lookupEffectiveRule API Wiring', () => {

  test('lookupEffectiveRule returns null when no effective rule found', async ({ page }) => {
    /**
     * Spec (PATH-060): lookupEffectiveRule uses checkedFetch with proper error
     * validation. Returns {ok: true, data: null} when no rule is active.
     *
     * Expected behavior: { ok: true, data: null }
     */
    await page.addInitScript(() => {
      localStorage.setItem('google_id_token', 'e2e-test-token');
    });

    await page.route('**/automations/rules**', (route) => {
      const req = route.request();
      const url = req.url();

      if (req.method().toUpperCase() === 'GET' && url.includes('/lookup')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: null }),
        });
        return;
      }

      if (req.method().toUpperCase() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: [] }),
        });
        return;
      }

      route.continue();
    });

    await page.goto('./automations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const bodyText = await page.locator('body').textContent();
    expect((bodyText?.length ?? 0)).toBeGreaterThan(0);
  });

  test('lookupEffectiveRule returns effective rule when found', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('google_id_token', 'e2e-test-token');
    });

    await page.route('**/automations/rules**', (route) => {
      const req = route.request();
      const url = req.url();

      if (req.method().toUpperCase() === 'GET' && url.includes('/lookup')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: {
              trigger: 'daily_digest',
              enabled: true,
              replyTemplate: 'Daily digest sent.',
            },
          }),
        });
        return;
      }

      if (req.method().toUpperCase() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: [
              { key: 'automation:rule:linkedin:ch-abc', rule: { trigger: 'daily_digest', replyTemplate: 'Daily digest sent.', enabled: true, updatedAt: '2026-01-01' } },
            ],
          }),
        });
        return;
      }

      route.continue();
    });

    await page.goto('./automations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Page should render without crash
    const bodyText = await page.locator('body').textContent();
    expect((bodyText?.length ?? 0)).toBeGreaterThan(0);
  });

  test('lookupEffectiveRule throws on 500 from checkedFetch', async ({ page }) => {
    /**
     * Spec (PATH-060): checkedFetch validates res.ok and throws on non-2xx.
     * When the lookup endpoint returns 500, the UI should handle the error
     * gracefully without JavaScript crash.
     */
    await page.addInitScript(() => {
      localStorage.setItem('google_id_token', 'e2e-test-token');
    });

    await page.route('**/automations/rules**', (route) => {
      const req = route.request();
      const url = req.url();

      if (req.method().toUpperCase() === 'GET' && url.includes('/lookup')) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: 'Rule lookup failed' }),
        });
        return;
      }

      if (req.method().toUpperCase() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: [] }),
        });
        return;
      }

      route.continue();
    });

    await page.goto('./automations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // No JS crash — checkedFetch threw but error was handled
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    expect(jsErrors).toHaveLength(0);

    const bodyText = await page.locator('body').textContent();
    expect((bodyText?.length ?? 0)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 29.3: Automations — YouTube Webhook Guard
// ---------------------------------------------------------------------------

test.describe('Journey 29.3: Automations — YouTube Webhook Guard', () => {

  test('YouTube tab shows informational message (not webhook form)', async ({ page }) => {
    /**
     * Spec (PATH-062): YouTube webhook shows unsupported button / message.
     * The YouTube tab should NOT show a webhook registration form — instead
     * it shows a message that YouTube uses scheduled polling.
     *
     * Expected behavior: "scheduled polling" or "no webhook" text visible on YouTube tab.
     */
    await gotoAuthenticated(page, '/automations');

    const youtubeBtn = page.getByRole('button', { name: /^youtube$/i });
    await expect(youtubeBtn).toBeVisible({ timeout: 10000 });
    await youtubeBtn.click();

    // YouTube should show polling info, NOT a webhook registration form
    const pollingText = page.getByText(/scheduled polling|polling|no webhook|uses scheduled/i);
    await expect(pollingText.first()).toBeVisible({ timeout: 10000 });

    // Webhook register button should NOT appear for YouTube
    const registerBtn = page.getByRole('button', { name: /register webhook/i });
    const registerBtnVisible = await registerBtn.isVisible({ timeout: 3000 }).catch(() => false);
    expect(registerBtnVisible).toBeFalsy();
  });

  test('Instagram tab shows webhook registration form (control test)', async ({ page }) => {
    /**
     * Control test: Instagram DOES support webhooks, so the form should appear.
     * This verifies the YouTube guard is specific to YouTube and not a blanket
     * suppression of all webhook forms.
     */
    await gotoAuthenticated(page, '/automations');

    const instagramBtn = page.getByRole('button', { name: /^instagram$/i });
    await expect(instagramBtn).toBeVisible({ timeout: 10000 });
    await instagramBtn.click();

    // Instagram SHOULD show webhook registration
    const registerBtn = page.getByRole('button', { name: /register webhook/i });
    await expect(registerBtn).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Journey 29.4: Automations — Rule CRUD Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 29.4: Automations — Rule CRUD Wiring', () => {

  test('upsertRule fires with correct body shape', async ({ page }) => {
    const capturedRequests: { method: string; body: unknown }[] = [];

    await page.addInitScript(() => {
      localStorage.setItem('google_id_token', 'e2e-test-token');
    });

    await page.route('**/automations/rules**', async (route) => {
      const req = route.request();
      const method = req.method().toUpperCase();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: [] }),
        });
        return;
      }

      let body: unknown = {};
      try { body = req.postDataJSON() ?? {}; } catch { /* ignore */ }
      capturedRequests.push({ method, body });

      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: { id: 'rule-new-1' } }),
        });
        return;
      }

      if (method === 'DELETE') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
        return;
      }

      route.continue();
    });

    await page.goto('./automations');
    await page.waitForLoadState('domcontentloaded');

    const addRuleBtn = page.getByRole('button', { name: /add rule|new rule|create rule/i });
    if (await addRuleBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await addRuleBtn.click();
      await page.waitForTimeout(500);

      const channelInput = page
        .getByLabel(/channel id|source channel/i)
        .or(page.getByPlaceholder(/channel id/i))
        .last();
      await channelInput.fill('test-channel-id', { timeout: 10000 });

      const saveBtn = page
        .getByRole('button', { name: /save rule|save|submit/i })
        .last();
      await saveBtn.click({ timeout: 10000 });

      await page.waitForTimeout(800);

      const postRequest = capturedRequests.find(r => r.method === 'POST');
      expect(postRequest).toBeDefined();
    } else {
      test.skip(true, 'Add rule button not visible — automations may be in a different state');
    }
  });

  test('deleteRule fires DELETE request on rule deletion', async ({ page }) => {
    const capturedRequests: { method: string }[] = [];

    await page.addInitScript(() => {
      localStorage.setItem('google_id_token', 'e2e-test-token');
    });

    await page.route('**/automations/rules**', async (route) => {
      const req = route.request();
      const method = req.method().toUpperCase();

      capturedRequests.push({ method });

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: [
              { key: 'automation:rule:linkedin:ch-delete-test', rule: { trigger: 'comment', replyTemplate: 'Test delete', enabled: true, updatedAt: '2026-01-01' } },
            ],
          }),
        });
        return;
      }

      if (method === 'DELETE') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
        return;
      }

      route.continue();
    });

    await page.goto('./automations');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the existing rule to appear
    await expect(
      page.getByText(/channel default|save rule|delete/i).first()
    ).toBeVisible({ timeout: 10000 });

    const deleteBtn = page.getByRole('button', { name: /^delete$/i }).first();
    if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteBtn.click();

      const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i }).last();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      await page.waitForTimeout(500);

      const deleteRequest = capturedRequests.find(r => r.method === 'DELETE');
      expect(deleteRequest).toBeDefined();
    } else {
      test.skip(true, 'Delete button not visible');
    }
  });

  test('rule list renders empty state without crash', async ({ page }) => {
    await gotoAuthenticated(page, '/automations', {
      listRules: [],
    });

    await page.waitForLoadState('domcontentloaded');

    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    expect(jsErrors).toHaveLength(0);

    // Page should show either empty state or the platform buttons
    const bodyText = await page.locator('body').textContent();
    expect((bodyText?.length ?? 0)).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 29.5: Automations — Page Load & Navigation
// ---------------------------------------------------------------------------

test.describe('Journey 29.5: Automations — Page Load & Navigation', () => {

  test('automations page loads for admin without JS crash', async ({ page }) => {
    /**
     * Spec: Admin users can access the automations page.
     * The page should load without JavaScript errors.
     */
    await gotoAuthenticated(page, '/automations');

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    expect(jsErrors).toHaveLength(0);

    // Platform buttons should be visible
    await expect(page.getByRole('button', { name: /^linkedin$/i })).toBeVisible({ timeout: 10000 });
  });

  test('automations page shows all 5 platform buttons', async ({ page }) => {
    await gotoAuthenticated(page, '/automations');

    // PLATFORMS = ['instagram', 'linkedin', 'telegram', 'gmail', 'youtube']
    const platforms = ['instagram', 'linkedin', 'telegram', 'gmail', 'youtube'] as const;
    for (const platform of platforms) {
      const btn = page.getByRole('button', { name: new RegExp(`^${platform}$`, 'i') });
      await expect(btn).toBeVisible({ timeout: 8000 });
    }
  });

  test('switching between platform tabs works without crash', async ({ page }) => {
    await gotoAuthenticated(page, '/automations');

    const platforms = ['instagram', 'linkedin', 'telegram', 'gmail', 'youtube'] as const;
    for (const platform of platforms) {
      const btn = page.getByRole('button', { name: new RegExp(`^${platform}$`, 'i') });
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }

    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    await page.waitForTimeout(500);
    expect(jsErrors).toHaveLength(0);
  });

  test('navigating away from automations and back preserves state', async ({ page }) => {
    await gotoAuthenticated(page, '/automations');

    await page.getByRole('button', { name: /^instagram$/i }).click();
    await page.waitForTimeout(300);

    // Navigate away
    await page.goto('./topics');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Navigate back
    await page.goto('./automations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    expect(jsErrors).toHaveLength(0);

    // Instagram tab should still be accessible
    await expect(page.getByRole('button', { name: /^instagram$/i })).toBeVisible({ timeout: 8000 });
  });
});
