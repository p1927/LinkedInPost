/**
 * Self-hosted happy path: same flow as SaaS but with `selfHosted` chosen.
 * Asserts the deployment-mode call goes out with `mode: 'selfHosted'`.
 */

import { test, expect } from '@playwright/test';
import { setupSetupApiMocks, findCall } from '../helpers/mockSetupApi';

const WIZARD = '/setup-wizard.html';

test('self-hosted flow: pick selfHosted, get started, captures correct mode payload', async ({ page }) => {
  const mocks = await setupSetupApiMocks(page);
  await page.goto(WIZARD);

  const selfHostedRadio = page.locator('input[type="radio"][value="selfHosted"]');
  await expect(selfHostedRadio).toBeVisible({ timeout: 10000 });
  await selfHostedRadio.check();
  await page.getByRole('button', { name: /continue/i }).click();

  // Welcome step renders
  await expect(page.getByRole('button', { name: /get started/i })).toBeVisible({ timeout: 5000 });

  const modeCall = findCall(mocks.calls, 'deployment-mode', 'POST');
  expect(modeCall?.body?.mode).toBe('selfHosted');
});
