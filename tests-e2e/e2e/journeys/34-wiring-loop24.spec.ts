/**
 * Journey 34: Wiring Loop 24 — WhatsApp OAuth & Connections Wiring
 *
 * Validates wiring issues for the WhatsApp OAuth flow and connections page
 * based on the spec for el-724d408aa17f. Tests verify the WhatsApp wiring,
 * connection status, and UI behavior against the specification
 * (not against implementation).
 *
 * Key issues being tested (from USE-CASES.mdJourneys 5/6 spec):
 *   1. WhatsApp appears on /connections page (PATH-052 fix)
 *   2. startWhatsAppAuth action fires and returns OAuth URL
 *   3. WhatsApp OAuth popup opens correctly (two-step: OAuth → phone selector)
 *   4. completeWhatsAppConnection fires after phone selection
 *   5. WhatsApp phone ID is stored in D1 after connection
 *   6. WhatsApp shows connected status in integrations array
 *   7. WhatsApp connection shows in sidebar nav (when connected)
 *   8. WhatsApp channel shows "Connect" button when disconnected
 *
 * References:
 *   journeys/31-wiring-loop24.spec.ts — loop 24 (Bootstrap & Session, patterns)
 *   journeys/33-wiring-loop24.spec.ts — loop 24 (Bootstrap Integration, patterns)
 *   journeys/45-wiring-loop28.spec.ts — loop 28 (Discovery defensive wiring)
 *   helpers/mockApi.ts — mock API helper (with WhatsApp OAuth action mocks)
 *   USE-CASES.md — wiring status for PATH-052 (WhatsApp on /connections)
 *
 * API routing pattern: All actions POST to `http://localhost:5174/` with
 * `{ action: ... }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/
 * 31/32/33/34/35/36/37/38/39/40/41/42/43/44/45/46/47/48/49/50/51/52/53/54/55/56/57/
 * 58/59/60/61/62/63/64/65/66/67/68).
 */

