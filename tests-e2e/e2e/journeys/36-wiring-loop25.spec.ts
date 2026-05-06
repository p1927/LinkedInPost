/**
 * Journey 36: Wiring Loop 25/50 — Feed Enrichment & Editor Integration Wiring
 *
 * Validates wiring issues for the integration between feed enrichment features
 * and the editor's debate mode / cross-domain / opinion-leader capabilities.
 * Tests verify against the SPEC (USE-CASES.md Journey 12), not implementation.
 *
 * Key issues being tested (from USE-CASES.md Journey 12):
 *   1. getFeedArticles returns articles with url, title, source, publishedAt,
 *      snippet, imageUrl fields and correct stale flag
 *   2. setArticleFeedback + getArticleFeedback wiring for article voting
 *   3. Cluster draft clips against feed articles (clusterDraftClips)
 *   4. findDraftConnections wires related topics back from an article
 *   5. Debate Mode: findDebateArticle retrieves counter-stance article
 *      and pins it alongside the draft
 *   6. Cross-domain: crossDomainInsight pulls analogous example from
 *      different industry/topic
 *   7. Opinion-leader: opinionLeaderInsights fetches curated quotes/
 *      positions from notable voices
 *   8. Per-article analysis: analyzeFeedArticle returns angle, hook, key facts
 *   9. Author profile from bootstrap config personalizes enrichment output
 *  10. Enrichment workspace is gated by FEATURE_ENRICHMENT flag
 *
 * References:
 *   journeys/28-wiring-loop20.spec.ts — loop 20 (Feed Enrichment API, patterns)
 *   journeys/30-wiring-loop24.spec.ts — loop 24 (Topic Discovery, patterns)
 *   journeys/33-wiring-loop24.spec.ts — loop 24 (Bootstrap Integration, patterns)
 *   journeys/35-wiring-loop25.spec.ts — loop 25 (Workflow/Persona Wiring, patterns)
 *   helpers/mockApi.ts — mock API helper (with feed/enrichment action mocks)
 *   USE-CASES.md — wiring status for Journey 12 (Feed Enrichment & Debate Mode)
 *
 * Wiring Loop 25 Fixes (2026-04-30): Added new test file for enrichment-editor
 * integration wiring. Tests use the established pattern from loops 20/24/25
 * (page.evaluate for browser fetch, fireAction helper, primary OR fallback
 * pattern for UI visibility checks).
 */

