import { test, expect } from '@playwright/test';
import { gotoAuthenticated, MOCK_INTEREST_GROUPS, MOCK_FEED_ARTICLES, MOCK_CLIPS } from '../helpers/mockApi';

test.describe('Journey 12: Feed – Interest Groups & Articles', () => {
  test('feed page loads and shows interest group panel', async ({ page }) => {
    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');

    // The feed page should load without errors — look for key structural elements
    const newGroupBtn = page
      .getByRole('button', { name: /new group/i })
      .or(page.getByText(/new group/i));
    await expect(newGroupBtn.first()).toBeVisible({ timeout: 12000 });
  });

  test('existing interest groups are displayed', async ({ page }) => {
    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: MOCK_INTEREST_GROUPS,
    });
    await page.waitForLoadState('domcontentloaded');

    // Both mock groups should appear — use .first() since "Remote Work" also appears in article titles
    await expect(page.getByText('AI & Technology')).toBeVisible({ timeout: 12000 });
    await expect.soft(page.getByText('Remote Work').first()).toBeVisible({ timeout: 5000 });
  });

  test('clicking New Group opens create form', async ({ page }) => {
    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: [],
    });
    await page.waitForLoadState('domcontentloaded');

    const newGroupBtn = page
      .getByRole('button', { name: /new group/i })
      .first();
    await expect(newGroupBtn).toBeVisible({ timeout: 12000 });
    await newGroupBtn.click();

    // Create form should appear with group name input
    const nameInput = page.getByPlaceholder(/group name/i);
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  test('create group form has name and topics fields', async ({ page }) => {
    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: [],
    });
    await page.waitForLoadState('domcontentloaded');

    const newGroupBtn = page
      .getByRole('button', { name: /new group/i })
      .first();
    await expect(newGroupBtn).toBeVisible({ timeout: 12000 });
    await newGroupBtn.click();

    const nameInput = page.getByPlaceholder(/group name/i);
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    const topicsInput = page.getByPlaceholder(/topics.*comma/i);
    await expect.soft(topicsInput).toBeVisible({ timeout: 5000 });
  });

  test('filling create group form and saving fires createInterestGroup', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: [],
      createInterestGroup: {
        id: 'group-created',
        name: 'Startup Growth',
        topics: ['startup', 'growth hacking'],
        color: '#6366f1',
        domains: [],
      },
    });
    await page.waitForLoadState('domcontentloaded');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    const newGroupBtn = page.getByRole('button', { name: /new group/i }).first();
    await expect(newGroupBtn).toBeVisible({ timeout: 12000 });
    await newGroupBtn.click();

    const nameInput = page.getByPlaceholder(/group name/i);
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Startup Growth');

    const topicsInput = page.getByPlaceholder(/topics.*comma/i);
    if (await topicsInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await topicsInput.fill('startup, growth hacking');
    }

    // Click the Save button inside the create form
    const saveBtn = page
      .getByRole('button', { name: /^save$/i })
      .or(page.getByRole('button', { name: /create|add group/i }))
      .last();

    await expect(saveBtn).toBeVisible({ timeout: 3000 });
    await saveBtn.click();
    await page.waitForTimeout(600);
    expect(capturedActions).toContain('createInterestGroup');
  });

  test('selecting an interest group loads articles for that group', async ({ page }) => {
    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: MOCK_INTEREST_GROUPS,
      getFeedArticles: { articles: MOCK_FEED_ARTICLES, stale: false },
    });
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('AI & Technology')).toBeVisible({ timeout: 12000 });
    await page.getByText('AI & Technology').click();

    // After selecting group, feed articles should eventually appear
    const article = page
      .getByText(/How AI Is Transforming/i)
      .or(page.getByText(/AI-powered tools/i));
    await expect.soft(article.first()).toBeVisible({ timeout: 10000 });
  });

  test('edit button on interest group opens edit form', async ({ page }) => {
    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: MOCK_INTEREST_GROUPS,
    });
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('AI & Technology')).toBeVisible({ timeout: 12000 });

    // Hover the group pill to reveal the edit/delete icon buttons
    const groupPill = page.getByRole('button', { name: 'AI & Technology' });
    await groupPill.hover();

    // The edit button has title="Edit group" (rendered as a Pencil icon button)
    const editBtn = page.getByTitle('Edit group').first();

    await expect(editBtn).toBeVisible({ timeout: 3000 });
    await editBtn.click();

    const editFormHeading = page
      .getByText(/edit interest group/i)
      .or(page.getByPlaceholder(/group name/i));
    await expect.soft(editFormHeading.first()).toBeVisible({ timeout: 5000 });
  });

  test('delete group fires deleteInterestGroup action', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: [MOCK_INTEREST_GROUPS[0]],
      deleteInterestGroup: { success: true },
    });
    await page.waitForLoadState('domcontentloaded');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    await expect(page.getByText('AI & Technology')).toBeVisible({ timeout: 12000 });

    // Accept the window.confirm dialog that appears before deletion
    page.on('dialog', dialog => dialog.accept());

    // Hover the group pill to reveal the edit/delete icon buttons
    const groupPill = page.getByRole('button', { name: 'AI & Technology' });
    await groupPill.hover();

    // The delete button has title="Delete group" (rendered as a Trash2 icon button)
    const deleteBtn = page.getByTitle('Delete group').first();

    await expect(deleteBtn).toBeVisible({ timeout: 3000 });
    await deleteBtn.click({ force: true });
    await page.waitForTimeout(800);
    expect.soft(capturedActions).toContain('deleteInterestGroup');
  });

  test('feed articles display title and source', async ({ page }) => {
    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: MOCK_INTEREST_GROUPS,
      getFeedArticles: { articles: MOCK_FEED_ARTICLES, stale: false },
    });
    await page.waitForLoadState('domcontentloaded');

    // Select a group to trigger article load
    await expect(page.getByText('AI & Technology')).toBeVisible({ timeout: 12000 });
    await page.getByText('AI & Technology').click();

    const articleTitle = page.getByText(/How AI Is Transforming/i);
    await expect.soft(articleTitle.first()).toBeVisible({ timeout: 10000 });

    const sourceLabel = page.getByText(/TechCrunch/i);
    await expect.soft(sourceLabel.first()).toBeVisible({ timeout: 5000 });
  });

  test('clips dock shows when clips exist', async ({ page }) => {
    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: MOCK_INTEREST_GROUPS,
      listClips: MOCK_CLIPS,
    });
    await page.waitForLoadState('domcontentloaded');

    // Clips dock or clips count indicator
    const clipsDock = page
      .getByText(/clips/i)
      .or(page.locator('[data-testid*="clips"]'))
      .or(page.getByRole('button', { name: /clips/i }));
    await expect.soft(clipsDock.first()).toBeVisible({ timeout: 10000 });
  });

  test('refresh button fires refreshFeedArticles', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: MOCK_INTEREST_GROUPS,
      getFeedArticles: { articles: MOCK_FEED_ARTICLES, stale: false },
      refreshFeedArticles: { articles: MOCK_FEED_ARTICLES, stale: false },
    });
    await page.waitForLoadState('domcontentloaded');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    // Select a group first (needed to have a topic for refresh)
    await expect(page.getByText('AI & Technology')).toBeVisible({ timeout: 12000 });
    await page.getByText('AI & Technology').click();

    // The feed refresh button has title="Fetch fresh articles"
    const refreshBtn = page.getByTitle('Fetch fresh articles').first();

    await expect(refreshBtn).toBeVisible({ timeout: 5000 });
    await refreshBtn.click();
    await page.waitForTimeout(600);
    expect.soft(capturedActions).toContain('refreshFeedArticles');
  });

  test('article feedback thumbs up fires setArticleFeedback', async ({ page }) => {
    const capturedRequests: Array<{ action: string; vote?: string }> = [];

    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: MOCK_INTEREST_GROUPS,
      getFeedArticles: { articles: MOCK_FEED_ARTICLES, stale: false },
      setArticleFeedback: { vote: 'up' },
    });
    await page.waitForLoadState('domcontentloaded');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action === 'setArticleFeedback') {
            capturedRequests.push({ action: body.action, vote: body.vote as string });
          }
        } catch { /* ignore */ }
      }
    });

    await expect(page.getByText('AI & Technology')).toBeVisible({ timeout: 12000 });
    await page.getByText('AI & Technology').click();

    // Wait for articles to load
    await page.waitForTimeout(1500);

    // Thumbs-up button on FeedArticleCard has title="Helpful"
    const thumbsUpBtn = page.getByTitle('Helpful').first();

    await expect(thumbsUpBtn).toBeVisible({ timeout: 8000 });
    await thumbsUpBtn.click();
    await page.waitForTimeout(500);
    expect.soft(capturedRequests.length).toBeGreaterThan(0);
  });
});
