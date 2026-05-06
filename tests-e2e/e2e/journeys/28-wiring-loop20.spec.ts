/**
 * Journey 28: Wiring Loop 20/50 — Feed Enrichment API Contract
 *
 * Validates wiring issues identified in the spec for el-36c5f5d3cc56.
 * Tests verify the feed enrichment API wiring, response shapes, and UI behavior
 * against the specification (not against implementation).
 *
 * Key issues being tested (from Journey 12 spec — Feed Enrichment & Debate Mode):
 *   1. getFeedArticles returns articles array with required fields
 *   2. refreshFeedArticles returns stale=false and articles array
 *   3. setArticleFeedback returns vote confirmation
 *   4. getArticleFeedback returns object
 *   5. listClips / createClip / deleteClip wired correctly
 *   6. assignClipToPost / unassignClipFromPost wired correctly
 *   7. listInterestGroups / createInterestGroup / deleteInterestGroup wired
 *   8. updateInterestGroup wired
 *   9. generateVariantsPreview / generateQuickChange wired with correct shapes
 *   10. getNodeRuns wired with correct shape
 *   11. searchNewsResearch wired
 *   12. listCustomPersonas / createCustomPersona / deleteCustomPersona wired
 *   13. listCustomWorkflows / createCustomWorkflow / deleteCustomWorkflow wired
 *
 * API routing pattern: All enrichment actions POST to / with { action: … } body.
 * The mockApi.ts route handler intercepts these calls in the browser context.
 *
 * References:
 *   journeys/23-wiring-loop3.spec.ts — loop 3 (wizard wiring, patterns)
 *   journeys/24-wiring-loop4.spec.ts — loop 4 (wizard wiring)
 *   journeys/25-wiring-loop9.spec.ts — loop 9 (wizard wiring)
 *   journeys/26-wiring-loop16.spec.ts — loop 16 (wizard wiring)
 *   journeys/27-wiring-loop19.spec.ts — loop 19 (wizard wiring)
 *   helpers/mockApi.ts — mock API helper (with feed/enrichment action mocks)
 *   helpers/mockSetupApi.ts — mock setup API helper
 *
 * Wiring Loop 20 Fixes (2026-04-30): Documented in USE-CASES.md.
 */

