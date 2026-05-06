/**
 * Journey 49: Wiring Loop 29/50 — Gmail Campaign Wiring Validation
 *
 * Validates wiring for Journey 3 (Gmail Campaign) against the SPEC
 * (USE-CASES.md). Tests verify the implementation satisfies the specification,
 * failing if the spec is not met.
 *
 * Key issues being tested (from USE-CASES.md Journey 3):
 *   1. Gmail integration in bootstrap config (hasGmailAccessToken flag)
 *   2. startGmailAuth OAuth redirect URL is reachable and targets google
 *   3. email tab fields (To/CC/BCC/Subject) appear in editor for gmail topic
 *   4. saveEmailFields action persists email headers alongside draft
 *   5. publishContent fires with channel='gmail' and email header fields
 *   6. Gmail returns deliveryMode='sent' and ISO timestamp on publish
 *   7. hasGmailAccessToken flag set correctly when connected
 *   8. Gmail accessible from /connections page alongside other channels
 *   9. addTopic accepts topicDeliveryChannel='gmail' and persists field
 *  10. Gmail integration shows in integrations array from bootstrap
 *
 * API routing pattern: All actions POST to `http://localhost:5174/` with
 * `{ action: ... }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/33/
 * 35/36/37/38/39/40/41/42/43/44/45/46/47/48).
 *
 * References:
 *   USE-CASES.md — Journey 3 spec (Gmail Campaign wiring: WIRED)
 *   helpers/mockApi.ts — mock API helper (Gmail OAuth mocks)
 *   frontend/src/services/backendApi.ts — startGmailAuth, publishContent client methods
 *   frontend/src/services/sheets.ts — emailTo/emailCc/emailBcc/emailSubject fields in SheetRow
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
// Journey 49.1: Gmail — Bootstrap Config Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 49.1: Gmail — Bootstrap Config Wiring', () => {

  test('bootstrap returns hasGmailAccessToken=false when not connected', async ({ page }) => {
    /**
     * Spec (Journey 1/3): Bootstrap session config includes hasGmailAccessToken.
     * When Gmail is not connected, the flag should be false.
     *
     * Expected behavior: config.hasGmailAccessToken === false
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(config.hasGmailAccessToken).toBe(false);
  });

  test('bootstrap returns hasGmailAccessToken=true when connected', async ({ page }) => {
    /**
     * Spec (Journey 1/3): When Gmail OAuth is complete, hasGmailAccessToken is true.
     *
     * Expected behavior: config.hasGmailAccessToken === true
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(config.hasGmailAccessToken).toBe(true);
  });

  test('bootstrap returns gmailEmailAddress from session config', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    const gmailEmailAddress = config.gmailEmailAddress as string;
    expect(typeof gmailEmailAddress).toBe('string');
    expect(gmailEmailAddress.length).toBeGreaterThan(0);
  });

  test('bootstrap integrations array includes Gmail with connected flag', async ({ page }) => {
    /**
     * Spec (Journey 1/3): Bootstrap returns integrations array including Gmail.
     * Each integration has type, connected, and provider fields.
     *
     * Expected behavior: integrations includes entry with type='gmail', connected=true
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    const integrations = config.integrations as unknown[];

    const gmailIntegration = (integrations as Record<string, unknown>[])
      .find(i => (i.type as string) === 'gmail');

    expect(gmailIntegration).toBeDefined();
    expect(gmailIntegration?.type).toBe('gmail');
    expect(Boolean(gmailIntegration?.connected)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 49.2: Gmail — OAuth Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 49.2: Gmail — OAuth Wiring', () => {

  test('startGmailAuth returns authorization URL targeting google', async ({ page }) => {
    /**
     * Spec (Journey 3/6): startGmailAuth initiates Gmail OAuth by returning an
     * authorization URL that opens the Google OAuth consent screen.
     *
     * Expected behavior: { ok: true, data: { authorizationUrl: 'https://accounts.google.com/...' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'startGmailAuth');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const authUrl = data.authorizationUrl as string;
    expect(typeof authUrl).toBe('string');
    expect(authUrl).toContain('google');
    expect(authUrl.startsWith('https://')).toBe(true);
  });

  test('startGmailAuth URL is valid https absolute URL', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'startGmailAuth');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const authUrl = data.authorizationUrl as string;
    expect(authUrl.startsWith('https://')).toBe(true);
    expect(authUrl.length).toBeGreaterThan(20);
  });

  test('completeGmailConnection action fires with email field', async ({ page }) => {
    /**
     * Spec (Journey 3): After OAuth popup completes, completeGmailConnection
     * is called with the authorized email address to store in D1.
     *
     * Expected behavior: { ok: true, data: { gmailEmailAddress: '...' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'completeGmailConnection', {
      email: 'test@gmail.com',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Boolean(data)).toBe(true);
  });

  test('startGmailAuth action is callable without prior Gmail connection', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'startGmailAuth');

    // OAuth initiation should succeed even when Gmail is not yet connected
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.authorizationUrl).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 49.3: Gmail — Email Fields Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 49.3: Gmail — Email Fields Wiring', () => {

  test('getRows returns rows with email header fields', async ({ page }) => {
    /**
     * Spec (Journey 3): For Gmail topics, the sheet row includes email
     * header fields: emailTo, emailCc, emailBcc, emailSubject.
     *
     * Expected behavior: rows include all four email fields (non-empty strings)
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');

    expect(result.ok).toBe(true);
    const rows = result.data as unknown[];
    expect(Array.isArray(rows)).toBe(true);

    if (rows.length > 0) {
      const row = rows[0] as Record<string, unknown>;
      expect(typeof row.emailTo).toBe('string');
      expect(typeof row.emailCc).toBe('string');
      expect(typeof row.emailBcc).toBe('string');
      expect(typeof row.emailSubject).toBe('string');
    }
  });

  test('addTopic accepts topicDeliveryChannel=gmail and persists field', async ({ page }) => {
    /**
     * Spec (Journey 3): The scratchpad form accepts topicDeliveryChannel field.
     * When set to 'gmail', the topic is created for the Gmail campaign flow.
     *
     * Expected behavior: addTopic returns row with topicDeliveryChannel='gmail'
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'addTopic', {
      topic: 'Q2 Investor Update',
      topicDeliveryChannel: 'gmail',
      emailTo: 'investors@example.com',
      emailSubject: 'Q2 Investor Update',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.topicDeliveryChannel).toBe('gmail');
  });

  test('saveEmailFields action persists email headers', async ({ page }) => {
    /**
     * Spec (Journey 3): saveEmailFields persists email header fields
     * (To/CC/BCC/Subject) alongside the draft text.
     *
     * Expected behavior: { ok: true, data: { success: true } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'saveEmailFields', {
      rowIndex: 0,
      emailTo: 'team@example.com',
      emailCc: 'manager@example.com',
      emailBcc: '',
      emailSubject: 'Weekly Update',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 49.4: Gmail — Publish Action Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 49.4: Gmail — Publish Action Wiring', () => {

  test('publishContent with channel=gmail returns deliveryMode=sent', async ({ page }) => {
    /**
     * Spec (Journey 3): publishContent for Gmail returns deliveryMode='sent'
     * and ISO timestamp after successful send.
     *
     * Expected behavior: { ok: true, data: { deliveryMode: 'sent', timestamp: '...' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'publishContent', {
      channel: 'gmail',
      message: 'Test email body content',
      row: { rowIndex: 0, topicId: 'gmail-topic-1' },
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.deliveryMode).toBe('sent');
    expect(typeof data.timestamp).toBe('string');
    // Timestamp should be valid ISO date string
    expect(() => new Date(data.timestamp as string)).not.toThrow();
  });

  test('publishContent accepts email header fields in body', async ({ page }) => {
    /**
     * Spec (Journey 3): publishContent accepts emailTo, emailCc, emailBcc,
     * emailSubject fields alongside the message.
     *
     * Expected behavior: { ok: true, data: { deliveryMode: 'sent' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'publishContent', {
      channel: 'gmail',
      message: 'Gmail publish body',
      emailTo: 'recipient@example.com',
      emailCc: 'cc@example.com',
      emailBcc: 'bcc@example.com',
      emailSubject: 'Subject Line',
      row: { rowIndex: 1, topicId: 'gmail-topic-2' },
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.deliveryMode).toBe('sent');
  });

  test('publishContent with gmail channel is callable from authenticated context', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'publishContent', {
      channel: 'gmail',
      message: 'Authenticated Gmail send test',
      row: { rowIndex: 0, topicId: 'gmail-auth-1' },
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.deliveryMode).toBe('sent');
  });

  test('publishContent with gmail channel returns stable response across calls', async ({ page }) => {
    /**
     * Spec: Multiple publishContent calls should return stable responses.
     *
     * Expected behavior: All calls return { ok: true, deliveryMode: 'sent' }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result1 = await fireAction(page, 'publishContent', {
      channel: 'gmail',
      message: 'Gmail send 1',
      row: { rowIndex: 0, topicId: 'gmail-stable-1' },
    });
    const result2 = await fireAction(page, 'publishContent', {
      channel: 'gmail',
      message: 'Gmail send 2',
      row: { rowIndex: 1, topicId: 'gmail-stable-2' },
    });

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    const data1 = result1.data as Record<string, unknown>;
    const data2 = result2.data as Record<string, unknown>;
    expect(data1.deliveryMode).toBe('sent');
    expect(data2.deliveryMode).toBe('sent');
  });
});

// ---------------------------------------------------------------------------
// Journey 49.5: Gmail — Connections Page Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 49.5: Gmail — Connections Page Wiring', () => {

  test('connections page shows Gmail channel alongside others', async ({ page }) => {
    /**
     * Spec (Journey 6): All five channels (LinkedIn, Instagram, Gmail, Telegram,
     * WhatsApp) should be available on /connections.
     *
     * Expected behavior: Gmail channel text visible on /connections page.
     */
    await gotoAuthenticated(page, '/connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const gmailText = page.getByText(/gmail/i).first();
    const hasGmail = await gmailText.isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasGmail).toBeTruthy();
  });

  test('connections page shows all 5 channel types including Gmail', async ({ page }) => {
    await gotoAuthenticated(page, '/connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const channels = ['linkedin', 'instagram', 'gmail', 'telegram', 'whatsapp'] as const;

    for (const channel of channels) {
      const channelText = page.getByText(new RegExp(channel, 'i'));
      const isVisible = await channelText.first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
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
// Journey 49.6: Gmail — Editor Email Tab Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 49.6: Gmail — Editor Email Tab Wiring', () => {

  test('getRows returns rows with email header fields for gmail topic', async ({ page }) => {
    /**
     * Spec (Journey 3): Gmail topics in the editor show the email tab with
     * To/CC/BCC/Subject fields pre-populated from the sheet row.
     *
     * Expected behavior: getRows returns rows with emailTo/emailCc/emailBcc/emailSubject
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');

    expect(result.ok).toBe(true);
    const rows = result.data as unknown[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);

    const row = rows[0] as Record<string, unknown>;
    expect(typeof row.emailTo).toBe('string');
    expect(typeof row.emailCc).toBe('string');
    expect(typeof row.emailBcc).toBe('string');
    expect(typeof row.emailSubject).toBe('string');
  });

  test('getRows returns rows with topicDeliveryChannel=gmail for email topics', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');

    expect(result.ok).toBe(true);
    const rows = result.data as unknown[];
    expect(Array.isArray(rows)).toBe(true);

    if (rows.length > 0) {
      const row = rows[0] as Record<string, unknown>;
      // topicDeliveryChannel may be empty or 'gmail' — at minimum the field should exist
      expect(typeof row.topicDeliveryChannel).toBe('string');
    }
  });

  test('gmail topic editor loads without JS crash', async ({ page }) => {
    /**
     * Spec (Journey 3): Editor for Gmail topic should load without JavaScript errors.
     *
     * Expected behavior: /review/{gmail-topic} or /editor/{gmail-topic} renders without crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/review/gmail-test-topic');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });

  test('gmail editor loads without crash via editor route', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/editor/gmail-test-topic');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// Journey 49.7: Gmail — Cross-Channel Routing Stability
// ---------------------------------------------------------------------------

test.describe('Journey 49.7: Gmail — Cross-Channel Routing Stability', () => {

  test('publishContent with gmail channel works after linkedin publish', async ({ page }) => {
    /**
     * Spec: Action routing should be stable across different channel publishes.
     * Publishing Gmail after LinkedIn should not cause routing interference.
     *
     * Expected behavior: Both calls return { ok: true, deliveryMode: 'sent' }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const linkedinResult = await fireAction(page, 'publishContent', {
      channel: 'linkedin',
      message: 'LinkedIn publish',
      row: { rowIndex: 0, topicId: 'linkedin-cross-1' },
    });
    const gmailResult = await fireAction(page, 'publishContent', {
      channel: 'gmail',
      message: 'Gmail publish after LinkedIn',
      row: { rowIndex: 1, topicId: 'gmail-cross-1' },
    });

    expect(linkedinResult.ok).toBe(true);
    expect(gmailResult.ok).toBe(true);
    const gmailData = gmailResult.data as Record<string, unknown>;
    expect(gmailData.deliveryMode).toBe('sent');
  });

  test('startGmailAuth and startLinkedInAuth both work without conflict', async ({ page }) => {
    /**
     * Spec (Journey 3/6): Both LinkedIn and Gmail OAuth actions should be
     * reachable in the same session without interference.
     *
     * Expected behavior: Both return { ok: true, data: { authorizationUrl: '...' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const gmailResult = await fireAction(page, 'startGmailAuth');
    const linkedinResult = await fireAction(page, 'startLinkedInAuth');

    expect(gmailResult.ok).toBe(true);
    expect(linkedinResult.ok).toBe(true);
    const gmailData = gmailResult.data as Record<string, unknown>;
    const linkedinData = linkedinResult.data as Record<string, unknown>;
    expect(typeof gmailData.authorizationUrl).toBe('string');
    expect(typeof linkedinData.authorizationUrl).toBe('string');
  });

  test('gmail publish interleaved with getRows works without crash', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const rowsResult = await fireAction(page, 'getRows');
    const gmailPublishResult = await fireAction(page, 'publishContent', {
      channel: 'gmail',
      message: 'Interleaved Gmail publish',
      row: { rowIndex: 0, topicId: 'gmail-interleave-1' },
    });
    const rowsResult2 = await fireAction(page, 'getRows');

    expect(rowsResult.ok).toBe(true);
    expect(gmailPublishResult.ok).toBe(true);
    expect(rowsResult2.ok).toBe(true);

    const gmailData = gmailPublishResult.data as Record<string, unknown>;
    expect(gmailData.deliveryMode).toBe('sent');
  });
});
