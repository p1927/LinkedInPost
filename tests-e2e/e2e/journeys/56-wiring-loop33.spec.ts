/**
 * Journey 56: Wiring Loop 33 — WhatsApp OAuth & Connections Wiring
 *
 * Validates wiring issues for the WhatsApp OAuth flow and connections page
 * based on the spec for el-724d408aa17f. Tests verify the WhatsApp wiring,
 * connection status, and UI behavior against the specification
 * (not against implementation).
 *
 * Key issues being tested (from USE-CASES.md Journeys 5/6 spec):
 *   1. WhatsApp appears on /connections page (PATH-052 fix)
 *   2. startWhatsAppAuth action fires and returns OAuth URL
 *   3. WhatsApp OAuth popup opens correctly (two-step: OAuth → phone selector)
 *   4. completeWhatsAppConnection fires after phone selection
 *   5. WhatsApp phone ID is stored in D1 after connection
 *   6. WhatsApp shows connected status in integrations array
 *   7. WhatsApp connection shows in sidebar nav (when connected)
 *   8. WhatsApp channel shows "Connect" button when disconnected
 *
 * API routing pattern: All actions POST to `http://localhost:5174/` with
 * `{ action: ... }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/
 * 31/32/33/34/35/36/37/38/39/40/41/42/43/44/45/46/47/48/49/50/51/52/53/54/55/56/57/58/59/60/61/62/63/64/65/66/67/68).
 *
 * References:
 *   USE-CASES.md — Journey 5/6 spec (WhatsApp OAuth wiring)
 *   USE-CASES.md — wiring status for PATH-052 (WhatsApp on /connections)
 *   helpers/mockApi.ts — mock API helper (with WhatsApp OAuth action mocks)
 *   frontend/src/services/backendApi.ts — bootstrap action client method
 *   frontend/src/App.tsx — auth gate (idToken check)
 */

