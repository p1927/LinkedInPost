/**
 * Deployment mode selection — covers the most common decision a user makes
 * when first opening the wizard: SaaS vs self-hosted, and switching between them.
 */

import { test, expect } from '@playwright/test';
import { setupSetupApiMocks, findAllCalls } from '../helpers/mockSetupApi';

const WIZARD = '/setup-wizard.html';

test.describe('Deployment mode', () => {
  test('shows both deployment options with descriptions', async ({ page }) => {
    await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="radio"][value="selfHosted"]')).toBeVisible();
    // Each option has a description hinting at its tradeoffs
    await expect(page.locator('text=/invite.?only|admin panel/i')).toBeVisible();
    await expect(page.locator('text=/no waitlist|own api keys/i')).toBeVisible();
  });

  test('SaaS is selected by default', async ({ page }) => {
    await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    const saas = page.locator('input[type="radio"][value="saas"]');
    await expect(saas).toBeVisible({ timeout: 10000 });
    await expect(saas).toBeChecked();
  });

  test('switching mode and continuing again POSTs the new value', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    // Switch to self-hosted, advance, then come back and switch to saas
    await page.locator('input[type="radio"][value="selfHosted"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    // Reload and pick saas this time
    await page.goto(WIZARD);
    await page.locator('input[type="radio"][value="saas"]').check();
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

    const modeCalls = findAllCalls(mocks.calls, 'deployment-mode', 'POST');
    expect(modeCalls.length).toBeGreaterThanOrEqual(2);
    expect(modeCalls[0].body.mode).toBe('selfHosted');
    expect(modeCalls[modeCalls.length - 1].body.mode).toBe('saas');
  });
});
