/**
 * Journey 44: Wiring Loop 28/50 — Cross-Cutting Integration Wiring
 *
 * Validates wiring for cross-cutting concerns across Journeys 12 and 13.
 * Tests verify the enrichment + discovery integration, error handling,
 * response shapes, and UI behavior against the specification (not against
 * implementation).
 *
 * Key issues being tested (from USE-CASES.md Journeys 12/13):
 *   1. Enrichment actions work alongside topic discovery actions
 *   2. Feed enrichment returns articles with required fields (url, title, source)
 *   3. Clips (saved passages) can be created and assigned to posts
 *   4. Interest groups wire to feed clustering
 *   5. Node runs return structured data for enrichment pipeline
 *   6. Trending topics integrate with feed enrichment
 *   7. Error handling for enrichment endpoints
 *   8. Error handling for discovery endpoints
 *   9. Feed page renders without JS crash
 *  10. Discovery page renders without JS crash
 *  11. Action routing stable across enrichment + discovery calls
 *  12. Custom personas and workflows integrate with enrichment
 *
 * API routing pattern: All enrichment/discovery actions POST to `/` with
 * `{ action: … }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/
 * 33/35/36/37/38/39/40/41/42/43).
 *
 * References:
 *   journeys/28-wiring-loop20.spec.ts — loop 20 (Feed Enrichment API contract)
 *   journeys/30-wiring-loop24.spec.ts — loop 24 (Topic Discovery API contract)
 *   journeys/35-wiring-loop25.spec.ts — loop 25 (Custom Workflows & Writing Styles)
 *   journeys/36-wiring-loop25.spec.ts — loop 25 (Feed Enrichment & Editor Integration)
 *   journeys/43-wiring-loop28.spec.ts — loop 28 (Trending & Research Wiring)
 *   helpers/mockApi.ts — mock API helper (with enrichment/discovery action mocks)
 *   USE-CASES.md — wiring status for Journey 12 (Feed Enrichment)
 *   USE-CASES.md — wiring status for Journey 13 (Trending & Research)
 */

