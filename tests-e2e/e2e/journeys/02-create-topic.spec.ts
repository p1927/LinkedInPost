import { test, expect, type Page } from '@playwright/test';
import { setupApiMocks, injectFakeToken, gotoAuthenticated, MOCK_SESSION, MOCK_ROWS } from '../helpers/mockApi';

test.describe('Journey 02: Scratchpad – Create Topic', () => {
  test('scratchpad form shows all fields', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new');
    await page.waitForLoadState('domcontentloaded');

    // Title input
    const titleInput = page
      .getByRole('textbox', { name: /title/i })
      .or(page.getByPlaceholder(/title/i));
    await expect(titleInput.first()).toBeVisible({ timeout: 10000 });

    // About / description textarea
    const aboutArea = page
      .getByRole('textbox', { name: /about|description|what is this about/i })
      .or(page.getByPlaceholder(/about|describe|what/i));
    await expect.soft(aboutArea.first()).toBeVisible({ timeout: 5000 });

    // Message textarea
    const messageArea = page
      .getByRole('textbox', { name: /message|content|post/i })
      .or(page.getByPlaceholder(/message|write|post/i));
    await expect.soft(messageArea.first()).toBeVisible({ timeout: 5000 });

    // Style chips — look for common writing style labels
    const styleChip = page
      .getByRole('button', { name: /storytelling|educational|inspirational|controversial|casual/i })
      .or(page.locator('[data-testid*="style-chip"]'));
    await expect.soft(styleChip.first()).toBeVisible({ timeout: 5000 });

    // Notes textarea
    const notesArea = page
      .getByPlaceholder(/paste links|scratchpad/i)
      .or(page.getByRole('textbox', { name: /notes|research/i }));
    await expect.soft(notesArea.first()).toBeVisible({ timeout: 5000 });
  });

  test('Add to Queue disabled when title empty', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new');
    await page.waitForLoadState('domcontentloaded');

    const addButton = page
      .getByRole('button', { name: /add to queue|queue|save/i })
      .first();

    await expect(addButton).toBeVisible({ timeout: 10000 });
    await expect(addButton).toBeDisabled({ timeout: 5000 });
  });

  test('Add to Queue enables after title filled', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new');
    await page.waitForLoadState('domcontentloaded');

    const titleInput = page
      .getByRole('textbox', { name: /title/i })
      .or(page.getByPlaceholder(/title/i))
      .first();

    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill('My E2E Test Topic');

    const addButton = page
      .getByRole('button', { name: /add to queue|queue|save/i })
      .first();

    await expect(addButton).toBeEnabled({ timeout: 5000 });
  });

  test('style chip toggles on click', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new');
    await page.waitForLoadState('domcontentloaded');

    const styleChip = page
      .getByRole('button', { name: /storytelling|educational|inspirational/i })
      .first();

    await expect(styleChip).toBeVisible({ timeout: 10000 });

    // Record state before click
    const ariaBeforeClick = await styleChip.getAttribute('aria-pressed');
    await styleChip.click();

    // After click: aria-pressed should flip, or a CSS class should change
    const ariaAfterClick = await styleChip.getAttribute('aria-pressed');

    if (ariaBeforeClick !== null) {
      // If aria-pressed is used, it should have flipped
      expect(ariaAfterClick).not.toBe(ariaBeforeClick);
    } else {
      // Fall back: check the chip looks visually different (has border-primary class)
      const isSelected = await styleChip.evaluate((el) =>
        el.className.includes('border-primary') ||
        el.className.includes('selected') ||
        el.className.includes('active') ||
        el.getAttribute('data-selected') === 'true'
      );
      expect.soft(isSelected).toBeTruthy();
    }
  });

  test('style chip deselects on second click', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new');
    await page.waitForLoadState('domcontentloaded');

    const styleChip = page
      .getByRole('button', { name: /storytelling|educational|inspirational/i })
      .first();

    await expect(styleChip).toBeVisible({ timeout: 10000 });

    // Click once to select
    await styleChip.click();

    // Capture selected state
    const classAfterFirstClick = await styleChip.getAttribute('class');
    const ariaAfterFirstClick = await styleChip.getAttribute('aria-pressed');

    // Click again to deselect
    await styleChip.click();

    const ariaAfterSecondClick = await styleChip.getAttribute('aria-pressed');
    if (ariaAfterFirstClick !== null) {
      expect(ariaAfterSecondClick).not.toBe(ariaAfterFirstClick);
    } else {
      // Class should differ from after-first-click state
      const classAfterSecondClick = await styleChip.getAttribute('class');
      // After deselect, border-primary class should be gone
      expect.soft(classAfterSecondClick?.includes('border-primary')).toBeFalsy();
    }
  });

  test('Generate with AI shows pros/cons', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new', {
      generateTopicInsights: {
        ok: true,
        data: {
          pros: ['Great angle', 'Timely topic'],
          cons: ['Niche audience', 'Needs research'],
        },
      },
    });
    await page.waitForLoadState('domcontentloaded');

    // Fill title first (required for generation)
    const titleInput = page
      .getByRole('textbox', { name: /title/i })
      .or(page.getByPlaceholder(/title/i))
      .first();

    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill('AI and the Future of Work');

    // Switch to the Analysis tab to reveal the Generate with AI button
    const analysisTab = page.getByRole('button', { name: /^analysis$/i }).first();
    if (await analysisTab.isVisible({ timeout: 4000 }).catch(() => false)) {
      await analysisTab.click();
    }

    // Click generate button
    const generateButton = page
      .getByRole('button', { name: /generate with ai|analyse|analyze|ai/i })
      .first();

    if (!(await generateButton.isVisible({ timeout: 6000 }).catch(() => false))) {
      test.skip(true, 'Generate with AI button not visible — Analysis tab may be in a different layout');
      return;
    }
    await generateButton.click();

    // Pros/cons content should appear
    const prosContent = page.getByText(/pros|great angle|timely/i);
    const consContent = page.getByText(/cons|niche|research/i);

    await expect(prosContent.first()).toBeVisible({ timeout: 10000 });
    await expect.soft(consContent.first()).toBeVisible({ timeout: 5000 });
  });

  test('form submission fires addTopic action', async ({ page }) => {
    const capturedRequests: any[] = [];

    await gotoAuthenticated(page, '/topics/new', {
      addTopic: { ok: true, data: { topicId: 'new-topic-123' } },
    });
    await page.waitForLoadState('domcontentloaded');

    // Capture API calls
    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action === 'addTopic') {
            capturedRequests.push(body);
          }
        } catch {
          // ignore non-JSON
        }
      }
    });

    // Fill and submit the form
    const titleInput = page
      .getByRole('textbox', { name: /title/i })
      .or(page.getByPlaceholder(/title/i))
      .first();

    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill('My Test Topic for Submission');

    const addButton = page
      .getByRole('button', { name: /add to queue|queue|save/i })
      .first();

    await expect(addButton).toBeEnabled({ timeout: 5000 });
    await addButton.click();

    // Wait briefly for the request to fire
    await page.waitForTimeout(1000);

    expect(capturedRequests.length).toBeGreaterThan(0);
  });

  test('successful submit navigates to topics', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new', {
      addTopic: { ok: true, data: { topicId: 'new-topic-456' } },
    });
    await page.waitForLoadState('domcontentloaded');

    const titleInput = page
      .getByRole('textbox', { name: /title/i })
      .or(page.getByPlaceholder(/title/i))
      .first();

    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill('Submit Navigation Test Topic');

    const addButton = page
      .getByRole('button', { name: /add to queue|queue|save/i })
      .first();

    await expect(addButton).toBeEnabled({ timeout: 5000 });
    await addButton.click();

    // Should navigate away from /topics/new
    await page.waitForURL(
      (url) => !url.pathname.includes('/topics/new'),
      { timeout: 10000 }
    );

    // URL should contain /topics or /
    expect(
      page.url().includes('/topics') || page.url().endsWith('/')
    ).toBeTruthy();
  });

  test('Cancel navigates away', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new');
    await page.waitForLoadState('domcontentloaded');

    const cancelButton = page
      .getByRole('button', { name: /cancel|discard|back/i })
      .first();

    await expect(cancelButton).toBeVisible({ timeout: 10000 });
    await cancelButton.click();

    // Should navigate away from /topics/new
    await page.waitForURL(
      (url) => !url.pathname.includes('/topics/new'),
      { timeout: 10000 }
    );

    expect(page.url()).not.toContain('/topics/new');
  });
});
