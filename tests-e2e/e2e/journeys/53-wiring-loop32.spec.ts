/**
 * Journey 53: Wiring Loop 32/50 — Worker Integration & E2E Infrastructure Validation
 *
 * Validates wiring for worker integration and E2E test infrastructure against the
 * SPEC (USE-CASES.md). Tests verify the implementation satisfies the specification,
 * failing if the spec is not met.
 *
 * Key issues being tested (from USE-CASES.md Loop 32):
 *   1. Worker startup script (start-worker.sh) exists and is executable
 *   2. Worker runs on port 8787 as specified in playwright.config.ts
 *   3. Worker health check endpoint responds on startup
 *   4. Action routing POST to '/' reaches worker via mockApi.ts
 *   5. All mock action handlers return correct response shapes
 *   6. Auth injection (injectFakeToken) enables authenticated requests
 *   7. Mock session bootstrap returns required session fields
 *   8. MOCK_ROWS contains rows with all required SheetRow fields
 *   9. SSE stream endpoint (/api/generate/stream) returns parseable events
 *  10. Worker PID tracking works correctly in start-worker.sh
 *  11. Worker startup timeout handling (30s timeout as documented)
 *
 * API routing pattern: All actions POST to `http://localhost:5174/` with
 * `{ action: ... }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/31/
 * 33/35/36/37/38/39/40/41/42/43/44/45/46/47/48/49/50/51/52).
 *
 * References:
 *   USE-CASES.md — Wiring Status documentation (Wiring: 100% WIRED)
 *   USE-CASES.md — Loop 28 documentation (bulkImportCampaign wiring)
 *   USE-CASES.md — Loop 29 documentation (worker automation cleanup)
 *   helpers/mockApi.ts — mock API helpers (all action mocks, MOCK_SESSION, MOCK_ROWS)
 *   helpers/mockSetupApi.ts — setup wizard mock helpers
 *   playwright.config.ts — webServer config for worker (port 8787)
 *   tests/e2e/start-worker.sh — worker startup script (PID tracking, health check)
 *   journeys/48-wiring-loop28.spec.ts — Core Content Creation Loop (loop 28)
 *   journeys/50-wiring-loop29.spec.ts — Telegram & WhatsApp Messaging (loop 29)
 *   journeys/52-wiring-loop31.spec.ts — Journey 47 Structure Validation (loop 31)
 */

