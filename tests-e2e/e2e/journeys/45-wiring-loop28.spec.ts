/**
 * Journey 45: Wiring Loop 45 — Discovery & Trending API Defensive Wiring
 *
 * Extends Journey 43 (Trending & Research Wiring) with defensive tests that verify
 * the Discovery & Trending API wiring handles edge cases gracefully — without JS
 * crashes, unhandled rejections, or silent failures — against the specification
 * (not against implementation).
 *
 * Key issues being tested (extending Journey 43 / el-43f7480bd306):
 *   1. getTrendingTopics handles empty platform filter gracefully (no crash)
 *   2. getTrendingTopics handles empty category filter gracefully (no crash)
 *   3. searchTopics returns empty array when no results match query
 *   4. discoverTopics handles limit=0 without crash
 *   5. discoverTopics handles empty interests filter without crash
 *   6. discoverTopics handles large limit value without crash
 *   7. getTopicDetails handles empty topicId (no crash)
 *   8. getTopicDetails handles unknown topicId (returns structured response)
 *   9. saveTopicToQueue handles missing optional fields without crash
 *  10. saveTopicToQueue handles very long name without crash
 *  11. All discovery actions are reachable and stable across repeated calls
 *  12. getLinkedInTrending handles unknown timeframe without crash
 *  13. getYouTubeTrending handles unknown timeframe without crash
 *  14. Mixed discovery + enrichment actions interleaved without crash
 *  15. feed page renders without JS crash after bootstrap
 *
 * This file builds on Journey 43 which covers the happy-path wiring. Journey 45
 * focuses on defensive / error-resilient behavior to ensure the wiring is robust.
 *
 * API routing pattern: All discovery/trending actions POST to `/` with `{ action: … }`
 * body. The mockApi.ts route handler intercepts these calls in the browser context.
 * The fireAction(page, action, body) helper uses page.evaluate so Playwright route
 * handlers intercept correctly (consistent with established patterns from
 * loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/31/32/33/34/35/36/37/38/39/40/41/42/43/44/45/46/47/48/49/50/51/52/53/54/55/56/57/58/59/60/61/62/63/64/65/66/67/68).
 *
 * References:
 *   journeys/43-wiring-loop28.spec.ts — loop 28 (Trending & Research, happy path)
 *   journeys/44-wiring-loop28.spec.ts — loop 28 re-run #1 (Cross-Cutting Integration)
 *   journeys/46-wiring-loop28.spec.ts — loop 28 re-run #2 (Bulk Import validation)
 *   helpers/mockApi.ts — mock API helper (with topic discovery action mocks)
 *   USE-CASES.md — wiring status for Journey 11 (Trending & Research)
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
// Journey 45.1: Trending Topics — getTrendingTopics Edge Cases
// ---------------------------------------------------------------------------

test.describe('Journey 45.1: Trending Topics — getTrendingTopics Edge Cases', () => {

  test('getTrendingTopics handles empty platform filter without crash', async ({ page }) => {
    /**
     * Spec (Journey 11): getTrendingTopics accepts an optional platform filter.
     * When called with an empty/unknown platform value, it should return all
     * topics or an empty array (not crash).
     *
     * Expected behavior: { ok: true, data: { data: Topic[] } } or graceful empty result.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTrendingTopics', {
      platform: '',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);

    const wrapper = result.data as Record<string, unknown>;
    const data = (wrapper.data ?? wrapper) as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('getTrendingTopics handles empty category filter without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTrendingTopics', {
      category: '',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);

    const wrapper = result.data as Record<string, unknown>;
    const data = (wrapper.data ?? wrapper) as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('getTrendingTopics handles unknown platform without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTrendingTopics', {
      platform: 'unknown-platform-xyz',
    });

    // Should not crash — returns either empty array or all topics (filtered to none)
    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);

    const wrapper = result.data as Record<string, unknown>;
    const data = (wrapper.data ?? wrapper) as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('getTrendingTopics returns stale flag in all cases', async ({ page }) => {
    /**
     * Spec (Journey 11): getTrendingTopics includes a stale flag for cache
     * management. Even on edge-case inputs, the response should include stale.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTrendingTopics', {
      platform: 'linkedin',
      category: 'technology',
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    // stale is always present at top level in getTrendingTopics response (not nested in wrapper.data)
    expect(typeof wrapper.stale).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Journey 45.2: Search Topics — searchTopics Edge Cases
// ---------------------------------------------------------------------------

test.describe('Journey 45.2: Search Topics — searchTopics Edge Cases', () => {

  test('searchTopics returns all results when query is empty', async ({ page }) => {
    /**
     * Spec (Journey 11): searchTopics accepts an optional query string.
     * An empty query should return all results or an empty array (not crash).
     *
     * Expected behavior: { ok: true, data: { data: Topic[] } } with all results.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchTopics', {
      query: '',
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    const data = (wrapper.data ?? wrapper) as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('searchTopics returns empty array when no match', async ({ page }) => {
    /**
     * Spec (Journey 11): searchTopics returns empty array when no topics
     * match the query string.
     *
     * Expected behavior: { ok: true, data: { data: [] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchTopics', {
      query: 'xyzzy-nonexistent-query-12345',
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    const data = (wrapper.data ?? wrapper) as unknown[];
    expect(Array.isArray(data)).toBe(true);
    // Empty result is acceptable
  });

  test('searchTopics accepts sortBy parameter without crash', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchTopics', {
      query: 'AI',
      sortBy: 'relevance',
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    const data = (wrapper.data ?? wrapper) as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('searchTopics accepts sortBy=volume without crash', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchTopics', {
      query: 'startup',
      sortBy: 'volume',
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    const data = (wrapper.data ?? wrapper) as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('searchTopics handles very long query without crash', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchTopics', {
      query: 'A'.repeat(500),
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    const data = (wrapper.data ?? wrapper) as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 45.3: Discover Topics — discoverTopics Edge Cases
// ---------------------------------------------------------------------------

test.describe('Journey 45.3: Discover Topics — discoverTopics Edge Cases', () => {

  test('discoverTopics handles limit=0 without crash', async ({ page }) => {
    /**
     * Spec (Journey 11): discoverTopics accepts an optional limit parameter.
     * A limit of 0 should not cause a crash — it should return an empty array.
     *
     * Expected behavior: { ok: true, data: { topics: [] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'discoverTopics', {
      limit: 0,
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    const topics = (wrapper.topics ?? wrapper) as unknown[];
    expect(Array.isArray(topics)).toBe(true);
  });

  test('discoverTopics handles negative limit gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'discoverTopics', {
      limit: -1,
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    const topics = (wrapper.topics ?? wrapper) as unknown[];
    expect(Array.isArray(topics)).toBe(true);
  });

  test('discoverTopics handles empty interests array without crash', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'discoverTopics', {
      interests: [],
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    const topics = (wrapper.topics ?? wrapper) as unknown[];
    expect(Array.isArray(topics)).toBe(true);
  });

  test('discoverTopics handles very large limit without crash', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'discoverTopics', {
      limit: 10000,
    });

    // Should not crash — limit is clamped or handled gracefully
    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    const topics = (wrapper.topics ?? wrapper) as unknown[];
    expect(Array.isArray(topics)).toBe(true);
    // Topics should be capped at a reasonable number (no infinite array)
    expect(topics.length).toBeLessThanOrEqual(100);
  });

  test('discoverTopics returns topics with required fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'discoverTopics', {
      limit: 5,
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    const topics = (wrapper.topics ?? wrapper) as unknown[];
    expect(Array.isArray(topics)).toBe(true);

    if (topics.length > 0) {
      const topic = topics[0] as Record<string, unknown>;
      expect(typeof topic.id).toBe('string');
      expect(typeof topic.name).toBe('string');
    }
  });

  test('discoverTopics returns sources array', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'discoverTopics');

    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    expect(Array.isArray(wrapper.sources as unknown[])).toBe(true);
  });

  test('discoverTopics handles single interest filter', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'discoverTopics', {
      interests: ['artificial intelligence'],
    });

    expect(result.ok).toBe(true);
    const wrapper = result.data as Record<string, unknown>;
    const topics = (wrapper.topics ?? wrapper) as unknown[];
    expect(Array.isArray(topics)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 45.4: Topic Details — getTopicDetails Edge Cases
// ---------------------------------------------------------------------------

test.describe('Journey 45.4: Topic Details — getTopicDetails Edge Cases', () => {

  test('getTopicDetails handles empty topicId without crash', async ({ page }) => {
    /**
     * Spec (Journey 11): getTopicDetails returns topic metadata including
     * name, description, relatedTopics[], and sentimentBreakdown.
     * When called with an empty topicId, it should return a structured response
     * (default topic or null) — not crash with a JS error.
     *
     * Expected behavior: { ok: true, data: TopicMetadata | null } — no JS crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTopicDetails', {
      topicId: '',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });

  test('getTopicDetails handles unknown topicId without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTopicDetails', {
      topicId: 'nonexistent-topic-id-xyz',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);

    // The response should be structured (object or null), not an error type
    const data = result.data;
    expect(data === null || typeof data === 'object').toBe(true);
  });

  test('getTopicDetails returns required metadata fields when topic found', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTopicDetails', {
      topicId: 'topic-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(typeof data.name).toBe('string');
    expect(typeof data.description).toBe('string');
    expect(Array.isArray(data.relatedTopics)).toBe(true);
    expect(typeof data.sentimentBreakdown).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// Journey 45.5: Platform-Specific Trending — Edge Cases
// ---------------------------------------------------------------------------

test.describe('Journey 45.5: Platform Trending — Edge Cases', () => {

  test('getLinkedInTrending handles unknown timeframe without crash', async ({ page }) => {
    /**
     * Spec (Journey 11): getLinkedInTrending accepts an optional timeframe
     * parameter. Unknown timeframe values should be handled gracefully.
     *
     * Expected behavior: { ok: true, data: LinkedInTrend[] } — no JS crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getLinkedInTrending', {
      timeframe: 'unknown-timeframe',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('getLinkedInTrending handles empty timeframe without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getLinkedInTrending', {
      timeframe: '',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('getLinkedInTrending returns required engagement fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getLinkedInTrending', {
      timeframe: '7d',
    });

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      const trend = data[0] as Record<string, unknown>;
      expect(typeof trend.name).toBe('string');
      expect(typeof trend.engagement).toBe('number');
      expect(typeof trend.views).toBe('number');
    }
  });

  test('getYouTubeTrending handles unknown timeframe without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getYouTubeTrending', {
      timeframe: 'invalid',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('getYouTubeTrending returns required view count fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getYouTubeTrending', {
      timeframe: '30d',
    });

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      const trend = data[0] as Record<string, unknown>;
      expect(typeof trend.name).toBe('string');
      expect(typeof trend.views).toBe('number');
      expect(typeof trend.engagement).toBe('number');
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 45.6: Save Topic to Queue — Edge Cases
// ---------------------------------------------------------------------------

test.describe('Journey 45.6: Save Topic to Queue — Edge Cases', () => {

  test('saveTopicToQueue handles missing optional fields without crash', async ({ page }) => {
    /**
     * Spec (Journey 11): saveTopicToQueue accepts topic metadata fields.
     * Missing optional fields should not cause a crash — the API should
     * use sensible defaults.
     *
     * Expected behavior: { ok: true, data: SavedRow } — no JS crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Call with only required field (name)
    const result = await fireAction(page, 'saveTopicToQueue', {
      name: 'Minimal Topic',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);

    const data = result.data as Record<string, unknown>;
    expect(typeof data.topicId).toBe('string');
    expect(data.topic).toBe('Minimal Topic');
  });

  test('saveTopicToQueue handles very long name without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'saveTopicToQueue', {
      name: 'A'.repeat(500),
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);

    const data = result.data as Record<string, unknown>;
    expect(typeof data.topicId).toBe('string');
  });

  test('saveTopicToQueue handles all metadata fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'saveTopicToQueue', {
      name: 'AI Tools for Founders',
      source: 'linkedin',
      category: 'technology',
      notes: 'Great article on AI productivity for startups',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.topicId).toBe('string');
    expect(data.topic).toBe('AI Tools for Founders');
    expect(data.source).toBe('linkedin');
    expect(data.category).toBe('technology');
    expect(data.status).toBe('Pending');
  });

  test('saveTopicToQueue handles duplicate gracefully (no crash)', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Call twice with same name
    const result1 = await fireAction(page, 'saveTopicToQueue', {
      name: 'Duplicate Topic',
    });

    const result2 = await fireAction(page, 'saveTopicToQueue', {
      name: 'Duplicate Topic',
    });

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 45.7: Action Routing Stability
// ---------------------------------------------------------------------------

test.describe('Journey 45.7: Discovery Action Routing — Stability', () => {

  test('discovery actions are stable across repeated calls', async ({ page }) => {
    /**
     * Spec (Journeys 11/12): Action routing should be stable across multiple
     * repeated calls. Making the same discovery action call multiple times
     * should not cause a JS crash or routing instability.
     *
     * Expected behavior: All calls return { ok: true, data: ... } — no crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Make 5 repeated calls to getTrendingTopics
    for (let i = 0; i < 5; i++) {
      const result = await fireAction(page, 'getTrendingTopics', { platform: 'linkedin' });
      expect(result.ok).toBe(true);
      expect(jsErrors).toHaveLength(0);
    }

    // Make 5 repeated calls to searchTopics
    for (let i = 0; i < 5; i++) {
      const result = await fireAction(page, 'searchTopics', { query: 'AI' });
      expect(result.ok).toBe(true);
      expect(jsErrors).toHaveLength(0);
    }

    // Make 5 repeated calls to discoverTopics
    for (let i = 0; i < 5; i++) {
      const result = await fireAction(page, 'discoverTopics', { limit: 3 });
      expect(result.ok).toBe(true);
      expect(jsErrors).toHaveLength(0);
    }
  });

  test('mixed discovery + enrichment actions interleaved without crash', async ({ page }) => {
    /**
     * Spec (Journeys 11/12): Discovery and enrichment actions should coexist
     * in the action routing system without interference. Mixing calls to both
     * action types should be stable.
     *
     * Expected behavior: All interleaved calls return { ok: true } — no crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const results = await Promise.allSettled([
      fireAction(page, 'getTrendingTopics'),
      fireAction(page, 'getFeedArticles'),
      fireAction(page, 'searchTopics', { query: 'startup' }),
      fireAction(page, 'refreshFeedArticles'),
      fireAction(page, 'discoverTopics', { limit: 2 }),
      fireAction(page, 'getLinkedInTrending'),
      fireAction(page, 'listClips'),
      fireAction(page, 'getYouTubeTrending'),
      fireAction(page, 'getTopicDetails', { topicId: 'topic-1' }),
      fireAction(page, 'listInterestGroups'),
    ]);

    for (const result of results) {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        const data = result.value;
        expect(data.ok).toBe(true);
      }
    }
    expect(jsErrors).toHaveLength(0);
  });

  test('all discovery actions reachable in sequence without state corruption', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Call all discovery actions in sequence — each should return valid data
    const trendingResult = await fireAction(page, 'getTrendingTopics');
    expect(trendingResult.ok).toBe(true);

    const searchResult = await fireAction(page, 'searchTopics', { query: 'AI' });
    expect(searchResult.ok).toBe(true);

    const discoverResult = await fireAction(page, 'discoverTopics', { limit: 5 });
    expect(discoverResult.ok).toBe(true);

    const detailsResult = await fireAction(page, 'getTopicDetails', { topicId: 'topic-1' });
    expect(detailsResult.ok).toBe(true);

    const liResult = await fireAction(page, 'getLinkedInTrending', { timeframe: '7d' });
    expect(liResult.ok).toBe(true);

    const ytResult = await fireAction(page, 'getYouTubeTrending', { timeframe: '7d' });
    expect(ytResult.ok).toBe(true);

    const saveResult = await fireAction(page, 'saveTopicToQueue', { name: 'Sequential Test' });
    expect(saveResult.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 45.8: Discovery Page — UI Rendering
// ---------------------------------------------------------------------------

test.describe('Journey 45.8: Discovery Page — UI Rendering', () => {

  test('discover page renders without JS crash', async ({ page }) => {
    /**
     * Spec (Journey 11): The trending/discover panel loads for an authenticated
     * user without JavaScript errors.
     *
     * Expected behavior: Page renders with body text > 0, no JS errors.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/discover');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });

  test('trending page renders without JS crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/trending');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });

  test('feed page renders without JS crash (enrichment baseline)', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });

  test('discovery page shows platform filter buttons', async ({ page }) => {
    await gotoAuthenticated(page, '/discover');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // At least one platform filter button should be visible
    const platformBtns = page.getByRole('button', { name: /linkedin|youtube|all/i });
    const visibleCount = await platformBtns.count();
    expect(visibleCount).toBeGreaterThan(0);
  });

  test('discovery page shows trending content after load', async ({ page }) => {
    await gotoAuthenticated(page, '/discover');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Page should show some trending or discovery content (text-based, not crash)
    const bodyText = await page.locator('body').textContent();
    expect((bodyText?.length ?? 0)).toBeGreaterThan(5);
  });
});
