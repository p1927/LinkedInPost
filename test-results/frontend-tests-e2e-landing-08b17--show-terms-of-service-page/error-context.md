# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend/tests/e2e/landing.spec.ts >> Landing Page >> should show terms of service page
- Location: frontend/tests/e2e/landing.spec.ts:26:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/terms", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Landing Page', () => {
  4  |   test('should load the landing page without errors', async ({ page }) => {
  5  |     await page.goto('/');
  6  | 
  7  |     // Check page loads (either marketing content or error state)
  8  |     await expect(page.locator('body')).toBeVisible();
  9  | 
  10 |     // Verify the page renders without console errors (ignoring favicon and network)
  11 |     const consoleErrors: string[] = [];
  12 |     page.on('console', msg => {
  13 |       if (msg.type() === 'error') consoleErrors.push(msg.text());
  14 |     });
  15 | 
  16 |     await page.waitForTimeout(2000);
  17 |     // Filter out known non-critical errors
  18 |     const criticalErrors = consoleErrors.filter(e =>
  19 |       !e.includes('favicon') &&
  20 |       !e.includes('net::ERR') &&
  21 |       !e.includes('Failed to load resource')
  22 |     );
  23 |     expect(criticalErrors).toHaveLength(0);
  24 |   });
  25 | 
  26 |   test('should show terms of service page', async ({ page }) => {
> 27 |     await page.goto('/terms');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  28 |     // Check page loads
  29 |     await expect(page.locator('body')).toBeVisible();
  30 |   });
  31 | 
  32 |   test('should show privacy policy page', async ({ page }) => {
  33 |     await page.goto('/privacy-policy');
  34 |     // Check page loads
  35 |     await expect(page.locator('body')).toBeVisible();
  36 |   });
  37 | });
```