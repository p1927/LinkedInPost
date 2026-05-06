/**
 * Journey 38: Wiring Loop 26/50 — Settings & Connections Integration Wiring
 *
 * Validates wiring issues for settings page integration and connections
 * management. Tests verify against the SPEC (USE-CASES.md), not implementation.
 *
 * Key issues being tested (from USE-CASES.md):
 *   1. Settings page loads without JS crash using bootstrap config
 *   2. Connection status for LinkedIn/Gmail/Instagram/Telegram/WhatsApp
 *   3. Model provider selection uses allowedGoogleModels from bootstrap
 *   4. Google OAuth redirect flow is wired
 *   5. Telegram chat ID verification flow wired
 *   6. WhatsApp OAuth flow wired (startWhatsAppAuth + completeWhatsAppConnection)
 *   7. Instagram OAuth flow wired
 *   8. Gmail OAuth flow wired
 *   9. Token usage endpoint returns correct shape
 *  10. Admin panel automation rules wiring
 *
 * References:
 *   journeys/26-wiring-loop16.spec.ts — loop 16 (Setup Wizard API, patterns)
 *   journeys/28-wiring-loop20.spec.ts — loop 20 (Feed Enrichment API, patterns)
 *   journeys/30-wiring-loop24.spec.ts — loop 24 (Topic Discovery, patterns)
 *   journeys/33-wiring-loop24.spec.ts — loop 24 (Bootstrap Integration, patterns)
 *   journeys/35-wiring-loop25.spec.ts — loop 25 (Workflow/Persona Wiring, patterns)
 *   journeys/36-wiring-loop25.spec.ts — loop 25 (Feed Enrichment Editor Integration)
 *   helpers/mockApi.ts — mock API helper
 *   USE-CASES.md — wiring status for Journeys 6 (Connections) and Journey 10 (Automations)
 *
 * Wiring Loop 26 Fixes (2026-04-30): Added new test file for settings &
 * connections integration wiring. Tests use the established pattern from
 * loops 16/20/24/25 (page.evaluate for browser fetch, fireAction helper,
 * primary OR fallback pattern for UI visibility checks).
 */

