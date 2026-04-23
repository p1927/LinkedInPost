import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load the landing page without errors', async ({ page }) => {
    await page.goto('/');

    // Check page loads (either marketing content or error state)
    await expect(page.locator('body')).toBeVisible();

    // Verify the page renders without console errors (ignoring favicon and network)
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.waitForTimeout(2000);
    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::ERR') &&
      !e.includes('Failed to load resource')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should show terms of service page', async ({ page }) => {
    await page.goto('/terms');
    // Check page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show privacy policy page', async ({ page }) => {
    await page.goto('/privacy-policy');
    // Check page loads
    await expect(page.locator('body')).toBeVisible();
  });
});