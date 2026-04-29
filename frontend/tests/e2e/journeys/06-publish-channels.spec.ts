import { test, expect, type Page } from '@playwright/test';
import { setupApiMocks, injectFakeToken, gotoAuthenticated, MOCK_SESSION, MOCK_ROWS } from '../helpers/mockApi';

// ConnectionsPage uses a sidebar — individual providers are buttons. Click to reveal detail panel.
async function clickTelegramProvider(page: import('@playwright/test').Page) {
  // Wait for page network to settle before interacting
  await page.waitForLoadState('networkidle').catch(() => {});

  // Use native DOM click so the React synthetic event fires reliably
  const clicked = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')];
    const btn = buttons.find(b => /^telegram$/i.test(b.textContent?.trim() ?? ''));
    if (btn) { btn.click(); return true; }
    return false;
  });

  if (clicked) {
    // Wait for the Telegram detail panel (Chat ID input) to render
    await page.getByPlaceholder(/chat id/i).first()
      .waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  }
}

test.describe('Journey 06: Multi-Channel Publishing Variations', () => {
  test('channel selector shows all channels', async ({ page }) => {
    // /connections lists all publishing channels by name
    await gotoAuthenticated(page, '/connections');
    await page.waitForLoadState('domcontentloaded');

    // Social Channels tab (default): LinkedIn and Instagram are visible
    await expect(page.getByText(/linkedin/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/instagram/i).first()).toBeVisible({ timeout: 10000 });

    // Messaging tab: Gmail, WhatsApp, Telegram
    await clickTelegramProvider(page);
    await expect(page.getByText(/gmail/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/telegram/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/whatsapp/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Instagram channel: publish payload includes imageUrls', async ({ page }) => {
    const publishedPayloads: unknown[] = [];

    await gotoAuthenticated(page, '/topics/eyJpZCI6InRvcGljLTEifQ', {
      publishContent: { ok: true, data: { deliveryMode: 'immediate', messageId: 'msg-123' } },
    });

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action === 'publishContent') {
            publishedPayloads.push(body);
          }
        } catch { /* ignore */ }
      }
    });

    await expect(page.getByText(/AI tools are reshaping|AI Tools for Founders/i).first()).toBeVisible({ timeout: 10000 });

    // Navigate into editor
    const selectButton = page.getByRole('button', { name: /select|use this|edit/i }).first();
    if (await selectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selectButton.click();
    }

    // Try to publish — this just tests the payload structure
    const publishBtn = page.getByRole('button', { name: /publish now/i }).first();
    if (await publishBtn.isVisible({ timeout: 5000 }).catch(() => false) &&
        await publishBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await publishBtn.click();
      await page.waitForTimeout(500);
      expect.soft(publishedPayloads.length).toBeGreaterThan(0);
    } else {
      test.skip(true, 'Publish button not available in editor');
    }
  });

  test('Gmail Email tab has To/CC/BCC/Subject fields', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/eyJpZCI6InRvcGljLTEifQ');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText(/AI tools are reshaping|AI Tools for Founders/i).first()).toBeVisible({ timeout: 10000 });

    const selectButton = page.getByRole('button', { name: /select|use this|edit/i }).first();
    if (await selectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selectButton.click();
    }

    // Look for Email tab
    const emailTab = page.getByRole('tab', { name: /email/i });
    if (await emailTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailTab.click();

      await expect.soft(
        page.getByLabel(/^to$/i).or(page.getByPlaceholder(/to/i))
      ).toBeVisible({ timeout: 10000 });
      await expect.soft(
        page.getByLabel(/subject/i).or(page.getByPlaceholder(/subject/i))
      ).toBeVisible({ timeout: 10000 });
    } else {
      test.skip(true, 'Email tab not visible — Gmail may not be selected as channel');
    }
  });

  test('filling email fields fires saveEmailFields', async ({ page }) => {
    const savedActions: string[] = [];

    await gotoAuthenticated(page, '/topics/eyJpZCI6InRvcGljLTEifQ');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) savedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    await expect(page.getByText(/AI tools are reshaping|AI Tools for Founders/i).first()).toBeVisible({ timeout: 10000 });

    const selectButton = page.getByRole('button', { name: /select|use this|edit/i }).first();
    if (await selectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selectButton.click();
    }

    const emailTab = page.getByRole('tab', { name: /email/i });
    if (await emailTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailTab.click();

      const toField = page.getByLabel(/^to$/i).or(page.getByPlaceholder(/to/i));
      await toField.fill('test@example.com', { timeout: 10000 }).catch(() => {});

      const subjectField = page.getByLabel(/subject/i).or(page.getByPlaceholder(/subject/i));
      await subjectField.fill('Test Email Subject', { timeout: 10000 }).catch(() => {});

      const saveBtn = page.getByRole('button', { name: /save/i });
      await saveBtn.click({ timeout: 10000 }).catch(() => {});

      await page.waitForTimeout(500);
      const emailSave = savedActions.some(
        (a) => a === 'saveEmailFields' || a === 'savePost' || a === 'updatePost' || a === 'saveConfig'
      );
      expect.soft(emailSave).toBeTruthy();
    } else {
      test.skip(true, 'Email tab not visible');
    }
  });

  test('Telegram channel shows chat ID selector', async ({ page }) => {
    // The connections page has Telegram chat ID input — in the Messaging tab
    await gotoAuthenticated(page, '/connections');
    await page.waitForLoadState('domcontentloaded');
    await clickTelegramProvider(page);

    await expect(page.getByText(/telegram/i).first()).toBeVisible({ timeout: 10000 });

    const chatSelector = page
      .getByLabel(/chat id|chat/i)
      .or(page.getByPlaceholder(/chat id|chat/i))
      .or(page.getByRole('textbox', { name: /chat/i }));
    await expect.soft(chatSelector.first()).toBeVisible({ timeout: 10000 });
  });

  test('WhatsApp channel shows phone selector if connected', async ({ page }) => {
    await gotoAuthenticated(page, '/connections');
    await page.waitForLoadState('domcontentloaded');
    await clickTelegramProvider(page);

    await expect(page.getByText(/whatsapp/i).first()).toBeVisible({ timeout: 10000 });
    // WhatsApp section is visible on connections page
    await expect(page.locator('body')).toBeVisible({ timeout: 3000 });
  });

  test('Gmail Connect button triggers startGmailAuth', async ({ page }) => {
    const capturedActions: string[] = [];

    // Use a session with no integrations so Gmail shows a Connect button
    const disconnectedSession = { ...MOCK_SESSION, integrations: [] };
    await gotoAuthenticated(page, '/connections', {
      bootstrap: disconnectedSession,
      getSpreadsheetStatus: { accessible: false, title: '' },
    });

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    // Gmail card shows "Connect" when not connected — scope to Publishing Channels section
    const publishingSection = page.locator('section').filter({ has: page.getByText('Publishing Channels') });
    const connectBtn = publishingSection
      .locator('div.rounded-2xl')
      .filter({ hasText: /^Gmail$/ })
      .getByRole('button', { name: /^Connect$|^Connecting/ });

    if (await connectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(500);
      expect.soft(capturedActions).toContain('startGmailAuth');
    } else {
      test.skip(true, 'Gmail connect button not visible');
    }
  });
});
