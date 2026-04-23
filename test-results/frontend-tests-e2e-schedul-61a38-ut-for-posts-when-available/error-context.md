# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend/tests/e2e/scheduling.spec.ts >> Scheduled Publish Feature >> should have time input for posts when available
- Location: frontend/tests/e2e/scheduling.spec.ts:15:3

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
  3  | test.describe('Scheduled Publish Feature', () => {
  4  |   test('should display calendar view', async ({ page }) => {
  5  |     await page.goto('/topics');
  6  |     await page.waitForLoadState('domcontentloaded');
  7  | 
  8  |     // Look for schedule-x calendar component
  9  |     const calendar = page.locator('.sx-react, [class*="schedule-x"], [class*="calendar"]').first();
  10 |     await expect(calendar).toBeVisible({ timeout: 15000 }).catch(() => {
  11 |       // Calendar may require data
  12 |     });
  13 |   });
  14 | 
  15 |   test('should have time input for posts when available', async ({ page }) => {
> 16 |     await page.goto('/topics');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  17 |     await page.waitForLoadState('domcontentloaded');
  18 | 
  19 |     // Look for time input fields - may not be visible without proper context
  20 |     const timeInputs = page.locator('input[type="time"]');
  21 |     const count = await timeInputs.count();
  22 |     // Just verify the page renders, inputs may be conditionally visible
  23 |     expect(count).toBeGreaterThanOrEqual(0);
  24 |   });
  25 | 
  26 |   test('should display scheduled posts in calendar', async ({ page }) => {
  27 |     await page.goto('/topics');
  28 |     await page.waitForLoadState('networkidle');
  29 | 
  30 |     // Calendar events should be visible if there are scheduled posts
  31 |     const events = page.locator('[class*="event"], [class*="schedule"], [class*="post"]');
  32 |     expect(await events.count()).toBeGreaterThanOrEqual(0);
  33 |   });
  34 | });
  35 | 
  36 | test.describe('Scheduling Operations', () => {
  37 |   test('should allow time selection', async ({ page }) => {
  38 |     await page.goto('/topics');
  39 |     await page.waitForLoadState('domcontentloaded');
  40 | 
  41 |     const timeInput = page.locator('input[type="time"]').first();
  42 |     if (await timeInput.isVisible()) {
  43 |       await timeInput.fill('14:00');
  44 |     }
  45 |   });
  46 | 
  47 |   test('should handle timezone considerations', async ({ page }) => {
  48 |     await page.goto('/topics');
  49 |     await page.waitForLoadState('domcontentloaded');
  50 |   });
  51 | 
  52 |   test('should show publish queue', async ({ page }) => {
  53 |     await page.goto('/topics');
  54 |     await page.waitForLoadState('domcontentloaded');
  55 | 
  56 |     // Look for queue or pending items
  57 |     const queueSection = page.getByText(/queue|pending|scheduled/i).first();
  58 |     await expect(queueSection).toBeVisible({ timeout: 5000 }).catch(() => {
  59 |       // May not be visible without data
  60 |     });
  61 |   });
  62 | });
```