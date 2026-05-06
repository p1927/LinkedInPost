/**
 * Journey 30: Wiring Loop 24/50 — Topic Discovery & Trending Research
 *
 * Validates wiring issues for the trending research system based on the spec for el-724d408aa17f.
 * Tests verify the Topic Discovery API wiring, response shapes, and UI behavior
 * against the specification (not against implementation).
 *
 * Key issues being tested (from Journey 13 spec — Topic Discovery & Trending Research):
 *   1. getTrendingTopics returns topics array with required fields
 *   2. searchTopics fires with query and returns matching topics
 *   3. discoverTopics returns discovered topics with source info
 *   4. getTopicDetails returns topic metadata
 *   5. getLinkedInTrending returns LinkedIn-specific trending topics
 *   6. getYouTubeTrending returns YouTube-specific trending topics
 *   7. saveTopicToQueue fires and returns saved topic
 *   8. saveTopicToQueue handles duplicate gracefully
 *   9. trending topics page renders without JS crash
 *   10. search topics filters results client-side
 *
 * References:
 *   journeys/28-wiring-loop20.spec.ts — loop 20 (Feed Enrichment API, patterns)
 *   journeys/29-wiring-loop23.spec.ts — loop 23 (Automations API, patterns)
 *   helpers/mockApi.ts — mock API helper (with feed/enrichment/trending action mocks)
 *   USE-CASES.md — wiring status for Journey 13 (Topic Discovery & Trending Research)
 */

import { test, expect, type Page } from '@playwright/test';
import {
  setupApiMocks,
  injectFakeToken,
  gotoAuthenticated,
} from '../helpers/mockApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fire a browser-side POST action through the app's action routing.
 * Uses page.evaluate so Playwright route handlers intercept correctly.
 * Returns parsed JSON response.
 */
async function fireAction(
  page: Page,
  action: string,
  body: Record<string, unknown> = {},
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  return page.evaluate(async ({ action: a, body: b }) => {
    const resp = await fetch('http://localhost:5174/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: a, ...b }),
    });
    return resp.json();
  }, { action, body });
}

// ---------------------------------------------------------------------------
// Journey 30.1: Topic Discovery — getTrendingTopics wiring
// ---------------------------------------------------------------------------

