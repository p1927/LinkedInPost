# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend/tests/e2e/content-flow.spec.ts >> Content Review Feature >> should show review settings when feature is enabled
- Location: frontend/tests/e2e/content-flow.spec.ts:15:3

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
  3  | test.describe('Content Review Feature', () => {
  4  |   test('should display content review workspace', async ({ page }) => {
  5  |     await page.goto('/topics');
  6  |     await page.waitForLoadState('domcontentloaded');
  7  | 
  8  |     // Look for review-related sections
  9  |     const reviewSection = page.locator('section:has-text("Review"), [aria-label*="review"]').first();
  10 |     await expect(reviewSection).toBeVisible({ timeout: 10000 }).catch(() => {
  11 |       // May not be visible in default state
  12 |     });
  13 |   });
  14 | 
  15 |   test('should show review settings when feature is enabled', async ({ page }) => {
> 16 |     await page.goto('/topics');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  17 |     await page.waitForLoadState('domcontentloaded');
  18 | 
  19 |     // Navigate to settings if needed
  20 |     await page.goto('/settings');
  21 |     await page.waitForLoadState('domcontentloaded');
  22 | 
  23 |     // Look for content review settings
  24 |     const contentReviewSettings = page.getByText(/content review/i).first();
  25 |     await expect(contentReviewSettings).toBeVisible({ timeout: 5000 }).catch(() => {
  26 |       // Settings may not show this section
  27 |     });
  28 |   });
  29 | 
  30 |   test('should display review workflow', async ({ page }) => {
  31 |     await page.goto('/topics');
  32 |     await page.waitForLoadState('domcontentloaded');
  33 |   });
  34 | });
  35 | 
  36 | test.describe('Content Flow', () => {
  37 |   test('should display pattern-based content selector', async ({ page }) => {
  38 |     await page.goto('/topics');
  39 |     await page.waitForLoadState('domcontentloaded');
  40 | 
  41 |     // Look for pattern or flow related UI
  42 |     const flowSection = page.locator('[class*="pattern"], [class*="flow"], section:has-text("pattern")').first();
  43 |     await expect(flowSection).toBeVisible({ timeout: 10000 }).catch(() => {
  44 |       // May require specific topic selection
  45 |     });
  46 |   });
  47 | 
  48 |   test('should allow template selection', async ({ page }) => {
  49 |     await page.goto('/topics');
  50 |     await page.waitForLoadState('domcontentloaded');
  51 |   });
  52 | });
  53 | 
  54 | test.describe('Generation Rules', () => {
  55 |   test('should display rules panel', async ({ page }) => {
  56 |     await page.goto('/rules');
  57 |     await page.waitForLoadState('domcontentloaded');
  58 | 
  59 |     // Check for rules page elements
  60 |     const rulesHeading = page.getByRole('heading', { name: /rules|generation/i }).first();
  61 |     await expect(rulesHeading).toBeVisible({ timeout: 10000 }).catch(() => {
  62 |       // May require auth
  63 |     });
  64 |   });
  65 | 
  66 |   test('should allow editing global rules', async ({ page }) => {
  67 |     await page.goto('/rules');
  68 |     await page.waitForLoadState('domcontentloaded');
  69 | 
  70 |     // Look for editable area
  71 |     const editableArea = page.locator('textarea, [contenteditable="true"]').first();
  72 |     await expect(editableArea).toBeVisible({ timeout: 5000 }).catch(() => {
  73 |       // May not be visible
  74 |     });
  75 |   });
  76 | });
```