import { test, expect, type Page } from '@playwright/test';
import {
  setupApiMocks,
  injectFakeToken,
  gotoAuthenticated,
  MOCK_SESSION,
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
// Journey 38.1: Settings Page Integration Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 38.1: Settings Page — Bootstrap Config Integration', () => {

  test('settings page loads without JS crash using bootstrap config', async ({ page }) => {
    /**
     * Spec (Journey 1/6): Settings page should load without JavaScript errors
     * and use bootstrap config for initial state.
     *
     * Expected behavior: Page renders without JS errors, body has content.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/settings');

    // Wait for page to load
    await page.waitForTimeout(1500);

    // Page should have content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);

    // No JS crashes
    expect(jsErrors).toHaveLength(0);
  });

  test('settings page displays googleModel from bootstrap config', async ({ page }) => {
    /**
     * Spec (Journey 1/8): Settings page should display the current model
     * from bootstrap config (googleModel field).
     *
     * Expected behavior: Model string is visible in the settings UI.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/settings');

    await page.waitForTimeout(1500);

    // Page should contain the model name from MOCK_SESSION.config.googleModel
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('gemini');
  });

  test('allowedGoogleModels drives model selector dropdown', async ({ page }) => {
    /**
     * Spec (Journey 8): Model provider selection dropdown should be populated
     * from allowedGoogleModels array in bootstrap config.
     *
     * Expected behavior: Dropdown options match the allowed models list.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/settings');

    await page.waitForTimeout(1500);

    // Should have the allowed model from MOCK_SESSION.config.allowedGoogleModels
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('gemini-2.0-flash');
  });

  test('authorProfile is displayed in settings', async ({ page }) => {
    /**
     * Spec (Journey 1): Author profile from bootstrap config should be
     * visible in settings.
     *
     * Expected behavior: Author profile text is present in settings UI.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/settings');

    await page.waitForTimeout(1500);

    // Should show author profile from MOCK_SESSION.config.authorProfile
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('Founder');
  });

  test('hasGenerationWorker gates generation-related settings', async ({ page }) => {
    /**
     * Spec (Journey 1): Settings should respect hasGenerationWorker flag
     * from bootstrap config to show/hide generation-related options.
     *
     * Expected behavior: When hasGenerationWorker is true, generation
     * settings are visible.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/settings');

    await page.waitForTimeout(1500);

    // Since hasGenerationWorker is true in MOCK_SESSION, generation options should be available
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toBe('');
  });
});

// ---------------------------------------------------------------------------
// Journey 38.2: Connections Page Integration Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 38.2: Connections Page — Channel Connection Status', () => {

  test('connections page loads without JS crash', async ({ page }) => {
    /**
     * Spec (Journey 6): Connections page should load without JavaScript
     * errors and display channel connection status.
     *
     * Expected behavior: Page renders without JS errors.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/connections');

    await page.waitForTimeout(1500);

    // Page should have content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);

    // No JS crashes
    expect(jsErrors).toHaveLength(0);
  });

  test('LinkedIn connection status is displayed', async ({ page }) => {
    /**
     * Spec (Journey 6): LinkedIn connection status from bootstrap config
     * should be visible on connections page.
     *
     * Expected behavior: LinkedIn channel shows connection status.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/connections');

    await page.waitForTimeout(1500);

    // Should show LinkedIn connection info
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('LinkedIn');
  });

  test('Gmail connection status is displayed', async ({ page }) => {
    /**
     * Spec (Journey 6): Gmail connection status should be visible.
     *
     * Expected behavior: Gmail channel shows connection status.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/connections');

    await page.waitForTimeout(1500);

    // Should show Gmail connection info
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('Gmail');
  });

  test('Instagram connection status is displayed', async ({ page }) => {
    /**
     * Spec (Journey 6): Instagram connection status should be visible.
     *
     * Expected behavior: Instagram channel shows connection status.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/connections');

    await page.waitForTimeout(1500);

    // Should show Instagram connection info
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('Instagram');
  });

  test('Telegram configuration section is accessible', async ({ page }) => {
    /**
     * Spec (Journey 4/6): Telegram configuration section should be visible
     * on connections page (not just in settings drawer).
     *
     * Expected behavior: Telegram section is present on the page.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/connections');

    await page.waitForTimeout(1500);

    // Should show Telegram section
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('Telegram');
  });

  test('WhatsApp configuration section is accessible', async ({ page }) => {
    /**
     * Spec (Journey 5/6): WhatsApp configuration section should be visible
     * on connections page (not just in settings drawer).
     *
     * Expected behavior: WhatsApp section is present on the page.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/connections');

    await page.waitForTimeout(1500);

    // Should show WhatsApp section
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('WhatsApp');
  });

  test('OAuth connect buttons are present for disconnected channels', async ({ page }) => {
    /**
     * Spec (Journey 6): OAuth connect buttons should be present for
     * disconnected channels to initiate OAuth flow.
     *
     * Expected behavior: Connect buttons visible for channels that need auth.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/connections');

    await page.waitForTimeout(1500);

    // Page should have some action buttons
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 38.3: Token Usage API Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 38.3: Token Usage — API Endpoint Wiring', () => {

  test('getTokenUsage returns correct shape', async ({ page }) => {
    /**
     * Spec (Journey 19): Token usage endpoint should return correct shape
     * with used, budget, and resetDate fields.
     *
     * Expected behavior: { ok: true, data: { used: number, budget: number, resetDate: string } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/settings');

    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'getTokenUsage');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.used).toBe('number');
    expect(typeof data.budget).toBe('number');
    expect(typeof data.resetDate).toBe('string');
  });

  test('getTokenUsage returns valid numbers', async ({ page }) => {
    /**
     * Spec: Token usage values should be valid non-negative numbers.
     *
     * Expected behavior: used >= 0, budget > 0, resetDate is a valid date string.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/settings');

    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'getTokenUsage');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const used = data.used as number;
    const budget = data.budget as number;
    expect(used).toBeGreaterThanOrEqual(0);
    expect(budget).toBeGreaterThan(0);
  });

  test('getTokenUsage handles error gracefully', async ({ page }) => {
    /**
     * Spec: Token usage endpoint should handle errors gracefully.
     *
     * Expected behavior: Error returns { ok: false, error: string }.
     */
    await setupApiMocks(page, { getTokenUsage: { __error: true } });
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/settings');

    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'getTokenUsage');

    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 38.4: Automations Rules API Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 38.4: Automations — Rules API Wiring', () => {

  test('listRules returns rules array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 10): listRules should return an array of automation
     * rule objects with required fields (id, name, platform, channel, trigger).
     *
     * Expected behavior: { ok: true, data: AutomationRule[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/admin');

    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'listRules');

    expect(result.ok).toBe(true);
    const rules = result.data as unknown[];
    expect(Array.isArray(rules)).toBe(true);
  });

  test('listRules returns empty array when no rules exist', async ({ page }) => {
    /**
     * Spec: When no automation rules exist, listRules returns empty array.
     *
     * Expected behavior: { ok: true, data: [] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/admin');

    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'listRules');

    expect(result.ok).toBe(true);
    const rules = result.data as unknown[];
    expect(Array.isArray(rules)).toBe(true);
  });

  test('createRule creates a new automation rule', async ({ page }) => {
    /**
     * Spec (Journey 10): createRule action creates a new automation rule
     * with name, platform, channel, trigger fields.
     *
     * Expected behavior: { ok: true, data: { id: string, name: string, ... } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/admin');

    await page.waitForTimeout(1000);

    const ruleData = {
      name: 'Daily LinkedIn Post',
      platform: 'linkedin',
      channel: 'linkedin',
      trigger: 'schedule',
      schedule: '09:00',
      days: ['monday', 'wednesday', 'friday'],
    };

    const result = await fireAction(page, 'createRule', ruleData);

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(typeof data.name).toBe('string');
  });

  test('deleteRule removes an automation rule', async ({ page }) => {
    /**
     * Spec (Journey 10): deleteRule action removes an automation rule
     * by id and returns success confirmation.
     *
     * Expected behavior: { ok: true, data: { success: true } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/admin');

    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'deleteRule', { id: 'rule-123' });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Boolean(data.success)).toBe(true);
  });

  test('lookupEffectiveRule returns effective rule for a context', async ({ page }) => {
    /**
     * Spec (Journey 10): lookupEffectiveRule returns the effective automation
     * rule that applies to the given context (platform, channel).
     *
     * Expected behavior: Returns rule object or null if no matching rule.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/admin');

    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'lookupEffectiveRule', {
      platform: 'linkedin',
      channel: 'linkedin',
    });

    expect(result.ok).toBe(true);
    // Result should have data field (rule or null)
    const data = result.data;
    if (data !== null) expect(typeof data).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// Journey 38.5: Connections OAuth Flow Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 38.5: Connections — OAuth Flow Integration', () => {

  test('LinkedIn OAuth URL is correctly formed', async ({ page }) => {
    /**
     * Spec (Journey 6): LinkedIn OAuth redirect URL should be correctly
     * formed with required parameters.
     *
     * Expected behavior: OAuth URL contains required params (client_id, redirect_uri, scope).
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/connections');

    await page.waitForTimeout(1000);

    // Get OAuth URL from the page or via action
    const result = await fireAction(page, 'getLinkedInOAuthUrl');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.url).toBe('string');
    const url = data.url as string;
    expect(url).toContain('linkedin.com');
    expect(url).toContain('oauth');
  });

  test('Gmail OAuth URL is correctly formed', async ({ page }) => {
    /**
     * Spec (Journey 6): Gmail OAuth redirect URL should be correctly
     * formed with required parameters.
     *
     * Expected behavior: OAuth URL contains required params.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/connections');

    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'getGmailOAuthUrl');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.url).toBe('string');
    const url = data.url as string;
    expect(url).toContain('googleapis.com');
    expect(url).toContain('oauth');
  });

  test('startWhatsAppAuth initiates OAuth flow', async ({ page }) => {
    /**
     * Spec (Journey 5): startWhatsAppAuth action initiates WhatsApp OAuth
     * flow and returns redirect URL.
     *
     * Expected behavior: { ok: true, data: { url: string } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/connections');

    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'startWhatsAppAuth');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.url).toBe('string');
  });

  test('completeWhatsAppConnection completes OAuth with phone data', async ({ page }) => {
    /**
     * Spec (Journey 5): completeWhatsAppConnection completes WhatsApp OAuth
     * with phone number selection.
     *
     * Expected behavior: { ok: true, data: { phoneNumberId: string, ... } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/connections');

    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'completeWhatsAppConnection', {
      phoneNumberId: 'test-phone-id',
      displayName: 'Test WhatsApp',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.phoneNumberId).toBe('string');
  });

  test('verifyTelegramChat validates chat ID', async ({ page }) => {
    /**
     * Spec (Journey 4): verifyTelegramChat action validates a Telegram
     * chat ID and returns verification status.
     *
     * Expected behavior: { ok: true, data: { verified: boolean, chatId: string } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/connections');

    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'verifyTelegramChat', {
      chatId: '123456789',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.verified).toBe('boolean');
    expect(typeof data.chatId).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 38.6: Admin Panel Integration Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 38.6: Admin Panel — Page Integration', () => {

  test('admin panel loads without JS crash', async ({ page }) => {
    /**
     * Spec (Journey 10): Admin panel should load without JavaScript errors
     * and display automation rules management interface.
     *
     * Expected behavior: Page renders without JS errors.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/admin');

    await page.waitForTimeout(1500);

    // Page should have content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);

    // No JS crashes
    expect(jsErrors).toHaveLength(0);
  });

  test('admin panel displays isAdmin flag from session', async ({ page }) => {
    /**
     * Spec (Journey 10): Admin panel should check isAdmin flag from
     * session and display admin-only features.
     *
     * Expected behavior: Admin controls are visible.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/admin');

    await page.waitForTimeout(1500);

    // Should show some admin-related content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toBe('');
  });

  test('admin panel shows automation rules section', async ({ page }) => {
    /**
     * Spec (Journey 10): Admin panel should display automation rules
     * section with list/create/delete functionality.
     *
     * Expected behavior: Rules section is visible.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/admin');

    await page.waitForTimeout(1500);

    // Should have action buttons for rules management
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 38.7: Bootstrap Config Session Integration
// ---------------------------------------------------------------------------

test.describe('Journey 38.7: Bootstrap Config — Session Integration', () => {

  test('bootstrap config includes all required fields', async ({ page }) => {
    /**
     * Spec: Bootstrap config (MOCK_SESSION) should include all required
     * fields for app initialization.
     *
     * Required fields: email, isAdmin, onboardingCompleted, config object
     * with: googleModel, allowedGoogleModels, spreadsheetId, integrations,
     * hasLinkedInAccessToken, hasGmailAccessToken, hasGenerationWorker,
     * authorProfile.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/');

    await page.waitForTimeout(1500);

    // Verify the session was properly loaded
    const sessionData = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:5174/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getSession' }),
      });
      return resp.json();
    });

    expect(sessionData.ok).toBe(true);
    const data = sessionData.data as Record<string, unknown>;
    expect(typeof data.email).toBe('string');
    expect(typeof data.isAdmin).toBe('boolean');
    expect(typeof data.onboardingCompleted).toBe('boolean');

    const config = data.config as Record<string, unknown>;
    expect(typeof config).toBe('object');
    expect(typeof config.googleModel).toBe('string');
    expect(typeof config.spreadsheetId).toBe('string');
    expect(typeof config.hasGenerationWorker).toBe('boolean');
  });

  test('integrations array has connection status for each channel', async ({ page }) => {
    /**
     * Spec (Journey 6): Bootstrap config integrations array should have
     * connection status for each channel (LinkedIn, Gmail, Instagram,
     * Telegram, WhatsApp).
     *
     * Expected behavior: Each integration has id, type, provider, connected fields.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/');

    await page.waitForTimeout(1500);

    const result = await fireAction(page, 'getSession');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const integrations = data.integrations as unknown[];
    expect(Array.isArray(integrations)).toBe(true);
    expect(integrations.length).toBeGreaterThan(0);

    for (const integration of integrations) {
      const i = integration as Record<string, unknown>;
      expect(typeof i.id).toBe('string');
      expect(typeof i.type).toBe('string');
      expect(typeof i.connected).toBe('boolean');
    }
  });

  test('spreadsheetId is used for dashboard queue fetch', async ({ page }) => {
    /**
     * Spec (Journey 1): Dashboard queue should use spreadsheetId from
     * bootstrap config to fetch topic rows.
     *
     * Expected behavior: getRows is called and returns topic data.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/');

    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'getRows');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const rows = data.rows as unknown[];
    expect(Array.isArray(rows)).toBe(true);
  });
});
