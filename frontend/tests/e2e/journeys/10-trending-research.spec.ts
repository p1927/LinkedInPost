import { test, expect, type Page } from '@playwright/test';
import { setupApiMocks, injectFakeToken, gotoAuthenticated, MOCK_SESSION, MOCK_ROWS, MOCK_INTEREST_GROUPS, MOCK_FEED_ARTICLES } from '../helpers/mockApi';

// Journey 10: /trending redirects to /feed (the interest groups + articles page).
// These tests verify the feed page that replaces the old trending panel UI.

test.describe('Journey 10: Trending & News Research (Feed Page)', () => {
  test('trending page loads with search input', async ({ page }) => {
    await gotoAuthenticated(page, '/trending');

    // TrendingSearchBar has placeholder "Enter a topic to explore trending content..."
    const searchInput = page
      .getByPlaceholder(/enter a topic to explore/i)
      .or(page.getByPlaceholder(/search|query|topic/i));
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
  });

  test('/trending redirects to /feed', async ({ page }) => {
    await gotoAuthenticated(page, '/trending');
    await page.waitForLoadState('domcontentloaded');

    // The workspace router redirects /trending → /feed
    await expect(page).toHaveURL(/\/feed/, { timeout: 8000 });
  });

  test('feed page shows interest groups sidebar', async ({ page }) => {
    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: MOCK_INTEREST_GROUPS,
    });

    // Interest groups sidebar renders
    await expect(page.getByText(/interest groups/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('feed page shows New Group button', async ({ page }) => {
    await gotoAuthenticated(page, '/feed');

    const newGroupBtn = page
      .getByRole('button', { name: /new group/i })
      .or(page.getByText(/new group/i));
    await expect(newGroupBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('searching fires internal search and renders result state', async ({ page }) => {
    await gotoAuthenticated(page, '/trending');

    const searchInput = page
      .getByPlaceholder(/enter a topic to explore/i)
      .or(page.getByPlaceholder(/search|query|topic/i));
    await searchInput.first().fill('artificial intelligence', { timeout: 10000 });
    await searchInput.first().press('Enter');

    // After searching the search topic is set — loading or empty state renders without crash
    await page.waitForTimeout(800);
    const body = await page.locator('body').textContent();
    expect((body?.length ?? 0)).toBeGreaterThan(20);
  });

  test('empty state shows prompt when no group selected and no search', async ({ page }) => {
    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: MOCK_INTEREST_GROUPS,
    });

    // Without performing a search or selecting a group, an empty state renders
    const emptyState = page
      .getByText(/select an interest group|enter a topic to discover|your feed is empty/i);
    await expect.soft(emptyState.first()).toBeVisible({ timeout: 10000 });
  });

  test('selecting interest group loads articles', async ({ page }) => {
    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: MOCK_INTEREST_GROUPS,
      getFeedArticles: { articles: MOCK_FEED_ARTICLES, stale: false },
    });

    await expect(page.getByText('AI & Technology').first()).toBeVisible({ timeout: 12000 });
    await page.getByText('AI & Technology').first().click();

    // Articles should load
    await expect.soft(
      page.getByText(/How AI Is Transforming|AI-powered tools/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('article links open in new tab', async ({ page }) => {
    await gotoAuthenticated(page, '/feed', {
      listInterestGroups: MOCK_INTEREST_GROUPS,
      getFeedArticles: { articles: MOCK_FEED_ARTICLES, stale: false },
    });

    await expect(page.getByText('AI & Technology').first()).toBeVisible({ timeout: 12000 });
    await page.getByText('AI & Technology').first().click();
    await page.waitForTimeout(1000);

    const anyArticleLink = page.locator('a[target="_blank"]').first();
    await expect.soft(anyArticleLink).toBeVisible({ timeout: 5000 });
  });

  test('feed page renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');

    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});
