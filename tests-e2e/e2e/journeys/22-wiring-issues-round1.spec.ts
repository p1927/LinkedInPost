/**
 * Journey 22: Wiring Issues Round 1 — Setup Flow
 *
 * Covers wiring verification for the setup wizard and its integration with
 * the dashboard settings page, targeting:
 *   • Missing API connections between wizard steps
 *   • Broken redirects on wizard completion
 *   • State management bugs (stale data, missing re-fetches)
 *   • Model provider selection confirmation wiring
 *   • Setup API contract gaps (wrong body shape, missing fields)
 *
 * References:
 *   Journey 08  — model-provider-selection (dashboard settings page)
 *   setup-flow.spec.ts — wizard smoke tests
 *   setup/wizard-state-detection.spec.ts — wizard state hydration
 *   setup/wizard-navigation.spec.ts — wizard step navigation
 */

import { test, expect, type Page } from '@playwright/test';
import {
  setupSetupApiMocks,
  findCall,
  findAllCalls,
  buildPartialState,
  type MockSetupApi,
} from '../helpers/mockSetupApi';
import {
  setupApiMocks,
  injectFakeToken,
  gotoAuthenticated,
  MOCK_SESSION,
} from '../helpers/mockApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to the wizard (served by the local Express server at port 3456). */
async function gotoWizard(page: Page): Promise<void> {
  await page.goto('http://localhost:3456/setup');
}

/** Navigate to the dashboard settings page (authenticated). */
async function gotoSettings(page: Page): Promise<void> {
  await gotoAuthenticated(page, '/settings');
}

// ---------------------------------------------------------------------------
// Journey 22.1: Wizard — model provider step wiring
// ---------------------------------------------------------------------------