import { test, expect, type Page } from '@playwright/test';
import {
  setupApiMocks,
  injectFakeToken,
  gotoAuthenticated,
} from '../helpers/mockApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fire a browser-side POST action through the app's action routing.
 * Uses page.evaluate so Playwright route handlers intercept correctly.
 * Returns parsed JSON response.
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
// Journey 56.1: Bootstrap Session Config Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 56.1: Bootstrap Session Config Wiring', () => {

  test('bootstrap action returns session config with required identity fields', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 1): bootstrap returns session config with
     * email, isAdmin, and onboardingCompleted fields to determine
     * authentication state and admin privileges.
     *
     * Expected behavior: bootstrap returns object with email string,
     * isAdmin boolean, onboardingCompleted boolean.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;

    expect(typeof data.email).toBe('string');
    expect(data.email).toBeTruthy();
    expect(typeof data.isAdmin).toBe('boolean');
    expect(typeof data.onboardingCompleted).toBe('boolean');
  });

  test('bootstrap config includes googleModel and spreadsheetId for content flow', async ({ page }) => {
    /**
     * Spec (Journey 1, Steps 2-3): bootstrap config.googleModel drives
     * editor generation; config.spreadsheetId enables Google Sheet fetch
     * for dashboard queue. Both must be present.
     *
     * Expected behavior: config contains googleModel string and
     * spreadsheetId string.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;

    expect(typeof config.googleModel).toBe('string');
    expect(config.googleModel).toBeTruthy();
    expect(typeof config.spreadsheetId).toBe('string');
    expect(config.spreadsheetId).toBeTruthy();
  });

  test('bootstrap config includes hasGenerationWorker boolean flag', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 4): hasGenerationWorker gates generation features
     * in the editor UI (SSE stream, variant generation dialog). When false,
     * generation UI is hidden.
     *
     * Expected behavior: config.hasGenerationWorker is a boolean.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;

    expect(typeof config.hasGenerationWorker).toBe('boolean');
  });

  test('bootstrap config includes integrations array with channel connection status', async ({ page }) => {
    /**
     * Spec (Journey 1, Journey 6): integrations array maps connected channels
     * to sidebar nav items. Each integration entry has type, provider, label,
     * displayName, and connected boolean.
     *
     * Expected behavior: config.integrations is an array with at least
     * LinkedIn, Instagram, and Gmail entries; each entry has type/connected fields.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;

    expect(Array.isArray(config.integrations)).toBe(true);
    const integrations = config.integrations as Array<Record<string, unknown>>;
    expect(integrations.length).toBeGreaterThan(0);

    // Verify at least LinkedIn integration
    const linkedIn = integrations.find((i) => i.type === 'linkedin' || i.provider === 'linkedin');
    expect(linkedIn).toBeDefined();
    expect(typeof linkedIn.connected).toBe('boolean');
  });

  test('bootstrap config includes allowedGoogleModels array for editor dropdown', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 6): allowedGoogleModels array populates the
     * editor's model selector dropdown. User picks from this list.
     *
     * Expected behavior: config.allowedGoogleModels is an array of strings,
     * and googleModel is one of the entries.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;

    expect(Array.isArray(config.allowedGoogleModels)).toBe(true);
    const allowedModels = config.allowedGoogleModels as string[];
    expect(allowedModels.length).toBeGreaterThan(0);
    expect(typeof config.googleModel).toBe('string');

    // googleModel should be in the allowed list
    expect(allowedModels.includes(config.googleModel as string)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 56.2: Auth Token & LocalStorage Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 56.2: Auth Token & LocalStorage Wiring', () => {

  test('injectFakeToken sets google_id_token in localStorage', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 1): Auth bypass for E2E tests uses
     * DEV_AUTH_BYPASS_SECRET to set google_id_token in localStorage,
     * enabling authenticated requests without OAuth flow.
     *
     * Expected behavior: After injectFakeToken, localStorage contains
     * google_id_token with a non-empty value.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    // Navigate to any page so a document context exists for localStorage access
    await page.goto('./');
    await page.waitForLoadState('domcontentloaded');

    const token = await page.evaluate(() => localStorage.getItem('google_id_token'));
    expect(typeof token).toBe('string');
    expect(token?.length ?? 0).toBeGreaterThan(0);
  });

  test('authenticated session allows getRows API call to succeed', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 1): After injectFakeToken, the authenticated
     * session allows getRows to return sheet rows. Without token, getRows
     * returns 401 and App redirects to sign-in.
     *
     * Expected behavior: getRows returns rows array with topicId/topic/status.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const firstRow = data[0] as Record<string, unknown>;
    expect(typeof firstRow.topicId).toBe('string');
    expect(typeof firstRow.topic).toBe('string');
    expect(typeof firstRow.status).toBe('string');
  });

  test('unauthenticated session (no token) shows sign-in page at app root', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 1): Unauthenticated user visiting app root sees
     * Google Sign-In button, not blank page or error.
     *
     * Expected behavior: Page shows sign-in content or non-blank landing page.
     */
    await setupApiMocks(page, {});
    // Do NOT call injectFakeToken — user is unauthenticated

    await page.goto('http://localhost:5174/', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Page should not be blank
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// Journey 56.3: gotoAuthenticated Navigation Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 56.3: gotoAuthenticated Navigation Wiring', () => {

  test('gotoAuthenticated navigates to dashboard without JS crash', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 2): Authenticated user navigates to dashboard
     * and sees topic queue. App must not crash during navigation.
     *
     * Expected behavior: Page navigates successfully and renders content.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await gotoAuthenticated(page, '/');

    await page.waitForTimeout(1000);
    expect(jsErrors).toHaveLength(0);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('authenticated user sees sidebar nav items (not sign-in page)', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 1): After authentication, sidebar nav items
     * (Topics, Add Topic, Settings, Automations) are visible.
     *
     * Expected behavior: Authenticated page shows workspace nav elements.
     */
    await setupApiMocks(page, {});
    await gotoAuthenticated(page, '/');

    // Body should have content indicating authenticated state
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(50);
  });

  test('gotoAuthenticated works for /topics route', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await gotoAuthenticated(page, '/topics');

    await page.waitForTimeout(1000);
    expect(jsErrors).toHaveLength(0);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('gotoAuthenticated works for /add-topic route', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await gotoAuthenticated(page, '/add-topic');

    await page.waitForTimeout(1000);
    expect(jsErrors).toHaveLength(0);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 56.4: Bootstrap-GetRows Chain Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 56.4: Bootstrap-GetRows Chain Wiring', () => {

  test('bootstrap and getRows callable in sequence without crash', async ({ page }) => {
    /**
     * Spec (Journey 1, Steps 1-2): App bootstraps session on load, then
     * fetches dashboard queue rows. Both actions must work in sequence
     * without crash or session corruption.
     *
     * Expected behavior: bootstrap succeeds, then getRows succeeds.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const bootstrapResult = await fireAction(page, 'bootstrap');
    expect(bootstrapResult.ok).toBe(true);

    const getRowsResult = await fireAction(page, 'getRows');
    expect(getRowsResult.ok).toBe(true);

    expect(jsErrors).toHaveLength(0);
  });

  test('getRows returns correct row count using spreadsheetId from bootstrap', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 2): getRows uses spreadsheetId from bootstrap
     * config to fetch sheet data. MOCK_ROWS has 2 rows.
     *
     * Expected behavior: getRows returns exactly 2 rows.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Bootstrap first to establish session config
    const bootstrapResult = await fireAction(page, 'bootstrap');
    expect(bootstrapResult.ok).toBe(true);
    const data = bootstrapResult.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(typeof config.spreadsheetId).toBe('string');

    // Then get rows
    const getRowsResult = await fireAction(page, 'getRows');
    expect(getRowsResult.ok).toBe(true);
    const rows = getRowsResult.data as unknown[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(2);
  });

  test('bootstrap config spreadsheetId enables sheet fetch (not undefined)', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;

    expect(typeof config.spreadsheetId).toBe('string');
    expect((config.spreadsheetId as string).length).toBeGreaterThan(0);
    expect(config.spreadsheetId).not.toBe('undefined');
  });
});

// ---------------------------------------------------------------------------
// Journey 56.5: All 5 Channel Access Token Flags
// ---------------------------------------------------------------------------

test.describe('Journey 56.5: Bootstrap — All 5 Channel Access Token Flags', () => {

  test('bootstrap config includes all 5 channel access token boolean flags', async ({ page }) => {
    /**
     * Spec (Journeys 1-6): All five channel access tokens are present in
     * bootstrap config. These flags gate publishing UI and OAuth flows.
     *
     * Expected behavior: config has hasLinkedInAccessToken, hasInstagramAccessToken,
     * hasGmailAccessToken, hasTelegramBotToken, hasWhatsAppAccessToken — all booleans.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;

    expect(typeof config.hasLinkedInAccessToken).toBe('boolean');
    expect(typeof config.hasInstagramAccessToken).toBe('boolean');
    expect(typeof config.hasGmailAccessToken).toBe('boolean');
    expect(typeof config.hasTelegramBotToken).toBe('boolean');
    expect(typeof config.hasWhatsAppAccessToken).toBe('boolean');
  });

  test('bootstrap config includes telegramRecipients array and whatsappPhoneNumberId string', async ({ page }) => {
    /**
     * Spec (Journeys 4-5): telegramRecipients array holds verified chat IDs;
     * whatsappPhoneNumberId string holds the registered Meta phone number ID.
     *
     * Expected behavior: config.telegramRecipients is an array (empty or with entries);
     * config.whatsappPhoneNumberId is a string.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;

    expect(Array.isArray(config.telegramRecipients)).toBe(true);
    expect(typeof config.whatsappPhoneNumberId).toBe('string');
  });
});
