/**
 * State detection: project-path auto-detection and state endpoint behavior.
 */

import { test, expect } from '@playwright/test';
import { setupSetupApiMocks, findAllCalls, buildPartialState } from '../helpers/mockSetupApi';

const WIZARD = '/setup-wizard.html';

test.describe('State detection', () => {
  test('calls project-path on mount', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
    expect(findAllCalls(mocks.calls, 'project-path', 'GET').length).toBeGreaterThan(0);
  });

  test('skips state load when projectDir is empty', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page, { projectDir: '' });
    await page.goto(WIZARD);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
    // With empty projectDir, the state endpoint should NOT be queried.
    expect(findAllCalls(mocks.calls, 'state', 'GET').length).toBe(0);
  });

  test('high-progress state lands on StatusDashboard with percentage shown', async ({ page }) => {
    await setupSetupApiMocks(page, { state: buildPartialState(80) });
    await page.goto(WIZARD);

    // StatusDashboard shows progress ring with percentage.
    await expect(page.locator('text=/\\d+%/')).toBeVisible({ timeout: 10000 });
  });
});