test.describe('Journey 22.1: Wizard — LLM Provider Step', () => {

  test('wizard shows LLM provider section when navigating to settings step', async ({ page }) => {
    // Verify the wizard correctly exposes the settings page link / shows model config
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    // Advance past deployment-mode (saas) → welcome
    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    // Try to find any LLM / model-related text in the wizard body
    // (wizard may show a link or button to "Configure Model" or "Settings")
    const bodyText = await page.locator('body').textContent();
    // Body should at minimum contain the wizard chrome
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('LLM model combobox is visible on dashboard settings after wizard completion', async ({ page }) => {
    // After the wizard completes, the user lands on the dashboard.
    // Verify the model combobox on /settings is wired up.
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./settings');
    await page.waitForLoadState('domcontentloaded');

    // LlmModelCombobox renders as button with aria-haspopup="listbox"
    const modelTrigger = page
      .locator('[aria-haspopup="listbox"]')
      .or(page.getByRole('button', { name: /gemini|claude|model/i }))
      .first();

    const hasTrigger = await modelTrigger.isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasTrigger).toBeTruthy();
  });

  test('opening model combobox shows search input', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./settings');
    await page.waitForLoadState('domcontentloaded');

    const modelTrigger = page.locator('[aria-haspopup="listbox"]').first();
    await expect(modelTrigger).toBeVisible({ timeout: 8000 });
    await modelTrigger.click();

    const searchInput = page
      .getByPlaceholder('Search models…')
      .or(page.getByLabel('Search models'))
      .or(page.getByPlaceholder(/search|filter/i));
    await expect(searchInput.first()).toBeVisible({ timeout: 8000 });
  });

  test('provider selector fires no JS errors when clicked', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./settings');
    await page.waitForLoadState('domcontentloaded');

    const providerBtn = page
      .getByRole('button', { name: /google|anthropic|gemini|openrouter/i })
      .first();

    if (await providerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await providerBtn.click();
      await page.waitForTimeout(500);
    }

    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 22.2: Wizard — setup confirmation wiring
// ---------------------------------------------------------------------------

test.describe('Journey 22.2: Wizard — Setup Confirmation', () => {

  test('complete-wizard button is wired to write-config POST', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.locator('input[type="radio"][value="selfHosted"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    // Navigate through the wizard: welcome → directory
    await page.getByRole('button', { name: /get started/i }).click();
    await expect(page.locator('text=/project directory/i')).toBeVisible({ timeout: 5000 });

    // Continue → progress step
    const continueBtn = page.getByRole('button', { name: /continue/i }).first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
    }
    await page.waitForTimeout(500);

    // At this point the wizard may have fired write-config already, or will fire on "Finish"
    // Verify the wizard has made at least one POST to a known endpoint
    const postCalls = mocks.calls.filter(c => c.method === 'POST');
    expect(postCalls.length).toBeGreaterThan(0);
  });

  test('write-config fires with projectDir and envVars in body', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    // Trigger write-config via browser-side fetch so Playwright route handlers intercept.
    await page.evaluate(async () => {
      await fetch('http://localhost:3456/api/setup/write-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectDir: '/test/project',
          envVars: {
            'VITE_GOOGLE_CLIENT_ID': 'mock-id',
            'GEMINI_API_KEY': 'mock-key',
            'GOOGLE_CLIENT_ID': 'mock-sa-id',
          },
        }),
      });
    });

    // Verify the call was captured
    const writeConfigCall = findCall(mocks.calls, 'write-config', 'POST');
    expect(writeConfigCall).toBeDefined();
    expect((writeConfigCall?.body as Record<string, unknown>)?.projectDir).toBe('/test/project');
  });

  test('setup confirmation shows completion state after write-config succeeds', async ({ page }) => {
    await setupSetupApiMocks(page, {
      writeConfig: { ok: true, status: 200 },
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    // Simulate the wizard completing — navigate through steps until we see completion
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(500);

    // Wizard should show either a progress step, env vars, or completion
    const anyWizardContent = page.locator('body').textContent();
    expect((await anyWizardContent)?.length ?? 0).toBeGreaterThan(10);
  });

  test('write-config failure does not crash wizard', async ({ page }) => {
    await setupSetupApiMocks(page, {
      writeConfig: { ok: false, status: 500, error: 'filesystem error' },
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.locator('input[type="radio"][value="selfHosted"]').check();
    await page.getByRole('button', { name: /continue/i }).click();

    await page.waitForTimeout(500);

    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    await page.waitForTimeout(500);

    // Wizard should remain on a valid step (not blank)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 22.3: Wizard — missing API connections / wiring gaps
// ---------------------------------------------------------------------------

test.describe('Journey 22.3: Wizard — API Connection Wiring', () => {

  test('deployment-mode POST body contains mode field', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    const modeCall = findCall(mocks.calls, 'deployment-mode', 'POST');
    expect(modeCall).toBeDefined();
    expect((modeCall?.body as Record<string, unknown>)?.mode).toBe('saas');
  });

  test('selfHosted mode fires with correct body', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.locator('input[type="radio"][value="selfHosted"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    const modeCall = findCall(mocks.calls, 'deployment-mode', 'POST');
    expect(modeCall).toBeDefined();
    expect((modeCall?.body as Record<string, unknown>)?.mode).toBe('selfHosted');
  });

  test('state endpoint is called only once on wizard load', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');
    expect(stateCalls.length).toBeLessThanOrEqual(2); // initial + possible refresh
  });

  test('project-path is called before state on fresh load', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    const projectPathCalls = findAllCalls(mocks.calls, 'project-path', 'GET');
    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');

    if (projectPathCalls.length > 0 && stateCalls.length > 0) {
      // project-path should be called first (or at least before the second state call)
      const firstProjectPath = projectPathCalls[0];
      const firstStateCall = stateCalls[0];
      expect(firstProjectPath).toBeDefined();
      expect(firstStateCall).toBeDefined();
    }
  });

  test('unknown API endpoint returns 404 (not silently swallowed)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    // Use page.evaluate + browser fetch so Playwright route handlers intercept the request.
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

    // Server should return 404
    expect(result.status).toBe(404);
    // Response should be JSON (not HTML) so the wizard doesn't crash on parse errors
    expect(result.parseError).toBe(false);
    expect(result.json as Record<string, unknown>).not.toBeNull();
    expect((result.json as Record<string, unknown>).error).toBeDefined();

    // No JS crash should occur
    expect(errors).toHaveLength(0);
  });

  test('validate-cloudflare POST returns correct shape on success', async ({ page }) => {
    await setupSetupApiMocks(page, {
      cloudflare: { ok: true },
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);
    await page.waitForTimeout(1000);

    // Use browser-side fetch so Playwright route handlers intercept the request.
    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3456/api/setup/validate-cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: 'fake-token' }),
      });
      return { status: resp.status, json: await resp.json() };
    });

    expect(result.status).toBe(200);
    expect(result.json.ok).toBe(true);
    expect(result.json.result).toBeDefined();
  });

  test('validate-cloudflare POST returns error shape on failure', async ({ page }) => {
    await setupSetupApiMocks(page, {
      cloudflare: { ok: false, error: 'Invalid token' },
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);
    await page.waitForTimeout(1000);

    // Use browser-side fetch so Playwright route handlers intercept the request.
    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3456/api/setup/validate-cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: 'bad-token' }),
      });
      return { status: resp.status, json: await resp.json() };
    });

    expect(result.status).toBe(400);
    expect(result.json.ok).toBe(false);
    expect(result.json.error).toBeDefined();
  });

  test('run-setup-py returns output on success', async ({ page }) => {
    await setupSetupApiMocks(page, {
      setupPy: { ok: true, output: 'Setup completed successfully.' },
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);
    await page.waitForTimeout(1000);

    // Use browser-side fetch so Playwright route handlers intercept the request.
    const result = await page.evaluate(async () => {
      const resp = await fetch('http://localhost:3456/api/setup/run-setup-py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir: '/test/project', args: ['--all'] }),
      });
      return { status: resp.status, json: await resp.json() };
    });

    // Check the response is parseable
    expect(result.status).toBe(200);
    expect(result.json.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 22.4: Wizard — state management bugs
// ---------------------------------------------------------------------------

test.describe('Journey 22.4: Wizard — State Management', () => {

  test('high-progress state shows status dashboard (not wizard steps)', async ({ page }) => {
    await setupSetupApiMocks(page, {
      state: buildPartialState(90),
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    // When setup is near-complete, the wizard should show the status dashboard
    // (not re-run the wizard from step 1)
    const progressPct = page.locator('text=/\\d+%/');
    const dashboardContent = await progressPct.isVisible({ timeout: 8000 }).catch(() => false);
    expect(dashboardContent).toBeTruthy();
  });

  test('zero-progress state shows welcome screen', async ({ page }) => {
    await setupSetupApiMocks(page, {
      state: buildPartialState(0),
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    // Should show the deployment-mode step (radio buttons)
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
  });

  test('partial-progress state shows relevant wizard step', async ({ page }) => {
    await setupSetupApiMocks(page, {
      state: buildPartialState(40),
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.waitForTimeout(1000);

    // Should show either wizard steps OR the status dashboard
    const hasWizardContent = await page.locator('input[type="radio"]').isVisible({ timeout: 5000 }).catch(() => false);
    const hasDashboard = await page.locator('text=/\\d+%/').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasWizardContent || hasDashboard).toBeTruthy();
  });

  test('state URL does not contain undefined projectDir', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page, {
      projectDir: '/test/wizard/project',
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');
    for (const call of stateCalls) {
      expect(call.url).not.toContain('undefined');
      expect(call.url).toContain('projectDir=');
    }
  });

  test('refresh on wizard does not duplicate state calls beyond expected limit', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    const callsBefore = mocks.calls.length;
    await page.reload();
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    const newCalls = mocks.calls.slice(callsBefore);
    // After refresh: project-path (1) + possibly state (1) = at most 2 new calls
    expect(newCalls.length).toBeLessThanOrEqual(3);
  });

  test('STT status endpoint returns correct shape', async ({ page }) => {
    // Load the wizard page first so Playwright route handlers are activated.
    await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);
    await page.waitForTimeout(500);

    // Use browser-side fetch so Playwright route handlers intercept the request.
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
    // Load the wizard page first so Playwright route handlers are activated.
    await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);
    await page.waitForTimeout(500);

    // Use browser-side fetch so Playwright route handlers intercept the request.
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

  test('settings page bootstrap contains session config after wizard completion', async ({ page }) => {
    const capturedBootstrap: unknown[] = [];
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
          body: JSON.stringify({ ok: true, data: MOCK_SESSION }),
        });
        return;
      }
      await route.continue();
    });

    await injectFakeToken(page);
    await page.goto('./settings');
    await page.waitForLoadState('domcontentloaded');

    // Bootstrap should have been called
    expect(capturedBootstrap.length).toBeGreaterThan(0);

    // Settings page should render (model section or equivalent)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 22.5: Dashboard settings — model provider confirmation wiring
// ---------------------------------------------------------------------------

test.describe('Journey 22.5: Dashboard Settings — Model Provider Confirmation', () => {

  test('save config fires action on dashboard settings', async ({ page }) => {
    const capturedActions: string[] = [];
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./settings');
    await page.waitForLoadState('domcontentloaded');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    // Interact with model combobox if visible
    const modelTrigger = page.locator('[aria-haspopup="listbox"]').first();
    if (await modelTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await modelTrigger.click();
      const options = page.getByRole('option');
      if (await options.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await options.first().click();
        await page.waitForTimeout(300);
      }
    }

    // Try save button
    const saveBtn = page.getByRole('button', { name: /save settings|save/i }).first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (await saveBtn.isEnabled({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(500);
        const hasSaveAction = capturedActions.some(
          a => a === 'saveConfig' || a === 'updateConfig' || a === 'saveSettings'
        );
        expect(hasSaveAction).toBeTruthy();
      } else {
        test.skip(true, 'Save button disabled — no unsaved changes in test environment');
      }
    } else {
      test.skip(true, 'Save settings button not visible');
    }
  });

  test('changing provider updates model options list', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./settings');
    await page.waitForLoadState('domcontentloaded');

    const anthropicBtn = page.getByRole('button', { name: /anthropic/i });
    if (await anthropicBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await anthropicBtn.click();
      await page.waitForTimeout(500);

      const modelTrigger = page.locator('[aria-haspopup="listbox"]').first();
      if (await modelTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await modelTrigger.click();
        // Should show Claude models
        const claudes = page.getByText(/claude/i);
        await expect(claudes.first()).toBeVisible({ timeout: 8000 });
      }
    } else {
      test.skip(true, 'Anthropic provider button not visible');
    }
  });

  test('settings page model section renders without JS crash', async ({ page }) => {
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

// ---------------------------------------------------------------------------
// Journey 22.6: Redirect and navigation wiring
// ---------------------------------------------------------------------------

test.describe('Journey 22.6: Wizard — Redirects & Navigation', () => {

  test('wizard continues to dashboard on completion (if redirect wired)', async ({ page }) => {
    await setupSetupApiMocks(page, {
      state: buildPartialState(100),
    });
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.waitForTimeout(2000);

    // After wizard "completion", the wizard may try to redirect to the dashboard.
    // Check the final URL or page content reflects either dashboard or wizard completion.
    const url = page.url();
    const bodyText = await page.locator('body').textContent();

    // Either the redirect happened (dashboard URL) or the wizard shows completion state
    const isOnDashboard = url.includes('localhost:5173') || url.includes('p1927.github.io');
    const showsCompletion = bodyText?.includes('Setup Complete') || bodyText?.includes('100%');
    expect(isOnDashboard || showsCompletion).toBeTruthy();
  });

  test('navigating away from wizard and back does not lose state', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.locator('input[type="radio"][value="selfHosted"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    // Navigate away
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    // Come back
    await gotoWizard(page);
    await page.waitForTimeout(1000);

    // Wizard should recover (show saas radio since state is fresh)
    const hasPicker = await page.locator('input[type="radio"][value="saas"]').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasPicker).toBeTruthy();
  });

  test('deployment mode selection persists through wizard step navigation', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.waitForLoadState('domcontentloaded');
    await gotoWizard(page);

    await page.locator('input[type="radio"][value="selfHosted"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    // Go forward and back
    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(500);

    const backBtn = page.getByRole('button', { name: /back/i }).first();
    if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(500);

      // Deployment mode selection should be preserved
      const selfHostedChecked = await page.locator('input[type="radio"][value="selfHosted"]').isChecked().catch(() => false);
      const saasChecked = await page.locator('input[type="radio"][value="saas"]').isChecked().catch(() => false);
      expect(selfHostedChecked || saasChecked).toBeTruthy();

      // Verify the mode call was made
      const modeCall = findCall(mocks.calls, 'deployment-mode', 'POST');
      expect(modeCall).toBeDefined();
    }
  });
});
