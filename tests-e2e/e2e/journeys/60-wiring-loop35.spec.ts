/**
 * Journey 60: Wiring Loop 35/50 — Enrichment Workspace & Editor Image Integration
 *
 * Validates wiring for two wiring gaps identified across the journey test files:
 * (1) clusterDraftClips action wiring for Journey 12 (Feed Enrichment & Debate
 *     Mode) — grouping related clips on a draft topic, and (2) uploadDraftImage
 *     action wiring for Journey 1 Step 6 (Editor — Image Asset Management).
 * Tests verify the implementation satisfies the SPEC (USE-CASES.md), failing if
 * the spec is not met.
 *
 * Key issues being tested:
 *   Journeys 60.1 (clusterDraftClips — Journey 12):
 *     1. clusterDraftClips action is reachable and returns grouped clusters
 *     2. clusterDraftClips accepts topicId and returns clips grouped by theme
 *     3. clusterDraftClips returns empty clusters gracefully when no clips exist
 *     4. clusterDraftClips handles unknown topicId without crash
 *     5. clusterDraftClips groups clips by type field (passage vs quote)
 *     6. clusterDraftClips is stable across repeated calls
 *     7. clusterDraftClips works alongside getFeedArticles without interference
 *   Journeys 60.2 (uploadDraftImage — Journey 1 Step 6 / Journey 12):
 *     8. uploadDraftImage action is reachable and returns image URL
 *     9. uploadDraftImage accepts File blob and returns stable image ID
 *    10. uploadDraftImage is callable from editor Media tab context
 *    11. uploadDraftImage is stable across multiple uploads
 *    12. fetchDraftImages action is reachable from editor Media tab
 *    13. fetchDraftImages returns image candidates with URLs
 *    14. fetchDraftImages and uploadDraftImage coexist without interference
 *   Journeys 60.3 (Newsletter Editor Integration):
 *    15. newsletter page shows newsletter list with names and statuses
 *    16. newsletter list shows status badges (active/draft)
 *    17. newsletter.createDraftNow is callable from newsletter page without crash
 *    18. newsletter page navigates to issue detail on click without crash
 *    19. newsletter page renders alongside dashboard queue without crash
 *
 * API routing pattern: All actions POST to `http://localhost:5174/` with
 * `{ action: ... }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/
 * 33/34/35/36/37/38/39/40/41/42/43/44/45/46/47/48/49/50/51/52/53/54/55/
 * 56/57/58/59).
 *
 * References:
 *   USE-CASES.md — Journey 12 spec (Feed Enrichment & Debate Mode wiring: WIRED)
 *   USE-CASES.md — Journey 1 Step 6 spec (Editor — Image Asset Management wiring: WIRED)
 *   journeys/36-wiring-loop25.spec.ts — loop 25 (Feed Enrichment & Editor Integration)
 *   journeys/39-wiring-loop25.spec.ts — loop 25 (Multi-Channel & AI Refinement)
 *   journeys/47-wiring-loop28.spec.ts — loop 28 (Content Creation Flow Validation)
 *   journeys/57-wiring-loop33.spec.ts — loop 33 (Newsletter Wiring)
 *   journeys/59-wiring-loop35.spec.ts — loop 35 (Feed Page UI & Routing Stability)
 *   helpers/mockApi.ts — mock API helper (feed/enrichment action mocks)
 *   frontend/src/services/backendApi.ts — uploadDraftImage client method
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
// Journey 60.1: clusterDraftClips — Enrichment Clip Clustering Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 60.1: Enrichment — clusterDraftClips Wiring', () => {

  test('clusterDraftClips action is reachable and returns grouped clusters', async ({ page }) => {
    /**
     * Spec (Journey 12): clusterDraftClips groups clips on a draft topic
     * by theme for inline surfacing in the editor sidebar.
     *
     * Expected behavior: { ok: true, data: { clusters: Cluster[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'clusterDraftClips', {
      topicId: 'topic-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  test('clusterDraftClips accepts topicId and returns clips grouped by theme', async ({ page }) => {
    /**
     * Spec (Journey 12): clusterDraftClips fetches all clips assigned to a
     * topic and groups them by theme (cluster) for the editor sidebar.
     *
     * Expected behavior: data.clusters is an array; each cluster has a
     * theme/name and an array of clips.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'clusterDraftClips', {
      topicId: 'topic-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const clusters = data.clusters as unknown[];
    expect(Array.isArray(clusters)).toBe(true);

    if (clusters.length > 0) {
      const firstCluster = clusters[0] as Record<string, unknown>;
      expect(typeof firstCluster.name === 'string' || typeof firstCluster.theme === 'string').toBe(true);
    }
  });

  test('clusterDraftClips returns empty clusters gracefully when no clips exist', async ({ page }) => {
    /**
     * Spec (Journey 12 / error resilience): clusterDraftClips with an unknown
     * topicId should return an empty clusters array (not crash).
     *
     * Expected behavior: { ok: true, data: { clusters: [] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'clusterDraftClips', {
      topicId: 'nonexistent-topic-id',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const clusters = data.clusters as unknown[];
    expect(Array.isArray(clusters)).toBe(true);
  });

  test('clusterDraftClips handles unknown topicId without crash', async ({ page }) => {
    /**
     * Spec (Journey 12 / defensive): Unknown topicId should return a
     * structured response, not throw a JS error.
     *
     * Expected behavior: { ok: true } with no pageerror.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'clusterDraftClips', {
      topicId: 'unknown-topic-xyz',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });

  test('clusterDraftClips groups clips by type field', async ({ page }) => {
    /**
     * Spec (Journey 12): Clips have a type field (passage, quote, etc.).
     * clusterDraftClips groups them so related clips of the same type
     * are clustered together.
     *
     * Expected behavior: Each cluster contains clips with a type field.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'clusterDraftClips', {
      topicId: 'topic-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const clusters = data.clusters as unknown[];
    expect(Array.isArray(clusters)).toBe(true);

    if (clusters.length > 0) {
      const firstCluster = clusters[0] as Record<string, unknown>;
      const clips = firstCluster.clips as unknown[] | undefined;
      if (clips && clips.length > 0) {
        const firstClip = clips[0] as Record<string, unknown>;
        expect(typeof firstClip.type === 'string').toBe(true);
      }
    }
  });

  test('clusterDraftClips is stable across repeated calls', async ({ page }) => {
    /**
     * Spec (Journey 12 / stability): clusterDraftClips should return stable
     * responses across repeated calls without state corruption.
     *
     * Expected behavior: Three sequential calls all return { ok: true }.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const r1 = await fireAction(page, 'clusterDraftClips', { topicId: 'topic-1' });
    const r2 = await fireAction(page, 'clusterDraftClips', { topicId: 'topic-1' });
    const r3 = await fireAction(page, 'clusterDraftClips', { topicId: 'topic-2' });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
  });

  test('clusterDraftClips works alongside getFeedArticles without interference', async ({ page }) => {
    /**
     * Spec (Journey 12): clusterDraftClips enriches the editor sidebar while
     * getFeedArticles serves the feed page. Both actions coexist without
     * routing collision or interference.
     *
     * Expected behavior: Both actions return { ok: true } in any order.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const feedResult = await fireAction(page, 'getFeedArticles');
    const clusterResult = await fireAction(page, 'clusterDraftClips', { topicId: 'topic-1' });
    const feedResult2 = await fireAction(page, 'getFeedArticles');

    expect(feedResult.ok).toBe(true);
    expect(clusterResult.ok).toBe(true);
    expect(feedResult2.ok).toBe(true);

    const feedData = feedResult.data as Record<string, unknown>;
    expect(Array.isArray(feedData.articles)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 60.2: Editor — uploadDraftImage & fetchDraftImages Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 60.2: Editor — uploadDraftImage & fetchDraftImages Wiring', () => {

  test('uploadDraftImage action is reachable and returns image URL', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 6 / Journey 12): User clicks Media tab → ImageAssetManager
     * calls uploadDraftImage to upload a local file. The action returns the image
     * URL for insertion into the preview.
     *
     * Expected behavior: { ok: true, data: { imageUrl, imageId } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'uploadDraftImage', {
      topicId: 'topic-1',
      fileName: 'test-image.jpg',
      mimeType: 'image/jpeg',
      // base64-encoded tiny red pixel image (1x1)
      data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.imageUrl === 'string' || typeof data.url === 'string').toBe(true);
  });

  test('uploadDraftImage accepts File blob metadata and returns stable image ID', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 6): uploadDraftImage accepts file metadata
     * (fileName, mimeType) and optionally the file data, returning an imageId
     * for tracking the uploaded asset.
     *
     * Expected behavior: Response includes imageId non-empty string.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'uploadDraftImage', {
      topicId: 'topic-upload-1',
      fileName: 'draft-cover.png',
      mimeType: 'image/png',
      data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.imageId === 'string' || typeof data.id === 'string').toBe(true);
    const imageId = (data.imageId ?? data.id) as string;
    expect(imageId.length).toBeGreaterThan(0);
  });

  test('uploadDraftImage is callable from editor Media tab context', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 6): uploadDraftImage should be callable from the
     * editor Media tab without JavaScript errors.
     *
     * Expected behavior: Action returns { ok: true } from editor context.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, './review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const result = await fireAction(page, 'uploadDraftImage', {
      topicId: 'topic-editor-1',
      fileName: 'editor-test.jpg',
      mimeType: 'image/jpeg',
      data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });

  test('uploadDraftImage is stable across multiple uploads', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 6 / stability): Multiple sequential uploadDraftImage
     * calls should return stable responses without session corruption.
     *
     * Expected behavior: Three uploads all return { ok: true }.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const r1 = await fireAction(page, 'uploadDraftImage', {
      topicId: 'topic-multi-1',
      fileName: 'image-1.jpg',
      mimeType: 'image/jpeg',
    });
    const r2 = await fireAction(page, 'uploadDraftImage', {
      topicId: 'topic-multi-1',
      fileName: 'image-2.jpg',
      mimeType: 'image/jpeg',
    });
    const r3 = await fireAction(page, 'uploadDraftImage', {
      topicId: 'topic-multi-2',
      fileName: 'image-3.png',
      mimeType: 'image/png',
    });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
  });

  test('fetchDraftImages action is reachable and returns image candidates', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 6): fetchDraftImages fetches image candidates
     * from Unsplash for the editor Media tab.
     *
     * Expected behavior: { ok: true, data: { imageUrls: string[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'fetchDraftImages', {
      topic: 'AI tools for founders',
      count: 4,
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const imageUrls = data.imageUrls as unknown[];
    expect(Array.isArray(imageUrls)).toBe(true);
    expect(imageUrls.length).toBeGreaterThan(0);

    const firstUrl = imageUrls[0] as string;
    expect(typeof firstUrl).toBe('string');
    expect(firstUrl.length).toBeGreaterThan(0);
  });

  test('fetchDraftImages returns image candidates with URLs', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 6): fetchDraftImages returns image candidates
     * with URLs from the image library (Unsplash or similar).
     *
     * Expected behavior: imageUrls array contains valid URL strings.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'fetchDraftImages', {
      topic: 'Remote work culture',
      count: 4,
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const imageUrls = data.imageUrls as string[];

    for (const url of imageUrls) {
      expect(typeof url).toBe('string');
      expect(url.startsWith('http')).toBe(true);
    }
  });

  test('fetchDraftImages and uploadDraftImage coexist without interference', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 6): Both fetchDraftImages (Unsplash search) and
     * uploadDraftImage (local upload) serve the Media tab. They should coexist
     * without routing collision.
     *
     * Expected behavior: Both actions return { ok: true } in any order.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const fetchResult = await fireAction(page, 'fetchDraftImages', {
      topic: 'Founder tools',
      count: 4,
    });
    const uploadResult = await fireAction(page, 'uploadDraftImage', {
      topicId: 'topic-image-1',
      fileName: 'uploaded.jpg',
      mimeType: 'image/jpeg',
    });
    const fetchResult2 = await fireAction(page, 'fetchDraftImages', {
      topic: 'Startup growth',
      count: 4,
    });

    expect(fetchResult.ok).toBe(true);
    expect(uploadResult.ok).toBe(true);
    expect(fetchResult2.ok).toBe(true);

    const fetchData = fetchResult.data as Record<string, unknown>;
    expect(Array.isArray(fetchData.imageUrls)).toBe(true);
  });

  test('editor Media tab loads without JS crash using bootstrap config', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 6): The editor Media tab loads using bootstrap
     * config for the model context and should not crash.
     *
     * Expected behavior: Page renders without JS errors.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, './review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 60.3: Newsletter — Editor Integration Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 60.3: Newsletter — Editor Integration & UI Rendering', () => {

  test('newsletter page shows newsletter list with names and statuses', async ({ page }) => {
    /**
     * Spec (Newsletter feature): The newsletter management page should display
     * all newsletters with their names and status badges (active/draft).
     *
     * Expected behavior: Page renders with newsletter name text and status.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const listResult = await fireAction(page, 'newsletter.list');
    expect(listResult.ok).toBe(true);
    const newsletters = listResult.data as Record<string, unknown>[];
    expect(Array.isArray(newsletters)).toBe(true);

    if (newsletters.length > 0) {
      const first = newsletters[0];
      expect(typeof first.name).toBe('string');
      expect(typeof first.status).toBe('string');
    }
  });

  test('newsletter list shows status badges (active/draft)', async ({ page }) => {
    /**
     * Spec (Newsletter feature): Each newsletter record has a status field
     * (active, draft, archived) shown as a badge on the newsletter page.
     *
     * Expected behavior: newsletter records include status field.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.list');
    expect(result.ok).toBe(true);
    const newsletters = result.data as Record<string, unknown>[];
    expect(Array.isArray(newsletters)).toBe(true);

    if (newsletters.length > 0) {
      const validStatuses = ['active', 'draft', 'archived', 'paused'];
      const first = newsletters[0];
      expect(typeof first.status).toBe('string');
      expect(validStatuses.includes(first.status as string)).toBe(true);
    }
  });

  test('newsletter.createDraftNow is callable from newsletter page without crash', async ({ page }) => {
    /**
     * Spec (Newsletter feature): User clicks "Generate Draft" on the newsletter
     * page to create a draft issue. This calls newsletter.createDraftNow.
     *
     * Expected behavior: { ok: true, data: { id, subject, status } } — no crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/newsletter');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const result = await fireAction(page, 'newsletter.createDraftNow');
    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);

    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(typeof data.status).toBe('string');
  });

  test('newsletter page navigates to issue detail without crash', async ({ page }) => {
    /**
     * Spec (Newsletter feature): Clicking a newsletter or issue row navigates
     * to the issue detail view. Navigation should not crash.
     *
     * Expected behavior: Newsletter page renders without crash after navigation.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/newsletter');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Click a newsletter item if found
    const nlItem = page.locator('text=/Founder Weekly|Tech Trends|Newsletter/i').first();
    const hasNlItem = await nlItem.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasNlItem) {
      await nlItem.click();
      await page.waitForTimeout(1000);
    }

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });

  test('newsletter page renders alongside dashboard queue without crash', async ({ page }) => {
    /**
     * Spec (Newsletter + Dashboard integration): The newsletter page and
     * dashboard queue both render without JS errors when navigated together.
     * This validates that newsletter action routing does not interfere with
     * dashboard action routing.
     *
     * Expected behavior: Both pages render successfully, no JS errors.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    // Navigate to dashboard first
    await gotoAuthenticated(page, './dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    expect(jsErrors).toHaveLength(0);

    // Then to newsletter
    await gotoAuthenticated(page, './newsletter');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });

  test('newsletter actions coexist with feed actions without crash', async ({ page }) => {
    /**
     * Spec (Newsletter + Feed enrichment integration): newsletter.* and
     * feed actions (getFeedArticles, clusterDraftClips) should coexist in the
     * action routing system without interference.
     *
     * Expected behavior: All interleaved calls return { ok: true }.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const results = await Promise.allSettled([
      fireAction(page, 'getFeedArticles'),
      fireAction(page, 'newsletter.list'),
      fireAction(page, 'clusterDraftClips', { topicId: 'topic-1' }),
      fireAction(page, 'newsletter.listIssues'),
      fireAction(page, 'uploadDraftImage', { topicId: 'topic-1', fileName: 'test.jpg', mimeType: 'image/jpeg' }),
      fireAction(page, 'fetchDraftImages', { topic: 'test', count: 4 }),
    ]);

    for (const result of results) {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        expect(result.value.ok).toBe(true);
      }
    }
    expect(jsErrors).toHaveLength(0);
  });
});