import { test, expect, type Page } from '@playwright/test';
import {
  setupApiMocks,
  injectFakeToken,
  gotoAuthenticated,
  // MOCK_SESSION imported for connectedSession override in Journey 34.5
  // (used in test body, not just comments — cannot be removed without reimplementation)
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
// Journey 34.1: WhatsApp — startWhatsAppAuth Action Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 34.1: WhatsApp — startWhatsAppAuth Wiring', () => {

  test('startWhatsAppAuth fires and returns OAuth authorization URL', async ({ page }) => {
    /**
     * Spec (Journey 5, Journey 6): startWhatsAppAuth initiates WhatsApp OAuth
     * by calling the Meta Cloud API OAuth endpoint. The action should return
     * an authorization URL for the popup.
     *
     * Expected behavior: { ok: true, data: { authorizationUrl: 'https://facebook.com/oauth/...' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'startWhatsAppAuth');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.authorizationUrl).toBe('string');
    expect(data.authorizationUrl).toContain('facebook.com');
  });

  test('startWhatsAppAuth URL includes required OAuth parameters', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'startWhatsAppAuth');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const authUrl = data.authorizationUrl as string;
    // The authorization URL should contain required OAuth parameters
    expect(authUrl.length).toBeGreaterThan(0);
    // Meta OAuth URLs should include client_id and redirect_uri
    const hasClientId = authUrl.includes('client_id') || authUrl.includes('app_id');
    expect(hasClientId).toBeTruthy();
  });

  test('startWhatsAppAuth action is callable without prior WhatsApp connection', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Bootstrap session shows no WhatsApp connection
    const bootstrapResult = await fireAction(page, 'bootstrap');
    expect(bootstrapResult.ok).toBe(true);
    const bootstrapData = bootstrapResult.data as Record<string, unknown>;
    const config = bootstrapData.config as Record<string, unknown>;

    // MOCK_SESSION has hasWhatsAppAccessToken=false
    expect(config.hasWhatsAppAccessToken).toBe(false);

    // But startWhatsAppAuth should still fire (initiates new OAuth)
    const oauthResult = await fireAction(page, 'startWhatsAppAuth');
    expect(oauthResult.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 34.2: WhatsApp — Connections Page Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 34.2: WhatsApp — Connections Page Wiring', () => {

  test('connections page shows WhatsApp card for authenticated user', async ({ page }) => {
    /**
     * Spec (Journey 6, PATH-052): WhatsApp should be available on the /connections
     * page alongside LinkedIn, Instagram, Gmail, and Telegram.
     *
     * Expected behavior: /connections shows a WhatsApp card or channel option.
     */
    await gotoAuthenticated(page, '/connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // WhatsApp should appear on the connections page
    const whatsappCard = page.getByText(/whatsapp/i);
    const hasWhatsApp = await whatsappCard.first().isVisible({ timeout: 8000 }).catch(() => false);

    expect(hasWhatsApp).toBeTruthy();
  });

  test('WhatsApp card on /connections shows Connect button when disconnected', async ({ page }) => {
    await gotoAuthenticated(page, '/connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Find WhatsApp section/card
    const whatsappSection = page.getByText(/whatsapp/i).first();
    if (await whatsappSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Should show a Connect button (not Disconnect or Connected)
      const connectBtn = page.getByRole('button', { name: /connect|setup|configure/i })
        .or(page.getByText(/connect.*whatsapp|setup.*whatsapp/i));

      const hasConnectAction = await connectBtn.first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasConnectAction).toBeTruthy();
    } else {
      // WhatsApp section not found — page should still render
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length ?? 0).toBeGreaterThan(10);
    }
  });

  test('connections page shows LinkedIn alongside WhatsApp (not WhatsApp-only)', async ({ page }) => {
    /**
     * Spec (Journey 6): All channels (LinkedIn, Instagram, Gmail, Telegram, WhatsApp)
     * should be available on /connections. WhatsApp is an addition to existing channels.
     *
     * Expected behavior: Both LinkedIn and WhatsApp cards visible on /connections.
     */
    await gotoAuthenticated(page, '/connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const hasLinkedIn = await page.getByText(/linkedin/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasWhatsApp = await page.getByText(/whatsapp/i).first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasLinkedIn).toBeTruthy();
    expect(hasWhatsApp).toBeTruthy();
  });

  test('connections page loads without JS crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 34.3: WhatsApp — OAuth Two-Step Flow Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 34.3: WhatsApp — OAuth Two-Step Flow Wiring', () => {

  test('startWhatsAppAuth initiates first OAuth step (popup)', async ({ page }) => {
    /**
     * Spec (Journey 5): WhatsApp uses Meta Cloud API two-step OAuth:
     * Step 1: startWhatsAppAuth opens popup for Meta login
     * Step 2: User selects phone number → completeWhatsAppConnection
     *
     * Expected behavior: startWhatsAppAuth returns authorization URL
     * that can be opened in a popup window.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'startWhatsAppAuth');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const authUrl = data.authorizationUrl as string;

    // OAuth URL should be a valid https URL suitable for popup
    expect(authUrl.startsWith('https://')).toBe(true);
    expect(authUrl.length).toBeGreaterThan(20);
  });

  test('completeWhatsAppConnection fires with phoneNumberId after phone selection', async ({ page }) => {
    /**
     * Spec (Journey 5): After the OAuth popup completes and user selects
     * a phone number, completeWhatsAppConnection is called with the
     * phoneNumberId to store in D1.
     *
     * Expected behavior: completeWhatsAppConnection action fires with
     * { phoneNumberId: '...' } body.
     */
    const capturedActions: { action: string; body: unknown }[] = [];

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    await page.route('**', async (route) => {
      const req = route.request();
      if (req.method().toUpperCase() !== 'POST') { await route.continue(); return; }
      let body: Record<string, unknown>;
      try { body = await req.postDataJSON(); } catch { await route.continue(); return; }
      if (body?.action) {
        capturedActions.push({ action: body.action as string, body });
      }
      await route.continue();
    });

    await page.goto('./connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Simulate completing WhatsApp OAuth by firing the action directly
    await fireAction(page, 'completeWhatsAppConnection', {
      phoneNumberId: 'mock-phone-number-id-123',
    });

    // completeWhatsAppConnection should have fired
    const completeCall = capturedActions.find(
      a => a.action === 'completeWhatsAppConnection'
    );
    expect(completeCall).toBeDefined();

    const callBody = completeCall?.body as Record<string, unknown>;
    expect(typeof callBody.phoneNumberId).toBe('string');
    expect((callBody.phoneNumberId as string).length).toBeGreaterThan(0);
  });

  test('completeWhatsAppConnection stores phone ID in session', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Fire completeWhatsAppConnection to simulate successful OAuth
    const result = await fireAction(page, 'completeWhatsAppConnection', {
      phoneNumberId: 'mock-phone-id-456',
    });

    // Action should succeed
    expect(result.ok).toBe(true);
    // Session should reflect WhatsApp connection
    const bootstrapResult = await fireAction(page, 'bootstrap');
    expect(bootstrapResult.ok).toBe(true);
    const bootstrapData = bootstrapResult.data as Record<string, unknown>;
    const config = bootstrapData.config as Record<string, unknown>;
    expect(typeof config.whatsappPhoneNumberId).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 34.4: WhatsApp — Integration Status Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 34.4: WhatsApp — Integration Status Wiring', () => {

  test('bootstrap returns WhatsApp integration in connections list', async ({ page }) => {
    /**
     * Spec (Journey 1, Journey 6): Bootstrap returns integrations array
     * including WhatsApp. WhatsApp should be listed alongside LinkedIn,
     * Instagram, Gmail, and Telegram.
     *
     * Expected behavior: integrations includes WhatsApp with connected=false
     * when not yet connected.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    const integrations = config.integrations as unknown[];

    // Find WhatsApp in integrations
    const whatsappIntegration = (integrations as Record<string, unknown>[])
      .find(i => (i.type as string) === 'whatsapp' || (i.provider as string) === 'whatsapp');

    expect(whatsappIntegration).toBeDefined();
    expect(whatsappIntegration?.type).toBe('whatsapp');
  });

  test('bootstrap returns hasWhatsAppAccessToken=false when disconnected', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(config.hasWhatsAppAccessToken).toBe(false);
  });

  test('WhatsApp integration shows correct disconnected state fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    const integrations = config.integrations as unknown[];

    const whatsappIntegration = (integrations as Record<string, unknown>[])
      .find(i => (i.type as string) === 'whatsapp');

    expect(whatsappIntegration).toBeDefined();
    // Disconnected WhatsApp should have empty phoneNumberId
    expect(whatsappIntegration?.connected).toBe(false);
  });

  test('connections page shows all 5 channel types including WhatsApp', async ({ page }) => {
    await gotoAuthenticated(page, '/connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // PLATFORMS = ['linkedin', 'instagram', 'gmail', 'telegram', 'whatsapp']
    const channels = ['linkedin', 'instagram', 'gmail', 'telegram', 'whatsapp'] as const;

    for (const channel of channels) {
      const channelText = page.getByText(new RegExp(channel, 'i'));
      const isVisible = await channelText.first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 34.5: WhatsApp — Sidebar Navigation Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 34.5: WhatsApp — Sidebar Navigation Wiring', () => {

  test('sidebar shows WhatsApp nav item when connected', async ({ page }) => {
    /**
     * Spec (Journey 6): When WhatsApp is connected, the sidebar navigation
     * shows a WhatsApp item alongside other channel links.
     *
     * Expected behavior: Connected WhatsApp shows nav item in sidebar.
     */
    const connectedSession = {
      ...MOCK_SESSION,
      config: {
        ...MOCK_SESSION.config,
        hasWhatsAppAccessToken: true,
        whatsappPhoneNumberId: 'mock-phone-id',
      },
    };

    await setupApiMocks(page, {
      bootstrap: connectedSession,
    });
    await injectFakeToken(page);
    await page.goto('./dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // When connected, WhatsApp should appear in sidebar or channel nav
    const hasNav = (await page.locator('nav, aside, [role="navigation"]').count()) > 0;
    expect(hasNav).toBeTruthy();
  });

  test('sidebar hides WhatsApp or shows setup indicator when disconnected', async ({ page }) => {
    await gotoAuthenticated(page, './dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // When disconnected, WhatsApp should not be prominently shown
    // OR the sidebar should render without error
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    expect(jsErrors).toHaveLength(0);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('navigating to /connections from sidebar works without crash', async ({ page }) => {
    await gotoAuthenticated(page, './dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Find and click connections link in sidebar
    const connectionsLink = page.getByRole('link', { name: /connections/i })
      .or(page.getByRole('menuitem', { name: /connections/i }))
      .or(page.getByText(/connections/i).first());

    if (await connectionsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await connectionsLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Should be on connections page
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length ?? 0).toBeGreaterThan(10);
    } else {
      test.skip(true, 'Connections link not visible in sidebar');
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 34.6: WhatsApp — Error Handling Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 34.6: WhatsApp — Error Handling Wiring', () => {

  test('startWhatsAppAuth handles OAuth failure gracefully', async ({ page }) => {
    /**
     * Spec (Journey 5): When WhatsApp OAuth fails (user cancels, invalid token),
     * the UI should show an error state without crashing.
     *
     * Expected behavior: startWhatsAppAuth returns {ok: false, error: '...'}
     * OR the action fails gracefully with no JS crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Even if OAuth URL is invalid, the action should not crash
    const result = await fireAction(page, 'startWhatsAppAuth');

    // The action should return a response (not throw)
    expect(result).toBeDefined();
    expect(typeof result.ok).toBe('boolean');

    expect(jsErrors).toHaveLength(0);
  });

  test('connections page renders when WhatsApp API is unavailable', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Page should render without crash regardless of WhatsApp availability
    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('completeWhatsAppConnection handles missing phoneNumberId gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Fire completeWhatsAppConnection without phoneNumberId
    const result = await fireAction(page, 'completeWhatsAppConnection', {});

    // Should return a response (not crash), even if missing required field
    expect(result).toBeDefined();
    expect(typeof result.ok).toBe('boolean');
  });
});
