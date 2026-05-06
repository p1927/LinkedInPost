/**
 * STT step: covered separately because it has its own endpoints (/stt/config,
 * /stt/status, /stt/disable, /stt/download) and a download-progress UX.
 *
 * Uses page.evaluate to fetch from the page context — page.request bypasses
 * page.route() interception in Playwright, so direct API tests must run
 * inside the page context.
 */

import { test, expect } from '@playwright/test';
import { setupSetupApiMocks, findCall } from '../helpers/mockSetupApi';

const WIZARD = '/setup-wizard.html';

async function fetchInPage(page: any, url: string, init?: RequestInit) {
  return page.evaluate(async ({ u, opts }: any) => {
    const r = await fetch(u, opts);
    return { status: r.status, body: await r.json().catch(() => ({})) };
  }, { u: url, opts: init });
}

test.describe('STT step (mocked endpoints)', () => {
  test('stt/config returns mocked defaults', async ({ page }) => {
    await setupSetupApiMocks(page, {
      sttConfig: { enabled: false, model: 'small.en', shortcut: 'Mod+Alt+M' },
    });
    await page.goto(WIZARD);
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    const { status, body } = await fetchInPage(page, 'http://localhost:3456/api/setup/stt/config');
    expect(status).toBe(200);
    expect(body.enabled).toBe(false);
    expect(body.model).toBe('small.en');
  });

  test('stt/disable can be invoked via direct request', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.goto(WIZARD);
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    const { status, body } = await fetchInPage(page, 'http://localhost:3456/api/setup/stt/disable', { method: 'POST' });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(findCall(mocks.calls, 'stt/disable', 'POST')).toBeDefined();
  });

  test('stt/status reflects in-progress download', async ({ page }) => {
    await setupSetupApiMocks(page, {
      sttStatus: { inProgress: true, downloaded: 50 * 1024 * 1024, total: 100 * 1024 * 1024, done: false },
    });
    await page.goto(WIZARD);
    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    const { body } = await fetchInPage(page, 'http://localhost:3456/api/setup/stt/status');
    expect(body.inProgress).toBe(true);
    expect(body.done).toBe(false);
    expect(body.downloaded).toBe(50 * 1024 * 1024);
  });
});
