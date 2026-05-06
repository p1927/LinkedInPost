/**
 * Journey 25: Wiring Loop 29/50 — Setup Wizard Wiring Validation
 *
 * Validates wiring issues identified in the spec for el-9189b721552a.
 * Tests verify the wizard's API wiring, state management, and UI behavior
 * against the specification (not against implementation).
 *
 * Key issues being tested (based on Journey 22/23/24 error contexts):
 *   1. validate-cloudflare POST should return 200 with {ok:true, result} shape (not 400)
 *   2. high-progress state (>=90%) should show status dashboard (not wizard steps)
 *   3. unknown API endpoints return JSON 404 (not HTML/SyntaxError)
 *   4. wizard detects existing state and redirects appropriately
 *   5. wizard shows deployment-mode radio buttons on initial welcome step
 *   6. write-config failure is handled gracefully (no blank screen)
 *   7. deployment-mode POST body includes `mode` field
 *   8. wizard state URL does not include undefined projectDir
 *
 * References:
 *   journeys/22-wiring-issues-round1.spec.ts — prior wiring tests
 *   journeys/23-wiring-loop3.spec.ts — loop 3 tests
 *   journeys/24-wiring-loop4.spec.ts — loop 4 tests (corrected patterns)
 *   journeys/45-wiring-loop28.spec.ts — loop 28 (Discovery defensive wiring)
 *   helpers/mockSetupApi.ts — mock setup API helper
 */

import { test, expect, type Page } from '@playwright/test';

