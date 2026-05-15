/**
 * Regression test: playwright.config.ts baseURL must resolve '.' correctly.
 *
 * Before the fix, tests-e2e/ had no playwright.config.ts, so
 * page.goto('.') failed with "Cannot navigate to invalid URL" because
 * Playwright had no baseURL to resolve the relative path against.
 *
 * This test verifies that the config is present and that navigation
 * using '.' (relative path to baseURL) works correctly.
 */

import { test, expect } from '@playwright/test';

test.describe('playwright.config.ts regression', () => {
  test('page.goto(".") resolves to baseURL and loads the app', async ({ page }) => {
    // Navigate using '.' which should resolve to the baseURL from playwright.config.ts
    await page.goto('.');
    await page.waitForLoadState('domcontentloaded');

    // The app should have loaded (title or body content present)
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('baseURL is configured in playwright config', async () => {
    // Read the playwright config to verify baseURL is set
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');

    const configPath = resolve(__dirname, '../../playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');

    // Verify baseURL is set in the config
    expect(configContent).toContain('baseURL');
    expect(configContent).toContain('localhost');
  });
});