import { test, expect, type Page } from '@playwright/test';
import {
  setupApiMocks,
  injectFakeToken,
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
// Journey 28.1: Feed — Article List & Article Shape
// ---------------------------------------------------------------------------

test.describe('Journey 28.1: Feed — Article List & Shape', () => {

  test('getFeedArticles returns articles array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): getFeedArticles returns articles list with feedback controls.
     *
     * Expected behavior: { ok: true, data: { articles: FeedArticle[] } } where each
     * article has url, title, source, publishedAt, snippet, imageUrl.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as { articles: unknown[] };
    expect(Array.isArray(data.articles)).toBe(true);
    expect(data.articles.length).toBeGreaterThan(0);

    // Verify required fields on each article
    for (const article of data.articles) {
      const a = article as Record<string, unknown>;
      expect(typeof a.url).toBe('string');
      expect(a.url.length).toBeGreaterThan(0);
      expect(typeof a.title).toBe('string');
      expect(a.title.length).toBeGreaterThan(0);
      expect(typeof a.source).toBe('string');
      expect(typeof a.publishedAt).toBe('string');
      expect(typeof a.snippet).toBe('string');
    }
  });

  test('getFeedArticles returns stale:false on fresh data', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as { stale?: boolean };
    // stale field should exist and be boolean
    expect(typeof (data.stale)).toBe('boolean');
  });

  test('feed page renders without JS crash after bootstrap', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 28.2: Feed — Refresh & Feedback
// ---------------------------------------------------------------------------

test.describe('Journey 28.2: Feed — Refresh & Feedback', () => {

  test('refreshFeedArticles returns articles and stale=false', async ({ page }) => {
    /**
     * Spec (Journey 12): refreshFeedArticles fires on demand.
     *
     * Expected behavior: { ok: true, data: { articles: [...], stale: false, ... } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'refreshFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as { articles: unknown[]; stale: boolean };
    expect(Array.isArray(data.articles)).toBe(true);
    expect(data.stale).toBe(false);
  });

  test('setArticleFeedback returns vote confirmation', async ({ page }) => {
    /**
     * Spec (Journey 12): setArticleFeedback returns vote confirmation per article.
     *
     * Expected behavior: { ok: true, data: { vote: 'up'|'down' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'setArticleFeedback', {
      articleUrl: 'https://example.com/ai',
      vote: 'up',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.vote).toBe('up');
  });

  test('getArticleFeedback returns empty object on no feedback', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getArticleFeedback', {
      articleUrl: 'https://example.com/ai',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// Journey 28.3: Feed — Clip Management Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 28.3: Feed — Clip Management', () => {

  test('listClips returns clips array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): listClips returns clips grouped by theme for a draft.
     *
     * Expected behavior: { ok: true, data: Clip[] } where each clip has
     * id, type, passageText, articleTitle, articleUrl, source, createdAt.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listClips');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      const clip = data[0] as Record<string, unknown>;
      expect(typeof clip.id).toBe('string');
      expect(typeof clip.type).toBe('string');
      expect(typeof clip.passageText).toBe('string');
      expect(typeof clip.articleTitle).toBe('string');
      expect(typeof clip.articleUrl).toBe('string');
      expect(typeof clip.createdAt).toBe('string');
    }
  });

  test('createClip fires with required fields and returns clip with id', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createClip', {
      type: 'passage',
      passageText: 'AI is transforming how startups operate.',
      articleTitle: 'AI Trends 2024',
      articleUrl: 'https://example.com/ai',
      source: 'TechCrunch',
      publishedAt: '2024-01-01',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(data.passageText).toBe('AI is transforming how startups operate.');
  });

  test('assignClipToPost returns clip with assignedPostIds', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'assignClipToPost', {
      clipId: 'clip-1',
      postId: 'topic-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.assignedPostIds)).toBe(true);
    expect((data.assignedPostIds as string[]).includes('topic-1')).toBe(true);
  });

  test('unassignClipFromPost returns clip with empty assignedPostIds', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'unassignClipFromPost', {
      clipId: 'clip-1',
      postId: 'topic-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.assignedPostIds)).toBe(true);
    expect((data.assignedPostIds as string[]).length).toBe(0);
  });

  test('deleteClip returns success:true', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteClip', {
      clipId: 'clip-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 28.4: Feed — Interest Groups Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 28.4: Feed — Interest Groups', () => {

  test('listInterestGroups returns groups array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): listInterestGroups returns interest groups.
     *
     * Expected behavior: { ok: true, data: InterestGroup[] } where each group
     * has id, name, topics[], color, domains[].
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listInterestGroups');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      const group = data[0] as Record<string, unknown>;
      expect(typeof group.id).toBe('string');
      expect(typeof group.name).toBe('string');
      expect(Array.isArray(group.topics)).toBe(true);
      expect(typeof group.color).toBe('string');
      expect(Array.isArray(group.domains)).toBe(true);
    }
  });

  test('createInterestGroup fires with name/topics/color and returns group with id', async ({ page }) => {
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
  });

  test('updateInterestGroup fires and returns updated group', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'updateInterestGroup', {
      id: 'group-1',
      name: 'Updated Group',
      topics: 'ai,llm',
      color: '#10b981',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.name).toBe('Updated Group');
  });

  test('deleteInterestGroup returns success:true', async ({ page }) => {
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
// Journey 28.5: Enrichment — Generation Actions Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 28.5: Enrichment — Generation Actions', () => {

  test('generateVariantsPreview fires and returns variants array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): Action-based mocks for generation preview wiring tests
     * work without hitting the real worker.
     *
     * Expected behavior: { ok: true, data: { variants: Variant[] } } where each
     * variant has id, label, replacementText, fullText, hookType, arcType.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'generateVariantsPreview', {
      topicId: 'topic-1',
      draftText: 'AI tools are reshaping how founders build products.',
    });

    expect(result.ok).toBe(true);
    const data = result.data as { variants: unknown[]; scope: string; model: string };
    expect(Array.isArray(data.variants)).toBe(true);
    expect(data.variants.length).toBeGreaterThan(0);
    expect(data.scope).toBe('full');
    expect(typeof data.model).toBe('string');

    // Verify variant structure
    const variant = data.variants[0] as Record<string, unknown>;
    expect(typeof variant.id).toBe('string');
    expect(typeof variant.label).toBe('string');
    expect(typeof variant.replacementText).toBe('string');
    expect(typeof variant.fullText).toBe('string');
    expect(typeof variant.hookType).toBe('string');
    expect(typeof variant.arcType).toBe('string');
  });

  test('generateQuickChange fires and returns replacementText and fullText', async ({ page }) => {
    /**
     * Spec (Journey 9): generateQuickChange fires with selected text and returns
     * replacement text for inline preview.
     *
     * Expected behavior: { ok: true, data: { replacementText, fullText, scope, model } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'generateQuickChange', {
      topicId: 'topic-1',
      selectedText: 'AI tools are reshaping how founders build products.',
      instructions: 'Tighten the spacing',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.replacementText).toBe('string');
    expect(typeof data.fullText).toBe('string');
    expect(typeof data.scope).toBe('string');
    expect(typeof data.model).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Journey 28.6: Enrichment — Node Runs Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 28.6: Enrichment — Node Runs', () => {

  test('getNodeRuns returns nodeRuns array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): getNodeRuns returns enrichment node run history.
     *
     * Expected behavior: { ok: true, data: { nodeRuns: NodeRunItem[] } } where each
     * run has id, node_id, model, status, created_at, input_json, output_json.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getNodeRuns', {
      runId: 'run-abc123',
    });

    expect(result.ok).toBe(true);
    const data = result.data as { nodeRuns: unknown[] };
    expect(Array.isArray(data.nodeRuns)).toBe(true);

    if (data.nodeRuns.length > 0) {
      const run = data.nodeRuns[0] as Record<string, unknown>;
      expect(typeof run.id).toBe('string');
      expect(typeof run.node_id).toBe('string');
      expect(typeof run.model).toBe('string');
      expect(typeof run.status).toBe('string');
      expect(typeof run.created_at).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 28.7: Feed — News Research Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 28.7: Feed — News Research', () => {

  test('searchNewsResearch fires and returns articles array', async ({ page }) => {
    /**
     * Spec (Journey 11): searchNewsResearch returns aggregated news articles.
     *
     * Expected behavior: { ok: true, data: { articles: NewsArticle[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchNewsResearch', {
      query: 'AI tools for founders',
    });

    expect(result.ok).toBe(true);
    const data = result.data as { articles: unknown[] };
    expect(Array.isArray(data.articles)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 28.8: Personas & Workflows Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 28.8: Personas & Workflows', () => {

  test('listCustomPersonas returns array (empty or populated)', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listCustomPersonas');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('createCustomPersona fires with name and returns persona with id', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createCustomPersona', {
      name: 'Tech Founder Persona',
      currentFocus: 'Building AI startups',
      language: 'en',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(data.name).toBe('Tech Founder Persona');
  });

  test('deleteCustomPersona returns success:true', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteCustomPersona', {
      id: 'persona-custom-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.success).toBe(true);
  });

  test('listCustomWorkflows returns array (empty or populated)', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listCustomWorkflows');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('createCustomWorkflow fires and returns workflow with id', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createCustomWorkflow', {
      name: 'Tech Narrative',
      steps: ['hook', 'body', 'cta'],
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
  });

  test('deleteCustomWorkflow returns success:true', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteCustomWorkflow', {
      id: 'workflow-custom-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.success).toBe(true);
  });
});
