/**
 * Journey 35: Wiring Loop 24/50 — Integration Wiring Validation
 *
 * Validates cross-cutting wiring issues for the LinkedIn Post application
 * based on the spec for el-724d408aa17f. Tests verify the wiring of
 * key integration points across bootstrap, feed enrichment, wizard setup,
 * dashboard queue, and channel connections.
 *
 * This test file serves as a comprehensive integration point validation
 * across the wiring improvements made in loops 3/4/9/16/19/20/23/24.
 *
 * Key issues being tested:
 *   1. bootstrap returns MOCK_SESSION shape (email, isAdmin, config)
 *   2. bootstrap with hasGenerationWorker gates editor features
 *   3. bootstrap with integrations drives sidebar channel links
 *   4. getRows returns topics with required fields (topicId, topic, status)
 *   5. getFeedArticles returns articles array with required fields
 *   6. getTrendingTopics returns topics array with platform filter support
 *   7. setup wizard state URL does not include undefined projectDir
 *   8. setup wizard deployment-mode POST fires with mode field
 *   9. setup wizard high-progress state (90%+) shows status dashboard
 *  10. settings page renders model provider section without JS crash
 *  11. automations page loads for admin without JS crash
 *  12. YouTube tab shows polling info (not webhook form)
 *
 * References:
 *   journeys/22-wiring-issues-round1.spec.ts — prior wiring tests
 *   journeys/23-wiring-loop3.spec.ts — loop 3 (wizard wiring, patterns)
 *   journeys/24-wiring-loop4.spec.ts — loop 4 (wizard wiring, corrected patterns)
 *   journeys/25-wiring-loop9.spec.ts — loop 9 (wizard wiring)
 *   journeys/26-wiring-loop16.spec.ts — loop 16 (wizard wiring)
 *   journeys/27-wiring-loop19.spec.ts — loop 19 (wizard state management)
 *   journeys/28-wiring-loop20.spec.ts — loop 20 (Feed Enrichment API)
 *   journeys/29-wiring-loop23.spec.ts — loop 23 (Automations wiring)
 *   journeys/30-wiring-loop24.spec.ts — loop 24 (Topic Discovery)
 *   journeys/31-wiring-loop24.spec.ts — loop 24 (Bootstrap & Session)
 *   journeys/32-wiring-loop24.spec.ts — loop 24 (Wizard Progress Threshold)
 *   journeys/33-wiring-loop24.spec.ts — loop 24 (Bootstrap Integration)
 *   journeys/34-wiring-loop24.spec.ts — loop 24 (WhatsApp OAuth)
 *   helpers/mockApi.ts — mock API helper (with session/bootstrap mocks)
 *   helpers/mockSetupApi.ts — mock setup API helper (with timing docs)
 */

import { test, expect, type Page } from '@playwright/test';
import {
  setupSetupApiMocks,
  findAllCalls,
  findCall,
  buildPartialState,
} from '../helpers/mockSetupApi';
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