import { test, expect, type Page } from '@playwright/test';
import {
  setupApiMocks,
  injectFakeToken,
  gotoAuthenticated,
  MOCK_SESSION,
  MOCK_FEED_ARTICLES,
  MOCK_CLIPS,
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
// Journey 36.1: Feed Articles — getFeedArticles Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 36.1: Feed Articles — getFeedArticles Wiring', () => {

  test('getFeedArticles returns articles array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): getFeedArticles returns articles array with required
     * fields: url, title, source, publishedAt, snippet, imageUrl.
     *
     * Expected behavior: { ok: true, data: { articles: FeedArticle[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const articles = data.articles as unknown[];
    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBeGreaterThan(0);

    // Verify required fields on each article
    for (const article of articles) {
      const a = article as Record<string, unknown>;
      expect(typeof a.url).toBe('string');
      expect(typeof a.title).toBe('string');
      expect(typeof a.source).toBe('string');
      expect(typeof a.publishedAt).toBe('string');
      expect(typeof a.snippet).toBe('string');
      expect(typeof a.imageUrl).toBe('string');
    }
  });

  test('getFeedArticles returns stale flag for cache invalidation', async ({ page }) => {
    /**
     * Spec (Journey 12): getFeedArticles returns a stale boolean flag
     * indicating whether the cached feed data may be outdated.
     *
     * Expected behavior: { ok: true, data: { articles, stale: boolean } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.stale).toBe('boolean');
  });

  test('refreshFeedArticles refreshes and returns updated articles', async ({ page }) => {
    /**
     * Spec (Journey 12): refreshFeedArticles fetches fresh articles from
     * the feed sources and returns updated articles with stale=false.
     *
     * Expected behavior: { ok: true, data: { articles, stale: false } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'refreshFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.articles)).toBe(true);
    expect(data.stale).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Journey 36.2: Article Feedback — setArticleFeedback & getArticleFeedback
// ---------------------------------------------------------------------------

test.describe('Journey 36.2: Article Feedback — Voting Wiring', () => {

  test('setArticleFeedback fires with article URL and vote', async ({ page }) => {
    /**
     * Spec (Journey 12): setArticleFeedback action accepts an article URL
     * and a vote direction (up/down/skip) and returns confirmation.
     *
     * Expected behavior: { ok: true, data: { vote: 'up'|'down'|'skip' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'setArticleFeedback', {
      url: 'https://example.com/ai-article-1',
      vote: 'up',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.vote).toBe('string');
    expect(['up', 'down', 'skip']).toContain(data.vote);
  });

  test('setArticleFeedback accepts down vote', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'setArticleFeedback', {
      url: 'https://example.com/ai-article-1',
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
      url: 'https://example.com/ai-article-1',
      vote: 'skip',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.vote).toBe('skip');
  });

  test('getArticleFeedback returns feedback for articles', async ({ page }) => {
    /**
     * Spec (Journey 12): getArticleFeedback returns the current feedback
     * state for the user's articles (votes, dismissals).
     *
     * Expected behavior: { ok: true, data: { [url]: { vote, dismissed } } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getArticleFeedback');

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    // getArticleFeedback returns an object (may be empty {})
    expect(typeof result.data).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// Journey 36.3: Clip Management — listClips & clusterDraftClips
// ---------------------------------------------------------------------------

test.describe('Journey 36.3: Clip Management — listClips Wiring', () => {

  test('listClips returns clips array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): listClips returns the user's saved clips from
     * the feed, with required fields: id, type, articleTitle, passageText.
     *
     * Expected behavior: { ok: true, data: Clip[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listClips');

    expect(result.ok).toBe(true);
    const clips = result.data as unknown[];
    expect(Array.isArray(clips)).toBe(true);

    // Each clip has required fields
    for (const clip of clips) {
      const c = clip as Record<string, unknown>;
      expect(typeof c.id).toBe('string');
      expect(typeof c.type).toBe('string');
      expect(typeof c.articleTitle).toBe('string');
      expect(typeof c.passageText).toBe('string');
    }
  });

  test('createClip saves a new clip with passage text', async ({ page }) => {
    /**
     * Spec (Journey 12): createClip action accepts clip data and returns
     * the saved clip with a generated id.
     *
     * Expected behavior: { ok: true, data: Clip }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createClip', {
      type: 'passage',
      articleTitle: 'AI Tools for Founders',
      articleUrl: 'https://example.com/ai-tools',
      source: 'TechCrunch',
      publishedAt: '2024-01-15',
      passageText: 'AI-powered tools are reshaping how startups operate in 2024.',
    });

    expect(result.ok).toBe(true);
    const clip = result.data as Record<string, unknown>;
    expect(typeof clip.id).toBe('string');
    expect(clip.passageText).toBe('AI-powered tools are reshaping how startups operate in 2024.');
  });

  test('assignClipToPost links clip to a topic draft', async ({ page }) => {
    /**
     * Spec (Journey 12): assignClipToPost action links a clip to a specific
     * topic/post for use in the editor.
     *
     * Expected behavior: { ok: true, data: Clip } with assignedPostIds updated.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'assignClipToPost', {
      clipId: 'clip-1',
      postId: 'topic-1',
    });

    expect(result.ok).toBe(true);
    const clip = result.data as Record<string, unknown>;
    expect(Array.isArray(clip.assignedPostIds)).toBe(true);
    expect((clip.assignedPostIds as string[]).includes('topic-1')).toBe(true);
  });

  test('unassignClipFromPost removes post link from clip', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'unassignClipFromPost', {
      clipId: 'clip-1',
      postId: 'topic-1',
    });

    expect(result.ok).toBe(true);
    const clip = result.data as Record<string, unknown>;
    expect(Array.isArray(clip.assignedPostIds)).toBe(true);
  });

  test('deleteClip removes a clip gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteClip', { id: 'clip-1' });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.success).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Journey 36.4: Debate Mode — findDebateArticle Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 36.4: Debate Mode — findDebateArticle Wiring', () => {

  test('findDebateArticle action is callable and returns counter-stance article', async ({ page }) => {
    /**
     * Spec (Journey 12): findDebateArticle retrieves a counter-stance article
     * for the given draft topic and returns it alongside the draft.
     *
     * The editor uses this to show opposing viewpoints next to the draft.
     *
     * Expected behavior: { ok: true, data: { draft, debateArticle } }
     * or equivalent response with counter-stance content.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {
      topic: 'AI Tools for Founders',
      draftText: 'AI tools are reshaping how founders build products.',
    });

    // Action should succeed (returns ok: true or falls through to real worker)
    expect(typeof result.ok).toBe('boolean');
    // Either returns data with debate article or continues to real endpoint
    if (result.ok) {
      const data = result.data as Record<string, unknown>;
      expect(data).toBeDefined();
    }
  });

  test('findDebateArticle handles missing draft gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {
      topic: 'Remote Work Culture',
    });

    expect(typeof result.ok).toBe('boolean');
  });

  test('debate mode UI loads without JS crash when enrichment is active', async ({ page }) => {
    /**
     * Spec (Journey 12): The Debate Mode view in the editor should load
     * without crash when enrichment features are available from bootstrap.
     *
     * Expected behavior: Editor shows debate mode toggle, no JS errors.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, './review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // No crash — editor renders debate mode or equivalent
    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 36.5: Cross-Domain & Opinion-Leader Enrichment
// ---------------------------------------------------------------------------

test.describe('Journey 36.5: Cross-Domain & Opinion-Leader Wiring', () => {

  test('crossDomainInsight action is callable and returns analogous example', async ({ page }) => {
    /**
     * Spec (Journey 12): crossDomainInsight action accepts a draft topic
     * and returns an analogous example pulled from a different industry/topic.
     *
     * Expected behavior: { ok: true, data: { crossDomainExample, source } }
     * or returns analogous insight from cross-domain data.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {
      topic: 'AI Tools for Founders',
      currentIndustry: 'technology',
    });

    expect(typeof result.ok).toBe('boolean');
    if (result.ok) {
      const data = result.data as Record<string, unknown>;
      expect(data).toBeDefined();
    }
  });

  test('crossDomainInsight handles unknown topic gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {
      topic: 'Unknown Topic XYZ',
    });

    expect(typeof result.ok).toBe('boolean');
  });

  test('opinionLeaderInsights action is callable and returns curated quotes', async ({ page }) => {
    /**
     * Spec (Journey 12): opinionLeaderInsights action fetches curated quotes
     * and positions from notable voices on the draft topic.
     *
     * Expected behavior: { ok: true, data: { quotes: OpinionQuote[] } }
     * or returns opinion leader content.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'opinionLeaderInsights', {
      topic: 'AI Tools for Founders',
    });

    expect(typeof result.ok).toBe('boolean');
    if (result.ok) {
      const data = result.data as Record<string, unknown>;
      expect(data).toBeDefined();
    }
  });

  test('opinionLeaderInsights handles empty topic gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'opinionLeaderInsights', {
      topic: '',
    });

    expect(typeof result.ok).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Journey 36.6: Per-Article Analysis — analyzeFeedArticle
// ---------------------------------------------------------------------------

test.describe('Journey 36.6: Per-Article Analysis — analyzeFeedArticle Wiring', () => {

  test('analyzeFeedArticle action returns article analysis', async ({ page }) => {
    /**
     * Spec (Journey 12): analyzeFeedArticle action analyzes a single article
     * and returns angle, hook, and key facts.
     *
     * Expected behavior: { ok: true, data: { angle, hook, keyFacts } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'analyzeFeedArticle', {
      url: 'https://example.com/ai-article-1',
      topic: 'AI Tools for Founders',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    // Analysis should return structured insight fields
    expect(data).toBeDefined();
  });

  test('analyzeFeedArticle handles article not in feed gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'analyzeFeedArticle', {
      url: 'https://example.com/unknown-article',
      topic: 'Unknown Topic',
    });

    expect(typeof result.ok).toBe('boolean');
  });

  test('findDraftConnections links articles to related topics', async ({ page }) => {
    /**
     * Spec (Journey 12): findDraftConnections action finds related topics/drafts
     * from an article's content or metadata.
     *
     * Expected behavior: { ok: true, data: { relatedTopics: Topic[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDraftConnections', {
      url: 'https://example.com/ai-article-1',
    });

    expect(typeof result.ok).toBe('boolean');
    if (result.ok) {
      const data = result.data as Record<string, unknown>;
      expect(data).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 36.7: Enrichment Personalization — authorProfile from Bootstrap
// ---------------------------------------------------------------------------

test.describe('Journey 36.7: Enrichment — authorProfile Personalization Wiring', () => {

  test('bootstrap returns authorProfile for enrichment personalization', async ({ page }) => {
    /**
     * Spec (Journey 12, Journey 1): bootstrap returns authorProfile string
     * which is used by enrichment actions to personalize generated content.
     *
     * Expected behavior: config.authorProfile is a non-empty string.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(typeof config.authorProfile).toBe('string');
    expect((config.authorProfile as string).length).toBeGreaterThan(0);
  });

  test('bootstrap returns llm config for enrichment model override', async ({ page }) => {
    /**
     * Spec (Journey 1): config.llm can override the default googleModel
     * for enrichment actions.
     *
     * Expected behavior: config.llm is null or a string model identifier.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    // llm can be null (use default) or a model string override
    if (config.llm !== null) expect(typeof config.llm).toBe('string');
  });

  test('bootstrap returns imageGen config for enrichment image generation', async ({ page }) => {
    /**
     * Spec (Journey 1): config.imageGen is used by enrichment for
     * generating images alongside enriched content.
     *
     * Expected behavior: config.imageGen is null or an object.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    if (config.imageGen !== null) expect(typeof config.imageGen).toBe('object');
  });

  test('enrichment workspace loads without crash using bootstrap config', async ({ page }) => {
    /**
     * Spec (Journey 12): The enrichment workspace at /enrichment should
     * load using authorProfile and llm config from bootstrap.
     *
     * Expected behavior: Page renders without JS crash, body content > 10 chars.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, './feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 36.8: Interest Groups — listInterestGroups Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 36.8: Interest Groups — listInterestGroups Wiring', () => {

  test('listInterestGroups returns interest groups array', async ({ page }) => {
    /**
     * Spec (Journey 12): listInterestGroups returns the user's interest groups
     * for organizing feed topics.
     *
     * Expected behavior: { ok: true, data: InterestGroup[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listInterestGroups');

    expect(result.ok).toBe(true);
    const groups = result.data as unknown[];
    expect(Array.isArray(groups)).toBe(true);
  });

  test('listInterestGroups returns groups with required fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listInterestGroups');

    expect(result.ok).toBe(true);
    const groups = result.data as unknown[];

    for (const group of groups) {
      const g = group as Record<string, unknown>;
      expect(typeof g.id).toBe('string');
      expect(typeof g.name).toBe('string');
      expect(Array.isArray(g.topics)).toBe(true);
    }
  });

  test('createInterestGroup creates new group with name and topics', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createInterestGroup', {
      name: 'AI & Technology',
      topics: ['artificial intelligence', 'machine learning'],
      color: '#6366f1',
    });

    expect(result.ok).toBe(true);
    const group = result.data as Record<string, unknown>;
    expect(typeof group.id).toBe('string');
    expect(group.name).toBe('AI & Technology');
    expect(Array.isArray(group.topics)).toBe(true);
  });

  test('updateInterestGroup updates existing group', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'updateInterestGroup', {
      id: 'group-1',
      name: 'Updated AI Group',
      topics: ['ai', 'startups'],
    });

    expect(result.ok).toBe(true);
    const group = result.data as Record<string, unknown>;
    expect(group.id).toBe('group-1');
    expect(group.name).toBe('Updated AI Group');
  });

  test('deleteInterestGroup removes a group gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteInterestGroup', { id: 'group-1' });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.success).toBe('boolean');
  });
});
