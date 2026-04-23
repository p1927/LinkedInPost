# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend/tests/e2e/setup-flow.spec.ts >> Status Dashboard >> shows action buttons for incomplete items
- Location: frontend/tests/e2e/setup-flow.spec.ts:113:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3456/setup
Call log:
  - navigating to "http://localhost:3456/setup", waiting until "load"

```

# Test source

```ts
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
  106 |     if (isVisible) {
  107 |       // Progress percentage should be displayed
  108 |       const percentage = page.locator('text=/\\d+%/');
  109 |       await expect(percentage).toBeVisible({ timeout: 3000 }).catch(() => {});
  110 |     }
  111 |   });
  112 | 
  113 |   test('shows action buttons for incomplete items', async ({ page }) => {
> 114 |     await page.goto('http://localhost:3456/setup');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3456/setup
  115 |     await page.waitForTimeout(3000);
  116 | 
  117 |     // Look for action buttons (Complete Setup, Connect Integrations)
  118 |     const completeButton = page.getByRole('button', { name: /complete setup/i }).or(
  119 |       page.getByRole('button', { name: /connect integrations/i })
  120 |     );
  121 | 
  122 |     const buttonVisible = await completeButton.isVisible().catch(() => false);
  123 |     if (buttonVisible) {
  124 |       await expect(completeButton).toBeVisible();
  125 |     }
  126 |   });
  127 | 
  128 |   test('shows missing items summary', async ({ page }) => {
  129 |     await page.goto('http://localhost:3456/setup');
  130 |     await page.waitForTimeout(3000);
  131 | 
  132 |     // Look for Action Required section or missing items list
  133 |     const actionRequired = page.locator('text=Action Required').or(
  134 |       page.locator('text=Set VITE_')
  135 |     );
  136 | 
  137 |     const isVisible = await actionRequired.isVisible().catch(() => false);
  138 |     // This is optional - setup may already be complete
  139 |     if (isVisible) {
  140 |       await expect(actionRequired.first()).toBeVisible();
  141 |     }
  142 |   });
  143 | });
  144 | 
  145 | test.describe('Setup Wizard Navigation', () => {
  146 |   test('can proceed from welcome to directory selection', async ({ page }) => {
  147 |     const getStarted = page.getByRole('button', { name: /get started/i });
  148 |     await getStarted.click();
  149 | 
  150 |     await expect(page.locator('text=Select your project directory')).toBeVisible({ timeout: 5000 });
  151 |   });
  152 | 
  153 |   test('can go back from directory to welcome', async ({ page }) => {
  154 |     const getStarted = page.getByRole('button', { name: /get started/i });
  155 |     await getStarted.click();
  156 | 
  157 |     await page.waitForTimeout(500);
  158 | 
  159 |     const backButton = page.getByRole('button', { name: /back/i });
  160 |     if (await backButton.isVisible().catch(() => false)) {
  161 |       await backButton.click();
  162 |       await expect(page.locator('text=Welcome to LinkedIn Post')).toBeVisible({ timeout: 3000 });
  163 |     }
  164 |   });
  165 | 
  166 |   test('shows integrations step after clicking through', async ({ page }) => {
  167 |     const getStarted = page.getByRole('button', { name: /get started/i });
  168 |     await getStarted.click();
  169 | 
  170 |     await page.waitForTimeout(500);
  171 | 
  172 |     // Click Next/Continue to proceed
  173 |     const nextButton = page.getByRole('button', { name: /next|continue/i }).first();
  174 |     if (await nextButton.isVisible().catch(() => false)) {
  175 |       await nextButton.click();
  176 |       // Should proceed to next step
  177 |     }
  178 |   });
  179 | });
  180 | 
  181 | test.describe('Database Cleanup (UI)', () => {
  182 |   test('shows database section in settings', async ({ page }) => {
  183 |     await page.goto('http://localhost:3456/setup');
  184 |     await page.waitForTimeout(2000);
  185 | 
  186 |     const dbSection = page.locator('text=/database|reset|cleanup/i');
  187 |     const isVisible = await dbSection.isVisible().catch(() => false);
  188 | 
  189 |     if (isVisible) {
  190 |       await expect(dbSection.first()).toBeVisible();
  191 |     }
  192 |   });
  193 | });
  194 | 
  195 | test.describe('Dry Run Mode', () => {
  196 |   test('setup wizard runs in dry run mode', async ({ page }) => {
  197 |     await page.goto('http://localhost:3456/setup');
  198 |     await page.waitForTimeout(2000);
  199 | 
  200 |     // Navigate to status dashboard if exists
  201 |     const progress = page.locator('text=/\\d+%/');
  202 |     await expect(progress).toBeVisible({ timeout: 10000 });
  203 | 
  204 |     // Find Quick Actions section
  205 |     const quickActions = page.locator('text=Quick Actions');
  206 |     const hasQuickActions = await quickActions.isVisible().catch(() => false);
  207 | 
  208 |     if (hasQuickActions) {
  209 |       // Click Reset Database - should not actually delete
  210 |       const resetDbBtn = page.locator('text=Reset Database').first();
  211 |       if (await resetDbBtn.isVisible()) {
  212 |         await resetDbBtn.click();
  213 |         // Should see DRY RUN message in console (verified manually)
  214 |       }
```