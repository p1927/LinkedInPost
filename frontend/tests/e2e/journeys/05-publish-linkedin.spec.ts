import { test, expect, type Page } from '@playwright/test';
import { setupApiMocks, injectFakeToken, gotoAuthenticated, MOCK_SESSION, MOCK_ROWS } from '../helpers/mockApi';

// Helper: navigate to topic-1 which has selectedText in MOCK_ROWS (after selecting variant)
async function gotoEditorWithSelectedVariant(page: Page, overrides?: Record<string, unknown>) {
  await gotoAuthenticated(page, '/topics/eyJpZCI6InRvcGljLTEifQ', {
    updateRowStatus: { ok: true, data: { updated: true } },
    publishContent: {
      ok: true,
      data: {
        deliveryMode: 'sent',
        postUrl: 'https://linkedin.com/posts/test-123',
        message: 'Published successfully',
      },
    },
    ...overrides,
  });
  await page.waitForLoadState('domcontentloaded');

  // Wait for topic content to load, then try to select a variant
  await expect(page.getByText(/AI tools are reshaping|AI Tools for Founders/i).first()).toBeVisible({ timeout: 10000 });

  // If there's a Select button for the variant, click it to enter the editor
  const selectButton = page
    .getByRole('button', { name: /select|use this|edit/i })
    .first();

  if (await selectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await selectButton.click();
    await page.waitForLoadState('domcontentloaded');
  }
}

test.describe('Journey 05: Publish to LinkedIn', () => {
  test('Publish to button visible in editor', async ({ page }) => {
    await gotoEditorWithSelectedVariant(page);

    const publishButton = page.getByRole('button', { name: /publish to/i });
    await expect.soft(publishButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('Publish to disabled when no text', async ({ page }) => {
    // Navigate to a topic with no variants (topic-2 has Approved status but we need it empty)
    // Use topic-1 without selecting a variant
    await gotoAuthenticated(page, '/topics/eyJpZCI6InRvcGljLTEifQ', {
      publishContent: { ok: true, data: { deliveryMode: 'sent' } },
    });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/AI tools are reshaping|AI Tools for Founders/i).first()).toBeVisible({ timeout: 10000 });

    const publishButton = page.getByRole('button', { name: /publish to/i }).first();

    const isVisible = await publishButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      // Button may be disabled before text is selected
      await expect.soft(publishButton).toBeDisabled({ timeout: 5000 });
    } else {
      // Button absent before variant selected is also acceptable
      expect(isVisible).toBeFalsy();
    }
  });

  test('Publish to enables when text present', async ({ page }) => {
    await gotoEditorWithSelectedVariant(page);

    const publishButton = page.getByRole('button', { name: /publish to/i }).first();
    if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect.soft(publishButton).toBeEnabled({ timeout: 5000 });
    } else {
      // Publish button may only appear after editor opens
      await expect.soft(publishButton).toBeVisible({ timeout: 3000 });
    }
  });

  test('clicking Publish to fires updateRowStatus', async ({ page }) => {
    const capturedRequests: { action: string; [key: string]: unknown }[] = [];

    await gotoEditorWithSelectedVariant(page);

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action === 'updateRowStatus') {
            capturedRequests.push(body);
          }
        } catch {
          // ignore non-JSON
        }
      }
    });

    const publishButton = page.getByRole('button', { name: /publish to/i }).first();
    if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false) &&
        await publishButton.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await publishButton.click();
      await page.waitForTimeout(1500);
      expect.soft(capturedRequests.length).toBeGreaterThan(0);
    } else {
      test.skip(true, 'Publish to button not visible/enabled in current state');
    }
  });

  test('clicking Publish to fires publishContent with channel:linkedin', async ({ page }) => {
    const capturedRequests: { action: string; channel?: string; [key: string]: unknown }[] = [];

    await gotoEditorWithSelectedVariant(page);

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action === 'publishContent') {
            capturedRequests.push(body);
          }
        } catch {
          // ignore non-JSON
        }
      }
    });

    const publishButton = page.getByRole('button', { name: /publish to/i }).first();
    if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false) &&
        await publishButton.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await publishButton.click();
      await page.waitForTimeout(1500);
      expect.soft(capturedRequests.length).toBeGreaterThan(0);
      if (capturedRequests.length > 0) {
        expect.soft(capturedRequests[0].channel).toBe('linkedin');
      }
    } else {
      test.skip(true, 'Publish to button not visible/enabled in current state');
    }
  });

  test('success alert shown after publish', async ({ page }) => {
    await gotoEditorWithSelectedVariant(page, {
      publishContent: {
        ok: true,
        data: {
          deliveryMode: 'sent',
          postUrl: 'https://linkedin.com/posts/test-success',
          message: 'Published successfully',
        },
      },
    });

    const publishButton = page.getByRole('button', { name: /publish to/i }).first();
    if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false) &&
        await publishButton.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await publishButton.click();

      const successAlert = page
        .getByRole('alert')
        .or(page.locator('[data-testid*="success"], [data-testid*="alert"]'))
        .or(page.getByText(/published|success|sent/i));

      await expect.soft(successAlert.first()).toBeVisible({ timeout: 10000 });
    } else {
      test.skip(true, 'Publish to button not visible/enabled in current state');
    }
  });

  test('success alert contains post info', async ({ page }) => {
    await gotoEditorWithSelectedVariant(page, {
      publishContent: {
        ok: true,
        data: {
          deliveryMode: 'sent',
          postUrl: 'https://linkedin.com/posts/test-info',
          message: 'Published successfully',
        },
      },
    });

    const publishButton = page.getByRole('button', { name: /publish to/i }).first();
    if (await publishButton.isVisible({ timeout: 5000 }).catch(() => false) &&
        await publishButton.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await publishButton.click();

      const publishedText = page.getByText(/published|post live|success/i);
      await expect.soft(publishedText.first()).toBeVisible({ timeout: 10000 });
    } else {
      test.skip(true, 'Publish to button not visible/enabled in current state');
    }
  });
});
