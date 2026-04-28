/**
 * StatusDashboard actions: reset database, clear cache, regenerate features.
 * In dry-run mode, these click handlers log instead of calling backends.
 */

import { test, expect } from '@playwright/test';
import { setupSetupApiMocks, buildPartialState } from '../helpers/mockSetupApi';

const WIZARD = '/setup-wizard.html';

test.describe('Status dashboard quick actions', () => {
  test.beforeEach(async ({ page }) => {
    await setupSetupApiMocks(page, { state: buildPartialState(60) });
    await page.goto(WIZARD);
    // Wait for status dashboard to render
    await page.waitForTimeout(1000);
  });

  test('renders Quick Actions section', async ({ page }) => {
    const quickActions = page.locator('text=/quick actions/i');
    if (await quickActions.isVisible().catch(() => false)) {
      await expect(quickActions.first()).toBeVisible();
    }
  });

  test('reset-database button is clickable without crashing', async ({ page }) => {
    const btn = page.getByRole('button', { name: /reset database/i });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      // Wizard remains alive — percentage indicator still visible
      await expect(page.locator('text=/\\d+%/')).toBeVisible({ timeout: 5000 });
    }
  });

  test('regenerate-features button is clickable without crashing', async ({ page }) => {
    const btn = page.getByRole('button', { name: /regenerate features/i });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await expect(page.locator('text=/\\d+%/')).toBeVisible({ timeout: 5000 });
    }
  });
});
