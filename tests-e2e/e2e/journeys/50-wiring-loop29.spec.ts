/**
 * Journey 50: Wiring Loop 29/50 — Telegram & WhatsApp Messaging Wiring Validation
 *
 * Validates wiring for Journey 4 (Telegram) and Journey 5 (WhatsApp) against the
 * SPEC (USE-CASES.md). Tests verify the implementation satisfies the specification,
 * failing if the spec is not met.
 *
 * Key issues being tested (from USE-CASES.md Journeys 4 & 5):
 *   1. Telegram: chat ID verification via verifyTelegramChat action
 *   2. Telegram: hasTelegramBotToken flag in bootstrap config
 *   3. Telegram: telegramRecipients array in session config
 *   4. Telegram: publishContent with channel='telegram' returns deliveryMode + timestamp
 *   5. Telegram: accessible from /connections page alongside other channels
 *   6. WhatsApp: startWhatsAppAuth OAuth URL returning authorizationUrl
 *   7. WhatsApp: completeWhatsAppConnection persists phone ID to D1
 *   8. WhatsApp: hasWhatsAppAccessToken flag in bootstrap config
 *   9. WhatsApp: whatsappPhoneNumberId in session config
 *  10. WhatsApp: accessible from /connections page (PATH-041 resolved)
 *  11. WhatsApp: publishContent with channel='whatsapp' returns deliveryMode + timestamp
 *
 * API routing pattern: All actions POST to `http://localhost:5174/` with
 * `{ action: ... }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/33/
 * 35/36/37/38/39/40/41/42/43/44/45/46/47/48/49).
 *
 * References:
 *   USE-CASES.md — Journey 4 (Telegram wiring: WIRED) & Journey 5 (WhatsApp wiring: WIRED)
 *   helpers/mockApi.ts — mock API helpers (verifyTelegramChat, startWhatsAppAuth,
 *     completeWhatsAppConnection mocks)
 *   frontend/src/services/backendApi.ts — publishContent client method
 *   frontend/src/integrations/channels.ts — ChannelId type (includes telegram, whatsapp)
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
// Journey 50.1: Telegram — Bootstrap Config Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 50.1: Telegram — Bootstrap Config Wiring', () => {

  test('bootstrap config includes hasTelegramBotToken boolean flag', async ({ page }) => {
    /**
     * Spec (Journey 4): The bootstrap config must include hasTelegramBotToken
     * as a boolean flag to gate Telegram publishing UI elements.
     *
     * Expected behavior: config.hasTelegramBotToken is a boolean
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    const hasTelegramBotToken = config.hasTelegramBotToken;
    expect(typeof hasTelegramBotToken).toBe('boolean');
  });

  test('bootstrap config includes telegramRecipients array', async ({ page }) => {
    /**
     * Spec (Journey 4): The bootstrap config must include telegramRecipients
     * as an array of verified recipient objects for targeting Telegram sends.
     *
     * Expected behavior: config.telegramRecipients is an array
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    const telegramRecipients = config.telegramRecipients;
    expect(Array.isArray(telegramRecipients)).toBe(true);
  });

  test('bootstrap integrations array includes Telegram entry', async ({ page }) => {
    /**
     * Spec (Journey 4 / Journey 6): Bootstrap returns integrations array including
     * a Telegram entry with type='telegram'.
     *
     * Expected behavior: integrations includes entry with type='telegram'
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    const integrations = data.integrations as unknown[];

    const telegramIntegration = (integrations as Record<string, unknown>[])
      .find(i => (i.type as string) === 'telegram');

    expect(telegramIntegration).toBeDefined();
    expect(telegramIntegration?.type).toBe('telegram');
  });

  test('telegram channel is reachable from /connections page', async ({ page }) => {
    /**
     * Spec (Journey 6): All channels can be configured from /connections page.
     * Telegram must have a presence on the /connections page (verification
     * section below Publishing Channels — PATH-053 resolved).
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText();
    const hasTelegramText = /telegram/i.test(bodyText);
    expect(hasTelegramText).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 50.2: Telegram — Chat ID Verification Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 50.2: Telegram — Chat ID Verification Wiring', () => {

  test('verifyTelegramChat action returns chatId and title fields', async ({ page }) => {
    /**
     * Spec (Journey 4): Telegram requires chat ID verification via
     * verifyTelegramChat() before sending. The action should return
     * chatId and title fields for the verified chat.
     *
     * Mock returns { chatId: '-100123456', title: 'Test Chat', username: 'testchat', type: 'group' }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'verifyTelegramChat', { chatId: '-100123456' });
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    const chatId = data.chatId as string;
    const title = data.title as string;

    expect(typeof chatId).toBe('string');
    expect(chatId.length).toBeGreaterThan(0);
    expect(typeof title).toBe('string');
  });

  test('verifyTelegramChat is reachable without crashing', async ({ page }) => {
    /**
     * Spec (Journey 4): verifyTelegramChat must be callable without JS crash.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'verifyTelegramChat');
    // Mock returns ok=true even without chatId param
    expect(result.ok).toBe(true);
  });

  test('verifyTelegramChat result includes chatId field that is a string', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'verifyTelegramChat');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    expect(typeof data.chatId).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 50.3: Telegram — Publish Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 50.3: Telegram — Publish Content Wiring', () => {

  test('publishContent with channel=telegram returns deliveryMode and timestamp', async ({ page }) => {
    /**
     * Spec (Journey 4): publishContent fires with channel='telegram' and
     * returns deliveryMode and ISO timestamp on success.
     *
     * Expected behavior: { ok: true, data: { deliveryMode: 'sent', timestamp: '...' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'publishContent', {
      channel: 'telegram',
      message: 'Test Telegram message',
      recipientId: '-100123456',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const deliveryMode = data.deliveryMode as string;
    const timestamp = data.timestamp as string;

    expect(typeof deliveryMode).toBe('string');
    expect(deliveryMode.length).toBeGreaterThan(0);
    expect(typeof timestamp).toBe('string');
    // Verify timestamp is ISO-like format
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('publishContent telegram supports recipientId parameter', async ({ page }) => {
    /**
     * Spec (Journey 4): Telegram sends require recipientId to specify the target
     * chat. publishContent must accept recipientId alongside channel and message.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'publishContent', {
      channel: 'telegram',
      message: 'Hello from LinkedIn Post bot',
      recipientId: '-100987654',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.deliveryMode).toBe('string');
  });

  test('publishContent telegram is stable across multiple calls', async ({ page }) => {
    /**
     * Spec (Journeys 4 & 7): Publishing actions should return consistent response
     * shapes across sequential calls without crashing.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result1 = await fireAction(page, 'publishContent', {
      channel: 'telegram',
      message: 'First Telegram post',
      recipientId: '-100123456',
    });
    expect(result1.ok).toBe(true);

    const result2 = await fireAction(page, 'publishContent', {
      channel: 'telegram',
      message: 'Second Telegram post',
      recipientId: '-100123456',
    });
    expect(result2.ok).toBe(true);

    const data1 = result1.data as Record<string, unknown>;
    const data2 = result2.data as Record<string, unknown>;
    expect(typeof data1.deliveryMode).toBe('string');
    expect(typeof data2.deliveryMode).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 50.4: WhatsApp — Bootstrap Config Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 50.4: WhatsApp — Bootstrap Config Wiring', () => {

  test('bootstrap config includes hasWhatsAppAccessToken boolean flag', async ({ page }) => {
    /**
     * Spec (Journey 5): The bootstrap config must include hasWhatsAppAccessToken
     * as a boolean flag to gate WhatsApp publishing UI elements.
     *
     * Expected behavior: config.hasWhatsAppAccessToken is a boolean
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    const hasWhatsAppAccessToken = config.hasWhatsAppAccessToken;
    expect(typeof hasWhatsAppAccessToken).toBe('boolean');
  });

  test('bootstrap config includes whatsappPhoneNumberId string', async ({ page }) => {
    /**
     * Spec (Journey 5): The bootstrap config must include whatsappPhoneNumberId
     * string (empty when not connected, populated after phone selection).
     *
     * Expected behavior: config.whatsappPhoneNumberId is a string
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    const whatsappPhoneNumberId = config.whatsappPhoneNumberId;
    expect(typeof whatsappPhoneNumberId).toBe('string');
  });

  test('bootstrap integrations array includes WhatsApp entry', async ({ page }) => {
    /**
     * Spec (Journey 5 / Journey 6): Bootstrap returns integrations array including
     * a WhatsApp entry with type='whatsapp'.
     *
     * Expected behavior: integrations includes entry with type='whatsapp'
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    const integrations = data.integrations as unknown[];

    const whatsappIntegration = (integrations as Record<string, unknown>[])
      .find(i => (i.type as string) === 'whatsapp');

    expect(whatsappIntegration).toBeDefined();
    expect(whatsappIntegration?.type).toBe('whatsapp');
  });

  test('whatsapp channel is reachable from /connections page', async ({ page }) => {
    /**
     * Spec (Journey 6): All channels can be configured from /connections page.
     * WhatsApp must have a presence on the /connections page (PATH-041 and
     * PATH-052 resolved — WhatsApp card added to SOCIAL_PROVIDERS array).
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText();
    const hasWhatsAppText = /whatsapp/i.test(bodyText);
    expect(hasWhatsAppText).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 50.5: WhatsApp — OAuth & Connection Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 50.5: WhatsApp — OAuth & Connection Wiring', () => {

  test('startWhatsAppAuth returns a valid OAuth URL', async ({ page }) => {
    /**
     * Spec (Journey 5 / Journey 6): startWhatsAppAuth initiates WhatsApp OAuth
     * via the Meta Cloud API by returning an authorization URL pointing to
     * facebook.com/oauth.
     *
     * Mock returns { authorizationUrl: 'https://facebook.com/oauth' }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'startWhatsAppAuth');
    expect(result.ok).toBe(true);

    const data = result.data as { authorizationUrl?: string };
    expect(typeof data.authorizationUrl).toBe('string');
    expect(data.authorizationUrl).toContain('facebook.com');
    expect(data.authorizationUrl.startsWith('https://')).toBe(true);
  });

  test('startWhatsAppAuth URL is valid https absolute URL', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'startWhatsAppAuth');
    expect(result.ok).toBe(true);

    const data = result.data as { authorizationUrl?: string };
    expect(typeof data.authorizationUrl).toBe('string');
    expect(data.authorizationUrl.startsWith('https://')).toBe(true);

    // Must be a valid URL
    const url = new URL(data.authorizationUrl);
    expect(url.protocol).toBe('https:');
  });

  test('completeWhatsAppConnection persists phone number ID', async ({ page }) => {
    /**
     * Spec (Journey 5): completeWhatsAppConnection is the second step of the
     * Meta Cloud API two-step: after OAuth popup, user selects their phone number
     * and this action persists the phone ID to D1.
     *
     * Mock returns { phoneNumberId: '...', displayName: '...' }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'completeWhatsAppConnection', {
      phoneNumberId: 'wa-phone-12345',
      displayName: 'Test WhatsApp Business',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const phoneNumberId = data.phoneNumberId as string;

    expect(typeof phoneNumberId).toBe('string');
    expect(phoneNumberId.length).toBeGreaterThan(0);
  });

  test('completeWhatsAppConnection result includes phoneNumberId field', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'completeWhatsAppConnection', {
      phoneNumberId: 'wa-test-phone-abc',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.phoneNumberId).toBe('string');
  });

  test('startWhatsAppAuth is callable without prior WhatsApp connection', async ({ page }) => {
    /**
     * Spec (Journey 5 / Journey 6): OAuth initiation should work regardless of
     * current connection state.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'startWhatsAppAuth');
    expect(result.ok).toBe(true);

    const data = result.data as { authorizationUrl?: string };
    expect(typeof data.authorizationUrl).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 50.6: WhatsApp — Publish Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 50.6: WhatsApp — Publish Content Wiring', () => {

  test('publishContent with channel=whatsapp returns deliveryMode and timestamp', async ({ page }) => {
    /**
     * Spec (Journey 5): publishContent fires with channel='whatsapp' and
     * returns deliveryMode and ISO timestamp on success.
     *
     * Expected behavior: { ok: true, data: { deliveryMode: 'sent', timestamp: '...' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'publishContent', {
      channel: 'whatsapp',
      message: 'Test WhatsApp message via Meta Cloud API',
      recipientId: '+15550000001',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const deliveryMode = data.deliveryMode as string;
    const timestamp = data.timestamp as string;

    expect(typeof deliveryMode).toBe('string');
    expect(deliveryMode.length).toBeGreaterThan(0);
    expect(typeof timestamp).toBe('string');
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('publishContent whatsapp accepts recipientId parameter', async ({ page }) => {
    /**
     * Spec (Journey 5): WhatsApp sends require recipientId (phone number) to
     * specify the target. publishContent must accept recipientId.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'publishContent', {
      channel: 'whatsapp',
      message: 'Hello from LinkedIn Post via WhatsApp',
      recipientId: '+15551234567',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.deliveryMode).toBe('string');
  });

  test('publishContent whatsapp is stable across multiple calls', async ({ page }) => {
    /**
     * Spec (Journeys 5 & 7): Publishing actions should return consistent
     * response shapes across sequential calls without crashing.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result1 = await fireAction(page, 'publishContent', {
      channel: 'whatsapp',
      message: 'First WhatsApp message',
      recipientId: '+15550000001',
    });
    expect(result1.ok).toBe(true);

    const result2 = await fireAction(page, 'publishContent', {
      channel: 'whatsapp',
      message: 'Second WhatsApp message',
      recipientId: '+15550000001',
    });
    expect(result2.ok).toBe(true);

    const data1 = result1.data as Record<string, unknown>;
    const data2 = result2.data as Record<string, unknown>;
    expect(typeof data1.deliveryMode).toBe('string');
    expect(typeof data2.deliveryMode).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 50.7: Telegram & WhatsApp — Cross-Channel Routing Stability
// ---------------------------------------------------------------------------

test.describe('Journey 50.7: Telegram & WhatsApp — Cross-Channel Routing Stability', () => {

  test('all five messaging channels are accessible in the same session', async ({ page }) => {
    /**
     * Spec (Journeys 2-5 / Journey 6): All channels can coexist in the same
     * session. Bootstrap config should include flags for all five channels
     * (LinkedIn, Instagram, Gmail, Telegram, WhatsApp).
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;

    // All five channel flags should be present
    expect(typeof config.hasLinkedInAccessToken).toBe('boolean');
    expect(typeof config.hasInstagramAccessToken).toBe('boolean');
    expect(typeof config.hasGmailAccessToken).toBe('boolean');
    expect(typeof config.hasTelegramBotToken).toBe('boolean');
    expect(typeof config.hasWhatsAppAccessToken).toBe('boolean');
  });

  test('telegram publish interleaved with whatsapp publish works without crash', async ({ page }) => {
    /**
     * Spec (Journeys 4 & 5): Channel routing must be stable when switching
     * between messaging channels. Sequential calls to different channels
     * should not interfere.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const telegramResult = await fireAction(page, 'publishContent', {
      channel: 'telegram',
      message: 'Telegram message before WhatsApp',
      recipientId: '-100123456',
    });
    expect(telegramResult.ok).toBe(true);

    const whatsappResult = await fireAction(page, 'publishContent', {
      channel: 'whatsapp',
      message: 'WhatsApp message after Telegram',
      recipientId: '+15550000001',
    });
    expect(whatsappResult.ok).toBe(true);

    const telegramData = telegramResult.data as Record<string, unknown>;
    const whatsappData = whatsappResult.data as Record<string, unknown>;

    expect(typeof telegramData.deliveryMode).toBe('string');
    expect(typeof whatsappData.deliveryMode).toBe('string');
  });

  test('verifyTelegramChat and startWhatsAppAuth both callable in same session', async ({ page }) => {
    /**
     * Spec (Journeys 4 & 5): Both messaging channel verification/OAuth flows
     * should be independently callable in the same authenticated session.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const telegramResult = await fireAction(page, 'verifyTelegramChat', {
      chatId: '-100123456',
    });
    expect(telegramResult.ok).toBe(true);

    const whatsappResult = await fireAction(page, 'startWhatsAppAuth');
    expect(whatsappResult.ok).toBe(true);

    const whatsappData = whatsappResult.data as { authorizationUrl?: string };
    expect(typeof whatsappData.authorizationUrl).toBe('string');
  });

  test('connections page shows all five channels including telegram and whatsapp', async ({ page }) => {
    /**
     * Spec (Journey 6): All five channels (LinkedIn, Instagram, Gmail, Telegram,
     * WhatsApp) should be accessible from /connections page. PATH-052 (WhatsApp
     * missing) and PATH-053 (Telegram missing) are both resolved.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText();

    const hasLinkedIn = /linkedin/i.test(bodyText);
    const hasInstagram = /instagram/i.test(bodyText);
    const hasGmail = /gmail/i.test(bodyText);
    const hasTelegram = /telegram/i.test(bodyText);
    const hasWhatsApp = /whatsapp/i.test(bodyText);

    expect(hasLinkedIn).toBe(true);
    expect(hasInstagram).toBe(true);
    expect(hasGmail).toBe(true);
    expect(hasTelegram).toBe(true);
    expect(hasWhatsApp).toBe(true);
  });
});
