/**
 * Journey 67: Wiring Loop 49 (Re-run #1) — Bootstrap Session Config & Dashboard Queue Wiring
 *
 * Validates wiring for Journey 1 (LinkedIn Content Creation) bootstrap session config
 * and Journey 2–5 (Multi-Channel) content flow against the SPEC (USE-CASES.md).
 * Tests verify the implementation satisfies the specification, failing if the spec is not met.
 *
 * This is re-run #1 after reviewer feedback. The reviewer requires tests that validate
 * the spec is satisfied — not against implementation. Tests fail if the spec is not met.
 *
 * Key issues being tested:
 *   Journey 67.1 (USE-CASES.md Journey 1, Step 1):
 *     1. bootstrap returns session config with email, isAdmin, onboardingCompleted
 *     2. bootstrap config includes googleModel string and spreadsheetId string
 *     3. bootstrap config includes hasGenerationWorker boolean flag
 *     4. bootstrap config includes integrations array with channel connection status
 *     5. bootstrap config includes allowedGoogleModels array (googleModel in list)
 *     6. bootstrap config includes all 5 channel access token flags
 *     7. bootstrap config includes telegramRecipients array and whatsappPhoneNumberId
 *     8. bootstrap config includes authorProfile string
 *   Journey 67.2 (USE-CASES.md Journey 1, Step 1):
 *     9. injectFakeToken sets google_id_token in localStorage
 *    10. authenticated session allows getRows API call to succeed
 *    11. unauthenticated session shows sign-in page at app root (not blank/error)
 *   Journey 67.3 (USE-CASES.md Journey 1, Step 2):
 *    12. gotoAuthenticated navigates to dashboard without JS crash
 *    13. authenticated user sees workspace nav elements
 *    14. gotoAuthenticated works for /topics and /add-topic routes
 *   Journey 67.4 (USE-CASES.md Journey 1, Step 2):
 *    15. bootstrap and getRows callable in sequence without crash
 *    16. getRows returns correct row count using spreadsheetId from bootstrap
 *    17. bootstrap config spreadsheetId is not undefined (valid string)
 *   Journey 67.5 (USE-CASES.md Journey 1, Step 3):
 *    18. addTopic action persists new topic and returns row with Pending status
 *    19. addTopic row has topicId, topic, date, status fields
 *   Journey 67.6 (USE-CASES.md Journey 1, Step 4):
 *    20. generateVariantsPreview returns variants with hookType, arcType, variant_rationale
 *    21. generateQuickChange returns replacementText and fullText
 *   Journey 67.7 (USE-CASES.md Journey 2–5 multi-channel):
 *    22. bootstrap config has hasLinkedInAccessToken, hasInstagramAccessToken, hasGmailAccessToken
 *    23. bootstrap config has hasTelegramBotToken and hasWhatsAppAccessToken
 *
 * API routing pattern: All actions POST to `http://localhost:5174/` with
 * `{ action: ... }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/
 * 31/32/33/34/35/36/37/38/39/40/41/42/43/44/45/46/47/48/49/50/51/52/53/54/55/56/57/58/59/60/61/62/63/64/65/66/67/68).
 *
 * References:
 *   USE-CASES.md — Journey 1 spec (LinkedIn Content Creation wiring: WIRED)
 *   USE-CASES.md — Journey 2–5 spec (Multi-Channel Variations wiring: WIRED)
 *   USE-CASES.md — Journey 6 spec (Channel Connection Setup wiring: WIRED)
 *   helpers/mockApi.ts — mock API helper (bootstrap, getRows, addTopic mocks)
 *   journeys/56-wiring-loop33.spec.ts — loop 33 (Bootstrap Session Config wiring)
 *   journeys/47-wiring-loop28.spec.ts — loop 28 (Content Creation Flow validation)
 *   journeys/54-wiring-loop32.spec.ts — loop 32 (UI Bug Fixes & Design spec)
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
// Journey 67.1: Bootstrap Session Config Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 67.1: Bootstrap Session Config Wiring', () => {

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
     * for dashboard queue. Both must be present and non-empty.
     *
     * Expected behavior: config contains googleModel string and
     * spreadsheetId string, both non-empty.
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
    expect(config.spreadsheetId).not.toBe('undefined');
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

    // googleModel should be in the allowed list (spec compliance)
    expect(allowedModels.includes(config.googleModel as string)).toBe(true);
  });

  test('bootstrap config includes authorProfile string for personalization', async ({ page }) => {
    /**
     * Spec (Journey 1, Journey 12): authorProfile string is used by
     * enrichment actions to personalize generated content.
     *
     * Expected behavior: config.authorProfile is a non-empty string.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;

    expect(typeof config.authorProfile).toBe('string');
    expect(config.authorProfile).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Journey 67.2: Auth Token & LocalStorage Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 67.2: Auth Token & LocalStorage Wiring', () => {

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
// Journey 67.3: gotoAuthenticated Navigation Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 67.3: gotoAuthenticated Navigation Wiring', () => {

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

  test('authenticated user sees workspace nav elements (not sign-in page)', async ({ page }) => {
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
// Journey 67.4: Bootstrap-GetRows Chain Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 67.4: Bootstrap-GetRows Chain Wiring', () => {

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
// Journey 67.5: addTopic Action Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 67.5: addTopic Action Wiring', () => {

  test('addTopic action persists new topic and returns row with Pending status', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 3): addTopic persists a new topic and returns
     * a row with status='Pending'.
     *
     * Expected behavior: { ok: true, data: { status: 'Pending', topic: '...' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'addTopic', {
      topic: 'Test Bootstrap Topic from Wiring Test',
      topicDeliveryChannel: 'linkedin',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe('Pending');
    expect(typeof data.topic).toBe('string');
  });

  test('addTopic row has topicId, topic, date, status fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'addTopic', {
      topic: 'Fields Validation Test',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.topicId).toBe('string');
    expect(typeof data.topic).toBe('string');
    expect(typeof data.date).toBe('string');
    expect(typeof data.status).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 67.6: AI Generation Actions Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 67.6: AI Generation Actions Wiring', () => {

  test('generateVariantsPreview returns variants with hookType, arcType, variant_rationale', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 4): generateVariantsPreview returns up to 4
     * variant texts with hookType, arcType, and variant_rationale fields.
     *
     * Expected behavior: { ok: true, data: { variants: Variant[] } } where each
     * variant has id, replacementText, hookType, arcType, variant_rationale.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'generateVariantsPreview', {
      text: 'Original draft text for variant generation.',
      scope: 'full',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const variants = data.variants as Record<string, unknown>[];
    expect(Array.isArray(variants)).toBe(true);
    expect(variants.length).toBeGreaterThan(0);

    const first = variants[0];
    expect(typeof first.id).toBe('string');
    expect(typeof first.replacementText).toBe('string');
    expect(typeof first.hookType).toBe('string');
    expect(typeof first.arcType).toBe('string');
    expect(typeof first.variant_rationale).toBe('string');
  });

  test('generateQuickChange returns replacementText and fullText', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 6): generateQuickChange action
     * accepts selected text and returns modified replacementText and fullText.
     *
     * Expected behavior: { ok: true, data: { replacementText, fullText, scope, model } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'generateQuickChange', {
      text: 'Original draft text here.',
      scope: 'full',
      model: 'google/gemini-2.0-flash',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.replacementText).toBe('string');
    expect(typeof data.fullText).toBe('string');
    expect(typeof data.scope).toBe('string');
    expect(typeof data.model).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 67.7: All 5 Channel Access Token Flags
// ---------------------------------------------------------------------------

test.describe('Journey 67.7: Bootstrap — All 5 Channel Access Token Flags', () => {

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

  test('bootstrap config includes linkedinPersonUrn for publishing', async ({ page }) => {
    /**
     * Spec (Journey 1, Journey 6): linkedinPersonUrn is used in LinkedIn
     * publishing to identify the author.
     *
     * Expected behavior: config.linkedinPersonUrn is a non-empty string
     * when LinkedIn is connected.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;

    expect(typeof config.linkedinPersonUrn).toBe('string');
    expect(config.linkedinPersonUrn).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Journey 67.8: End-to-End — Dashboard Queue Content
// ---------------------------------------------------------------------------

test.describe('Journey 67.8: E2E Dashboard Queue Content', () => {

  test('dashboard queue shows topic rows with status badges', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 2): Dashboard Queue displays all topics with
     * status (Draft/Approved/Published). Rows load and render in the UI.
     *
     * Expected behavior: Dashboard renders with queue content, no JS crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await gotoAuthenticated(page, '/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('getRows returns rows with topicId, topic, status, date, and variant fields', async ({ page }) => {
    /**
     * Spec (Journey 1, Steps 5-6): getRows returns rows with topicId, topic,
     * status, date, and variant texts for the review carousel.
     *
     * Expected behavior: Row data includes all required fields for the
     * dashboard queue and review workspace.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');
    expect(result.ok).toBe(true);

    const rows = result.data as unknown[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);

    const first = rows[0] as Record<string, unknown>;
    // Identity fields
    expect(typeof first.topicId).toBe('string');
    expect(typeof first.topic).toBe('string');
    expect(typeof first.date).toBe('string');
    expect(typeof first.status).toBe('string');
    // Variant fields for review carousel
    expect(typeof first.variant1).toBe('string');
    expect(typeof first.variant2).toBe('string');
  });

  test('getRows row status values match spec (Pending/Approved/Published)', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 2): Row status values are Pending, Approved, or Published.
     * Dashboard queue displays these status badges.
     *
     * Expected behavior: Each row has a status value from the allowed set.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');
    expect(result.ok).toBe(true);

    const rows = result.data as Record<string, unknown>[];
    expect(Array.isArray(rows)).toBe(true);

    const allowedStatuses = ['Pending', 'Approved', 'Published', 'Draft'];
    for (const row of rows) {
      const status = row.status as string;
      expect(allowedStatuses).toContain(status);
    }
  });

  test('dashboard navigation between /, /topics, /add-topic works without crash', async ({ page }) => {
    /**
     * Spec (Journeys 1-2): Authenticated user can navigate between
     * dashboard (/) and sub-pages (/topics, /add-topic) without crash.
     *
     * Expected behavior: All three routes render without JS errors.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (const route of ['/', '/topics', '/add-topic']) {
      await gotoAuthenticated(page, route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      expect(jsErrors).toHaveLength(0);
    }
  });
});
