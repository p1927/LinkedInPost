/**
 * Sanity tests for the mock helper itself. These verify the test infrastructure
 * works as expected — without these, the rest of the suite is unreliable.
 */

import { test, expect } from '@playwright/test';
import { setupSetupApiMocks, findCall, findAllCalls, buildPartialState } from '../helpers/mockSetupApi';

const WIZARD = '/setup-wizard.html';

test.describe('Mock helper sanity', () => {
  test('captures GET project-path with method and URL', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.goto(WIZARD);
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    const call = findCall(mocks.calls, 'project-path', 'GET');
    expect(call).toBeDefined();
    expect(call?.method).toBe('GET');
    expect(call?.url).toContain('/api/setup/project-path');
  });

  test('reconfigure switches the projectDir mid-test', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page, { projectDir: '/initial/dir' });
    await page.goto(WIZARD);
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    // Fetch from page context so page.route() intercepts it.
    const before = await page.evaluate(async () => {
      const r = await fetch('http://localhost:3456/api/setup/project-path');
      return r.json();
    });
    expect(before.projectDir).toBe('/initial/dir');

    mocks.reconfigure({ projectDir: '/new/dir' });

    const after = await page.evaluate(async () => {
      const r = await fetch('http://localhost:3456/api/setup/project-path');
      return r.json();
    });
    expect(after.projectDir).toBe('/new/dir');
  });

  test('buildPartialState produces graduated env-var coverage', () => {
    const partial = buildPartialState(50);
    const setVars = partial.envVars?.filter(v => v.isSet) || [];
    // 5 required env vars, 50% → 2 set
    expect(setVars.length).toBe(2);
  });

  test('buildPartialState at 100% sets all required vars', () => {
    const full = buildPartialState(100);
    const setVars = full.envVars?.filter(v => v.isSet) || [];
    expect(setVars.length).toBe(5);
    const connectedIntegrations = full.integrations?.filter(i => i.connected) || [];
    expect(connectedIntegrations.length).toBe(4);
  });

  test('unknown endpoints return 404 so missing mocks are loud', async ({ page }) => {
    await setupSetupApiMocks(page);
    await page.goto(WIZARD);
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    const resp = await page.request.get('http://localhost:3456/api/setup/this-does-not-exist');
    expect(resp.status()).toBe(404);
  });

  test('multiple calls to the same endpoint are all captured', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.goto(WIZARD);
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    // Trigger several deployment-mode POSTs by clicking through twice
    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.goto(WIZARD);
    await page.locator('input[type="radio"][value="selfHosted"]').check();
    await page.getByRole('button', { name: /continue/i }).click();

    expect(findAllCalls(mocks.calls, 'deployment-mode', 'POST').length).toBeGreaterThanOrEqual(2);
  });
});
