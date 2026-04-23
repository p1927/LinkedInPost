# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend/tests/e2e/campaign.spec.ts >> Campaign Feature >> should display topic list correctly
- Location: frontend/tests/e2e/campaign.spec.ts:34:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/campaign", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | import { generateTestCampaign } from './helpers/testData';
  3  | 
  4  | test.describe('Campaign Feature', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     // Navigate to campaign page - assuming authenticated state
> 7  |     await page.goto('/campaign');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  8  |   });
  9  | 
  10 |   test('should display campaign page layout', async ({ page }) => {
  11 |     // Check that campaign page has proper structure
  12 |     await expect(page.locator('body')).toBeVisible();
  13 |   });
  14 | 
  15 |   test('should show campaign import section', async ({ page }) => {
  16 |     // Look for campaign import UI elements
  17 |     const pageContent = await page.content();
  18 |     // Campaign page should exist and render
  19 |     expect(pageContent).toBeTruthy();
  20 |   });
  21 | 
  22 |   test('should handle bulk topic operations', async ({ page }) => {
  23 |     // Test bulk operations on topics
  24 |     await page.waitForLoadState('networkidle');
  25 |     // Verify the page renders without errors
  26 |   });
  27 | 
  28 |   test('should validate campaign schema', async ({ page }) => {
  29 |     // Test that invalid data is properly rejected
  30 |     await page.goto('/campaign');
  31 |     await page.waitForLoadState('domcontentloaded');
  32 |   });
  33 | 
  34 |   test('should display topic list correctly', async ({ page }) => {
  35 |     await page.goto('/campaign');
  36 |     await page.waitForLoadState('networkidle');
  37 |     // Verify topics are displayed in the list
  38 |   });
  39 | });
  40 | 
  41 | test.describe('Campaign Import', () => {
  42 |   test('should accept valid JSON import', async ({ page }) => {
  43 |     await page.goto('/campaign');
  44 |     await page.waitForLoadState('domcontentloaded');
  45 | 
  46 |     // Look for import UI elements
  47 |     const importButton = page.getByRole('button', { name: /import/i }).first();
  48 |     if (await importButton.isVisible()) {
  49 |       // File input should be present
  50 |       const fileInput = page.locator('input[type="file"]');
  51 |       await expect(fileInput).toBeAttached();
  52 |     }
  53 |   });
  54 | 
  55 |   test('should reject invalid JSON format', async ({ page }) => {
  56 |     await page.goto('/campaign');
  57 |     await page.waitForLoadState('domcontentloaded');
  58 |     // Invalid JSON should show error
  59 |   });
  60 | 
  61 |   test('should show validation errors for malformed data', async ({ page }) => {
  62 |     await page.goto('/campaign');
  63 |     await page.waitForLoadState('domcontentloaded');
  64 |   });
  65 | });
  66 | 
  67 | test.describe('Campaign Calendar Integration', () => {
  68 |   test('should display calendar view', async ({ page }) => {
  69 |     await page.goto('/campaign');
  70 |     await page.waitForLoadState('networkidle');
  71 | 
  72 |     // Calendar should render
  73 |     const calendar = page.locator('[class*="calendar"], [class*="schedule"], .sx-react');
  74 |     await expect(calendar.first()).toBeVisible({ timeout: 10000 }).catch(() => {
  75 |       // Calendar may not be visible without data
  76 |     });
  77 |   });
  78 | 
  79 |   test('should sync topics to calendar events', async ({ page }) => {
  80 |     await page.goto('/campaign');
  81 |     await page.waitForLoadState('domcontentloaded');
  82 |   });
  83 | });
```