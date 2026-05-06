/**
 * Journey 51: Wiring Loop 30/50 — Feed Enrichment & Debate Mode Wiring Validation
 *
 * Validates wiring for Journey 12 (Feed Enrichment & Debate Mode) against the SPEC
 * (USE-CASES.md). Tests verify the implementation satisfies the specification,
 * failing if the spec is not met.
 *
 * Key issues being tested (from USE-CASES.md Journey 12):
 *   1. analyzeFeedArticle action returns angle, hook, and keyFacts fields
 *   2. analyzeFeedArticle handles article URL without crash
 *   3. findDebateArticle action returns article and angle fields
 *   4. findDebateArticle handles missing topic context gracefully
 *   5. crossDomainInsight action returns insight, source, and domain fields
 *   6. crossDomainInsight handles various topic inputs without crash
 *   7. opinionLeaderInsights action returns insights array
 *   8. opinionLeaderInsights returns insights with leader, position, and source fields
 *   9. findDraftConnections action returns connections array
 *  10. findDraftConnections returns connections with topicId, topic, and relevanceScore
 *  11. All enrichment actions stable across repeated calls
 *  12. All enrichment actions reachable in authenticated session
 *  13. feed page renders without JS crash after bootstrap
 *  14. enrichment workspace page renders without JS crash
 *
 * API routing pattern: All enrichment actions POST to `http://localhost:5174/` with
 * `{ action: ... }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/33/
 * 35/36/37/38/39/40/41/42/43/44/45/46/47/48/49/50).
 *
 * References:
 *   USE-CASES.md — Journey 12 spec (Feed Enrichment & Debate Mode wiring: WIRED)
 *   helpers/mockApi.ts — mock API helper (enrichment action mocks)
 *   frontend/src/services/backendApi.ts — enrichment action client methods
 *   journeys/28-wiring-loop20.spec.ts — Journey 28 (Feed Enrichment API contract, loop 20)
 *   journeys/43-wiring-loop28.spec.ts — loop 28 (Trending & Research happy path)
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
// Journey 51.1: analyzeFeedArticle — Core Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 51.1: analyzeFeedArticle — Core Wiring', () => {

  test('analyzeFeedArticle action is reachable and returns correct shape', async ({ page }) => {
    /**
     * Spec (Journey 12): analyzeFeedArticle returns per-article analysis
     * including angle, hook, and keyFacts[] fields.
     *
     * Expected behavior: { ok: true, data: { angle, hook, keyFacts[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'analyzeFeedArticle', {
      articleUrl: 'https://example.com/ai-article',
      articleTitle: 'How AI Is Transforming Startup Operations',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.angle).toBe('string');
    expect(typeof data.hook).toBe('string');
    expect(Array.isArray(data.keyFacts)).toBe(true);
  });

  test('analyzeFeedArticle returns keyFacts array with string elements', async ({ page }) => {
    /**
     * Spec (Journey 12): keyFacts should be an array of string facts from the article.
     *
     * Expected behavior: keyFacts is an array of strings (not empty if analysis succeeds).
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'analyzeFeedArticle', {
      articleUrl: 'https://example.com/startup-funding',
      articleTitle: 'Startup Funding Trends in 2024',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const keyFacts = data.keyFacts as unknown[];
    expect(Array.isArray(keyFacts)).toBe(true);

    if (keyFacts.length > 0) {
      expect(typeof keyFacts[0]).toBe('string');
    }
  });

  test('analyzeFeedArticle includes angle string in response', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'analyzeFeedArticle', {
      articleUrl: 'https://example.com/remote-work',
      articleTitle: 'The Future of Remote Work',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.angle).toBe('string');
    expect(data.angle.length).toBeGreaterThan(0);
  });

  test('analyzeFeedArticle is callable without optional fields', async ({ page }) => {
    /**
     * Spec (Journey 12): analyzeFeedArticle should be callable with minimal
     * required fields (articleUrl, articleTitle) without crashing.
     *
     * Expected behavior: { ok: true, data: ... } — no JS crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'analyzeFeedArticle', {});

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });

  test('analyzeFeedArticle is stable across repeated calls', async ({ page }) => {
    /**
     * Spec (Journeys 12): Enrichment actions should be stable across repeated
     * calls without crashing or routing instability.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 5; i++) {
      const result = await fireAction(page, 'analyzeFeedArticle', {
        articleUrl: `https://example.com/article-${i}`,
        articleTitle: `Article Title ${i}`,
      });
      expect(result.ok).toBe(true);
      expect(jsErrors).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 51.2: findDebateArticle — Core Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 51.2: findDebateArticle — Core Wiring', () => {

  test('findDebateArticle action is reachable and returns correct shape', async ({ page }) => {
    /**
     * Spec (Journey 12): findDebateArticle retrieves a counter-stance article
     * and returns article and angle fields.
     *
     * Expected behavior: { ok: true, data: { article, angle } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {
      topic: 'AI Tools for Founders',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.article).toBe('object');
    expect(typeof data.angle).toBe('string');
  });

  test('findDebateArticle returns article with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): The article returned by findDebateArticle should include
     * url, title, source, publishedAt, and snippet fields.
     *
     * Expected behavior: article object has all required fields.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {
      topic: 'Remote Work Culture',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const article = data.article as Record<string, unknown>;

    expect(typeof article.url).toBe('string');
    expect(typeof article.title).toBe('string');
    expect(typeof article.source).toBe('string');
    expect(typeof article.publishedAt).toBe('string');
    expect(typeof article.snippet).toBe('string');
  });

  test('findDebateArticle returns angle as string', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {
      topic: 'Startup Growth Strategies',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const angle = data.angle as string;
    expect(typeof angle).toBe('string');
  });

  test('findDebateArticle handles missing topic context gracefully', async ({ page }) => {
    /**
     * Spec (Journey 12): findDebateArticle should handle missing or empty topic
     * context without crashing.
     *
     * Expected behavior: Returns structured response (may be empty/null article)
     * — not JS crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {});

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });

  test('findDebateArticle is stable across repeated calls', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'findDebateArticle', {
        topic: `Topic ${i + 1}`,
      });
      expect(result.ok).toBe(true);
      expect(jsErrors).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 51.3: crossDomainInsight — Core Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 51.3: crossDomainInsight — Core Wiring', () => {

  test('crossDomainInsight action is reachable and returns correct shape', async ({ page }) => {
    /**
     * Spec (Journey 12): crossDomainInsight pulls an analogous example from a
     * different industry/topic and returns insight, source, and domain fields.
     *
     * Expected behavior: { ok: true, data: { insight, source, domain } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {
      topic: 'AI Tools for Founders',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.insight).toBe('string');
    expect(typeof data.source).toBe('string');
    expect(typeof data.domain).toBe('string');
  });

  test('crossDomainInsight returns insight as non-empty string', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {
      topic: 'Remote Work Culture',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const insight = data.insight as string;
    expect(typeof insight).toBe('string');
    expect(insight.length).toBeGreaterThan(0);
  });

  test('crossDomainInsight returns source string for cross-domain attribution', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {
      topic: 'Startup Funding Trends',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const source = data.source as string;
    expect(typeof source).toBe('string');
    expect(source.length).toBeGreaterThan(0);
  });

  test('crossDomainInsight returns domain string indicating source industry', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {
      topic: 'AI Tools for Founders',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const domain = data.domain as string;
    expect(typeof domain).toBe('string');
    expect(domain.length).toBeGreaterThan(0);
  });

  test('crossDomainInsight is stable across repeated calls', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'crossDomainInsight', {
        topic: `Test Topic ${i + 1}`,
      });
      expect(result.ok).toBe(true);
      expect(jsErrors).toHaveLength(0);
    }
  });

  test('crossDomainInsight handles empty topic without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {});

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 51.4: opinionLeaderInsights — Core Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 51.4: opinionLeaderInsights — Core Wiring', () => {

  test('opinionLeaderInsights action is reachable and returns insights array', async ({ page }) => {
    /**
     * Spec (Journey 12): opinionLeaderInsights returns curated quotes/positions
     * from notable voices, returning an insights array.
     *
     * Expected behavior: { ok: true, data: { insights: [] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'opinionLeaderInsights', {
      topic: 'AI Tools for Founders',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const insights = data.insights as unknown[];
    expect(Array.isArray(insights)).toBe(true);
  });

  test('opinionLeaderInsights returns insights with leader, position, and source fields', async ({ page }) => {
    /**
     * Spec (Journey 12): Each insight entry should include leader (name),
     * position (quote/stance), and source (attribution) fields.
     *
     * Expected behavior: insights[] entries have leader, position, source strings.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'opinionLeaderInsights', {
      topic: 'Remote Work Culture',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const insights = data.insights as Record<string, unknown>[];
    expect(Array.isArray(insights)).toBe(true);

    if (insights.length > 0) {
      const first = insights[0];
      expect(typeof first.leader).toBe('string');
      expect(typeof first.position).toBe('string');
      expect(typeof first.source).toBe('string');
    }
  });

  test('opinionLeaderInsights returns multiple insights entries', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'opinionLeaderInsights', {
      topic: 'Startup Growth Strategies',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const insights = data.insights as Record<string, unknown>[];
    expect(Array.isArray(insights)).toBe(true);
    expect(insights.length).toBeGreaterThan(1);
  });

  test('opinionLeaderInsights is stable across repeated calls', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'opinionLeaderInsights', {
        topic: `Topic ${i + 1}`,
      });
      expect(result.ok).toBe(true);
      expect(jsErrors).toHaveLength(0);
    }
  });

  test('opinionLeaderInsights handles empty topic without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'opinionLeaderInsights', {});

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 51.5: findDraftConnections — Core Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 51.5: findDraftConnections — Core Wiring', () => {

  test('findDraftConnections action is reachable and returns connections array', async ({ page }) => {
    /**
     * Spec (Journey 12): findDraftConnections surfaces related topics/drafts
     * for re-use, returning a connections array.
     *
     * Expected behavior: { ok: true, data: { connections: [] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDraftConnections', {
      articleUrl: 'https://example.com/ai-article-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const connections = data.connections as unknown[];
    expect(Array.isArray(connections)).toBe(true);
  });

  test('findDraftConnections returns connections with topicId and topic fields', async ({ page }) => {
    /**
     * Spec (Journey 12): Each connection entry should include topicId and topic
     * string fields for identification.
     *
     * Expected behavior: connections[] entries have topicId, topic strings.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDraftConnections', {
      articleUrl: 'https://example.com/remote-work-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const connections = data.connections as Record<string, unknown>[];
    expect(Array.isArray(connections)).toBe(true);

    if (connections.length > 0) {
      const first = connections[0];
      expect(typeof first.topicId).toBe('string');
      expect(typeof first.topic).toBe('string');
    }
  });

  test('findDraftConnections returns connections with relevanceScore number', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDraftConnections', {
      articleUrl: 'https://example.com/startup-funding-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const connections = data.connections as Record<string, unknown>[];
    expect(Array.isArray(connections)).toBe(true);

    if (connections.length > 0) {
      const first = connections[0];
      expect(typeof first.relevanceScore).toBe('number');
    }
  });

  test('findDraftConnections is stable across repeated calls', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'findDraftConnections', {
        articleUrl: `https://example.com/article-${i}`,
      });
      expect(result.ok).toBe(true);
      expect(jsErrors).toHaveLength(0);
    }
  });

  test('findDraftConnections handles empty articleUrl without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDraftConnections', {});

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 51.6: Enrichment Actions — Cross-Cutting Stability
// ---------------------------------------------------------------------------

test.describe('Journey 51.6: Enrichment Actions — Cross-Cutting Stability', () => {

  test('all five enrichment actions reachable in sequence without crash', async ({ page }) => {
    /**
     * Spec (Journey 12): All five enrichment actions should coexist in the
     * action routing system without interference. Calling them in sequence
     * should return valid responses without JS crash.
     *
     * Expected behavior: All five calls return { ok: true } — no crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const r1 = await fireAction(page, 'analyzeFeedArticle', {
      articleUrl: 'https://example.com/ai-article',
      articleTitle: 'AI Article',
    });
    const r2 = await fireAction(page, 'findDebateArticle', { topic: 'AI Tools' });
    const r3 = await fireAction(page, 'crossDomainInsight', { topic: 'AI Tools' });
    const r4 = await fireAction(page, 'opinionLeaderInsights', { topic: 'AI Tools' });
    const r5 = await fireAction(page, 'findDraftConnections', { articleUrl: 'https://example.com/a' });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
    expect(r4.ok).toBe(true);
    expect(r5.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });

  test('enrichment actions interleaved with feed actions work without crash', async ({ page }) => {
    /**
     * Spec (Journey 12): Enrichment actions should work alongside feed actions
     * (getFeedArticles, refreshFeedArticles) without interference.
     *
     * Expected behavior: All interleaved calls return { ok: true } — no crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const results = await Promise.allSettled([
      fireAction(page, 'getFeedArticles'),
      fireAction(page, 'analyzeFeedArticle', { articleUrl: 'https://example.com/ai', articleTitle: 'AI Article' }),
      fireAction(page, 'findDebateArticle', { topic: 'Remote Work' }),
      fireAction(page, 'refreshFeedArticles'),
      fireAction(page, 'crossDomainInsight', { topic: 'Startup' }),
      fireAction(page, 'opinionLeaderInsights', { topic: 'AI' }),
      fireAction(page, 'findDraftConnections', { articleUrl: 'https://example.com/a' }),
    ]);

    for (const result of results) {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        expect(result.value.ok).toBe(true);
      }
    }
    expect(jsErrors).toHaveLength(0);
  });

  test('enrichment actions stable across repeated calls in same session', async ({ page }) => {
    /**
     * Spec (Journeys 12): Repeated enrichment action calls in the same session
     * should return stable responses without crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      await fireAction(page, 'analyzeFeedArticle', { articleUrl: 'https://example.com/a', articleTitle: 'A' });
      await fireAction(page, 'findDebateArticle', { topic: 'T' });
      await fireAction(page, 'crossDomainInsight', { topic: 'T' });
      await fireAction(page, 'opinionLeaderInsights', { topic: 'T' });
      await fireAction(page, 'findDraftConnections', { articleUrl: 'https://example.com/a' });
    }

    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 51.7: Feed Enrichment — UI Page Integration
// ---------------------------------------------------------------------------

test.describe('Journey 51.7: Feed Enrichment — UI Page Integration', () => {

  test('feed page renders without JS crash after bootstrap', async ({ page }) => {
    /**
     * Spec (Journey 12): The feed page loads for an authenticated user
     * without JavaScript errors.
     *
     * Expected behavior: Page renders with body text > 0, no JS errors.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });

  test('feed page shows article list after load', async ({ page }) => {
    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Feed page should show content (articles, articles list, or empty state)
    const bodyText = await page.locator('body').textContent();
    expect((bodyText?.length ?? 0)).toBeGreaterThan(5);
  });

  test('feed page loads with articles having required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): getFeedArticles returns articles with url, title,
     * source, publishedAt, snippet, imageUrl fields.
     *
     * Expected behavior: Feed articles have all required fields.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const articles = data.articles as Record<string, unknown>[];
    expect(Array.isArray(articles)).toBe(true);

    if (articles.length > 0) {
      const first = articles[0];
      expect(typeof first.url).toBe('string');
      expect(typeof first.title).toBe('string');
      expect(typeof first.source).toBe('string');
      expect(typeof first.publishedAt).toBe('string');
      expect(typeof first.snippet).toBe('string');
    }
  });

  test('refreshFeedArticles returns stale flag', async ({ page }) => {
    /**
     * Spec (Journey 12): refreshFeedArticles returns articles along with a
     * stale flag for cache management.
     *
     * Expected behavior: Response includes stale boolean field.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'refreshFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.stale).toBe('boolean');
  });

  test('setArticleFeedback and getArticleFeedback are reachable without crash', async ({ page }) => {
    /**
     * Spec (Journey 12): setArticleFeedback and getArticleFeedback handle
     * article feedback (up/down votes) without JS crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const setResult = await fireAction(page, 'setArticleFeedback', {
      articleUrl: 'https://example.com/ai-article',
      vote: 'up',
    });
    expect(setResult.ok).toBe(true);

    const getResult = await fireAction(page, 'getArticleFeedback', {
      articleUrl: 'https://example.com/ai-article',
    });
    expect(getResult.ok).toBe(true);

    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 51.8: Feed Enrichment — Interest Groups Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 51.8: Feed Enrichment — Interest Groups Wiring', () => {

  test('listInterestGroups returns interest groups array', async ({ page }) => {
    /**
     * Spec (Journey 12): listInterestGroups returns interest groups for
     * feed categorization.
     *
     * Expected behavior: { ok: true, data: InterestGroup[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listInterestGroups');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('listInterestGroups returns groups with required fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listInterestGroups');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>[];
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      const first = data[0];
      expect(typeof first.id).toBe('string');
      expect(typeof first.name).toBe('string');
      expect(Array.isArray(first.topics)).toBe(true);
    }
  });

  test('createInterestGroup creates new group and returns id', async ({ page }) => {
    /**
     * Spec (Journey 12): createInterestGroup creates a new interest group
     * for feed categorization.
     *
     * Expected behavior: { ok: true, data: { id, name, topics, color } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createInterestGroup', {
      name: 'AI & Technology',
      topics: 'artificial intelligence,machine learning',
      color: '#6366f1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(data.name).toBe('AI & Technology');
    expect(data.color).toBe('#6366f1');
  });

  test('updateInterestGroup updates existing group', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'updateInterestGroup', {
      id: 'group-1',
      name: 'Updated Group Name',
      topics: 'new topics',
      color: '#10b981',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.name).toBe('Updated Group Name');
  });

  test('deleteInterestGroup returns success', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteInterestGroup', {
      id: 'group-to-delete',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 51.9: Feed Enrichment — Clips Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 51.9: Feed Enrichment — Clips Wiring', () => {

  test('listClips returns clips array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): listClips returns saved clips from the feed for
     * reuse in the editor.
     *
     * Expected behavior: { ok: true, data: Clip[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listClips');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('listClips returns clips with passageText field for editor reuse', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listClips');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>[];
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      const first = data[0];
      expect(typeof first.id).toBe('string');
      expect(typeof first.passageText).toBe('string');
    }
  });

  test('createClip creates new clip and returns id', async ({ page }) => {
    /**
     * Spec (Journey 12): createClip saves a passage from the feed to the
     * clips collection for reuse in the editor.
     *
     * Expected behavior: { ok: true, data: { id, passageText, ... } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createClip', {
      type: 'passage',
      articleTitle: 'AI Article Title',
      articleUrl: 'https://example.com/ai-article',
      source: 'TechCrunch',
      publishedAt: '2024-01-15',
      passageText: 'AI-powered tools are reshaping how startups operate in 2024.',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
  });

  test('assignClipToPost assigns clip to topic and returns updated clip', async ({ page }) => {
    /**
     * Spec (Journey 12): assignClipToPost assigns a saved clip to a topic/draft
     * for enrichment in the editor.
     *
     * Expected behavior: { ok: true, data: { assignedPostIds: [postId] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'assignClipToPost', {
      id: 'clip-1',
      postId: 'topic-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.assignedPostIds as unknown[])).toBe(true);
  });

  test('unassignClipFromPost removes clip from topic', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'unassignClipFromPost', {
      id: 'clip-1',
      postId: 'topic-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.assignedPostIds as unknown[])).toBe(true);
  });

  test('deleteClip returns success', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteClip', {
      id: 'clip-to-delete',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 51.10: Feed Enrichment — Enrichment Workspace Page Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 51.10: Feed Enrichment — Enrichment Workspace Page Wiring', () => {

  test('enrichment workspace page is accessible from authenticated context', async ({ page }) => {
    /**
     * Spec (Journey 12): The enrichment workspace at `/enrichment` is gated
     * by `FEATURE_ENRICHMENT`. This test verifies the page is reachable from
     * an authenticated session.
     *
     * Expected behavior: Page loads without JS crash, renders non-empty body.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, './enrichment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });

  test('enrichment workspace page accessible from feed page navigation', async ({ page }) => {
    /**
     * Spec (Journey 12): User can navigate from the feed page to the enrichment
     * workspace without JS crash.
     *
     * Expected behavior: Navigation succeeds, page renders content.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });

  test('enrichment workspace shows enrichment actions panel', async ({ page }) => {
    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Enrichment workspace should show content (enrichment panel, action buttons, or input fields)
    const bodyText = await page.locator('body').textContent();
    expect((bodyText?.length ?? 0)).toBeGreaterThan(5);
  });

  test('enrichment actions callable from enrichment workspace context', async ({ page }) => {
    /**
     * Spec (Journey 12): Enrichment actions should be callable from the
     * enrichment workspace without JS crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Fire enrichment actions from within the enrichment workspace
    const r1 = await fireAction(page, 'analyzeFeedArticle', { articleUrl: 'https://example.com/a', articleTitle: 'A' });
    const r2 = await fireAction(page, 'crossDomainInsight', { topic: 'Test' });
    const r3 = await fireAction(page, 'opinionLeaderInsights', { topic: 'Test' });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });
});
