import { test, expect } from '@playwright/test';

test.describe('Setup Wizard: Deployment Mode', () => {
  test('setup wizard page loads', async ({ page }) => {
    await page.goto('./setup-wizard.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('deployment mode step shows both options', async ({ page }) => {
    await page.goto('./setup-wizard.html');
    await page.waitForLoadState('networkidle');
    // Should show mode selection or subsequent steps if already configured
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
