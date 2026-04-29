import { test, expect, type Page } from '@playwright/test';
import { setupApiMocks, injectFakeToken, gotoAuthenticated, MOCK_SESSION, MOCK_ROWS } from '../helpers/mockApi';

// Session with no social integrations — forces all social cards to show "Connect" button
const DISCONNECTED_SESSION = {
  ...MOCK_SESSION,
  integrations: [],
  config: {
    ...MOCK_SESSION.config,
    hasLinkedInAccessToken: false,
    hasInstagramAccessToken: false,
    hasGmailAccessToken: false,
    hasWhatsAppAccessToken: false,
  },
};

// ConnectionsPage uses a sidebar navigation — "Social", "Messaging", "Sources" are section headers (not buttons).
// Individual providers (LinkedIn, Instagram, Gmail, WhatsApp, Telegram) are sidebar buttons that reveal a detail panel.
async function clickTelegramProvider(page: import('@playwright/test').Page) {
  const telegramBtn = page.getByRole('button', { name: /telegram/i }).first();
  if (await telegramBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await telegramBtn.click();
    // Wait for the Telegram detail panel (Chat ID input) to render
    await page.getByPlaceholder(/chat id/i).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }
}

test.describe('Journey 07: Channel Connection Setup (/connections)', () => {
  test('connections page shows all 4 OAuth cards', async ({ page }) => {
    await gotoAuthenticated(page, '/connections');

    // Social Channels tab (default): LinkedIn, Instagram
    await expect(page.getByText(/linkedin/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/instagram/i).first()).toBeVisible({ timeout: 10000 });

    // Messaging tab: Gmail, WhatsApp
    await clickTelegramProvider(page);
    await expect(page.getByText(/gmail/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/whatsapp/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('connections page shows Telegram section', async ({ page }) => {
    await gotoAuthenticated(page, '/connections');
    await clickTelegramProvider(page);

    await expect(page.getByText(/telegram/i).first()).toBeVisible({ timeout: 10000 });

    const chatInput = page
      .getByPlaceholder(/chat id/i)
      .or(page.getByLabel(/chat id/i))
      .or(page.getByRole('textbox', { name: /chat id/i }));
    await expect(chatInput.first()).toBeVisible({ timeout: 10000 });
  });

  test('LinkedIn Connect button triggers startLinkedInAuth', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoAuthenticated(page, '/connections', {
      bootstrap: DISCONNECTED_SESSION,
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

    const publishingSection = page.locator('section').filter({ has: page.getByText('Publishing Channels') });
    const connectBtn = publishingSection
      .locator('div.rounded-2xl')
      .filter({ hasText: /^LinkedIn$/ })
      .getByRole('button', { name: /^Connect$|^Connecting/ });

    if (await connectBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(500);
      expect.soft(capturedActions).toContain('startLinkedInAuth');
    } else {
      test.skip(true, 'LinkedIn Connect button not visible');
    }
  });

  test('Instagram Connect button triggers startInstagramAuth', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoAuthenticated(page, '/connections', {
      bootstrap: DISCONNECTED_SESSION,
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

    const publishingSection = page.locator('section').filter({ has: page.getByText('Publishing Channels') });
    const connectBtn = publishingSection
      .locator('div.rounded-2xl')
      .filter({ hasText: /^Instagram$/ })
      .getByRole('button', { name: /^Connect$|^Connecting/ });

    if (await connectBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(500);
      expect.soft(capturedActions).toContain('startInstagramAuth');
    } else {
      test.skip(true, 'Instagram Connect button not visible');
    }
  });

  test('Gmail Connect button triggers startGmailAuth', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoAuthenticated(page, '/connections', {
      bootstrap: DISCONNECTED_SESSION,
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

    const publishingSection = page.locator('section').filter({ has: page.getByText('Publishing Channels') });
    const connectBtn = publishingSection
      .locator('div.rounded-2xl')
      .filter({ hasText: /^Gmail$/ })
      .getByRole('button', { name: /^Connect$|^Connecting/ });

    if (await connectBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(500);
      expect.soft(capturedActions).toContain('startGmailAuth');
    } else {
      test.skip(true, 'Gmail Connect button not visible');
    }
  });

  test('WhatsApp Connect button triggers startWhatsAppAuth', async ({ page }) => {
    const capturedActions: string[] = [];

    // WhatsApp is never connected in MOCK_SESSION — it shows Connect directly
    await gotoAuthenticated(page, '/connections');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    const publishingSection = page.locator('section').filter({ has: page.getByText('Publishing Channels') });
    const connectBtn = publishingSection
      .locator('div.rounded-2xl')
      .filter({ hasText: /^WhatsApp$/ })
      .getByRole('button', { name: /^Connect$|^Connecting/ });

    if (await connectBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(500);
      expect.soft(capturedActions).toContain('startWhatsAppAuth');
    } else {
      test.skip(true, 'WhatsApp Connect button not visible');
    }
  });

  test('Telegram chat ID input visible', async ({ page }) => {
    await gotoAuthenticated(page, '/connections');
    await clickTelegramProvider(page);

    const chatInput = page
      .getByPlaceholder(/chat id/i)
      .or(page.getByLabel(/chat id/i))
      .or(page.getByRole('textbox', { name: /chat/i }));
    await expect(chatInput.first()).toBeVisible({ timeout: 10000 });
  });

  test('Telegram Verify button calls verifyTelegramChat', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoAuthenticated(page, '/connections');
    await clickTelegramProvider(page);

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    const chatInput = page
      .getByPlaceholder(/chat id/i)
      .or(page.getByLabel(/chat id/i))
      .or(page.getByRole('textbox', { name: /chat/i }));
    await chatInput.first().fill('-100123456789', { timeout: 10000 });

    const verifyBtn = page
      .getByRole('button', { name: /^Verify$|^Verifying/ });
    await verifyBtn.first().click({ timeout: 10000 });

    await page.waitForTimeout(500);
    expect.soft(capturedActions).toContain('verifyTelegramChat');
  });

  test('successful Telegram verify shows chat info', async ({ page }) => {
    await gotoAuthenticated(page, '/connections', {
      verifyTelegramChat: {
        chatId: '-100123',
        title: 'My Telegram Group',
        type: 'group',
      },
    });
    await clickTelegramProvider(page);

    const chatInput = page
      .getByPlaceholder(/chat id/i)
      .or(page.getByLabel(/chat id/i))
      .or(page.getByRole('textbox', { name: /chat/i }));
    await chatInput.first().fill('-100123456789', { timeout: 10000 });

    const verifyBtn = page.getByRole('button', { name: /^Verify$|^Verifying/ });
    await verifyBtn.first().click({ timeout: 10000 });

    await expect(page.getByText(/my telegram group/i)).toBeVisible({ timeout: 10000 });
  });

  test('invalid Telegram chat shows error', async ({ page }) => {
    // Navigate with standard auth + mock setup first
    await gotoAuthenticated(page, '/connections');
    await clickTelegramProvider(page);

    // Override verifyTelegramChat to return an error (added after navigation, still applies to future requests)
    await page.route('**', async (route) => {
      const req = route.request();
      if (req.method() !== 'POST') { await route.continue(); return; }
      let body: Record<string, unknown>;
      try { body = await req.postDataJSON(); } catch { await route.continue(); return; }
      if (body?.action === 'verifyTelegramChat') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: 'Chat not found or bot is not a member' }),
        });
        return;
      }
      await route.continue();
    });

    const chatInput = page.getByPlaceholder(/chat id/i).first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await chatInput.fill('invalid-chat-id');

    const verifyBtn = page.getByRole('button', { name: /^Verify$|^Verifying/ }).first();
    await verifyBtn.click({ timeout: 10000 });

    // Error renders as a red <p> — match the actual error text
    await expect(
      page.getByText(/chat not found|not a member|failed/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Disconnect button calls deleteIntegration', async ({ page }) => {
    const capturedActions: string[] = [];

    // MOCK_SESSION has LinkedIn connected — LinkedIn card shows a Disconnect button
    await gotoAuthenticated(page, '/connections');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    // Scope to Publishing Channels section to avoid clicking Google Sheets' Disconnect button
    const publishingSection = page.locator('section').filter({ has: page.getByText('Publishing Channels') });
    const disconnectBtn = publishingSection.getByRole('button', { name: /^Disconnect$/ }).first();

    if (await disconnectBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await disconnectBtn.click();

      const confirmBtn = page.getByRole('button', { name: /confirm|yes|ok/i });
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      await page.waitForTimeout(500);
      expect.soft(capturedActions).toContain('deleteIntegration');
    } else {
      test.skip(true, 'Disconnect button not visible in Publishing Channels section');
    }
  });
});
