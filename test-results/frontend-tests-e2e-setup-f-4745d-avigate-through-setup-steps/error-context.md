# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend/tests/e2e/setup-flow.spec.ts >> Setup Flow >> can navigate through setup steps
- Location: frontend/tests/e2e/setup-flow.spec.ts:31:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3456/setup
Call log:
  - navigating to "http://localhost:3456/setup", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Setup Flow', () => {
  4   |   test.beforeEach(async ({ page }) => {
> 5   |     await page.goto('http://localhost:3456/setup');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3456/setup
  6   |   });
  7   | 
  8   |   test('shows loading state while detecting setup', async ({ page }) => {
  9   |     const spinner = page.locator('.animate-spin');
  10  |     await expect(spinner).toBeVisible({ timeout: 5000 }).catch(() => {
  11  |       // If not visible, wizard may have already detected state
  12  |     });
  13  |   });
  14  | 
  15  |   test('shows welcome screen for fresh setup', async ({ page }) => {
  16  |     const getStarted = page.getByRole('button', { name: /get started/i });
  17  |     await expect(getStarted).toBeVisible({ timeout: 10000 });
  18  |   });
  19  | 
  20  |   test('shows status dashboard when partial setup exists', async ({ page }) => {
  21  |     await page.waitForTimeout(2000);
  22  | 
  23  |     const welcomeOrStatus = page.locator('text=Welcome to LinkedIn Post').or(
  24  |       page.locator('text=Environment Variables').or(
  25  |         page.locator('text=Setup Complete')
  26  |       )
  27  |     );
  28  |     await expect(welcomeOrStatus.first()).toBeVisible({ timeout: 10000 });
  29  |   });
  30  | 
  31  |   test('can navigate through setup steps', async ({ page }) => {
  32  |     const getStarted = page.getByRole('button', { name: /get started/i });
  33  |     await getStarted.click();
  34  | 
  35  |     await expect(page.locator('text=Select your project directory')).toBeVisible({ timeout: 5000 });
  36  |   });
  37  | 
  38  |   test('shows progress during dependency installation', async ({ page }) => {
  39  |     const getStarted = page.getByRole('button', { name: /get started/i });
  40  |     await getStarted.click();
  41  |     await page.waitForTimeout(500);
  42  | 
  43  |     const progressSection = page.locator('text=Setting up your environment');
  44  |     if (await progressSection.isVisible()) {
  45  |       // We're on progress page - verify log messages exist
  46  |       await expect(page.locator('.log-entry, [class*="log"]')).toBeVisible({ timeout: 3000 }).catch(() => {});
  47  |     }
  48  |   });
  49  | });
  50  | 
  51  | test.describe('Setup Detection', () => {
  52  |   test('detects environment variables from .env file', async ({ page }) => {
  53  |     await page.goto('http://localhost:3456/setup');
  54  |     await page.waitForTimeout(3000);
  55  | 
  56  |     const envVarsSection = page.locator('text=Environment Variables');
  57  |     const isVisible = await envVarsSection.isVisible().catch(() => false);
  58  | 
  59  |     if (isVisible) {
  60  |       const statusIndicators = page.locator('[class*="text-green-500"], [class*="text-red-500"]');
  61  |       expect(await statusIndicators.count()).toBeGreaterThan(0);
  62  |     }
  63  |   });
  64  | 
  65  |   test('shows integration status', async ({ page }) => {
  66  |     await page.goto('http://localhost:3456/setup');
  67  |     await page.waitForTimeout(3000);
  68  | 
  69  |     const integrationsSection = page.locator('text=Integrations');
  70  |     const isVisible = await integrationsSection.isVisible().catch(() => false);
  71  | 
  72  |     if (isVisible) {
  73  |       const checkCircle = page.locator('[class*="CheckCircle"], [class*="XCircle"]');
  74  |       expect(await checkCircle.count()).toBeGreaterThan(0);
  75  |     }
  76  |   });
  77  | 
  78  |   test('calculates overall progress correctly', async ({ page }) => {
  79  |     await page.goto('http://localhost:3456/setup');
  80  |     await page.waitForTimeout(3000);
  81  | 
  82  |     const progressRing = page.locator('text=/\\d+%/');
  83  |     const isVisible = await progressRing.isVisible().catch(() => false);
  84  | 
  85  |     if (isVisible) {
  86  |       const progressText = await progressRing.textContent();
  87  |       const progressMatch = progressText?.match(/(\d+)/);
  88  |       if (progressMatch) {
  89  |         const progress = parseInt(progressMatch[1], 10);
  90  |         expect(progress).toBeGreaterThanOrEqual(0);
  91  |         expect(progress).toBeLessThanOrEqual(100);
  92  |       }
  93  |     }
  94  |   });
  95  | });
  96  | 
  97  | test.describe('Status Dashboard', () => {
  98  |   test('displays progress ring with percentage', async ({ page }) => {
  99  |     await page.goto('http://localhost:3456/setup');
  100 |     await page.waitForTimeout(3000);
  101 | 
  102 |     // Look for SVG progress ring
  103 |     const progressRing = page.locator('svg circle').first();
  104 |     const isVisible = await progressRing.isVisible().catch(() => false);
  105 | 
```