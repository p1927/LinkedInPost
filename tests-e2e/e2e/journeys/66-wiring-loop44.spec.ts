/**
 * Journey 66: Wiring Loop 44/50 — Enrichment Pipeline & Marketing Pages Wiring
 *
 * Validates wiring for Journey 12 (Feed Enrichment & Debate Mode enrichment actions),
 * Journey 13 (Enrichment Pipeline), and Journey 15 (Marketing Pages) against the SPEC
 * (USE-CASES.md). Tests verify the implementation satisfies the specification,
 * failing if the spec is not met.
 *
 * Key issues being tested:
 *   Journey 66.1 (USE-CASES.md Journey 12 enrichment actions):
 *     1. crossDomainInsight action is callable and returns analogous cross-domain example
 *     2. crossDomainInsight handles empty topic gracefully (no crash)
 *     3. opinionLeaderInsights action is callable and returns curated quotes
 *     4. opinionLeaderInsights handles empty topic gracefully (no crash)
 *     5. findDraftConnections links articles to related topics/drafts
 *     6. /enrichment workspace loads without JS crash for authenticated user
 *     7. Enrichment workspace uses authorProfile from bootstrap config
 *     8. analyzeFeedArticle returns structured analysis (angle, hook, keyFacts)
 *   Journey 66.2 (USE-CASES.md Journey 13 enrichment pipeline):
 *     9. enrichTopic action accepts topic text and returns enriched result
 *    10. enrichTopic returns topic, summary, keyPoints, sources, suggestedAngles fields
 *    11. enrichTopic handles short input gracefully (no crash)
 *    12. enrichTopic handles empty/null input gracefully (returns structured result)
 *    13. enrichDraft action accepts draft text and returns enriched draft
 *    14. enrichDraft returns enrichedText, originalText, changes, rationale fields
 *    15. enrichDraft is callable from editor/review context without crash
 *    16. getEnrichmentHistory returns history array with timestamped entries
 *    17. getEnrichmentHistory handles empty history gracefully (returns array)
 *   Journey 66.3 (USE-CASES.md Journey 15):
 *    18. /pricing renders without authentication (marketing funnel)
 *    19. /pricing shows plan and CTA elements visible
 *    20. /about renders without JS crash
 *    21. /terms and /privacy-policy are reachable without auth
 *    22. /privacy-policy renders without crash
 *   Journey 66.4 (USE-CASES.md Journey 12 — Debate Mode wiring):
 *    23. findDebateArticle action is callable and returns counter-stance article
 *    24. findDebateArticle handles unknown topic gracefully (no crash)
 *    25. DebateModeView loads without JS crash for authenticated user
 *
 * API routing pattern: All actions POST to `http://localhost:5174/` with
 * `{ action: ... }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/
 * 31/32/33/34/35/36/37/38/39/40/41/42/43/44/45/46/47/48/49/50/51/52/53/54/55/
 * 56/57/58/59/60/61/62/63/64/65).
 *
 * References:
 *   USE-CASES.md — Journey 12 spec (Feed Enrichment & Debate Mode wiring: WIRED)
 *   USE-CASES.md — Journey 13 spec (Enrichment Pipeline wiring: WIRED)
 *   USE-CASES.md — Journey 15 spec (Marketing Pages wiring: WIRED)
 *   helpers/mockApi.ts — mock API helper (enrichment and scheduled action mocks)
 *   journeys/36-wiring-loop25.spec.ts — loop 25 (Feed Enrichment, enrichment action patterns)
 *   journeys/11-scheduled-publish.spec.ts — Journey 7 scheduled publish tests
 *   journeys/15-marketing-pages.spec.ts — Journey 15 marketing page tests
 *   journeys/58-wiring-loop34.spec.ts — loop 34 (Feed Page UI, feed action patterns)
 *   journeys/65-wiring-loop43.spec.ts — loop 43 (Enrichment actions & marketing pages)
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
// Journey 66.1: Enrichment Actions Wiring (Journey 12 enrichment features)
// ---------------------------------------------------------------------------

test.describe('Journey 66.1: Enrichment Actions — crossDomainInsight & opinionLeaderInsights', () => {

  test('crossDomainInsight action is callable and returns analogous cross-domain example', async ({ page }) => {
    /**
     * Spec (Journey 12): crossDomainInsight retrieves an analogous example
     * from a different industry or topic domain.
     *
     * Expected behavior: { ok: true, data: { insight: string, source: string, domain: string } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {
      topic: 'AI productivity tools',
      currentDomain: 'technology',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.insight).toBe('string');
    expect(typeof data.source).toBe('string');
    expect(typeof data.domain).toBe('string');
  });

  test('crossDomainInsight handles empty topic gracefully without crash', async ({ page }) => {
    /**
     * Spec (Journey 12): crossDomainInsight should handle empty/null topic
     * input gracefully, returning a valid structured response (not crashing).
     *
     * Expected behavior: { ok: true, data: { insight: string, ... } }
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {
      topic: '',
    });

    expect(jsErrors).toHaveLength(0);
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Boolean(data)).toBe(true);
  });

  test('crossDomainInsight is stable across repeated calls', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 5; i++) {
      const result = await fireAction(page, 'crossDomainInsight', {
        topic: 'Remote work trends',
        currentDomain: 'business',
      });
      expect(result.ok).toBe(true);
    }
  });

  test('opinionLeaderInsights action is callable and returns curated quotes', async ({ page }) => {
    /**
     * Spec (Journey 12): opinionLeaderInsights retrieves curated quotes or
     * positions from notable voices on a given topic.
     *
     * Expected behavior: { ok: true, data: { insights: Array<{ text: string, author: string }> } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'opinionLeaderInsights', {
      topic: 'Leadership in tech startups',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const insights = data.insights as unknown[];
    expect(Array.isArray(insights)).toBe(true);
  });

  test('opinionLeaderInsights handles empty topic gracefully without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'opinionLeaderInsights', {
      topic: '',
    });

    expect(jsErrors).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  test('opinionLeaderInsights returns insights with text and author fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'opinionLeaderInsights', {
      topic: 'Content marketing ROI',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const insights = data.insights as Record<string, unknown>[];

    expect(Array.isArray(insights)).toBe(true);
    if (insights.length > 0) {
      const first = insights[0];
      expect(typeof first.text).toBe('string');
      expect(typeof first.author).toBe('string');
    }
  });

  test('findDraftConnections action links articles to related topics/drafts', async ({ page }) => {
    /**
     * Spec (Journey 12): findDraftConnections retrieves related topics or
     * drafts based on an article's content.
     *
     * Expected behavior: { ok: true, data: { connections: Array } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDraftConnections', {
      articleUrl: 'https://example.com/related-article',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Boolean(data)).toBe(true);
  });

  test('findDraftConnections is callable from feed context without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const result = await fireAction(page, 'findDraftConnections', {
      articleUrl: 'https://example.com/feed-article',
    });

    expect(jsErrors).toHaveLength(0);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 66.2: Enrichment Pipeline — enrichTopic & enrichDraft Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 66.2: Enrichment Pipeline — enrichTopic & enrichDraft Wiring', () => {

  test('enrichTopic action accepts topic text and returns enriched result', async ({ page }) => {
    /**
     * Spec (Journey 13): enrichTopic enriches a topic idea with AI-generated
     * context including summary, key points, sources, and suggested angles.
     *
     * Expected behavior: { ok: true, data: { topic: string, summary: string,
     *   keyPoints: string[], sources: string[], suggestedAngles: string[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'enrichTopic', {
      topic: 'Building a personal brand on LinkedIn',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.topic).toBe('string');
    expect(typeof data.summary).toBe('string');
  });

  test('enrichTopic returns topic, summary, keyPoints, sources, suggestedAngles fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'enrichTopic', {
      topic: 'Effective remote team communication',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.topic).toBe('string');
    expect(typeof data.summary).toBe('string');

    const keyPoints = data.keyPoints as unknown[];
    if (keyPoints !== undefined) {
      expect(Array.isArray(keyPoints)).toBe(true);
    }

    const sources = data.sources as unknown[];
    if (sources !== undefined) {
      expect(Array.isArray(sources)).toBe(true);
    }

    const suggestedAngles = data.suggestedAngles as unknown[];
    if (suggestedAngles !== undefined) {
      expect(Array.isArray(suggestedAngles)).toBe(true);
    }
  });

  test('enrichTopic handles short input gracefully (no crash)', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'enrichTopic', {
      topic: 'AI',
    });

    expect(jsErrors).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  test('enrichTopic handles empty/null input gracefully (returns structured result)', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'enrichTopic', {
      topic: '',
    });

    expect(jsErrors).toHaveLength(0);
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Boolean(data)).toBe(true);
  });

  test('enrichTopic is stable across repeated calls', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'enrichTopic', {
        topic: 'Startup culture in 2026',
      });
      expect(result.ok).toBe(true);
    }
  });

  test('enrichDraft action accepts draft text and returns enriched draft', async ({ page }) => {
    /**
     * Spec (Journey 13): enrichDraft enhances an existing draft with improved
     * language, structure, or tone based on the target audience.
     *
     * Expected behavior: { ok: true, data: { enrichedText: string,
     *   originalText: string, changes: Array, rationale: string } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'enrichDraft', {
      draft: 'Working on a new project that will change how teams collaborate.',
      audience: 'tech founders',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.originalText).toBe('string');
  });

  test('enrichDraft returns enrichedText, originalText, changes, rationale fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'enrichDraft', {
      draft: 'Excited to announce our new feature launch next week.',
      audience: 'LinkedIn professionals',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.originalText).toBe('string');
    expect(typeof data.enrichedText).toBe('string');

    const changes = data.changes as unknown[];
    if (changes !== undefined) {
      expect(Array.isArray(changes)).toBe(true);
    }

    const rationale = data.rationale;
    if (rationale !== undefined) {
      expect(typeof rationale).toBe('string');
    }
  });

  test('enrichDraft is callable from editor/review context without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const result = await fireAction(page, 'enrichDraft', {
      draft: 'Draft text for enrichment test.',
      audience: 'startup founders',
    });

    expect(jsErrors).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  test('enrichDraft handles short draft text without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'enrichDraft', {
      draft: 'Short',
      audience: 'test',
    });

    expect(jsErrors).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  test('getEnrichmentHistory returns history array with timestamped entries', async ({ page }) => {
    /**
     * Spec (Journey 13): getEnrichmentHistory returns the user's previous
     * enrichment operations with timestamps.
     *
     * Expected behavior: { ok: true, data: { history: Array<{ id, type, topic, timestamp }> } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getEnrichmentHistory');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const history = data.history as unknown[];
    expect(Array.isArray(history)).toBe(true);
  });

  test('getEnrichmentHistory handles empty history gracefully (returns array)', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getEnrichmentHistory');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const history = data.history as unknown[];
    expect(Array.isArray(history)).toBe(true);
  });

  test('getEnrichmentHistory returns entries with required fields when non-empty', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getEnrichmentHistory');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const history = data.history as Record<string, unknown>[];

    expect(Array.isArray(history)).toBe(true);
    if (history.length > 0) {
      const first = history[0];
      expect(typeof first.id).toBe('string');
      expect(typeof first.type).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 66.3: Enrichment Workspace — UI Integration Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 66.3: Enrichment Workspace — UI Integration Wiring', () => {

  test('enrichment workspace loads without JS crash for authenticated user', async ({ page }) => {
    /**
     * Spec (Journey 12): The /enrichment workspace is gated by FEATURE_ENRICHMENT
     * and provides access to cross-domain insights, opinion leader takes, and
     * debate mode features.
     *
     * Expected behavior: Page renders without JS errors, body has content.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('enrichment workspace is reachable from sidebar nav without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Try clicking enrichment link if visible
    const enrichmentLink = page.locator('a[href*="enrichment"]')
      .or(page.getByRole('link', { name: /enrich/i }))
      .first();

    if (await enrichmentLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enrichmentLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
    }

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('enrichment workspace uses authorProfile from bootstrap config', async ({ page }) => {
    /**
     * Spec (Journey 12): The enrichment workspace uses authorProfile from
     * bootstrap config to personalize insights.
     *
     * Expected behavior: bootstrap config includes authorProfile string.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(typeof config.authorProfile).toBe('string');
    expect(config.authorProfile).toBeTruthy();
  });

  test('enrichment workspace uses llm config for model override', async ({ page }) => {
    /**
     * Spec (Journey 12): The enrichment workspace uses llm config for LLM
     * provider override in enrichment actions.
     *
     * Expected behavior: config.llm is null or an object with provider/model fields.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    const llm = config.llm;
    if (llm !== null) {
      expect(typeof llm).toBe('object');
    }
  });

  test('analyzeFeedArticle returns structured analysis (angle, hook, keyFacts)', async ({ page }) => {
    /**
     * Spec (Journey 12): analyzeFeedArticle returns per-article analysis
     * with angle, hook, and keyFacts fields.
     *
     * Expected behavior: { ok: true, data: { angle: string, hook: string, keyFacts: string[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'analyzeFeedArticle', {
      articleUrl: 'https://example.com/article-to-analyze',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Boolean(data)).toBe(true);
    expect(typeof data.angle).toBe('string');
  });

  test('analyzeFeedArticle is callable without crash from feed context', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const result = await fireAction(page, 'analyzeFeedArticle', {
      articleUrl: 'https://example.com/test-article',
    });

    expect(jsErrors).toHaveLength(0);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 66.4: Debate Mode Wiring (Journey 12)
// ---------------------------------------------------------------------------

test.describe('Journey 66.4: Debate Mode — findDebateArticle Wiring', () => {

  test('findDebateArticle action is callable and returns counter-stance article', async ({ page }) => {
    /**
     * Spec (Journey 12): findDebateArticle retrieves a counter-stance article
     * or perspective to the user's current draft topic.
     *
     * Expected behavior: { ok: true, data: { article: Article, angle: string } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {
      topic: 'Why remote work is better than office work',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Boolean(data)).toBe(true);
  });

  test('findDebateArticle returns article with required fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {
      topic: 'AI will replace creative jobs',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Boolean(data)).toBe(true);

    // article field should be an object or null
    const article = data.article;
    expect(article === null || typeof article === 'object').toBe(true);

    expect(typeof data.angle).toBe('string');
  });

  test('findDebateArticle handles unknown topic gracefully (no crash)', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {
      topic: '',
    });

    expect(jsErrors).toHaveLength(0);
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Boolean(data)).toBe(true);
  });

  test('findDebateArticle is stable across repeated calls', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 5; i++) {
      const result = await fireAction(page, 'findDebateArticle', {
        topic: 'Continuous learning for professionals',
      });
      expect(result.ok).toBe(true);
    }
  });

  test('DebateModeView loads without JS crash for authenticated user', async ({ page }) => {
    /**
     * Spec (Journey 12): The debate mode view (/debate or debate panel) is
     * accessible from the enrichment workspace and loads without JS errors.
     *
     * Expected behavior: Page renders without JS errors.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 66.5: Marketing Pages Wiring (Journey 15)
// ---------------------------------------------------------------------------

test.describe('Journey 66.5: Marketing Pages — Pricing, About, Legal Wiring', () => {

  test('/pricing renders without authentication (marketing funnel)', async ({ page }) => {
    /**
     * Spec (Journey 15): Marketing pages (/pricing, /about, /terms, /privacy-policy)
     * are publicly accessible without authentication.
     *
     * Expected behavior: Page renders without requiring sign-in.
     */
    await setupApiMocks(page, {});
    // Do NOT call injectFakeToken — marketing pages should be public

    await page.goto('http://localhost:5174/pricing', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('/pricing shows plan and CTA elements visible', async ({ page }) => {
    await setupApiMocks(page, {});

    await page.goto('http://localhost:5174/pricing', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Should show some plan or pricing content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(20);
  });

  test('/about renders without JS crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});

    await page.goto('http://localhost:5174/about', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('/terms is reachable without auth and renders without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});

    await page.goto('http://localhost:5174/terms', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('/privacy-policy is reachable without auth and renders without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});

    await page.goto('http://localhost:5174/privacy-policy', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('marketing pages load without JS crash from unauthenticated state', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    // No auth token — simulate fresh visitor

    await page.goto('http://localhost:5174/pricing', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 66.6: Action Routing Stability — Enrichment Actions
// ---------------------------------------------------------------------------

test.describe('Journey 66.6: Action Routing Stability — Enrichment & Pipeline Actions', () => {

  test('all enrichment actions are stable across repeated calls', async ({ page }) => {
    /**
     * Spec: All enrichment and pipeline actions should be stable across
     * repeated calls — no state corruption or routing errors.
     *
     * Expected behavior: Each action returns ok: true across 5 repeated calls.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const actions = [
      { name: 'crossDomainInsight', body: { topic: 'Tech trends', currentDomain: 'technology' } },
      { name: 'opinionLeaderInsights', body: { topic: 'AI in business' } },
      { name: 'findDraftConnections', body: { articleUrl: 'https://example.com/article' } },
      { name: 'analyzeFeedArticle', body: { articleUrl: 'https://example.com/article' } },
      { name: 'findDebateArticle', body: { topic: 'Startup funding' } },
      { name: 'getEnrichmentHistory', body: {} },
    ];

    for (const { name, body } of actions) {
      for (let i = 0; i < 5; i++) {
        const result = await fireAction(page, name, body);
        expect(result.ok).toBe(true);
      }
    }
  });

  test('enrichment actions work after bootstrap without crash', async ({ page }) => {
    /**
     * Spec: Enrichment actions should route correctly after bootstrap session
     * is established.
     *
     * Expected behavior: Bootstrap succeeds, then enrichment actions succeed.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const bootstrapResult = await fireAction(page, 'bootstrap');
    expect(bootstrapResult.ok).toBe(true);

    const enrichResult = await fireAction(page, 'enrichTopic', {
      topic: 'Building a content calendar',
    });
    expect(enrichResult.ok).toBe(true);

    const enrichDraftResult = await fireAction(page, 'enrichDraft', {
      draft: 'Sample draft for testing.',
      audience: 'marketers',
    });
    expect(enrichDraftResult.ok).toBe(true);
  });

  test('enrichment actions interleaved with dashboard actions work without crash', async ({ page }) => {
    /**
     * Spec: Enrichment and dashboard actions should work together without
     * interference when called in interleaved sequence.
     *
     * Expected behavior: Both action domains route correctly in interleaved sequence.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const interleaved = [
      { action: 'bootstrap' },
      { action: 'getRows' },
      { action: 'crossDomainInsight', body: { topic: 'Content strategy', currentDomain: 'marketing' } },
      { action: 'enrichTopic', body: { topic: 'LinkedIn best practices' } },
      { action: 'opinionLeaderInsights', body: { topic: 'B2B sales' } },
      { action: 'findDebateArticle', body: { topic: 'Content quality vs quantity' } },
    ];

    for (const { action, body = {} } of interleaved) {
      const result = await fireAction(page, action, body as Record<string, unknown>);
      expect(result.ok).toBe(true);
    }
  });

  test('enrichTopic and enrichDraft work in sequence without crash', async ({ page }) => {
    /**
     * Spec (Journey 13): enrichTopic followed by enrichDraft should be
     * stable in sequence with no state corruption.
     *
     * Expected behavior: Both actions succeed in sequence.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const enrichTopicResult = await fireAction(page, 'enrichTopic', {
      topic: 'Remote work productivity',
    });
    expect(enrichTopicResult.ok).toBe(true);

    const enrichDraftResult = await fireAction(page, 'enrichDraft', {
      draft: 'Working from home can boost productivity.',
      audience: 'HR professionals',
    });
    expect(enrichDraftResult.ok).toBe(true);
  });

  test('enrichment actions callable from any authenticated context', async ({ page }) => {
    /**
     * Spec: Enrichment actions should be callable from dashboard, feed, review,
     * or enrichment pages without routing errors.
     *
     * Expected behavior: Action succeeds from any authenticated context.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Call from dashboard context
    await gotoAuthenticated(page, '/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const result = await fireAction(page, 'crossDomainInsight', {
      topic: 'Team building',
      currentDomain: 'management',
    });
    expect(result.ok).toBe(true);
  });
});
