/**
 * Resume scenarios: when partial setup state exists, the wizard should detect
 * it and route the user to the StatusDashboard rather than the deployment
 * mode picker.
 */

import { test, expect } from '@playwright/test';
import { setupSetupApiMocks, buildPartialState, findAllCalls } from '../helpers/mockSetupApi';

const WIZARD = '/setup-wizard.html';

test.describe('Resume from partial state', () => {
  test('partial-state wizard skips deploymentMode and shows StatusDashboard', async ({ page }) => {
    await setupSetupApiMocks(page, {
      state: buildPartialState(50),
    });
    await page.goto(WIZARD);

    // The wizard should call /api/setup/state once it detects projectDir
    // and (because progress > 0) jump to StatusDashboard, not deploymentMode.
    // StatusDashboard shows a percentage / progress ring.
    const percentage = page.locator('text=/\\d+%/');
    await expect(percentage.first()).toBeVisible({ timeout: 10000 });

    // The deploymentMode radios should NOT be visible.
    await expect(page.locator('input[type="radio"][value="saas"]')).not.toBeVisible();
  });

  test('zero-progress wizard goes to deploymentMode picker, not StatusDashboard', async ({ page }) => {
    await setupSetupApiMocks(page); // default: 0% progress, fresh state
    await page.goto(WIZARD);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
  });

  test('state endpoint receives the detected projectDir as query', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page, {
      projectDir: '/custom/test/dir',
      state: buildPartialState(40),
    });
    await page.goto(WIZARD);

    // Wait for state detection to run
    await page.waitForTimeout(500);
    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');
    expect(stateCalls.length).toBeGreaterThan(0);
    expect(stateCalls[0].query?.projectDir).toBe('/custom/test/dir');
  });
});
