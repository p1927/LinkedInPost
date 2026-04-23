# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend/tests/e2e/onboarding.spec.ts >> Onboarding Flow >> should show onboarding modal for new users
- Location: frontend/tests/e2e/onboarding.spec.ts:4:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Onboarding Flow', () => {
  4   |   test('should show onboarding modal for new users', async ({ page }) => {
> 5   |     await page.goto('/');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6   |     await page.waitForLoadState('domcontentloaded');
  7   | 
  8   |     // Look for onboarding modal or setup flow
  9   |     // This may not trigger without fresh session
  10  |   });
  11  | 
  12  |   test('should guide through connection setup', async ({ page }) => {
  13  |     await page.goto('/');
  14  |     await page.waitForLoadState('domcontentloaded');
  15  | 
  16  |     // Look for connection/integration UI
  17  |     const connectSection = page.getByText(/connect|integration|setup/i).first();
  18  |     await expect(connectSection).toBeVisible({ timeout: 5000 }).catch(() => {
  19  |       // May not be visible without triggering
  20  |     });
  21  |   });
  22  | });
  23  | 
  24  | test.describe('Settings Page', () => {
  25  |   test('should display settings page', async ({ page }) => {
  26  |     await page.goto('/settings');
  27  |     await page.waitForLoadState('domcontentloaded');
  28  | 
  29  |     // Settings page should render
  30  |     const settingsHeading = page.locator('h1, h2').first();
  31  |     await expect(settingsHeading).toBeVisible({ timeout: 10000 });
  32  |   });
  33  | 
  34  |   test('should show LLM provider configuration', async ({ page }) => {
  35  |     await page.goto('/settings');
  36  |     await page.waitForLoadState('domcontentloaded');
  37  | 
  38  |     // Look for LLM or model settings
  39  |     const llmSection = page.getByText(/llm|model|provider/i).first();
  40  |     await expect(llmSection).toBeVisible({ timeout: 5000 }).catch(() => {
  41  |       // May require auth
  42  |     });
  43  |   });
  44  | 
  45  |   test('should show news research settings', async ({ page }) => {
  46  |     await page.goto('/settings');
  47  |     await page.waitForLoadState('domcontentloaded');
  48  | 
  49  |     // Look for news research configuration
  50  |     const newsSection = page.getByText(/news|research|api/i).first();
  51  |     await expect(newsSection).toBeVisible({ timeout: 5000 }).catch(() => {
  52  |       // May not have this setting visible
  53  |     });
  54  |   });
  55  | 
  56  |   test('should allow social integration management', async ({ page }) => {
  57  |     await page.goto('/settings');
  58  |     await page.waitForLoadState('domcontentloaded');
  59  | 
  60  |     // Look for social account connection UI
  61  |     const socialSection = page.getByText(/linkedin|instagram|social/i).first();
  62  |     await expect(socialSection).toBeVisible({ timeout: 5000 }).catch(() => {
  63  |       // May not be visible without auth
  64  |     });
  65  |   });
  66  | });
  67  | 
  68  | test.describe('Connections Page', () => {
  69  |   test('should display connections page', async ({ page }) => {
  70  |     await page.goto('/connections');
  71  |     await page.waitForLoadState('domcontentloaded');
  72  | 
  73  |     // Connections page should render
  74  |     const pageContent = await page.content();
  75  |     expect(pageContent).toBeTruthy();
  76  |   });
  77  | 
  78  |   test('should show integration status', async ({ page }) => {
  79  |     await page.goto('/connections');
  80  |     await page.waitForLoadState('domcontentloaded');
  81  | 
  82  |     // Look for status indicators
  83  |     const statusIndicator = page.locator('[class*="status"], [class*="connected"]').first();
  84  |     await expect(statusIndicator).toBeVisible({ timeout: 5000 }).catch(() => {
  85  |       // May not be visible without data
  86  |     });
  87  |   });
  88  | });
  89  | 
  90  | test.describe('Usage Page', () => {
  91  |   test('should display usage statistics', async ({ page }) => {
  92  |     await page.goto('/usage');
  93  |     await page.waitForLoadState('domcontentloaded');
  94  | 
  95  |     // Usage page should render
  96  |     const usageHeading = page.getByText(/usage|stats|quota/i).first();
  97  |     await expect(usageHeading).toBeVisible({ timeout: 10000 }).catch(() => {
  98  |       // May require auth
  99  |     });
  100 |   });
  101 | });
```