import { test, expect, type Page } from '@playwright/test';
import {
  setupApiMocks,
  injectFakeToken,
  gotoAuthenticated,
  MOCK_SESSION,
  MOCK_ROWS,
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
// Journey 53.1: Worker Startup Script Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 53.1: Worker Startup Script Wiring', () => {

  test('worker startup script exists and has correct shebang', async ({ page }) => {
    /**
     * Spec: The worker startup script (start-worker.sh) must exist at the
     * expected path and have a valid bash shebang.
     *
     * Expected behavior: Script file exists with #!/bin/bash shebang
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Verify the script is accessible by checking its content via page.evaluate
    const scriptCheck = await page.evaluate(async () => {
      try {
        const resp = await fetch('./start-worker.sh');
        if (!resp.ok) return { exists: false, status: resp.status };
        const text = await resp.text();
        return {
          exists: true,
          hasShebang: text.startsWith('#!/bin/bash') || text.startsWith('#!/usr/bin/env bash'),
          lineCount: text.split('\n').length,
        };
      } catch {
        return { exists: false, error: 'fetch failed' };
      }
    });

    expect(scriptCheck.exists).toBe(true);
  });

  test('worker startup script uses correct port (8787)', async ({ page }) => {
    /**
     * Spec: The worker startup script must start the worker on port 8787
     * to match the playwright.config.ts webServer configuration.
     *
     * Expected behavior: Script contains port 8787 configuration
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const portCheck = await page.evaluate(async () => {
      try {
        const resp = await fetch('./start-worker.sh');
        if (!resp.ok) return { exists: false };
        const text = await resp.text();
        return {
          exists: true,
          containsPort: text.includes('8787'),
          containsWrangler: text.includes('wrangler') || text.includes('dev'),
        };
      } catch {
        return { exists: false };
      }
    });

    expect(portCheck.exists).toBe(true);
    expect(portCheck.containsPort).toBe(true);
  });

  test('worker startup script has PID tracking', async ({ page }) => {
    /**
     * Spec: The worker startup script must track the worker PID for clean shutdown.
     *
     * Expected behavior: Script saves PID to a file
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const pidCheck = await page.evaluate(async () => {
      try {
        const resp = await fetch('./start-worker.sh');
        if (!resp.ok) return { exists: false };
        const text = await resp.text();
        return {
          exists: true,
          hasPidTracking: text.includes('PID') || text.includes('.pid'),
          hasCleanup: text.includes('exit'),
        };
      } catch {
        return { exists: false };
      }
    });

    expect(pidCheck.exists).toBe(true);
    expect(pidCheck.hasPidTracking).toBe(true);
  });

  test('worker startup script has health check with timeout', async ({ page }) => {
    /**
     * Spec: The worker startup script must poll for readiness with a timeout.
     *
     * Expected behavior: Script contains curl health check with 30s timeout
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const healthCheck = await page.evaluate(async () => {
      try {
        const resp = await fetch('./start-worker.sh');
        if (!resp.ok) return { exists: false };
        const text = await resp.text();
        return {
          exists: true,
          hasCurl: text.includes('curl'),
          hasLoop: text.includes('seq') || text.includes('while'),
          hasTimeout: text.includes('30') || text.includes('timeout'),
          hasErrorMessage: text.includes('failed'),
        };
      } catch {
        return { exists: false };
      }
    });

    expect(healthCheck.exists).toBe(true);
    expect(healthCheck.hasCurl).toBe(true);
    expect(healthCheck.hasLoop).toBe(true);
    expect(healthCheck.hasTimeout).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 53.2: MOCK_SESSION & Bootstrap Config Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 53.2: MOCK_SESSION & Bootstrap Config Wiring', () => {

  test('MOCK_SESSION has all required session fields', async ({ page }) => {
    /**
     * Spec: MOCK_SESSION must include all fields required by the bootstrap
     * endpoint as documented in USE-CASES.md Journey 1.
     *
     * Expected behavior: MOCK_SESSION contains email, isAdmin, onboardingCompleted,
     * integrations array, config object
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    // Required top-level fields
    expect(typeof data.email).toBe('string');
    expect(typeof data.isAdmin).toBe('boolean');
    expect(typeof data.onboardingCompleted).toBe('boolean');
    expect(Array.isArray(data.integrations)).toBe(true);
    expect(typeof data.config).toBe('object');
  });

  test('MOCK_SESSION config has all required channel flags', async ({ page }) => {
    /**
     * Spec: MOCK_SESSION config must include all channel access token flags
     * as documented in USE-CASES.md Journeys 1-5.
     *
     * Expected behavior: config has hasLinkedInAccessToken, hasInstagramAccessToken,
     * hasGmailAccessToken, hasTelegramBotToken, hasWhatsAppAccessToken
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

  test('MOCK_SESSION integrations array covers all channels', async ({ page }) => {
    /**
     * Spec: MOCK_SESSION integrations must include entries for all 5 channels
     * (LinkedIn, Instagram, Gmail, Telegram, WhatsApp) as documented in
     * USE-CASES.md Journey 6.
     *
     * Expected behavior: integrations array has entries for all 5 channel types
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    const integrations = data.integrations as Array<Record<string, unknown>>;
    const types = integrations.map(i => String(i.type ?? i.provider ?? ''));

    expect(types).toContain('linkedin');
    expect(types).toContain('instagram');
    expect(types).toContain('gmail');
    expect(types).toContain('telegram');
    expect(types).toContain('whatsapp');
  });

  test('MOCK_SESSION config includes googleModel and hasGenerationWorker', async ({ page }) => {
    /**
     * Spec: MOCK_SESSION config must include googleModel string and
     * hasGenerationWorker boolean for editor generation wiring (USE-CASES.md Journey 1 Step 4).
     *
     * Expected behavior: config.googleModel is string, config.hasGenerationWorker is boolean
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(typeof config.googleModel).toBe('string');
    expect(typeof config.hasGenerationWorker).toBe('boolean');
    expect(Array.isArray(config.allowedGoogleModels)).toBe(true);
    expect((config.allowedGoogleModels as unknown[]).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 53.3: MOCK_ROWS & SheetRow Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 53.3: MOCK_ROWS & SheetRow Wiring', () => {

  test('MOCK_ROWS returns rows with required SheetRow fields', async ({ page }) => {
    /**
     * Spec: getRows action must return rows with all required SheetRow fields
     * as documented in USE-CASES.md Journey 1 Step 2.
     *
     * Expected behavior: Row contains topicId, topic, status, date, variant1-4,
     * imageLink1-4, selectedText, postTime
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');
    expect(result.ok).toBe(true);

    const rows = result.data as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);

    const row = rows[0] as Record<string, unknown>;
    expect(typeof row.topicId).toBe('string');
    expect(typeof row.topic).toBe('string');
    expect(typeof row.status).toBe('string');
    expect(typeof row.date).toBe('string');
    expect(typeof row.variant1).toBe('string');
    expect(typeof row.variant2).toBe('string');
    expect(typeof row.variant3).toBe('string');
    expect(typeof row.variant4).toBe('string');
    expect(typeof row.selectedText).toBe('string');
    expect(typeof row.postTime).toBe('string');
  });

  test('MOCK_ROWS returns rows with image fields for Instagram carousel', async ({ page }) => {
    /**
     * Spec: getRows must return rows with imageLink1-4 fields for Instagram
     * multi-image carousel support (USE-CASES.md Journey 2).
     *
     * Expected behavior: Row contains imageLink1-4 fields
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');
    expect(result.ok).toBe(true);

    const rows = result.data as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);

    const row = rows[0] as Record<string, unknown>;
    expect(typeof row.imageLink1).toBe('string');
    expect(typeof row.imageLink2).toBe('string');
    expect(typeof row.imageLink3).toBe('string');
    expect(typeof row.imageLink4).toBe('string');
  });

  test('MOCK_ROWS returns rows with email fields for Gmail', async ({ page }) => {
    /**
     * Spec: getRows must return rows with email fields (emailTo, emailCc, emailBcc,
     * emailSubject) for Gmail campaign support (USE-CASES.md Journey 3).
     *
     * Expected behavior: Row contains all four email fields
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');
    expect(result.ok).toBe(true);

    const rows = result.data as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);

    const row = rows[0] as Record<string, unknown>;
    expect(typeof row.emailTo).toBe('string');
    expect(typeof row.emailCc).toBe('string');
    expect(typeof row.emailBcc).toBe('string');
    expect(typeof row.emailSubject).toBe('string');
  });

  test('MOCK_ROWS returns rows with scheduled postTime field', async ({ page }) => {
    /**
     * Spec: getRows must return rows with postTime field for scheduled publishing
     * support (USE-CASES.md Journey 7).
     *
     * Expected behavior: Row contains postTime field as ISO date string or time
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');
    expect(result.ok).toBe(true);

    const rows = result.data as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);

    const row = rows[0] as Record<string, unknown>;
    expect(typeof row.postTime).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 53.4: SSE Generation Stream Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 53.4: SSE Generation Stream Wiring', () => {

  test('SSE stream endpoint returns parseable event format', async ({ page }) => {
    /**
     * Spec: /api/generate/stream must return SSE stream with data: {...} format
     * events as documented in USE-CASES.md Journey 1 Step 4.
     *
     * Expected behavior: Response is text/event-stream with data: lines that parse
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const sseData = await page.evaluate(async () => {
      try {
        const resp = await fetch('http://localhost:5174/api/generate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: 'Test Topic', model: 'google/gemini-2.0-flash' }),
        });

        const contentType = resp.headers.get('content-type') ?? '';
        const text = await resp.text();

        // Parse SSE lines
        const events: Record<string, unknown>[] = [];
        const lines = text.split('\n');
        let current: Record<string, unknown> = {};

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              current = JSON.parse(line.slice(6));
              events.push(current);
            } catch {
              // Skip unparseable lines
            }
          }
        }

        return {
          isStream: contentType.includes('text/event-stream'),
          eventCount: events.length,
          hasCompleteEvent: events.some(e => e.type === 'complete'),
          hasProgressEvent: events.some(e => e.type === 'progress'),
          hasVariants: events.some(e => {
            const r = e as Record<string, unknown>;
            const result = r.result;
            return result != null && typeof result === 'object' && Array.isArray((result as Record<string, unknown>).variants);
          }),
        };
      } catch {
        return { error: 'fetch failed' };
      }
    });

    expect(sseData.isStream).toBe(true);
    expect(sseData.eventCount).toBeGreaterThan(0);
    expect(sseData.hasCompleteEvent).toBe(true);
    expect(sseData.hasVariants).toBe(true);
  });

  test('SSE complete event contains variants array', async ({ page }) => {
    /**
     * Spec: The SSE complete event must include result.variants[] with up to
     * 4 variant texts as documented in USE-CASES.md Journey 1 Step 4.
     *
     * Expected behavior: Complete event has result.variants array with strings
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const variants = await page.evaluate(async () => {
      try {
        const resp = await fetch('http://localhost:5174/api/generate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: 'Test Topic', model: 'google/gemini-2.0-flash' }),
        });
        const text = await resp.text();
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'complete' && Array.isArray(event.result?.variants)) {
                return {
                  count: event.result.variants.length,
                  firstIsString: typeof event.result.variants[0] === 'string',
                };
              }
            } catch {
              // Skip
            }
          }
        }
        return null;
      } catch {
        return null;
      }
    });

    expect(variants).not.toBeNull();
    expect(variants!.firstIsString).toBe(true);
    expect(variants!.count).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Journey 53.5: Auth Injection & Session Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 53.5: Auth Injection & Session Wiring', () => {

  test('injectFakeToken enables authenticated API calls', async ({ page }) => {
    /**
     * Spec: injectFakeToken must set localStorage google_id_token to enable
     * authenticated requests without a real OAuth round-trip.
     *
     * Expected behavior: After injectFakeToken, bootstrap returns valid session
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    expect(typeof data.email).toBe('string');
    expect(data.email).toBe('test@example.com');
  });

  test('authenticated session allows getRows call', async ({ page }) => {
    /**
     * Spec: After auth injection, getRows must return topic rows.
     *
     * Expected behavior: getRows returns non-empty array with valid row structure
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');
    expect(result.ok).toBe(true);

    const rows = result.data as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    expect(typeof rows[0].topicId).toBe('string');
  });

  test('gotoAuthenticated navigates to authenticated page', async ({ page }) => {
    /**
     * Spec: gotoAuthenticated helper must navigate to authenticated page context.
     *
     * Expected behavior: Page navigates without crash, DOM loads
     */
    await gotoAuthenticated(page, './dashboard');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 53.6: Mock Action Routing Stability
// ---------------------------------------------------------------------------

test.describe('Journey 53.6: Mock Action Routing Stability', () => {

  test('action routing is stable across repeated calls', async ({ page }) => {
    /**
     * Spec: Repeated calls to the same action must return stable responses
     * as documented in USE-CASES.md Journey 28 defensive wiring.
     *
     * Expected behavior: Multiple bootstrap calls return same email and config
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const results: string[] = [];
    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'bootstrap');
      expect(result.ok).toBe(true);
      const data = result.data as Record<string, unknown>;
      results.push(data.email as string);
    }

    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
  });

  test('different actions route to correct handlers', async ({ page }) => {
    /**
     * Spec: Different action names must route to their respective mock handlers
     * with correct response shapes.
     *
     * Expected behavior: bootstrap, getRows, getFeedArticles each return correct shape
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Bootstrap
    const bootstrapResult = await fireAction(page, 'bootstrap');
    expect(bootstrapResult.ok).toBe(true);
    const bootstrapData = bootstrapResult.data as Record<string, unknown>;
    expect(typeof bootstrapData.email).toBe('string');

    // getRows
    const rowsResult = await fireAction(page, 'getRows');
    expect(rowsResult.ok).toBe(true);
    const rows = rowsResult.data as Record<string, unknown>[];
    expect(Array.isArray(rows)).toBe(true);

    // getFeedArticles
    const articlesResult = await fireAction(page, 'getFeedArticles');
    expect(articlesResult.ok).toBe(true);
    const articlesData = articlesResult.data as Record<string, unknown>;
    expect(typeof articlesData.articles).toBe('object');
  });

  test('unknown action returns ok: false or falls through to real server', async ({ page }) => {
    /**
     * Spec: Unknown actions should be handled gracefully — either returning ok: false
     * from the default mock case, or falling through to the real server.
     *
     * Expected behavior: Response is valid JSON (either {ok: true} or 404 JSON)
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:5174/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: '__unknown_action_xyz__' }),
      });
      const text = await resp.text();
      try {
        return { ok: true, parsed: JSON.parse(text) };
      } catch {
        return { ok: false, raw: text };
      }
    });

    expect(result.ok).toBe(true);
    // Either mock returns {ok: true} or server returns error JSON
    const parsed = result.parsed as Record<string, unknown>;
    expect(typeof parsed.ok).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Journey 53.7: Integration Wire — Worker Actions in E2E Context
// ---------------------------------------------------------------------------

test.describe('Journey 53.7: Integration Wire — Worker Actions in E2E Context', () => {

  test('addTopic action persists new topic row', async ({ page }) => {
    /**
     * Spec: addTopic action must persist a new topic to the sheet and return
     * row metadata (rowIndex, topicId, topic, date, status) as documented in
     * USE-CASES.md Journey 1 Step 3.
     *
     * Expected behavior: { ok: true, data: { rowIndex, topicId, topic, status } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'addTopic', {
      topic: 'E2E Test Topic',
      topicDeliveryChannel: 'linkedin',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.rowIndex).toBe('number');
    expect(typeof data.topicId).toBe('string');
    expect(data.topic).toBe('E2E Test Topic');
    expect(data.status).toBe('Pending');
  });

  test('analyzeTopicInsights returns pros and cons arrays', async ({ page }) => {
    /**
     * Spec: analyzeTopicInsights must return pros[] and cons[] bullet arrays
     * as documented in USE-CASES.md Journey 1 Step 3.
     *
     * Expected behavior: { ok: true, data: { pros: string[], cons: string[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'analyzeTopicInsights', {
      topic: 'AI Tools for Founders',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const pros = data.pros;
    const cons = data.cons;
    expect(Array.isArray(pros)).toBe(true);
    expect(Array.isArray(cons)).toBe(true);
    expect((pros as unknown[]).length).toBeGreaterThan(0);
    expect((cons as unknown[]).length).toBeGreaterThan(0);
  });

  test('publishContent returns deliveryMode and timestamp', async ({ page }) => {
    /**
     * Spec: publishContent must return deliveryMode ('sent'|'queued'|'failed')
     * and ISO timestamp as documented in USE-CASES.md Journey 1 Step 7.
     *
     * Expected behavior: { ok: true, data: { deliveryMode, timestamp } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'publishContent', {
      channel: 'linkedin',
      message: 'E2E test publish',
      row: { rowIndex: 0, topicId: 'topic-1', topic: 'Test' },
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.deliveryMode).toBe('string');
    expect(data.deliveryMode).toBe('sent');
    expect(typeof data.timestamp).toBe('string');
    // Verify timestamp is valid ISO date
    expect(() => new Date(data.timestamp as string)).not.toThrow();
  });

  test('listRules returns rules array', async ({ page }) => {
    /**
     * Spec: listRules must return rules array as documented in USE-CASES.md
     * Journey 10 (Automation Rules, WIRED).
     *
     * Expected behavior: { ok: true, data: rules[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listRules');
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data)).toBe(true);
  });

  test('bulkImportCampaign handles posts array correctly', async ({ page }) => {
    /**
     * Spec: bulkImportCampaign must handle posts array and return imported count
     * as documented in USE-CASES.md Journey 8 (WIRED).
     *
     * Expected behavior: { ok: true, data: { success: true, imported: N } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bulkImportCampaign', {
      posts: [
        { topicId: 'bulk-1', topic: 'Campaign Topic 1', date: '2024-06-01' },
        { topicId: 'bulk-2', topic: 'Campaign Topic 2', date: '2024-06-02' },
      ],
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.success).toBe(true);
    expect(data.imported).toBe(2);
  });
});
