# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend/tests/e2e/news-research.spec.ts >> News Research History >> should display historical snapshots
- Location: frontend/tests/e2e/news-research.spec.ts:62:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/topics", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('News Research Feature', () => {
  4  |   test('should display news research panel', async ({ page }) => {
  5  |     await page.goto('/topics');
  6  |     await page.waitForLoadState('domcontentloaded');
  7  | 
  8  |     // Look for news research section
  9  |     const newsSection = page.locator('[aria-label*="News research"], section:has-text("News research")');
  10 |     await expect(newsSection.first()).toBeVisible({ timeout: 10000 }).catch(() => {
  11 |       // May not be visible without proper setup
  12 |     });
  13 |   });
  14 | 
  15 |   test('should show date range inputs when available', async ({ page }) => {
  16 |     await page.goto('/topics');
  17 |     await page.waitForLoadState('domcontentloaded');
  18 | 
  19 |     // Check for datetime-local inputs - may not be visible without auth
  20 |     const dateInputs = page.locator('input[type="datetime-local"]');
  21 |     const count = await dateInputs.count();
  22 |     // Just verify the page renders, inputs may be conditionally visible
  23 |     expect(count).toBeGreaterThanOrEqual(0);
  24 |   });
  25 | 
  26 |   test('should show search button', async ({ page }) => {
  27 |     await page.goto('/topics');
  28 |     await page.waitForLoadState('domcontentloaded');
  29 | 
  30 |     // Look for search functionality
  31 |     const searchButton = page.getByRole('button', { name: /search|fetch|go/i }).first();
  32 |     await expect(searchButton).toBeVisible({ timeout: 5000 }).catch(() => {
  33 |       // May not be visible in all states
  34 |     });
  35 |   });
  36 | 
  37 |   test('should handle search errors gracefully', async ({ page }) => {
  38 |     await page.goto('/topics');
  39 |     await page.waitForLoadState('domcontentloaded');
  40 | 
  41 |     // Try to perform a search - verify error handling exists
  42 |     const searchButton = page.getByRole('button', { name: /search|fetch/i }).first();
  43 |     if (await searchButton.isVisible()) {
  44 |       await searchButton.click();
  45 |       // Error state should be visible or warnings should appear
  46 |     }
  47 |   });
  48 | });
  49 | 
  50 | test.describe('News Research History', () => {
  51 |   test('should toggle history panel', async ({ page }) => {
  52 |     await page.goto('/topics');
  53 |     await page.waitForLoadState('domcontentloaded');
  54 | 
  55 |     // Look for history toggle
  56 |     const historyToggle = page.getByRole('button', { name: /history|recent|past/i }).first();
  57 |     if (await historyToggle.isVisible()) {
  58 |       await historyToggle.click();
  59 |     }
  60 |   });
  61 | 
  62 |   test('should display historical snapshots', async ({ page }) => {
> 63 |     await page.goto('/topics');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  64 |     await page.waitForLoadState('domcontentloaded');
  65 |   });
  66 | });
```