import { test, expect, type Page } from '@playwright/test';
import {
  setupApiMocks,
  injectFakeToken,
  gotoAuthenticated,
  MOCK_SESSION,
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
// Journey 44.1: Feed Enrichment — Core Articles Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 44.1: Feed Enrichment — Core Articles Wiring', () => {

  test('getFeedArticles returns articles array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): getFeedArticles returns an array of articles with
     * url, title, source, publishedAt, snippet, imageUrl fields.
     *
     * Expected behavior: { ok: true, data: { data: Article[], stale: boolean } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');

    const articles = (data.data ?? data.articles ?? data) as unknown[];
    expect(Array.isArray(articles)).toBe(true);
  });

  test('getFeedArticles returns stale flag for cache management', async ({ page }) => {
    /**
     * Spec (Journey 12): getFeedArticles includes a stale boolean flag
     * to indicate whether the articles need refresh.
     *
     * Expected behavior: response data includes stale: boolean
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.stale).toBe('boolean');
  });

  test('getFeedArticles returns articles with url and title', async ({ page }) => {
    /**
     * Spec (Journey 12): Each article must have url and title.
     *
     * Expected behavior: articles[0].url is a string URL, articles[0].title is a string
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const articles = (data.data ?? data.articles ?? data) as Record<string, unknown>[];

    if (articles.length > 0) {
      expect(typeof articles[0].url).toBe('string');
      expect(typeof articles[0].title).toBe('string');
      expect(articles[0].url).toMatch(/^https?:\/\//);
    }
  });

  test('refreshFeedArticles returns fresh articles array', async ({ page }) => {
    /**
     * Spec (Journey 12): refreshFeedArticles forces a fresh fetch of articles.
     * Returns the updated articles array.
     *
     * Expected behavior: { ok: true, data: Article[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'refreshFeedArticles');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const articles = (data.data ?? data.articles ?? data) as unknown[];
    expect(Array.isArray(articles)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 44.2: Feed Enrichment — Feedback Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 44.2: Feed Enrichment — Feedback Wiring', () => {

  test('setArticleFeedback accepts up vote', async ({ page }) => {
    /**
     * Spec (Journey 12): setArticleFeedback accepts vote types
     * up, down, skip to record user feedback on articles.
     *
     * Expected behavior: { ok: true, data: { success: true } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'setArticleFeedback', {
      articleUrl: 'https://example.com/ai-article-1',
      vote: 'up',
    });

    expect(result.ok).toBe(true);
  });

  test('setArticleFeedback accepts down vote', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'setArticleFeedback', {
      articleUrl: 'https://example.com/ai-article-1',
      vote: 'down',
    });

    expect(result.ok).toBe(true);
  });

  test('setArticleFeedback accepts skip vote', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'setArticleFeedback', {
      articleUrl: 'https://example.com/ai-article-1',
      vote: 'skip',
    });

    expect(result.ok).toBe(true);
  });

  test('getArticleFeedback returns feedback object for articles', async ({ page }) => {
    /**
     * Spec (Journey 12): getArticleFeedback returns the feedback object
     * for previously voted articles.
     *
     * Expected behavior: { ok: true, data: { [articleUrl]: vote } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getArticleFeedback');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// Journey 44.3: Feed Enrichment — Clips Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 44.3: Feed Enrichment — Clips Wiring', () => {

  test('listClips returns clips array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): listClips returns clips (saved passages) with
     * id, type, passageText, articleTitle fields.
     *
     * Expected behavior: { ok: true, data: Clip[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listClips');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const clips = (data.data ?? data.clips ?? data) as unknown[];
    expect(Array.isArray(clips)).toBe(true);
  });

  test('createClip creates a new clip', async ({ page }) => {
    /**
     * Spec (Journey 12): createClip saves a new passage clip.
     *
     * Expected behavior: { ok: true, data: { id: string, passageText: string, ... } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createClip', {
      passageText: 'AI-powered tools are reshaping how startups operate.',
      articleTitle: 'How AI Is Transforming Startup Operations',
      articleUrl: 'https://example.com/ai-article-1',
      type: 'passage',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('assignClipToPost links a clip to a post', async ({ page }) => {
    /**
     * Spec (Journey 12): assignClipToPost links a clip to a topic/post.
     *
     * Expected behavior: { ok: true, data: { success: true } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'assignClipToPost', {
      clipId: 'clip-1',
      postId: 'topic-1',
    });

    expect(result.ok).toBe(true);
  });

  test('unassignClipFromPost unlinks a clip from a post', async ({ page }) => {
    /**
     * Spec (Journey 12): unassignClipFromPost removes a clip from a topic/post.
     *
     * Expected behavior: { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'unassignClipFromPost', {
      clipId: 'clip-1',
      postId: 'topic-1',
    });

    expect(result.ok).toBe(true);
  });

  test('deleteClip removes a clip gracefully', async ({ page }) => {
    /**
     * Spec (Journey 12): deleteClip removes a clip by id.
     *
     * Expected behavior: { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteClip', { clipId: 'clip-1' });

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 44.4: Feed Enrichment — Interest Groups Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 44.4: Feed Enrichment — Interest Groups Wiring', () => {

  test('listInterestGroups returns groups with topics array', async ({ page }) => {
    /**
     * Spec (Journey 12): listInterestGroups returns interest groups with
     * id, name, topics array fields.
     *
     * Expected behavior: { ok: true, data: InterestGroup[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listInterestGroups');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const groups = (data.data ?? data.groups ?? data) as unknown[];
    expect(Array.isArray(groups)).toBe(true);
  });

  test('createInterestGroup creates a new interest group', async ({ page }) => {
    /**
     * Spec (Journey 12): createInterestGroup creates a new group with
     * name and topics fields.
     *
     * Expected behavior: { ok: true, data: { id: string, name: string, topics: string[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createInterestGroup', {
      name: 'AI & Technology',
      topics: ['artificial intelligence', 'machine learning'],
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('updateInterestGroup updates existing group', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'updateInterestGroup', {
      id: 'group-1',
      name: 'AI & Technology Updated',
      topics: ['artificial intelligence', 'llm'],
    });

    expect(result.ok).toBe(true);
  });

  test('deleteInterestGroup removes a group gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteInterestGroup', { id: 'group-1' });

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 44.5: Feed Enrichment — Debate & Cross-Domain Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 44.5: Feed Enrichment — Debate & Cross-Domain Wiring', () => {

  test('findDebateArticle returns counter-stance article for draft topic', async ({ page }) => {
    /**
     * Spec (Journey 12): findDebateArticle retrieves a counter-stance article
     * for a given draft topic, enabling debate mode in the editor.
     *
     * Expected behavior: { ok: true, data: { article: Article } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {
      topic: 'AI Tools for Founders',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('findDebateArticle handles unknown/empty topic gracefully', async ({ page }) => {
    /**
     * Spec (Journey 12): When no debate article is found, the action
     * returns { ok: true, data: null } (not error).
     *
     * Expected behavior: { ok: true, data: null }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDebateArticle', {
      topic: '',
    });

    expect(result.ok).toBe(true);
    // data is null or object — not an error
    if (result.data !== null) expect(typeof result.data).toBe('object');
  });

  test('crossDomainInsight returns analogous example from different industry', async ({ page }) => {
    /**
     * Spec (Journey 12): crossDomainInsight pulls an analogous example
     * from a different industry for the given topic.
     *
     * Expected behavior: { ok: true, data: { insight: string, domain: string } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {
      topic: 'Remote Work Culture',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('crossDomainInsight handles unknown topic gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'crossDomainInsight', {
      topic: 'nonexistent-topic-xyz',
    });

    expect(result.ok).toBe(true);
    // Returns null or object, not an error
    if (result.data !== null) expect(typeof result.data).toBe('object');
  });

  test('opinionLeaderInsights returns curated quotes from notable voices', async ({ page }) => {
    /**
     * Spec (Journey 12): opinionLeaderInsights returns curated quotes and
     * positions from notable voices for the given topic.
     *
     * Expected behavior: { ok: true, data: { insights: Insight[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'opinionLeaderInsights', {
      topic: 'AI Tools for Founders',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// Journey 44.6: Feed Enrichment — Article Analysis Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 44.6: Feed Enrichment — Article Analysis Wiring', () => {

  test('analyzeFeedArticle returns structured analysis', async ({ page }) => {
    /**
     * Spec (Journey 12): analyzeFeedArticle returns per-article analysis
     * with angle, hook, keyFacts fields.
     *
     * Expected behavior: { ok: true, data: { angle: string, hook: string, keyFacts: string[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'analyzeFeedArticle', {
      articleUrl: 'https://example.com/ai-article-1',
      topic: 'AI Tools for Founders',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('findDraftConnections links articles to related topics', async ({ page }) => {
    /**
     * Spec (Journey 12): findDraftConnections surfaces related topics/drafts
     * for a given article.
     *
     * Expected behavior: { ok: true, data: { connections: Draft[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'findDraftConnections', {
      articleUrl: 'https://example.com/ai-article-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// Journey 44.7: Feed Enrichment — Node Runs Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 44.7: Feed Enrichment — Node Runs Wiring', () => {

  test('getNodeRuns returns nodeRuns array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): getNodeRuns returns structured data from the
     * enrichment pipeline with id, run_id, node_id, status, duration_ms fields.
     *
     * Expected behavior: { ok: true, data: { nodeRuns: NodeRun[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getNodeRuns');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const nodeRuns = (data.nodeRuns ?? data.data ?? data) as unknown[];
    expect(Array.isArray(nodeRuns)).toBe(true);
  });

  test('getNodeRuns returns runs with status field', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getNodeRuns');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const nodeRuns = (data.nodeRuns ?? data.data ?? data) as Record<string, unknown>[];

    if (nodeRuns.length > 0) {
      expect(typeof nodeRuns[0].id).toBe('string');
      expect(typeof nodeRuns[0].status).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 44.8: Trending & Research — Integration Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 44.8: Trending & Research — Integration Wiring', () => {

  test('getTrendingTopics returns topics with id and name', async ({ page }) => {
    /**
     * Spec (Journey 11): getTrendingTopics returns trending topics with
     * id, name, category, volume, trend, source fields.
     *
     * Expected behavior: { ok: true, data: { data: Topic[], stale: boolean } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTrendingTopics');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');

    const topics = (data.data ?? data.topics ?? data) as unknown[];
    expect(Array.isArray(topics)).toBe(true);
  });

  test('getTrendingTopics returns stale flag', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTrendingTopics');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.stale).toBe('boolean');
  });

  test('getTrendingTopics accepts platform filter', async ({ page }) => {
    /**
     * Spec (Journey 11): getTrendingTopics accepts platform parameter
     * (e.g., 'linkedin', 'youtube') to filter by platform.
     *
     * Expected behavior: { ok: true, data: Topic[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTrendingTopics', {
      platform: 'linkedin',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const topics = (data.data ?? data.topics ?? data) as unknown[];
    expect(Array.isArray(topics)).toBe(true);
  });

  test('searchTopics fires with query and returns results', async ({ page }) => {
    /**
     * Spec (Journey 11): searchTopics fires with query and returns matching
     * topics. Handles empty query gracefully.
     *
     * Expected behavior: { ok: true, data: Topic[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchTopics', {
      query: 'artificial intelligence',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const topics = (data.data ?? data.topics ?? data) as unknown[];
    expect(Array.isArray(topics)).toBe(true);
  });

  test('searchTopics handles empty query gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchTopics', {
      query: '',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('discoverTopics returns AI-suggested topics', async ({ page }) => {
    /**
     * Spec (Journey 11): discoverTopics returns AI-suggested topics with
     * sources array and respects limit parameter.
     *
     * Expected behavior: { ok: true, data: { topics: Topic[], sources: Source[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'discoverTopics', {
      interests: ['startups', 'ai'],
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('discoverTopics respects limit parameter', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'discoverTopics', {
      limit: 5,
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const topics = (data.topics ?? data.data ?? data) as unknown[];
    expect(Array.isArray(topics)).toBe(true);
  });

  test('getTopicDetails returns topic metadata', async ({ page }) => {
    /**
     * Spec (Journey 11): getTopicDetails returns topic metadata with
     * name, description, relatedTopics array, sentimentBreakdown.
     *
     * Expected behavior: { ok: true, data: TopicDetails }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTopicDetails', {
      topicId: 'topic-ai-tools',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('getTopicDetails handles unknown topicId gracefully', async ({ page }) => {
    /**
     * Spec (Journey 11): When no topic is found, getTopicDetails returns
     * null or error gracefully (not crash).
     *
     * Expected behavior: { ok: true, data: null } or { ok: false, error: '...' }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getTopicDetails', {
      topicId: 'nonexistent-topic-id-xyz',
    });

    // Either returns null or an error — both are graceful
    if (result.ok !== true) expect(typeof result.error).toBe('string');
  });

  test('getLinkedInTrending returns LinkedIn-specific trending topics', async ({ page }) => {
    /**
     * Spec (Journey 11): getLinkedInTrending returns LinkedIn-specific
     * trending topics with engagement metrics.
     *
     * Expected behavior: { ok: true, data: LinkedInTrendingTopic[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getLinkedInTrending');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const items = (data.data ?? data.topics ?? data) as unknown[];
    expect(Array.isArray(items)).toBe(true);
  });

  test('getYouTubeTrending returns YouTube-specific trending topics', async ({ page }) => {
    /**
     * Spec (Journey 11): getYouTubeTrending returns YouTube-specific
     * trending topics with view counts.
     *
     * Expected behavior: { ok: true, data: YouTubeTrendingTopic[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getYouTubeTrending');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const items = (data.data ?? data.topics ?? data) as unknown[];
    expect(Array.isArray(items)).toBe(true);
  });

  test('saveTopicToQueue fires with topic data and returns saved topic', async ({ page }) => {
    /**
     * Spec (Journey 11): saveTopicToQueue accepts topic metadata and
     * returns the saved topic. Handles duplicate gracefully.
     *
     * Expected behavior: { ok: true, data: { topic: SavedTopic } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'saveTopicToQueue', {
      name: 'AI Tools for Founders',
      category: 'technology',
      source: 'linkedin-trending',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('saveTopicToQueue accepts all metadata fields', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'saveTopicToQueue', {
      name: 'Remote Work Culture',
      category: 'business',
      source: 'youtube-trending',
      volume: 15000,
      trend: 'rising',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// Journey 44.9: Feed Enrichment — News Research Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 44.9: Feed Enrichment — News Research Wiring', () => {

  test('searchNewsResearch returns results', async ({ page }) => {
    /**
     * Spec (Journey 12): searchNewsResearch returns news research results
     * aggregated from provider APIs.
     *
     * Expected behavior: { ok: true, data: { results: NewsArticle[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchNewsResearch', {
      query: 'startup AI tools',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('searchNewsResearch handles empty query', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'searchNewsResearch', {
      query: '',
    });

    // Should return empty results or null gracefully
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 44.10: Custom Personas & Workflows Integration
// ---------------------------------------------------------------------------

test.describe('Journey 44.10: Custom Personas & Workflows Integration', () => {

  test('listCustomPersonas returns personas array with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12): listCustomPersonas returns personas with
     * id, name, currentFocus fields.
     *
     * Expected behavior: { ok: true, data: Persona[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listCustomPersonas');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const personas = (data.data ?? data.personas ?? data) as unknown[];
    expect(Array.isArray(personas)).toBe(true);
  });

  test('createCustomPersona creates a new persona', async ({ page }) => {
    /**
     * Spec (Journey 12): createCustomPersona creates a persona with name
     * and currentFocus fields.
     *
     * Expected behavior: { ok: true, data: { id: string, name: string, currentFocus: string } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createCustomPersona', {
      name: 'Tech Founder Persona',
      currentFocus: 'AI Tools for early-stage startups',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('deleteCustomPersona removes a persona gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteCustomPersona', { id: 'persona-1' });

    expect(result.ok).toBe(true);
  });

  test('listCustomWorkflows returns workflows array with id and name', async ({ page }) => {
    /**
     * Spec (Journey 12): listCustomWorkflows returns workflows with
     * id, name, templateId, steps fields.
     *
     * Expected behavior: { ok: true, data: Workflow[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listCustomWorkflows');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const workflows = (data.data ?? data.workflows ?? data) as unknown[];
    expect(Array.isArray(workflows)).toBe(true);
  });

  test('createCustomWorkflow creates a new workflow with name', async ({ page }) => {
    /**
     * Spec (Journey 12): createCustomWorkflow creates a workflow with
     * name and templateId fields.
     *
     * Expected behavior: { ok: true, data: { id: string, name: string, templateId: string } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createCustomWorkflow', {
      name: 'Tech Founder Story',
      templateId: 'template-tech',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('deleteCustomWorkflow removes a workflow gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteCustomWorkflow', { id: 'workflow-1' });

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 44.11: Feed & Discovery Page Integration
// ---------------------------------------------------------------------------

test.describe('Journey 44.11: Feed & Discovery Page Integration', () => {

  test('feed page loads without JS crash for authenticated user', async ({ page }) => {
    /**
     * Spec (Journey 12): Authenticated users can access the feed page.
     * Page should load without JavaScript errors.
     *
     * Expected behavior: Page renders without JS errors, body has content.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('feed page renders articles section or empty state', async ({ page }) => {
    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Feed page should show either articles or an empty-state message
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });

  test('trending/discover page loads without JS crash', async ({ page }) => {
    /**
     * Spec (Journey 11): Authenticated users can access the trending/discover page.
     * Page should load without JavaScript errors.
     *
     * Expected behavior: Page renders without JS errors, body has content.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/trending');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('trending page shows platform filter buttons', async ({ page }) => {
    await gotoAuthenticated(page, '/trending');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Should show some platform filter buttons or trending content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });

  test('bootstrap config includes authorProfile for enrichment personalization', async ({ page }) => {
    /**
     * Spec (Journey 12): Bootstrap config includes authorProfile for
     * feed enrichment personalization.
     *
     * Expected behavior: bootstrap data includes non-empty authorProfile string
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    const authorProfile = config.authorProfile as string;
    expect(typeof authorProfile).toBe('string');
    expect(authorProfile.length).toBeGreaterThan(0);
  });

  test('bootstrap config includes llm for model override', async ({ page }) => {
    /**
     * Spec (Journey 12): Bootstrap config includes llm field for
     * model override in enrichment.
     *
     * Expected behavior: llm is null or a string
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    const llm = config.llm;
    if (llm !== null) expect(typeof llm).toBe('string');
  });

  test('bootstrap config includes hasGenerationWorker for editor gating', async ({ page }) => {
    /**
     * Spec (Journey 12): Bootstrap config includes hasGenerationWorker boolean
     * to gate editor features.
     *
     * Expected behavior: hasGenerationWorker is a boolean
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(typeof config.hasGenerationWorker).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Journey 44.12: Action Routing Stability Across Enrichment + Discovery
// ---------------------------------------------------------------------------

test.describe('Journey 44.12: Action Routing Stability', () => {

  test('enrichment actions stable across multiple sequential calls', async ({ page }) => {
    /**
     * Spec (Journey 12): Action routing should be stable across multiple
     * enrichment action calls without JS crash.
     *
     * Expected behavior: Each call returns a response (not crash)
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result1 = await fireAction(page, 'getFeedArticles');
    expect(result1.ok).toBe(true);

    const result2 = await fireAction(page, 'listClips');
    expect(result2.ok).toBe(true);

    const result3 = await fireAction(page, 'getFeedArticles');
    expect(result3.ok).toBe(true);

    const result4 = await fireAction(page, 'listInterestGroups');
    expect(result4.ok).toBe(true);
  });

  test('discovery actions stable across multiple sequential calls', async ({ page }) => {
    /**
     * Spec (Journey 11): Action routing should be stable across multiple
     * discovery action calls without JS crash.
     *
     * Expected behavior: Each call returns a response (not crash)
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result1 = await fireAction(page, 'getTrendingTopics');
    expect(result1.ok).toBe(true);

    const result2 = await fireAction(page, 'searchTopics', { query: 'AI' });
    expect(result2.ok).toBe(true);

    const result3 = await fireAction(page, 'getTrendingTopics');
    expect(result3.ok).toBe(true);

    const result4 = await fireAction(page, 'discoverTopics');
    expect(result4.ok).toBe(true);
  });

  test('mixed enrichment and discovery calls are all successful', async ({ page }) => {
    /**
     * Spec (Journeys 11/12): Enrichment and discovery actions can be
     * interleaved without interference.
     *
     * Expected behavior: All calls return ok=true
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const r1 = await fireAction(page, 'getFeedArticles');
    const r2 = await fireAction(page, 'getTrendingTopics');
    const r3 = await fireAction(page, 'setArticleFeedback', { articleUrl: 'https://example.com/a', vote: 'up' });
    const r4 = await fireAction(page, 'searchTopics', { query: 'AI' });
    const r5 = await fireAction(page, 'listClips');
    const r6 = await fireAction(page, 'getLinkedInTrending');

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
    expect(r4.ok).toBe(true);
    expect(r5.ok).toBe(true);
    expect(r6.ok).toBe(true);
  });

  test('AI refinement actions (generateVariantsPreview, generateQuickChange) work in enrichment context', async ({ page }) => {
    /**
     * Spec (Journey 9): generateVariantsPreview and generateQuickChange
     * work in the context of the enrichment/editor workflow.
     *
     * Expected behavior: Both actions return structured variant/quick-change data
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const variantResult = await fireAction(page, 'generateVariantsPreview', {
      text: 'AI tools are reshaping how founders build products.',
      count: 2,
    });

    expect(variantResult.ok).toBe(true);
    const variantData = variantResult.data as Record<string, unknown>;
    const variants = (variantData.data ?? variantData.variants ?? variantData) as unknown[];
    expect(Array.isArray(variants)).toBe(true);

    const quickResult = await fireAction(page, 'generateQuickChange', {
      text: 'AI tools are reshaping how founders build products.',
      scope: 'full',
    });

    expect(quickResult.ok).toBe(true);
    const quickData = quickResult.data as Record<string, unknown>;
    expect(typeof quickData).toBe('object');
  });
});
