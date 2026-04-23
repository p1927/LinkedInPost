# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend/tests/e2e/setup-flow.spec.ts >> Dry Run Mode >> status dashboard shows all sections
- Location: frontend/tests/e2e/setup-flow.spec.ts:255:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3456/setup
Call log:
  - navigating to "http://localhost:3456/setup", waiting until "load"

```

# Test source

```ts
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
  215 | 
  216 |       // Click Clear Cache - should not actually clear
  217 |       const clearCacheBtn = page.locator('text=Clear Cache').first();
  218 |       if (await clearCacheBtn.isVisible()) {
  219 |         await clearCacheBtn.click();
  220 |       }
  221 | 
  222 |       // Click Regenerate Features - should not actually regenerate
  223 |       const regenBtn = page.locator('text=Regenerate Features').first();
  224 |       if (await regenBtn.isVisible()) {
  225 |         await regenBtn.click();
  226 |       }
  227 |     }
  228 | 
  229 |     // Verify UI still responsive after clicking all actions
  230 |     await expect(progress).toBeVisible();
  231 |   });
  232 | 
  233 |   test('quick actions are clickable without errors', async ({ page }) => {
  234 |     await page.goto('http://localhost:3456/setup');
  235 |     await page.waitForTimeout(3000);
  236 | 
  237 |     // Expand each status card
  238 |     const envCard = page.locator('text=Environment Variables').first();
  239 |     if (await envCard.isVisible()) {
  240 |       await envCard.click();
  241 |       await page.waitForTimeout(500);
  242 |     }
  243 | 
  244 |     const intCard = page.locator('text=Integrations').first();
  245 |     if (await intCard.isVisible()) {
  246 |       await intCard.click();
  247 |       await page.waitForTimeout(500);
  248 |     }
  249 | 
  250 |     // Verify UI still responsive
  251 |     const progress = page.locator('text=/\\d+%/');
  252 |     await expect(progress).toBeVisible({ timeout: 5000 });
  253 |   });
  254 | 
  255 |   test('status dashboard shows all sections', async ({ page }) => {
> 256 |     await page.goto('http://localhost:3456/setup');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3456/setup
  257 |     await page.waitForTimeout(3000);
  258 | 
  259 |     // Check for all main sections
  260 |     await expect(page.locator('text=Environment Variables').first()).toBeVisible({ timeout: 5000 });
  261 |     await expect(page.locator('text=Integrations').first()).toBeVisible({ timeout: 5000 });
  262 |     await expect(page.locator('text=Workers').first()).toBeVisible({ timeout: 5000 });
  263 |     await expect(page.locator('text=Quick Actions').first()).toBeVisible({ timeout: 5000 });
  264 |   });
  265 | 
  266 |   test('can navigate between steps', async ({ page }) => {
  267 |     await page.goto('http://localhost:3456/setup');
  268 |     await page.waitForTimeout(2000);
  269 | 
  270 |     // Go through the welcome -> directory -> progress -> integrations -> envvars flow
  271 |     const getStarted = page.getByRole('button', { name: /get started/i });
  272 |     if (await getStarted.isVisible().catch(() => false)) {
  273 |       await getStarted.click();
  274 |       await page.waitForTimeout(1000);
  275 |     }
  276 | 
  277 |     // Verify navigation worked (we're now past welcome or on status dashboard)
  278 |     const progressOrStatus = page.locator('text=Setting up your environment').or(
  279 |       page.locator('text=Environment Variables').or(
  280 |         page.locator('text=Setup Complete')
  281 |       )
  282 |     );
  283 |     await expect(progressOrStatus.first()).toBeVisible({ timeout: 10000 });
  284 |   });
  285 | 
  286 |   test('action buttons trigger handlers without crashing', async ({ page }) => {
  287 |     await page.goto('http://localhost:3456/setup');
  288 |     await page.waitForTimeout(3000);
  289 | 
  290 |     // Look for action buttons in status dashboard
  291 |     const completeSetupBtn = page.getByRole('button', { name: /complete setup/i });
  292 |     const connectIntBtn = page.getByRole('button', { name: /connect integrations/i });
  293 | 
  294 |     // Click each if visible
  295 |     for (const btn of [completeSetupBtn, connectIntBtn]) {
  296 |       if (await btn.isVisible().catch(() => false)) {
  297 |         await btn.click();
  298 |         await page.waitForTimeout(500);
  299 |       }
  300 |     }
  301 | 
  302 |     // UI should still be responsive
  303 |     const spinnerOrContent = page.locator('.animate-spin, text=Welcome').first();
  304 |     await expect(spinnerOrContent).toBeVisible({ timeout: 3000 });
  305 |   });
  306 | });
  307 | 
```