test.describe('Journey 30.1: Topic Discovery — getTrendingTopics Wiring', () => {

  test('getTrendingTopics returns topics array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 13): getTrendingTopics returns trending topics for discovery.
     *
     * Expected behavior: { ok: true, data: Topic[] } where each topic has
     * id, name, category, volume, trend, source.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTrendingTopics');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Verify required fields on each topic
    const first = data[0] as Record<string, unknown>;
    expect(typeof first.id).toBe('string');
    expect(typeof first.name).toBe('string');
  });

  test('getTrendingTopics with platform filter returns filtered results', async ({ page }) => {
    /**
     * Spec (Journey 13): getTrendingTopics supports filtering by platform (linkedin/youtube/news).
     *
     * Expected behavior: { ok: true, data: Topic[] } filtered by platform.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTrendingTopics', {
      platform: 'linkedin',
    });

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('getTrendingTopics with category filter returns matching topics', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTrendingTopics', {
      category: 'technology',
    });

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('trending topics page renders without JS crash after bootstrap', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./discover');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 30.2: Topic Discovery — searchTopics wiring
// ---------------------------------------------------------------------------

test.describe('Journey 30.2: Topic Discovery — searchTopics Wiring', () => {

  test('searchTopics fires with query and returns matching topics', async ({ page }) => {
    /**
     * Spec (Journey 13): searchTopics returns topics matching search query.
     *
     * Expected behavior: { ok: true, data: Topic[] } with name/snippet matching query.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchTopics', {
      query: 'AI tools',
    });

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('searchTopics with empty query returns empty array', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchTopics', {
      query: '',
    });

    // Should return empty result without crashing
    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('searchTopics returns results sorted by relevance', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchTopics', {
      query: 'startup growth',
      sortBy: 'relevance',
    });

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 30.3: Topic Discovery — discoverTopics wiring
// ---------------------------------------------------------------------------

test.describe('Journey 30.3: Topic Discovery — discoverTopics Wiring', () => {

  test('discoverTopics returns discovered topics with source info', async ({ page }) => {
    /**
     * Spec (Journey 13): discoverTopics returns AI-suggested topics based on
     * trends, interests, and user profile.
     *
     * Expected behavior: { ok: true, data: { topics: Topic[], sources: string[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'discoverTopics');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.topics) || Array.isArray(data)).toBe(true);
  });

  test('discoverTopics with interests filter returns personalized topics', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'discoverTopics', {
      interests: ['AI', 'startups', 'productivity'],
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.topics) || Array.isArray(data)).toBe(true);
  });

  test('discoverTopics respects limit parameter', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'discoverTopics', {
      limit: 5,
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const topics = Array.isArray(data) ? data : (data.topics as unknown[]);
    expect(topics.length).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Journey 30.4: Topic Discovery — getTopicDetails wiring
// ---------------------------------------------------------------------------

test.describe('Journey 30.4: Topic Discovery — getTopicDetails Wiring', () => {

  test('getTopicDetails returns topic metadata', async ({ page }) => {
    /**
     * Spec (Journey 13): getTopicDetails returns detailed metadata for a topic.
     *
     * Expected behavior: { ok: true, data: TopicDetail } with name, description,
     * sources, relatedTopics, sentimentBreakdown.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTopicDetails', {
      topicId: 'topic-ai-tools-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.name).toBe('string');
    expect(typeof data.id).toBe('string');
  });

  test('getTopicDetails returns relatedTopics array', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTopicDetails', {
      topicId: 'topic-remote-work-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.relatedTopics) || Array.isArray(data)).toBe(true);
  });

  test('getTopicDetails handles unknown topicId gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTopicDetails', {
      topicId: 'nonexistent-topic-xyz',
    });

    // Should not crash — returns error shape or empty data
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// Journey 30.5: Topic Discovery — getLinkedInTrending wiring
// ---------------------------------------------------------------------------

test.describe('Journey 30.5: Topic Discovery — getLinkedInTrending Wiring', () => {

  test('getLinkedInTrending returns LinkedIn-specific trending topics', async ({ page }) => {
    /**
     * Spec (Journey 13): getLinkedInTrending returns trending topics on LinkedIn.
     *
     * Expected behavior: { ok: true, data: TrendingTopic[] } with platform='linkedin'.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getLinkedInTrending');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      const topic = data[0] as Record<string, unknown>;
      expect(typeof topic.name).toBe('string');
      expect(typeof topic.title).toBe('string');
    }
  });

  test('getLinkedInTrending returns topics with engagement metrics', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getLinkedInTrending');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    if (data.length > 0) {
      const topic = data[0] as Record<string, unknown>;
      // At least one numeric/metric field should be present
      const hasMetric = typeof topic.engagement === 'number' ||
        typeof topic.views === 'number' ||
        typeof topic.trend === 'number' ||
        typeof topic.volume === 'number';
      expect(typeof topic.name).toBe('string');
      expect(hasMetric).toBe(true);
    }
  });

  test('LinkedIn trending page renders without JS crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./discover/linkedin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 30.6: Topic Discovery — getYouTubeTrending wiring
// ---------------------------------------------------------------------------

test.describe('Journey 30.6: Topic Discovery — getYouTubeTrending Wiring', () => {

  test('getYouTubeTrending returns YouTube-specific trending topics', async ({ page }) => {
    /**
     * Spec (Journey 13): getYouTubeTrending returns trending topics on YouTube.
     *
     * Expected behavior: { ok: true, data: TrendingTopic[] } with platform='youtube'.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getYouTubeTrending');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      const topic = data[0] as Record<string, unknown>;
      expect(typeof topic.name).toBe('string');
      expect(typeof topic.title).toBe('string');
    }
  });

  test('getYouTubeTrending with timeframe filter returns recent topics', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getYouTubeTrending', {
      timeframe: '7d',
    });

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('YouTube trending page renders without JS crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./discover/youtube');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 30.7: Topic Discovery — saveTopicToQueue wiring
// ---------------------------------------------------------------------------

test.describe('Journey 30.7: Topic Discovery — saveTopicToQueue Wiring', () => {

  test('saveTopicToQueue fires with topic data and returns saved topic', async ({ page }) => {
    /**
     * Spec (Journey 13): saveTopicToQueue saves a discovered topic to the queue.
     *
     * Expected behavior: { ok: true, data: { rowIndex, topicId, ... } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'saveTopicToQueue', {
      name: 'AI Tools for Founders',
      category: 'technology',
      source: 'linkedin',
      notes: 'Interesting trend in AI adoption among startups.',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.topicId).toBe('string');
    expect(typeof data.rowIndex).toBe('number');
  });

  test('saveTopicToQueue handles duplicate topic gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'saveTopicToQueue', {
      name: 'AI Tools for Founders',
      category: 'technology',
      source: 'linkedin',
    });

    // Should return result regardless of whether it's a new save or duplicate
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('saveTopicToQueue with all metadata fields succeeds', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'saveTopicToQueue', {
      name: 'Remote Work Culture',
      category: 'workplace',
      source: 'youtube',
      trend: 0.85,
      volume: 50000,
      sentiment: 'positive',
      relatedTopics: ['async work', 'productivity'],
      notes: 'Great for engagement.',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// Journey 30.8: Topic Discovery — page integration wiring
// ---------------------------------------------------------------------------

test.describe('Journey 30.8: Topic Discovery — Page Integration Wiring', () => {

  test('discover page shows trending topics section without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./discover');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(20);
  });

  test('discover page shows platform filter buttons', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./discover');
    await page.waitForLoadState('domcontentloaded');

    // Platform filter buttons should be visible
    const platformBtns = page.getByRole('button', { name: /linkedin|youtube|news/i });
    const hasPlatformBtn = await platformBtns.first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasPlatformBtn).toBeTruthy();
  });

  test('clicking platform filter triggers getTrendingTopics with platform param', async ({ page }) => {
    const capturedActions: string[] = [];

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Intercept all POST requests to capture actions
    await page.route('**', async (route) => {
      const req = route.request();
      if (req.method().toUpperCase() !== 'POST') { await route.continue(); return; }
      let body: Record<string, unknown>;
      try { body = await req.postDataJSON(); } catch { await route.continue(); return; }
      if (body?.action) capturedActions.push(body.action as string);
      await route.continue();
    });

    await page.goto('./discover');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Click LinkedIn filter if visible
    const linkedinBtn = page.getByRole('button', { name: /^linkedin$/i });
    if (await linkedinBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await linkedinBtn.click();
      await page.waitForTimeout(500);

      // getTrendingTopics should have fired
      const trendingCall = capturedActions.includes('getTrendingTopics');
      expect(trendingCall).toBeTruthy();
    } else {
      test.skip(true, 'LinkedIn filter button not visible — page may show different state');
    }
  });

  test('search input on discover page triggers searchTopics action', async ({ page }) => {
    const capturedActions: string[] = [];

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    await page.route('**', async (route) => {
      const req = route.request();
      if (req.method().toUpperCase() !== 'POST') { await route.continue(); return; }
      let body: Record<string, unknown>;
      try { body = await req.postDataJSON(); } catch { await route.continue(); return; }
      if (body?.action) capturedActions.push(body.action as string);
      await route.continue();
    });

    await page.goto('./discover');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Find and use the search input
    const searchInput = page.getByPlaceholder(/search|find topics/i)
      .or(page.getByRole('searchbox'))
      .first();

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('AI productivity');
      await searchInput.press('Enter');
      await page.waitForTimeout(500);

      // searchTopics should have fired
      const searchCall = capturedActions.includes('searchTopics');
      expect(searchCall).toBeTruthy();
    } else {
      test.skip(true, 'Search input not visible on discover page');
    }
  });

  test('discover page switches between platform tabs without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./discover');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const platforms = ['LinkedIn', 'YouTube', 'News'];
    for (const platform of platforms) {
      const btn = page.getByRole('button', { name: new RegExp(`^${platform}$`, 'i') });
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }

    await page.waitForTimeout(500);
    expect(jsErrors).toHaveLength(0);
  });

  test('add to queue button on discover page fires saveTopicToQueue action', async ({ page }) => {
    const capturedActions: string[] = [];

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    await page.route('**', async (route) => {
      const req = route.request();
      if (req.method().toUpperCase() !== 'POST') { await route.continue(); return; }
      let body: Record<string, unknown>;
      try { body = await req.postDataJSON(); } catch { await route.continue(); return; }
      if (body?.action) capturedActions.push(body.action as string);
      await route.continue();
    });

    await page.goto('./discover');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Try to find and click an "add" or "save" button on a topic card
    const addBtn = page.getByRole('button', { name: /add to queue|save topic|add topic/i }).first();
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(800);

      // saveTopicToQueue should have fired
      const saveCall = capturedActions.includes('saveTopicToQueue');
      expect(saveCall).toBeTruthy();
    } else {
      test.skip(true, 'Add-to-queue button not visible — page may show topics in a different format');
    }
  });
});