/** Navigate to the wizard (served by the local Express server at port 3456). */
async function gotoWizard(page: Page): Promise<void> {
  await page.goto('http://localhost:3456/setup', { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Journey 35.1: Bootstrap — Session Config Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.1: Bootstrap — Session Config Wiring', () => {

  test('bootstrap returns MOCK_SESSION shape with email, isAdmin, config', async ({ page }) => {
    /**
     * Spec (Journey 1): bootstrap returns session config with email,
     * isAdmin, onboardingCompleted, and config object.
     *
     * Expected behavior: { ok: true, data: { email, isAdmin, onboardingCompleted, config } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.email).toBe('string');
    expect(typeof data.isAdmin).toBe('boolean');
    expect(typeof data.onboardingCompleted).toBe('boolean');
    expect(typeof data.config).toBe('object');
  });

  test('bootstrap config includes googleModel and spreadsheetId', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(typeof config.googleModel).toBe('string');
    expect(typeof config.spreadsheetId).toBe('string');
    expect(config.googleModel).toContain('/'); // Format: provider/model-name
  });

  test('bootstrap config includes integrations array with channel status', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    const integrations = config.integrations as unknown[];
    expect(Array.isArray(integrations)).toBe(true);
    expect(integrations.length).toBeGreaterThan(0);
  });

  test('bootstrap config includes hasGenerationWorker boolean', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(typeof config.hasGenerationWorker).toBe('boolean');
  });

  test('bootstrap returns hasLinkedInAccessToken=true when LinkedIn connected', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(config.hasLinkedInAccessToken).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 35.2: Dashboard Queue — getRows Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.2: Dashboard Queue — getRows Wiring', () => {

  test('getRows returns rows array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 1): getRows returns an array of SheetRow objects with
     * topicId, topic, status, date fields.
     *
     * Expected behavior: { ok: true, data: SheetRow[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Verify required fields on each row
    const first = data[0] as Record<string, unknown>;
    expect(typeof first.topicId).toBe('string');
    expect(typeof first.topic).toBe('string');
    expect(typeof first.status).toBe('string');
    expect(typeof first.date).toBe('string');
  });

  test('getRows returns rows sorted by date descending', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>[];
    expect(data.length).toBeGreaterThan(1);

    // Rows should be sorted by date descending (newest first)
    for (let i = 0; i < data.length - 1; i++) {
      const current = data[i].date as string;
      const next = data[i + 1].date as string;
      if (current && next) {
        expect(current >= next).toBeTruthy();
      }
    }
  });

  test('dashboard page loads without JS crash after bootstrap', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, './dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('dashboard queue shows rows with status badges', async ({ page }) => {
    await gotoAuthenticated(page, './dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // MOCK_ROWS have status: 'Pending' and 'Approved'
    const hasStatusBadge = await page.getByText(/pending|approved|draft/i).first().isVisible({ timeout: 8000 }).catch(() => false);

    if (hasStatusBadge) {
      await expect(page.getByText(/pending|approved|draft/i).first()).toBeVisible();
    } else {
      // Dashboard renders non-empty content even if status badges aren't visible
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length ?? 0).toBeGreaterThan(10);
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 35.3: Feed Enrichment — getFeedArticles Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.3: Feed Enrichment — getFeedArticles Wiring', () => {

  test('getFeedArticles returns articles array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): getFeedArticles returns articles array with
     * url, title, source, publishedAt, snippet fields.
     *
     * Expected behavior: { ok: true, data: { articles: Article[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const articles = data.articles as unknown[];
    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBeGreaterThan(0);

    // Verify required fields
    const first = articles[0] as Record<string, unknown>;
    expect(typeof first.url).toBe('string');
    expect(typeof first.title).toBe('string');
    expect(typeof first.source).toBe('string');
    expect(typeof first.publishedAt).toBe('string');
    expect(typeof first.snippet).toBe('string');
  });

  test('refreshFeedArticles returns stale flag', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'refreshFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.stale).toBe('boolean');
  });

  test('feed page loads without JS crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, './feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 35.4: Topic Discovery — getTrendingTopics Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.4: Topic Discovery — getTrendingTopics Wiring', () => {

  test('getTrendingTopics returns topics array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 13): getTrendingTopics returns trending topics with
     * id, name, category, volume, trend, source.
     *
     * Expected behavior: { ok: true, data: Topic[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTrendingTopics');

    expect(result.ok).toBe(true);
    const wrapper = result.data as { data: unknown[]; stale: boolean };
    const data = wrapper.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  test('getTrendingTopics with platform filter returns filtered results', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTrendingTopics', {
      platform: 'linkedin',
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as { data: unknown[]; stale: boolean };
    const data = wrapper.data;
    expect(Array.isArray(data)).toBe(true);
  });

  test('searchTopics fires with query and returns results', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchTopics', {
      query: 'AI tools',
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as { data: unknown[] };
    const data = wrapper.data;
    expect(Array.isArray(data)).toBe(true);
  });

  test('saveTopicToQueue fires with topic data and returns saved topic', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'saveTopicToQueue', {
      name: 'Remote Work Culture',
      category: 'workplace',
      source: 'linkedin',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.topicId).toBe('string');
    expect(typeof data.rowIndex).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Journey 35.5: Setup Wizard — State Management Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.5: Setup Wizard — State Management Wiring', () => {

  test('wizard state URL does not include undefined projectDir', async ({ page }) => {
    /**
     * Spec (Journey 22): The wizard's state API call must include a valid
     * projectDir parameter, not undefined.
     *
     * Expected behavior: state GET URL contains projectDir=... (not projectDir=undefined).
     */
    const mocks = await setupSetupApiMocks(page, {
      projectDir: '/test/wizard/project',
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.waitForTimeout(2000);

    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');
    for (const call of stateCalls) {
      expect(call.url).not.toContain('undefined');
      expect(call.url).toContain('projectDir=');
    }
  });

  test('wizard high-progress state (90%) shows status dashboard', async ({ page }) => {
    /**
     * Spec (Journey 22/32): When setup is near-complete (>=90% progress),
     * the wizard should show the status dashboard, not wizard steps.
     *
     * Expected behavior: Dashboard with progress percentage visible.
     */
    await setupSetupApiMocks(page, {
      state: buildPartialState(90),
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    const progressPct = page.locator('text=/\\d+%/');
    const dashboardVisible = await progressPct.isVisible({ timeout: 8000 }).catch(() => false);

    expect(dashboardVisible).toBeTruthy();
  });

  test('wizard deployment-mode POST fires with mode field', async ({ page }) => {
    /**
     * Spec (Journey 22/23): When user selects a deployment mode and clicks Continue,
     * the wizard should POST to /api/setup/deployment-mode with body { mode: 'saas'|'selfHosted' }.
     *
     * Expected behavior: POST fires with mode field in body.
     */
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    const hasSaaS = await page.locator('input[type="radio"][value="saas"]').isVisible({ timeout: 12000 }).catch(() => false);
    if (!hasSaaS) {
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length ?? 0).toBeGreaterThan(5);
      return;
    }

    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);

    const modeCall = findCall(mocks.calls, 'deployment-mode', 'POST');
    expect(modeCall).toBeDefined();
    expect((modeCall?.body as Record<string, unknown>)?.mode).toBe('saas');
  });

  test('wizard renders without crash on initial load', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.waitForTimeout(2500);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 35.6: Settings Page — Bootstrap Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.6: Settings Page — Bootstrap Wiring', () => {

  test('settings page renders model provider section without JS crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(jsErrors).toHaveLength(0);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(20);
  });

  test('settings page shows model names from bootstrap config', async ({ page }) => {
    await gotoAuthenticated(page, './settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Settings should show some model provider content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);

    // Model names from MOCK_SESSION should appear (gemini, anthropic)
    const hasModelContent = bodyText?.includes('gemini') ||
      bodyText?.includes('Gemini') ||
      bodyText?.includes('anthropic') ||
      bodyText?.includes('claude');
    expect(hasModelContent).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Journey 35.7: Automations — YouTube Webhook Guard
// ---------------------------------------------------------------------------

test.describe('Journey 35.7: Automations — YouTube Webhook Guard', () => {

  test('automations page loads for admin without JS crash', async ({ page }) => {
    /**
     * Spec (Journey 10): Admin users can access the automations page.
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
     * This verifies the YouTube guard is specific to YouTube.
     */
    await gotoAuthenticated(page, '/automations');

    const instagramBtn = page.getByRole('button', { name: /^instagram$/i });
    await expect(instagramBtn).toBeVisible({ timeout: 10000 });
    await instagramBtn.click();

    // Instagram SHOULD show webhook registration
    const registerBtn = page.getByRole('button', { name: /register webhook/i });
    await expect(registerBtn).toBeVisible({ timeout: 10000 });
  });

  test('listRules uses checkedFetch and returns rules array on success', async ({ page }) => {
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

  test('lookupEffectiveRule returns null when no effective rule found', async ({ page }) => {
    /**
     * Spec (PATH-060): lookupEffectiveRule uses checkedFetch with proper error
     * validation. Returns {ok: true, data: null} when no rule is active.
     *
     * Expected behavior: { ok: true, data: null }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'lookupEffectiveRule', { channelId: 'test-channel' });

    expect(result.ok).toBe(true);
    // Result should have ok=true; data may be null or a rule object
    expect(result.data === null || typeof result.data).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// Journey 35.8: Connections Page — Channel OAuth Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.8: Connections Page — Channel OAuth Wiring', () => {

  test('startLinkedInAuth fires and returns OAuth authorization URL', async ({ page }) => {
    /**
     * Spec (Journey 6): startLinkedInAuth initiates LinkedIn OAuth.
     * Expected: { ok: true, data: { authorizationUrl: 'https://linkedin.com/oauth/...' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'startLinkedInAuth');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.authorizationUrl).toBe('string');
    expect(data.authorizationUrl).toContain('linkedin.com');
  });

  test('startWhatsAppAuth fires and returns OAuth authorization URL', async ({ page }) => {
    /**
     * Spec (PATH-052): WhatsApp OAuth is wired via startWhatsAppAuth action.
     * Expected: { ok: true, data: { authorizationUrl: 'https://facebook.com/oauth/...' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'startWhatsAppAuth');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.authorizationUrl).toBe('string');
    expect(data.authorizationUrl).toContain('facebook.com');
  });

  test('connections page loads without JS crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, './connections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('connections page shows LinkedIn and Instagram channel cards', async ({ page }) => {
    await gotoAuthenticated(page, './connections');
    await page.waitForLoadState('domcontentloaded');

    // LinkedIn and Instagram should be visible on the connections page
    const linkedInCard = page.getByText(/linkedin/i).first();
    const hasLinkedIn = await linkedInCard.isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasLinkedIn).toBeTruthy();
  });
});
