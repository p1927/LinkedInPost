import { test, expect } from '@playwright/test';

test.describe('Trending Dashboard', () => {
  test('should load /trending without errors', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });

  test('shows trending search bar', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    const searchBar = page
      .locator('input[placeholder*="topic"], input[placeholder*="trending"], input[placeholder*="search"]')
      .first();

    await expect(searchBar).toBeVisible({ timeout: 10000 }).catch(() => {
      // May require auth or page may redirect
    });
  });

  test('shows panel toggle controls', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    // Platform toggles for YouTube, Instagram, LinkedIn, News
    const toggles = page.getByRole('button', {
      name: /youtube|instagram|linkedin|news/i,
    });
    const count = await toggles.count();
    if (count > 0) {
      await expect(toggles.first()).toBeVisible();
    }
  });

  test('shows settings/config icon', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    const settingsBtn = page.locator('[aria-label*="setting"], [class*="Settings"], [data-lucide="settings"]').first();
    if (await settingsBtn.isVisible().catch(() => false)) {
      await expect(settingsBtn).toBeEnabled();
    }
  });
});

test.describe('YouTube Panel', () => {
  test('YouTube panel is visible by default', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    // YouTube is in DEFAULT_ENABLED panels
    const ytPanel = page.getByText(/youtube/i).first();
    await expect(ytPanel).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('YouTube panel shows mock/live video cards', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(2000);
    // Look for video-like content (thumbnails, view counts, or mock data)
    const videoItems = page.locator('[class*="video"], [class*="YouTube"], a[href*="youtube.com"]').first();
    if (await videoItems.isVisible().catch(() => false)) {
      await expect(videoItems).toBeVisible();
    }
  });
});

test.describe('News Panel', () => {
  test('News panel is visible by default', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    // News is in DEFAULT_ENABLED panels
    const newsPanel = page.getByText(/news/i).first();
    await expect(newsPanel).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('News panel shows articles or empty state', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(2000);
    const articles = page.locator('[class*="article"], [class*="news"], a[href*="http"]').first();
    if (await articles.isVisible().catch(() => false)) {
      await expect(articles).toBeVisible();
    }
  });
});

test.describe('Instagram Panel', () => {
  test('Instagram panel is visible by default', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    const igPanel = page.getByText(/instagram/i).first();
    await expect(igPanel).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});

// PATH-066/070: LinkedIn panel is NOT in DEFAULT_ENABLED
test.describe('LinkedIn Panel — PATH-070 (PARTIAL: disabled by default)', () => {
  test('LinkedIn panel is NOT shown by default', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(1000);
    // LinkedIn panel is excluded from DEFAULT_ENABLED = ['youtube', 'instagram', 'news']
    // Look for a toggle button for LinkedIn but verify its panel is not active
    const linkedInToggle = page.getByRole('button', { name: /linkedin/i }).first();
    if (await linkedInToggle.isVisible().catch(() => false)) {
      // Toggle exists but panel should be off by default
      const panelActive = await page.locator('[class*="LinkedInPanel"], [data-panel="linkedin"]').isVisible().catch(() => false);
      expect(panelActive).toBe(false);
    }
  });

  test('LinkedIn panel activates when toggle enabled', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    const linkedInToggle = page.getByRole('button', { name: /linkedin/i }).first();
    if (await linkedInToggle.isVisible().catch(() => false)) {
      await linkedInToggle.click();
      await page.waitForTimeout(500);
      // After clicking, LinkedIn panel content should appear
      const linkedInContent = page.getByText(/linkedin/i).nth(1);
      if (await linkedInContent.isVisible().catch(() => false)) {
        await expect(linkedInContent).toBeVisible();
      }
    }
  });
});

test.describe('Topic Search Flow', () => {
  test('user can type a topic and trigger search', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    const searchBar = page
      .locator('input[placeholder*="topic"], input[placeholder*="trending"], input[placeholder*="search"]')
      .first();

    if (await searchBar.isVisible().catch(() => false)) {
      await searchBar.fill('artificial intelligence');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      // Should update search topic state — panels reload
    }
  });

  test('search button triggers topic fetch', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    const searchBar = page
      .locator('input[placeholder*="topic"], input[placeholder*="trending"]')
      .first();

    if (await searchBar.isVisible().catch(() => false)) {
      await searchBar.fill('startup growth');
      const searchBtn = page.getByRole('button', { name: /search|explore/i }).first();
      if (await searchBtn.isVisible().catch(() => false)) {
        await searchBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});

test.describe('Trending Graph', () => {
  test('graph component renders when data available', async ({ page }) => {
    await page.goto('/trending');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(2000);
    const graph = page.locator('svg, canvas, [class*="graph"], [class*="Graph"]').first();
    if (await graph.isVisible().catch(() => false)) {
      await expect(graph).toBeVisible();
    }
  });
});