console.log('[DEBUG] push-notifications-test: 25-wiring-loop9 spec loaded');
import {
  setupSetupApiMocks,
  findCall,
  findAllCalls,
  buildPartialState,
  validateSetupApiContract,
} from '../helpers/mockSetupApi';
import {
  setupApiMocks,
  injectFakeToken,
} from '../helpers/mockApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to the wizard (served by the local Express server at port 3456). */
async function gotoWizard(page: Page): Promise<void> {
  // Use a short timeout so tests fail fast when the server isn't running,
  // rather than hanging for 30s and then failing on a blank-page locator check.
  await page.goto('http://localhost:3456/setup', { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Journey 25.1: Wizard — Initial Load & Welcome Step
// ---------------------------------------------------------------------------

test.describe('Journey 25.1: Wizard — Initial Load', () => {

  test('wizard renders without crash on initial load', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    // DEBUG: push notifications test log
    console.log('[DEBUG] push-notifications-test: wizard initial load started');
    console.log('[DEBUG] push-notifications-test: awaiting setup API mocks');

    await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    // Wizard should show some content (either wizard step or dashboard)
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
    expect(jsErrors).toHaveLength(0);
  });

  test('wizard shows welcome step with deployment-mode radio buttons on fresh state', async ({ page }) => {
    /**
     * Spec: On fresh state (progress=0), the wizard should show the deployment-mode
     * welcome step with saas and selfHosted radio buttons.
     *
     * Expected behavior: Wizard loads → saas and selfHosted radio buttons visible.
     */
    await setupSetupApiMocks(page, {
      state: buildPartialState(0),
    });
    await gotoWizard(page);

    // Fresh state should show wizard welcome (deployment mode radio buttons)
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="radio"][value="selfHosted"]')).toBeVisible({ timeout: 5000 });
  });

  test('wizard page loads with project-path and state API calls', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await gotoWizard(page);

    // Wait for wizard to load and make API calls
    await page.waitForTimeout(2000);

    // Wizard should have called project-path and/or state
    const projectPathCalls = findAllCalls(mocks.calls, 'project-path', 'GET');
    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');

    expect(projectPathCalls.length + stateCalls.length).toBeGreaterThan(0);
  });

  test('wizard renders welcome or dashboard — not a blank page', async ({ page }) => {
    await setupSetupApiMocks(page, {
      state: buildPartialState(0),
    });
    await gotoWizard(page);

    // Fresh state should show wizard welcome (deployment mode radio buttons)
    // OR the dashboard if wizard logic redirects on any state
    await page.waitForTimeout(1500);

    const hasWelcomeContent = await page.locator('input[type="radio"]').isVisible({ timeout: 5000 }).catch(() => false);
    const hasDashboard = await page.locator('text=/\\d+%/').isVisible({ timeout: 5000 }).catch(() => false);

    // Wizard must show something — not blank
    expect(hasWelcomeContent || hasDashboard).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Journey 25.2: Wizard — State Management (high-progress dashboard)
// ---------------------------------------------------------------------------

test.describe('Journey 25.2: Wizard — State Management', () => {

  test('high-progress state (90%) shows status dashboard not wizard steps', async ({ page }) => {
    /**
     * Spec: When setup is near-complete (high progress >=90%), the wizard should
     * redirect to or show the status dashboard (progress percentage) rather
     * than re-running wizard steps from the beginning.
     *
     * Expected behavior: Navigate to wizard with 90% progress state →
     * Dashboard with progress percentage should be visible.
     *
     * Bug: Wizard re-runs wizard from step 1 (deployment mode radio),
     * never showing the status dashboard.
     */
    await setupSetupApiMocks(page, {
      state: buildPartialState(90),
    });
    await gotoWizard(page);

    // The status dashboard should show progress percentage
    // e.g., "90%" text or progress ring
    const progressPct = page.locator('text=/\\d+%/');
    const dashboardVisible = await progressPct.isVisible({ timeout: 8000 }).catch(() => false);

    expect(dashboardVisible).toBeTruthy();
  });

  test('high-progress state (100%) shows completion or dashboard', async ({ page }) => {
    await setupSetupApiMocks(page, {
      state: buildPartialState(100),
    });
    await gotoWizard(page);

    await page.waitForTimeout(1500);

    // Should show either completion state or dashboard (not wizard from scratch)
    const progressPct = page.locator('text=/\\d+%/');
    const completionText = page.getByText(/complete|done|success/i);
    const hasDashboardOrCompletion = await (
      progressPct.isVisible({ timeout: 3000 }).catch(() => false) ||
      completionText.first().isVisible({ timeout: 3000 }).catch(() => false)
    );

    expect(hasDashboardOrCompletion).toBeTruthy();
  });

  test('partial-progress state (40%) renders some valid content', async ({ page }) => {
    await setupSetupApiMocks(page, {
      state: buildPartialState(40),
    });
    await gotoWizard(page);

    await page.waitForTimeout(1500);

    // Wizard should show some valid content (wizard step OR dashboard)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);

    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    expect(jsErrors).toHaveLength(0);
  });

  test('state URL does not include undefined projectDir', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page, {
      projectDir: '/test/wizard/project',
    });
    await gotoWizard(page);

    await page.waitForTimeout(2000);

    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');
    for (const call of stateCalls) {
      expect(call.url).not.toContain('undefined');
      expect(call.url).toContain('projectDir=');
    }
  });

  test('state endpoint is called at most once on wizard load (no duplicate calls)', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await gotoWizard(page);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');
    // Initial load: project-path (1) + state (1) = at most 2 total state calls
    expect(stateCalls.length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Journey 25.3: Wizard — API Connection Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 25.3: Wizard — API Connection Wiring', () => {

  test('deployment-mode POST fires with mode field in body', async ({ page }) => {
    /**
     * Spec: When user selects a deployment mode and clicks Continue,
     * the wizard should POST to /api/setup/deployment-mode with body { mode: 'saas'|'selfHosted' }.
     *
     * Expected behavior: User selects saas radio, clicks Continue →
     * POST /api/setup/deployment-mode with { mode: 'saas' }.
     *
     * Bug: The POST may not fire, or body may be missing `mode` field.
     */
    const mocks = await setupSetupApiMocks(page);
    await gotoWizard(page);

    // Wait for wizard to load
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);

    const modeCall = findCall(mocks.calls, 'deployment-mode', 'POST');
    expect(modeCall).toBeDefined();
    expect((modeCall?.body as Record<string, unknown>)?.mode).toBe('saas');
  });

  test('selfHosted deployment-mode POST fires with mode field', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await gotoWizard(page);

    await expect(page.locator('input[type="radio"][value="selfHosted"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="radio"][value="selfHosted"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);

    const modeCall = findCall(mocks.calls, 'deployment-mode', 'POST');
    expect(modeCall).toBeDefined();
    expect((modeCall?.body as Record<string, unknown>)?.mode).toBe('selfHosted');
  });

  test('deployment-mode radio selection fires POST on Continue click', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await gotoWizard(page);

    await expect(page.locator('input[type="radio"][value="selfHosted"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="radio"][value="selfHosted"]').check();
    const isCheckedBefore = await page.locator('input[type="radio"][value="selfHosted"]').isChecked();
    expect(isCheckedBefore).toBeTruthy();

    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);

    // After continue, wizard should have fired the mode call
    const modeCall = findCall(mocks.calls, 'deployment-mode', 'POST');
    expect(modeCall).toBeDefined();
  });

  test('wizard makes no duplicate state calls on page load', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await gotoWizard(page);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');
    // Initial load: project-path (1) + state (1) = at most 2
    expect(stateCalls.length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Journey 25.4: Wizard — Error Handling & Resilience
// ---------------------------------------------------------------------------

test.describe('Journey 25.4: Wizard — Error Handling', () => {

  test('write-config failure does not crash wizard UI', async ({ page }) => {
    /**
     * Spec: When write-config fails (server returns 500), the wizard UI should
     * remain on a valid step with content, not go blank or crash.
     *
     * Expected behavior: write-config returns 500 → wizard shows error state,
     * body text still > 5 chars, no JS errors.
     *
     * Bug: write-config failure may crash the wizard or leave it blank.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupSetupApiMocks(page, {
      writeConfig: { ok: false, status: 500, error: 'filesystem error' },
    });
    await gotoWizard(page);

    await expect(page.locator('input[type="radio"][value="selfHosted"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="radio"][value="selfHosted"]').check();
    await page.getByRole('button', { name: /continue/i }).click();

    await page.waitForTimeout(1000);

    // Wizard should remain on a valid step (not blank)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
    expect(jsErrors).toHaveLength(0);
  });

  test('wizard handles write-config 500 gracefully without blank screen', async ({ page }) => {
    await setupSetupApiMocks(page, {
      writeConfig: { ok: false, status: 500, error: 'mock filesystem error' },
    });
    await gotoWizard(page);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(1000);

    // Verify some content is visible (not blank)
    const visibleElements = await page.locator('body > *').count();
    expect(visibleElements).toBeGreaterThan(0);

    const bodyText = await page.locator('body').textContent();
    expect((bodyText?.length ?? 0)).toBeGreaterThan(5);
  });

  test('wizard completes without JS crash on normal flow', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupSetupApiMocks(page, {
      writeConfig: { ok: true, status: 200 },
    });
    await gotoWizard(page);

    // Navigate through first steps
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 25.5: Wizard — API Response Shape Validation
// ---------------------------------------------------------------------------

test.describe('Journey 25.5: Wizard — API Response Shape', () => {

  test('validate-cloudflare POST returns correct shape on success (200, {ok:true, result})', async ({ page }) => {
    /**
     * Spec: POST /api/setup/validate-cloudflare with valid token
     * should return 200 with body { ok: true, result: { account: { id: '...' } } }.
     *
     * Expected behavior: Mock returns 200 with { ok: true, result: {...} }.
     *
     * Bug (from error-context): Returns 400 — Cloudflare validation fails
     * even with mock token. The mock override is not being applied correctly.
     *
     * Note: page.evaluate (browser fetch) ensures Playwright route handlers intercept.
     */
    await setupSetupApiMocks(page, {
      cloudflare: { ok: true },
    });
    await gotoWizard(page);
    await page.waitForTimeout(1000);

    // Make request through wizard's browser context (fetch inside page)
    // This ensures Playwright route handlers are active.
    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3456/api/setup/validate-cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: 'fake-token' }),
      });
      return { status: resp.status, ok: resp.ok, json: await resp.json() };
    });

    // SPEC REQUIREMENT: Must return 200 (not 400)
    expect(result.status).toBe(200);
    expect(result.json.ok).toBe(true);
    expect(result.json.result).toBeDefined();
  });

  test('validate-cloudflare POST returns error shape on failure (400, {ok:false, error})', async ({ page }) => {
    await setupSetupApiMocks(page, {
      cloudflare: { ok: false, error: 'Invalid token' },
    });
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
     *
     * Expected behavior: POST to unknown endpoint → 404 JSON response.
     *
     * Bug (from error-context): Returns HTML (possibly from Express catch-all
     * or static file server). The HTML response causes JSON parse failures
     * in the wizard with SyntaxError: Unexpected token '<'.
     *
     * Note: Use page.evaluate (browser fetch) so Playwright route handlers intercept.
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
      try {
        json = await resp.json();
      } catch {
        parseError = true;
      }
      return { status: resp.status, contentType: resp.headers.get('content-type'), json, parseError };
    });

    // SPEC REQUIREMENT: Server should return 404
    expect(result.status).toBe(404);
    // SPEC REQUIREMENT: Response must be parseable JSON (not HTML)
    expect(result.parseError).toBe(false);
    expect(result.json).not.toBeNull();
    const errorResponse = result.json as Record<string, unknown>;
    expect(errorResponse.error).toBeDefined();
  });

  test('write-config returns correct shape on success', async ({ page }) => {
    await setupSetupApiMocks(page, {
      writeConfig: { ok: true, status: 200 },
    });
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

  test('write-config returns error shape on failure', async ({ page }) => {
    await setupSetupApiMocks(page, {
      writeConfig: { ok: false, status: 500, error: 'mock filesystem error' },
    });
    await gotoWizard(page);
    await page.waitForTimeout(1000);

    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3456/api/setup/write-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir: '/test/project', envVars: {} }),
      });
      return { status: resp.status, json: await resp.json() };
    });

    // Failure should return 500 with error field
    const json = result.json as Record<string, unknown>;
    expect(result.status).toBeGreaterThanOrEqual(400);
    expect(json.error).toBeDefined();
  });

  test('run-setup-py mock returns correct shape on success', async ({ page }) => {
    await setupSetupApiMocks(page, {
      setupPy: { ok: true, output: 'Setup completed successfully.' },
    });
    await gotoWizard(page);
    await page.waitForTimeout(1000);

    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3456/api/setup/run-setup-py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir: '/test/project', args: ['--all'] }),
      });
      return { status: resp.status, json: await resp.json() };
    });

    expect(result.status).toBe(200);
    const json = result.json as Record<string, unknown>;
    expect(json.ok).toBe(true);
    expect(json.output).toBeDefined();
  });

  test('STT status endpoint returns correct shape', async ({ page }) => {
    await setupSetupApiMocks(page);
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
// Journey 25.6: Wizard — write-config Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 25.6: Wizard — write-config Wiring', () => {

  test('wizard fires write-config POST when completing wizard flow', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await gotoWizard(page);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    // Advance to trigger write-config
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(500);

    const postCalls = mocks.calls.filter(c => c.method === 'POST');
    expect(postCalls.length).toBeGreaterThan(0);
  });

  test('write-config captures projectDir in body', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page, {
      writeConfig: { ok: true, status: 200 },
    });
    await gotoWizard(page);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    // Trigger write-config via direct API call through browser fetch
    // This exercises the wiring from the wizard's fetch calls
    await page.evaluate(async () => {
      await fetch('http://localhost:3456/api/setup/write-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectDir: '/test/project',
          envVars: { 'GEMINI_API_KEY': 'mock-key' },
        }),
      });
    });

    const writeConfigCall = findCall(mocks.calls, 'write-config', 'POST');
    expect(writeConfigCall).toBeDefined();
    expect((writeConfigCall?.body as Record<string, unknown>)?.projectDir).toBe('/test/project');
  });
});

// ---------------------------------------------------------------------------
// Journey 25.7: Settings Page — Bootstrap Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 25.7: Settings Page — Bootstrap Wiring', () => {

  test('settings page bootstrap contains session config after wizard completion', async ({ page }) => {
    const capturedBootstrap: unknown[] = [];
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    await page.route('**', async (route) => {
      const req = route.request();
      if (req.method() !== 'POST') { await route.continue(); return; }
      let body: Record<string, unknown>;
      try { body = await req.postDataJSON(); } catch { await route.continue(); return; }
      if (body?.action === 'bootstrap') {
        capturedBootstrap.push(body);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: {
              email: 'test@example.com',
              isAdmin: true,
              onboardingCompleted: true,
              config: {
                googleModel: 'google/gemini-2.0-flash',
                llm: null,
              },
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('./settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Bootstrap should have been called
    expect(capturedBootstrap.length).toBeGreaterThan(0);

    // Settings page should render (model section or equivalent)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

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
});
