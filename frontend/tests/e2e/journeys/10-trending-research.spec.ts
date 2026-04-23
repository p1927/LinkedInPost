import { test, expect, type Page } from '@playwright/test';
import { setupApiMocks, injectFakeToken, gotoAuthenticated, MOCK_SESSION, MOCK_ROWS } from '../helpers/mockApi';

test.describe('Journey 10: Trending & News Research', () => {
  test('trending page loads with search input', async ({ page }) => {
    await gotoAuthenticated(page, '/trending');

    // TrendingSearchBar has placeholder "Enter a topic to explore trending content..."
    const searchInput = page
      .getByPlaceholder(/enter a topic to explore/i)
      .or(page.getByPlaceholder(/search|query|topic/i));
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
  });

  test('panel toggle buttons visible', async ({ page }) => {
    await gotoAuthenticated(page, '/trending');

    // PanelToggle renders buttons with platform labels: YouTube, Instagram, LinkedIn, News
    await expect(page.getByRole('button', { name: /^YouTube$/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /^Instagram$/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /^News$/i })).toBeVisible({ timeout: 10000 });
  });

  test('LinkedIn panel toggle is off by default', async ({ page }) => {
    await gotoAuthenticated(page, '/trending');

    // LinkedIn toggle button should exist
    const linkedinToggle = page.getByRole('button', { name: /^LinkedIn$/i });
    await expect(linkedinToggle).toBeVisible({ timeout: 10000 });

    // DEFAULT_ENABLED = ['youtube', 'instagram', 'news'] — LinkedIn is NOT in default
    // The button has bg-secondary class when disabled vs bg-primary/10 when enabled
    const className = await linkedinToggle.getAttribute('class');
    // Not enabled = doesn't have bg-primary/10
    const isEnabled = className?.includes('bg-primary') ?? false;
    expect.soft(isEnabled).toBeFalsy();
  });

  test('toggling LinkedIn panel makes it visible', async ({ page }) => {
    await gotoAuthenticated(page, '/trending');

    const linkedinToggle = page.getByRole('button', { name: /^LinkedIn$/i });
    await expect(linkedinToggle).toBeVisible({ timeout: 10000 });

    // Click to enable
    await linkedinToggle.click();

    // After toggling, the button should have the active class
    const className = await linkedinToggle.getAttribute('class');
    expect.soft(className?.includes('bg-primary') || className?.includes('text-primary')).toBeTruthy();
  });

  test('searching news fires internal search', async ({ page }) => {
    // Note: the trending page uses internal mock data, not the searchNewsResearch POST action.
    // After typing and pressing Enter, the app sets searchTopic state and fetches data via useTrending hooks.
    await gotoAuthenticated(page, '/trending');

    const searchInput = page
      .getByPlaceholder(/enter a topic to explore/i)
      .or(page.getByPlaceholder(/search|query|topic/i));
    await searchInput.first().fill('artificial intelligence', { timeout: 10000 });
    await searchInput.first().press('Enter');

    // After searching, a loading spinner or results should appear
    await page.waitForTimeout(500);
    
    // The app should be in some state — loading or showing results
    const spinner = page.locator('.animate-spin').or(page.getByText(/loading/i));
    const results = page.getByText(/artificial intelligence/i);
    
    // Either loading or results visible
    const anyChange = spinner.or(results);
    await expect.soft(anyChange.first()).toBeVisible({ timeout: 5000 });
  });

  test('news results display article titles', async ({ page }) => {
    await gotoAuthenticated(page, '/trending');

    // Enable News panel (it's in DEFAULT_ENABLED so should already be on)
    const newsToggle = page.getByRole('button', { name: /^News$/i });
    await expect(newsToggle).toBeVisible({ timeout: 10000 });

    // Type a search topic and press Enter
    const searchInput = page
      .getByPlaceholder(/enter a topic to explore/i)
      .or(page.getByPlaceholder(/search|query|topic/i));
    await searchInput.first().fill('AI Tools', { timeout: 10000 });
    await searchInput.first().press('Enter');

    // Wait for results — the mock generates titles like "{topic}: Latest News and Updates"
    await expect(
      page.getByText(/AI Tools.*Latest News|How AI Tools is Shaping|AI Tools/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('article link opens in new tab', async ({ page }) => {
    await gotoAuthenticated(page, '/trending');

    const searchInput = page
      .getByPlaceholder(/enter a topic to explore/i)
      .or(page.getByPlaceholder(/search|query|topic/i));
    await searchInput.first().fill('AI', { timeout: 10000 });
    await searchInput.first().press('Enter');

    // Wait for articles to appear (mock generates them after a brief delay)
    await page.waitForTimeout(1500);

    // Find an article link
    const articleLink = page.getByRole('link').filter({ has: page.getByText(/AI.*latest news|How AI|shaping/i) }).first();
    
    if (await articleLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const target = await articleLink.getAttribute('target', { timeout: 5000 });
      expect.soft(target).toBe('_blank');
    } else {
      // Articles may use mock data with different structure
      // Check that any link has target="_blank"
      const anyArticleLink = page.locator('a[target="_blank"]').first();
      await expect.soft(anyArticleLink).toBeVisible({ timeout: 5000 });
    }
  });

  test('empty search shows prompt', async ({ page }) => {
    await gotoAuthenticated(page, '/trending');

    // Without performing a search, the page should show a prompt
    const emptyState = page
      .getByText(/enter a topic above|discover viral|discover what.s viral/i);
    await expect(emptyState.first()).toBeVisible({ timeout: 10000 });
  });
});
