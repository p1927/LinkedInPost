/**
 * SaaS happy path: a user with a fresh git clone runs the wizard end-to-end.
 *
 * The wizard is dry-run on port 3456 so most side effects skip; we instead
 * assert on the captured API calls (deployment-mode POST, write-config POST,
 * etc.) which is the contract the Express server upholds.
 */

import { test, expect } from '@playwright/test';
import { setupSetupApiMocks, findCall, findAllCalls } from '../helpers/mockSetupApi';

const WIZARD = '/setup-wizard.html';

test.describe('SaaS happy path', () => {
  test('selects SaaS, advances through welcome to directory, captures deployment-mode POST', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    // 1. Deployment mode page — pick SaaS (already default) and continue
    const saasRadio = page.locator('input[type="radio"][value="saas"]');
    await expect(saasRadio).toBeVisible({ timeout: 10000 });
    await saasRadio.check();
    await page.getByRole('button', { name: /continue/i }).click();

    // 2. Welcome screen
    const getStarted = page.getByRole('button', { name: /get started/i });
    await expect(getStarted).toBeVisible({ timeout: 5000 });
    await getStarted.click();

    // 3. Directory step — verify it loaded
    await expect(page.locator('text=/project directory/i')).toBeVisible({ timeout: 5000 });

    // Verify the API contract: deployment-mode was POSTed with mode=saas
    const modeCall = findCall(mocks.calls, 'deployment-mode', 'POST');
    expect(modeCall?.body?.mode).toBe('saas');

    // project-path detection ran during mount
    expect(findAllCalls(mocks.calls, 'project-path', 'GET').length).toBeGreaterThan(0);
  });
});
