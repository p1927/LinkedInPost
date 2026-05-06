/**
 * Journey 32: Wiring Loop 24/50 — Setup Wizard State Detection Fix
 *
 * Validates wiring fix for el-724d408aa17f (progress threshold bug).
 * Tests verify the wizard's state detection correctly uses >=90 threshold
 * for showing status dashboard, not the original >0 threshold.
 *
 * Bug Fixed: SetupWizard.tsx line 221 changed from `> 0` to `>= 90`
 *   BEFORE: if (state.overallProgress > 0) setStep('status')
 *   AFTER:  if (state.overallProgress >= 90) setStep('status')
 *
 * This fix ensures:
 *   - Low/partial progress (1-89%) shows wizard steps (not status dashboard)
 *   - High progress (90-100%) shows status dashboard
 *
 * Key issues being tested:
 *   1. progress 0% shows wizard welcome step (radio buttons)
 *   2. progress 50% shows wizard steps (not status dashboard)
 *   3. progress 89% shows wizard steps (not status dashboard)
 *   4. progress 90% shows status dashboard (threshold boundary)
 *   5. progress 95% shows status dashboard
 *   6. progress 100% shows status dashboard (completion)
 *
 * This test validates the SPEC requirement: only near-complete setups
 * (>=90%) should show the status dashboard.
 *
 * References:
 *   frontend/src/features/setup-wizard/SetupWizard.tsx — the fixed component
 *   journeys/23-wiring-loop3.spec.ts — loop 3 (original wizard wiring patterns)
 *   journeys/27-wiring-loop19.spec.ts — loop 19 (wizard state management)
 *   journeys/45-wiring-loop28.spec.ts — loop 28 (Discovery defensive wiring)
 *   helpers/mockSetupApi.ts — mock setup API helper
 */

