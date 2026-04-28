/**
 * Navigation: back button, skip optional steps, browser refresh resilience.
 */

import { test, expect } from '@playwright/test';
import { setupSetupApiMocks } from '../helpers/mockSetupApi';

const WIZARD = '/setup-wizard.html';

test.describe('Wizard navigation', () => {
  test('continue advances from deploymentMode to welcome', async ({ page }) => {
    await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });
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
    await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    // Refresh — wizard should recover and show the picker again (state is fresh, 0%)
    await page.reload();
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
  });
});
