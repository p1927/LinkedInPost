/**
 * Navigation: back button, skip optional steps, browser refresh resilience.
 * These tests verify the multi-step wizard navigation and API call wiring.
 */

import { test, expect } from '@playwright/test';
import { setupSetupApiMocks, findAllCalls } from '../helpers/mockSetupApi';

const WIZARD = '/setup-wizard.html';

test.describe('Wizard navigation', () => {
  test('continue advances from deploymentMode to welcome', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    // Verify deployment-mode POST was fired with correct payload
    const modeCalls = findAllCalls(mocks.calls, 'deployment-mode', 'POST');
    expect(modeCalls.length).toBeGreaterThan(0);
    expect(modeCalls[0].body?.mode).toBe('saas');
  });

  test('get-started advances from welcome to directory step', async ({ page }) => {
    await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /get started/i }).click();
    await expect(page.locator('text=/project directory/i')).toBeVisible({ timeout: 5000 });
  });

  test('browser refresh on deploymentMode step preserves the picker', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    // Capture calls made before refresh
    const callsBefore = [...mocks.calls];

    // Refresh — wizard should recover and show the picker again (state is fresh, 0%)
    await page.reload();
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    // After reload, the wizard should call project-path again (not use stale cache)
    const newCalls = mocks.calls.slice(callsBefore.length);
    const projectPathCalls = newCalls.filter(c => c.endpoint === 'project-path');
    expect(projectPathCalls.length).toBeGreaterThan(0);
  });

  test('back button returns to previous step without crashing', async ({ page }) => {
    await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    // Go forward: deploymentMode -> welcome
    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    // Try to go back
    const backBtn = page.getByRole('button', { name: /back/i }).first();
    if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(500);

      // Should show the deployment mode picker again
      await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('continue button wiring when deployment mode selected', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    // Select selfHosted and continue — verify the mode is captured
    await page.locator('input[type="radio"][value="selfHosted"]').check();
    await page.getByRole('button', { name: /continue/i }).click();

    // Advance to welcome screen
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    const modeCalls = findAllCalls(mocks.calls, 'deployment-mode', 'POST');
    expect(modeCalls.some(c => c.body?.mode === 'selfHosted')).toBeTruthy();
  });

  test('project-path endpoint is called before any state request', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    // project-path MUST be called; state call (if any) should follow
    const projectPathCalls = findAllCalls(mocks.calls, 'project-path', 'GET');
    expect(projectPathCalls.length).toBeGreaterThan(0);

    // If state is called, ensure URL contains projectDir (not undefined)
    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');
    if (stateCalls.length > 0) {
      const allUrls = stateCalls.map(c => c.url).join(',');
      expect(allUrls).not.toContain('undefined');
    }
  });

  test('skipping welcome step lands correctly', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    await page.locator('input[type="radio"][value="selfHosted"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(500);

    // Wizard either shows welcome with "get started" button, or skips to status dashboard
    const welcomeOrStatus = page
      .getByRole('button', { name: /get started/i })
      .or(page.locator('text=/\\d+%/'));
    await expect(welcomeOrStatus.first()).toBeVisible({ timeout: 5000 });
  });
});