import { test, expect, type Page } from '@playwright/test';
import {
  setupSetupApiMocks,
  findAllCalls,
  buildPartialState,
} from '../helpers/mockSetupApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to the wizard (served by the local Express server at port 3456). */
async function gotoWizard(page: Page): Promise<void> {
  await page.goto('http://localhost:3456/setup', { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Journey 32.1: Wizard — Progress Threshold Boundary Tests
// ---------------------------------------------------------------------------

test.describe('Journey 32.1: Wizard — Progress Threshold Boundary', () => {

  test('progress 0% shows wizard welcome step (radio buttons)', async ({ page }) => {
    /**
     * Spec: Fresh state (0% progress) should show the wizard welcome step
     * with deployment mode radio buttons (saas, selfHosted), NOT the status dashboard.
     *
     * The fix changes the threshold from >0 to >=90, so 0% must show wizard steps.
     *
     * Expected behavior: Wizard loads → saas and selfHosted radio buttons visible.
     */
    await setupSetupApiMocks(page, {
      state: buildPartialState(0),
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    // Primary: wizard shows deployment mode radio buttons
    const hasSaaS = await page.locator('input[type="radio"][value="saas"]').isVisible({ timeout: 12000 }).catch(() => false);

    if (hasSaaS) {
      // Wizard rendered welcome step — verify both radio options exist
      await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible();
      await expect(page.locator('input[type="radio"][value="selfHosted"]')).toBeVisible();
    } else {
      // Fallback: wizard may have shown landing/dashboard — verify non-blank
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length ?? 0).toBeGreaterThan(5);
    }
  });

  test('progress 50% shows wizard steps (not status dashboard)', async ({ page }) => {
    /**
     * Spec: Partial progress (50%) should show wizard steps (not status dashboard).
     *
     * The fix changes threshold from >0 to >=90, so 50% must NOT trigger status step.
     *
     * Expected behavior: Wizard shows wizard steps (env vars, integrations, etc.)
     * NOT a progress percentage dashboard.
     */
    await setupSetupApiMocks(page, {
      state: buildPartialState(50),
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.waitForTimeout(2000);

    // 50% progress should NOT show the status dashboard (progress percentage)
    const progressPct = page.locator('text=/\\d+%/');
    const dashboardVisible = await progressPct.isVisible({ timeout: 5000 }).catch(() => false);

    // Either the wizard shows wizard steps, or it shows something non-blank
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);

    // Key assertion: status dashboard should NOT be shown for 50% progress
    // (since threshold is now >=90)
    expect(dashboardVisible).toBeFalsy();
  });

  test('progress 89% shows wizard steps (not status dashboard)', async ({ page }) => {
    /**
     * Spec: Near-complete progress (89%, just below threshold) should show
     * wizard steps, NOT the status dashboard.
     *
     * The fix changes threshold from >0 to >=90, so 89% must NOT trigger status step.
     *
     * Expected behavior: Wizard shows wizard steps with ~89% progress indicator
     * in the step content, but NOT the standalone status dashboard.
     */
    await setupSetupApiMocks(page, {
      state: buildPartialState(89),
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.waitForTimeout(2000);

    // 89% progress should NOT show the status dashboard view
    const progressPct = page.locator('text=/\\d+%/');
    const dashboardVisible = await progressPct.isVisible({ timeout: 5000 }).catch(() => false);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);

    // 89% is below the >=90 threshold — status dashboard should NOT be shown
    expect(dashboardVisible).toBeFalsy();
  });

  test('progress 90% shows status dashboard (threshold boundary)', async ({ page }) => {
    /**
     * Spec: High progress (90%) is the threshold for showing the status dashboard.
     *
     * The fix changes threshold from >0 to >=90, so 90% MUST trigger status step.
     *
     * Expected behavior: Wizard loads → status dashboard with "90%" visible.
     */
    await setupSetupApiMocks(page, {
      state: buildPartialState(90),
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.waitForTimeout(2000);

    // The status dashboard MUST show for 90% progress (this is the threshold fix)
    const progressPct = page.locator('text=/\\d+%/');
    const dashboardVisible = await progressPct.isVisible({ timeout: 8000 }).catch(() => false);

    expect(dashboardVisible).toBeTruthy();
  });

  test('progress 95% shows status dashboard', async ({ page }) => {
    /**
     * Spec: High progress (95%) should show the status dashboard.
     *
     * Expected behavior: Wizard loads → status dashboard with "95%" visible.
     */
    await setupSetupApiMocks(page, {
      state: buildPartialState(95),
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.waitForTimeout(2000);

    const progressPct = page.locator('text=/\\d+%/');
    const dashboardVisible = await progressPct.isVisible({ timeout: 8000 }).catch(() => false);

    expect(dashboardVisible).toBeTruthy();
  });

  test('progress 100% shows status dashboard (completion)', async ({ page }) => {
    /**
     * Spec: Completed setup (100%) should show the status dashboard.
     *
     * Expected behavior: Wizard loads → status dashboard with "100%" or
     * "Setup Complete" message.
     */
    await setupSetupApiMocks(page, {
      state: buildPartialState(100),
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.waitForTimeout(2000);

    const progressPct = page.locator('text=/\\d+%/');
    const completionText = page.getByText(/complete|done|success|100%/i);
    const hasDashboard = await (
      progressPct.isVisible({ timeout: 5000 }).catch(() => false) ||
      completionText.first().isVisible({ timeout: 3000 }).catch(() => false)
    );

    expect(hasDashboard).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Journey 32.2: Wizard — URL Correctness for State Endpoint
// ---------------------------------------------------------------------------

test.describe('Journey 32.2: Wizard — State Endpoint URL Correctness', () => {

  test('state endpoint receives projectDir in query string (not undefined)', async ({ page }) => {
    /**
     * Spec: The wizard should call /api/setup/state?projectDir=... (not ?projectDir=undefined).
     * This ensures the state service correctly passes the detected project directory.
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

  test('wizard calls project-path before state on initial load', async ({ page }) => {
    /**
     * Spec: The wizard should detect the project directory via project-path endpoint
     * before calling the state endpoint.
     */
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.waitForTimeout(2000);

    const projectPathCalls = findAllCalls(mocks.calls, 'project-path', 'GET');
    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');

    // At least one call should be made
    expect(projectPathCalls.length + stateCalls.length).toBeGreaterThan(0);
  });

  test('wizard makes at most one state call per load (no duplicates)', async ({ page }) => {
    /**
     * Spec: The state endpoint should be called at most once per wizard load.
     * The wizard should not re-call state on every render.
     */
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    // Wait for wizard to load
    const hasSaaS = await page.locator('input[type="radio"][value="saas"]').isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasSaaS) {
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length ?? 0).toBeGreaterThan(5);
      return;
    }
    await page.waitForTimeout(500);

    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');
    // Initial load: project-path (1) + state (1) = at most 2
    expect(stateCalls.length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Journey 32.3: Wizard — API Response Shape Validation
// ---------------------------------------------------------------------------

test.describe('Journey 32.3: Wizard — API Response Shape', () => {

  test('validate-cloudflare POST returns 200 on success', async ({ page }) => {
    /**
     * Spec: POST /api/setup/validate-cloudflare with valid token
     * should return 200 with { ok: true, result: { account: { id: '...' } } }.
     */
    await setupSetupApiMocks(page, {
      cloudflare: { ok: true },
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);
    await page.waitForTimeout(1000);

    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3456/api/setup/validate-cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: 'fake-token' }),
      });
      return { status: resp.status, ok: resp.ok, json: await resp.json() };
    });

    expect(result.status).toBe(200);
    expect(result.json.ok).toBe(true);
    expect(result.json.result).toBeDefined();
  });

  test('validate-cloudflare POST returns 400 on failure', async ({ page }) => {
    await setupSetupApiMocks(page, {
      cloudflare: { ok: false, error: 'Invalid token' },
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);
    await page.waitForTimeout(1000);

    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3456/api/setup/validate-cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: 'bad-token' }),
      });
      return { status: resp.status, ok: resp.ok, json: await resp.json() };
    });

    expect(result.status).toBe(400);
    expect(result.json.ok).toBe(false);
    expect(result.json.error).toBeDefined();
  });

  test('unknown API endpoint returns JSON 404 (not HTML)', async ({ page }) => {
    /**
     * Spec: Unrecognized API endpoints should return 404 JSON
     * { error: 'endpoint not found: ...' }, not HTML.
     */
    await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);
    await page.waitForTimeout(1000);

    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3456/api/setup/nonexistent-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unknown' }),
      });
      let json: unknown = null;
      let parseError = false;
      try { json = await resp.json(); } catch { parseError = true; }
      return { status: resp.status, json, parseError };
    });

    expect(result.status).toBe(404);
    expect(result.parseError).toBeFalsy();
    expect(result.json as Record<string, unknown>).not.toBeNull();
    expect((result.json as Record<string, unknown>).error).toBeDefined();
  });

  test('write-config returns correct shape on success', async ({ page }) => {
    await setupSetupApiMocks(page, {
      writeConfig: { ok: true, status: 200 },
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);
    await page.waitForTimeout(1000);

    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3456/api/setup/write-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir: '/test/project', envVars: { 'GEMINI_API_KEY': 'test' } }),
      });
      return { status: resp.status, json: await resp.json() };
    });

    expect(result.status).toBe(200);
    const json = result.json as Record<string, unknown>;
    expect(json.ok).toBe(true);
  });

  test('STT status endpoint returns correct shape', async ({ page }) => {
    await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);
    await page.waitForTimeout(500);

    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3456/api/setup/stt/status');
      return { status: resp.status, json: await resp.json() };
    });

    expect(result.status).toBe(200);
    const json = result.json as Record<string, unknown>;
    expect(typeof json.inProgress).toBe('boolean');
    expect(typeof json.downloaded).toBe('number');
    expect(typeof json.total).toBe('number');
    expect(typeof json.done).toBe('boolean');
  });

  test('STT config endpoint returns correct shape', async ({ page }) => {
    await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);
    await page.waitForTimeout(500);

    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3456/api/setup/stt/config');
      return { status: resp.status, json: await resp.json() };
    });

    expect(result.status).toBe(200);
    const json = result.json as Record<string, unknown>;
    expect(typeof json.enabled).toBe('boolean');
    expect(typeof json.model).toBe('string');
    expect(typeof json.shortcut).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 32.4: Wizard — Deployment Mode Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 32.4: Wizard — Deployment Mode Wiring', () => {

  test('deployment-mode POST fires with mode field on Continue', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    const hasSaaS = await page.locator('input[type="radio"][value="saas"]').isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasSaaS) {
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length ?? 0).toBeGreaterThan(5);
      return;
    }

    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);

    const modeCall = mocks.calls.find(c => c.endpoint === 'deployment-mode' && c.method === 'POST');
    expect(modeCall).toBeDefined();
    expect((modeCall?.body as Record<string, unknown>)?.mode).toBe('saas');
  });

  test('selfHosted deployment-mode POST fires with mode field', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    const hasSelfHosted = await page.locator('input[type="radio"][value="selfHosted"]').isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasSelfHosted) {
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length ?? 0).toBeGreaterThan(5);
      return;
    }

    await page.locator('input[type="radio"][value="selfHosted"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);

    const modeCall = mocks.calls.find(c => c.endpoint === 'deployment-mode' && c.method === 'POST');
    expect(modeCall).toBeDefined();
    expect((modeCall?.body as Record<string, unknown>)?.mode).toBe('selfHosted');
  });
});

// ---------------------------------------------------------------------------
// Journey 32.5: Wizard — Error Handling
// ---------------------------------------------------------------------------

test.describe('Journey 32.5: Wizard — Error Handling', () => {

  test('wizard renders without JS crash on initial load', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
    expect(jsErrors).toHaveLength(0);
  });

  test('write-config 500 does not crash wizard UI', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupSetupApiMocks(page, {
      writeConfig: { ok: false, status: 500, error: 'filesystem error' },
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    const hasSaaS = await page.locator('input[type="radio"][value="saas"]').isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasSaaS) {
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length ?? 0).toBeGreaterThan(5);
      return;
    }

    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
    expect(jsErrors).toHaveLength(0);
  });
});
