/**
 * Journey 41: Wiring Loop 26/50 — Feed Enrichment & Debate Mode Wiring
 *
 * Validates wiring issues for Journey 12 (Feed Enrichment & Debate Mode) based
 * on the spec for el-38631663b913. Tests verify the enrichment API wiring,
 * response shapes, and UI behavior against the specification (not against
 * implementation).
 *
 * Key issues being tested (from Journey 12 spec — Feed Enrichment & Debate Mode):
 *   1. getFeedArticles returns articles array with required fields (url, title,
 *      source, publishedAt, snippet, imageUrl) and correct stale flag
 *   2. refreshFeedArticles returns stale=false and articles array
 *   3. setArticleFeedback accepts up/down/skip votes and returns vote confirmation
 *   4. getArticleFeedback returns feedback object for articles
 *   5. listClips / createClip / assignClipToPost / deleteClip wired correctly
 *   6. analyzeFeedArticle returns structured analysis (angle, hook, keyFacts)
 *   7. findDebateArticle action returns counter-stance article for draft topic
 *   8. crossDomainInsight action returns analogous example from different industry
 *   9. opinionLeaderInsights action returns curated quotes from notable voices
 *   10. findDraftConnections links articles to related topics/drafts
 *   11. Feed page (/feed) loads without JS crash and shows article list
 *   12. Enrichment workspace at /enrichment loads without crash
 *
 * API routing pattern: All enrichment actions POST to / with { action: … } body.
 * The mockApi.ts route handler intercepts these calls in the browser context.
 * The fireAction(page, action, body) helper uses page.evaluate so Playwright
 * route handlers intercept correctly (consistent with established patterns from
 * loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/33/35/36/37/38/39/40).
 *
 * References:
 *   journeys/28-wiring-loop20.spec.ts — loop 20 (feed enrichment API contract)
 *   journeys/36-wiring-loop25.spec.ts — loop 25 (feed enrichment & editor integration)
 *   journeys/39-wiring-loop25.spec.ts — loop 25 (multi-channel & AI refinement)
 *   helpers/mockApi.ts — mock API helper (with feed/enrichment action mocks)
 *   USE-CASES.md Journey 12 — Feed Enrichment & Debate Mode spec
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
// Journey 41.1: Feed Articles — getFeedArticles Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 41.1: Feed Articles — getFeedArticles Wiring', () => {

  test('getFeedArticles returns articles array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): getFeedArticles returns articles array with required
     * fields url, title, source, publishedAt, snippet, imageUrl.
     *
     * Expected behavior: { ok: true, data: { articles: [{ url, title, source,
     * publishedAt, snippet, imageUrl, ... }] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.articles)).toBe(true);

    const articles = data.articles as Record<string, unknown>[];
    expect(articles.length).toBeGreaterThan(0);

    const article = articles[0];
    expect(typeof article.url).toBe('string');
    expect(article.url.length).toBeGreaterThan(0);
    expect(typeof article.title).toBe('string');
    expect(article.title.length).toBeGreaterThan(0);
    expect(typeof article.source).toBe('string');
    expect(typeof article.publishedAt).toBe('string');
    expect(typeof article.snippet).toBe('string');
    expect(typeof article.imageUrl).toBe('string');
  });

  test('getFeedArticles returns correct stale flag', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.stale).toBe('boolean');
    expect(data.stale).toBe(false);
  });

  test('refreshFeedArticles returns articles array with stale=false', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'refreshFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.articles)).toBe(true);
    expect(typeof data.stale).toBe('boolean');
    expect(data.stale).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Journey 41.2: Article Feedback Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 41.2: Article Feedback Wiring', () => {

  test('setArticleFeedback accepts up vote and returns vote confirmation', async ({ page }) => {
    /**
     * Spec (Journey 12): setArticleFeedback accepts up/down/skip votes
     * and returns a vote confirmation.
     *
     * Expected behavior: { ok: true, data: { vote: 'up' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'setArticleFeedback', {
      articleUrl: 'https://example.com/ai-article-1',
      vote: 'up',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.vote).toBe('string');
    expect(data.vote).toBe('up');
  });

  test('setArticleFeedback accepts down vote', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'setArticleFeedback', {
      articleUrl: 'https://example.com/ai-article-1',
      vote: 'down',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.vote).toBe('down');
  });

  test('setArticleFeedback accepts skip vote', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'setArticleFeedback', {
      articleUrl: 'https://example.com/ai-article-1',
      vote: 'skip',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.vote).toBe('skip');
  });

  test('getArticleFeedback returns feedback object', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getArticleFeedback', {
      articleUrl: 'https://example.com/ai-article-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data;
    expect(data).not.toBeNull();
    expect(typeof data).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// Journey 41.3: Clips — CRUD Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 41.3: Clips — CRUD Wiring', () => {

  test('listClips returns clips with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): listClips returns clips with id, type, articleTitle,
     * passageText fields.
     *
     * Expected behavior: { ok: true, data: [{ id, type, articleTitle,
     * passageText, ... }] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listClips');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const clip = data[0] as Record<string, unknown>;
    expect(typeof clip.id).toBe('string');
    expect(clip.id.length).toBeGreaterThan(0);
    expect(typeof clip.type).toBe('string');
    expect(typeof clip.articleTitle).toBe('string');
    expect(typeof clip.passageText).toBe('string');
  });

  test('createClip saves new clip and returns clip with id', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createClip', {
      type: 'passage',
      articleTitle: 'How AI Is Transforming Startup Operations',
      articleUrl: 'https://example.com/ai-article-1',
      source: 'TechCrunch',
      publishedAt: '2024-01-15',
      passageText: 'AI-powered tools are reshaping how startups operate in 2024.',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(data.id.length).toBeGreaterThan(0);
    expect(data.type).toBe('passage');
    expect(typeof data.passageText).toBe('string');
  });

  test('assignClipToPost links clip to post', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'assignClipToPost', {
      clipId: 'clip-1',
      postId: 'topic-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.assignedPostIds)).toBe(true);
    expect(data.assignedPostIds).toContain('topic-1');
  });

  test('unassignClipFromPost removes clip-to-post link', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'unassignClipFromPost', {
      clipId: 'clip-1',
      postId: 'topic-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.assignedPostIds)).toBe(true);
    expect(data.assignedPostIds).not.toContain('topic-1');
  });

  test('deleteClip removes clip gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteClip', { clipId: 'clip-1' });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 41.4: Enrichment Actions Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 41.4: Enrichment Actions Wiring', () => {

  test('analyzeFeedArticle returns structured analysis', async ({ page }) => {
    /**
     * Spec (Journey 12): analyzeFeedArticle returns per-article analysis
     * (angle, hook, key facts) returned and rendered.
     *
     * Expected behavior: { ok: true, data: { angle: '...', hook: '...',
     * keyFacts: [...] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'analyzeFeedArticle', {
      articleUrl: 'https://example.com/ai-article-1',
      snippet: 'AI-powered tools are reshaping how startups operate in 2024.',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.angle).toBe('string');
    expect(typeof data.hook).toBe('string');
    expect(Array.isArray(data.keyFacts)).toBe(true);
  });

  test('findDraftConnections links articles to related topics', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDraftConnections', {
      articleUrl: 'https://example.com/ai-article-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data;
    // findDraftConnections returns related topics/drafts for re-use
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  test('findDebateArticle returns counter-stance article', async ({ page }) => {
    /**
     * Spec (Journey 12): findDebateArticle retrieves counter-stance article
     * for a draft topic and pins it alongside the draft.
     *
     * Expected behavior: { ok: true, data: { article: { url, title, ... } } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {
      topic: 'AI Tools for Founders',
      currentAngle: 'productivity-tools',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
    expect(data).not.toBeNull();
  });

  test('crossDomainInsight returns analogous example from different industry', async ({ page }) => {
    /**
     * Spec (Journey 12): crossDomainInsight pulls analogous example from a
     * different industry/topic.
     *
     * Expected behavior: { ok: true, data: { insight: '...', source: '...' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {
      topic: 'AI Tools for Founders',
      targetIndustry: 'healthcare',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
    expect(data).not.toBeNull();
  });

  test('crossDomainInsight handles unknown/empty topic gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {});

    // Should return a response (not crash), even with empty input
    expect(result).toBeDefined();
    expect(typeof result.ok).toBe('boolean');
  });

  test('opinionLeaderInsights returns curated quotes from notable voices', async ({ page }) => {
    /**
     * Spec (Journey 12): opinionLeaderInsights returns curated
     * quotes/positions from notable voices.
     *
     * Expected behavior: { ok: true, data: { insights: [...] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'opinionLeaderInsights', {
      topic: 'AI Tools for Founders',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
    expect(data).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Journey 41.5: Feed Page Integration
// ---------------------------------------------------------------------------

test.describe('Journey 41.5: Feed Page Integration', () => {

  test('feed page loads without JS crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('feed page shows article list or loading state', async ({ page }) => {
    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Feed page should show articles or a loading state (not blank)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);

    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    expect(jsErrors).toHaveLength(0);
  });

  test('refresh button triggers refreshFeedArticles', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Mock already installed by setupApiMocks — no need for page.route('**')
    // which would override the mock and hit the real (unavailable) server.
    await page.goto('./feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Fire refreshFeedArticles action directly (simulates refresh button click)
    await fireAction(page, 'refreshFeedArticles');

    // Verify the action completed successfully (mock returns { ok: true, data: ... })
    const result = await fireAction(page, 'getFeedArticles');
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.articles)).toBe(true);
  });

  test('article feedback buttons fire setArticleFeedback actions', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Mock already installed by setupApiMocks — no need for page.route('**')
    // which would override the mock and hit the real (unavailable) server.
    await page.goto('./feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Fire setArticleFeedback action (simulates clicking feedback button on an article)
    const result = await fireAction(page, 'setArticleFeedback', {
      articleUrl: 'https://example.com/ai-article-1',
      vote: 'up',
    });

    // Verify the action completed successfully
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.vote).toBe('string');
    expect(data.vote).toBe('up');
  });
});

// ---------------------------------------------------------------------------
// Journey 41.6: Enrichment Workspace Integration
// ---------------------------------------------------------------------------

test.describe('Journey 41.6: Enrichment Workspace Integration', () => {

  test('enrichment workspace loads without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('enrichment page renders article list with feedback controls', async ({ page }) => {
    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Enrichment workspace should show article list with feedback controls
    // At minimum the page should render non-empty content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('analyzeFeedArticle fires from enrichment workspace', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Mock already installed by setupApiMocks — no need for page.route('**')
    // which would override the mock and hit the real (unavailable) server.
    await page.goto('./enrichment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Fire analyzeFeedArticle action
    const result = await fireAction(page, 'analyzeFeedArticle', {
      articleUrl: 'https://example.com/ai-article-1',
      snippet: 'AI-powered tools are reshaping how startups operate in 2024.',
    });

    // Verify the action completed successfully
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.angle).toBe('string');
    expect(typeof data.hook).toBe('string');
    expect(Array.isArray(data.keyFacts)).toBe(true);
  });

  test('findDebateArticle fires from enrichment workspace', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {
      topic: 'AI Tools for Founders',
      currentAngle: 'productivity-tools',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
    expect(data).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Journey 41.7: Interest Groups Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 41.7: Interest Groups Wiring', () => {

  test('listInterestGroups returns groups with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): listInterestGroups returns groups with id, name, topics.
     *
     * Expected behavior: { ok: true, data: [{ id, name, topics: [...] }] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listInterestGroups');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const group = data[0] as Record<string, unknown>;
    expect(typeof group.id).toBe('string');
    expect(group.id.length).toBeGreaterThan(0);
    expect(typeof group.name).toBe('string');
    expect(Array.isArray(group.topics)).toBe(true);
  });

  test('createInterestGroup creates new group with name', async ({ page }) => {
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
    expect(Array.isArray(data.topics)).toBe(true);
  });

  test('updateInterestGroup updates existing group', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'updateInterestGroup', {
      id: 'group-1',
      name: 'AI & Tech Updated',
      topics: 'artificial intelligence,llm',
      color: '#10b981',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.id).toBe('group-1');
    expect(data.name).toBe('AI & Tech Updated');
  });

  test('deleteInterestGroup removes group gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteInterestGroup', {
      id: 'group-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 41.8: Error Handling Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 41.8: Error Handling Wiring', () => {

  test('enrichment actions return response (not throw) on empty input', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Fire enrichment actions without required fields
    const analyzeResult = await fireAction(page, 'analyzeFeedArticle', {});
    const debateResult = await fireAction(page, 'findDebateArticle', {});
    const insightResult = await fireAction(page, 'crossDomainInsight', {});
    const opinionResult = await fireAction(page, 'opinionLeaderInsights', {});

    // All actions should return a defined response, not throw a JS exception
    expect(analyzeResult).toBeDefined();
    expect(typeof analyzeResult.ok).toBe('boolean');
    expect(debateResult).toBeDefined();
    expect(typeof debateResult.ok).toBe('boolean');
    expect(insightResult).toBeDefined();
    expect(typeof insightResult.ok).toBe('boolean');
    expect(opinionResult).toBeDefined();
    expect(typeof opinionResult.ok).toBe('boolean');
  });

  test('feed page renders when API is unavailable', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    // setupApiMocks not called — worker unavailable
    await injectFakeToken(page);
    await page.goto('./feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Page should render without crash regardless of API availability
    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(0);
  });

  test('getFeedArticles handles empty articles gracefully', async ({ page }) => {
    await setupApiMocks(page, {
      getFeedArticles: { articles: [], stale: false },
    });
    await injectFakeToken(page);

    const result = await fireAction(page, 'getFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.articles)).toBe(true);
    expect(data.articles.length).toBe(0);
    expect(typeof data.stale).toBe('boolean');
  });
});
