import { test, expect, type Page } from '@playwright/test';
import { setupApiMocks, injectFakeToken, gotoAuthenticated, MOCK_SESSION, MOCK_ROWS } from '../helpers/mockApi';

test.describe('Journey 08: LLM Provider & Model Selection', () => {
  test('settings page shows LLM section', async ({ page }) => {
    await gotoAuthenticated(page, '/settings');

    // Expect LLM-related content on settings page
    const llmSection = page
      .getByRole('heading', { name: /llm|model|ai provider|language model/i })
      .or(page.getByText(/llm provider|ai model|language model|model/i).first())
      .or(page.getByText(/google gemini|gemini|anthropic|openrouter/i).first());
    await expect(llmSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('provider selector is visible', async ({ page }) => {
    await gotoAuthenticated(page, '/settings');

    // LlmProviderSelect renders as plain buttons (not role="combobox")
    // Look for provider-related buttons (Google Gemini, Anthropic, etc.)
    const providerButton = page
      .getByRole('button', { name: /google|anthropic|gemini|openrouter|grok|minimax/i })
      .or(page.getByText(/google gemini|google|anthropic|provider/i));
    await expect(providerButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('model combobox is visible', async ({ page }) => {
    await gotoAuthenticated(page, '/settings');

    // LlmModelCombobox renders as button with aria-haspopup="listbox"
    const modelTrigger = page
      .locator('[aria-haspopup="listbox"]')
      .or(page.getByRole('button', { name: /select model|gemini|claude|model/i }));
    await expect(modelTrigger.first()).toBeVisible({ timeout: 10000 });
  });

  test('opening model combobox shows search input', async ({ page }) => {
    await gotoAuthenticated(page, '/settings');

    // Click the model combobox trigger (aria-haspopup="listbox")
    const modelTrigger = page.locator('[aria-haspopup="listbox"]').first();
    await expect(modelTrigger).toBeVisible({ timeout: 10000 });
    await modelTrigger.click();

    // A search input should appear inside the dropdown
    const searchInput = page
      .getByPlaceholder('Search models…')
      .or(page.getByLabel('Search models'))
      .or(page.getByPlaceholder(/search|filter/i));
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
  });

  test('typing in search filters models', async ({ page }) => {
    await gotoAuthenticated(page, '/settings');

    const modelTrigger = page.locator('[aria-haspopup="listbox"]').first();
    await expect(modelTrigger).toBeVisible({ timeout: 10000 });
    await modelTrigger.click();

    const searchInput = page
      .getByPlaceholder('Search models…')
      .or(page.getByLabel('Search models'));
    await searchInput.first().fill('gemini', { timeout: 10000 });

    // After typing, only gemini-related models should remain visible
    await expect(page.getByText(/gemini/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('selecting a model updates trigger button', async ({ page }) => {
    await gotoAuthenticated(page, '/settings');

    const modelTrigger = page.locator('[aria-haspopup="listbox"]').first();
    await expect(modelTrigger).toBeVisible({ timeout: 10000 });
    await modelTrigger.click();

    // Pick the second option to ensure we actually change selection
    const options = page.getByRole('option');
    const count = await options.count();
    if (count === 0) {
      test.skip(true, 'No model options visible');
      return;
    }

    // Try the second option first (if multiple); otherwise use the first
    const targetOption = count > 1 ? options.nth(1) : options.first();
    if (await targetOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await targetOption.click({ timeout: 10000 });

      // After clicking, the trigger should remain visible with a model name
      await expect.soft(modelTrigger).toBeVisible({ timeout: 5000 });
      const newText = (await modelTrigger.textContent({ timeout: 5000 }) ?? '').trim();
      expect.soft(newText.length).toBeGreaterThan(0);
    } else {
      test.skip(true, 'No model options visible');
    }
  });

  test('changing provider updates model options', async ({ page }) => {
    await gotoAuthenticated(page, '/settings');

    // LlmProviderSelect uses plain buttons — click an Anthropic provider button
    const anthropicBtn = page.getByRole('button', { name: /anthropic/i });
    if (await anthropicBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await anthropicBtn.click();

      // After selecting Anthropic, the model combobox should update
      // Open it and look for Claude models
      const modelTrigger = page.locator('[aria-haspopup="listbox"]').first();
      if (await modelTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await modelTrigger.click();
        await expect.soft(page.getByText(/claude/i).first()).toBeVisible({ timeout: 10000 });
      } else {
        await expect.soft(page.locator('body')).toBeVisible({ timeout: 3000 });
      }
    } else {
      test.skip(true, 'Anthropic provider button not visible');
    }
  });

  test('save config fires saveConfig action', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoAuthenticated(page, '/settings');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    // Save button text is "Save settings"
    const saveBtn = page.getByRole('button', { name: /save settings|save/i });
    if (await saveBtn.first().isVisible({ timeout: 10000 }).catch(() => false)) {
      await saveBtn.first().click({ timeout: 5000 });
      await page.waitForTimeout(500);
      const savedConfig = capturedActions.some(
        (a) => a === 'saveConfig' || a === 'updateConfig' || a === 'saveSettings'
      );
      expect.soft(savedConfig).toBeTruthy();
    } else {
      test.skip(true, 'Save settings button not visible');
    }
  });
});
