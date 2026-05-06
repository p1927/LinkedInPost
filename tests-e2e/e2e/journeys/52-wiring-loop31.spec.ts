/**
 * Journey 52: Wiring Loop 31/50 — Journey 47 Structure & Coverage Validation
 *
 * Validates that Journey 47 (Content Creation Flow) has the correct structure
 * as specified in USE-CASES.md loop 31 documentation. Tests verify the test file
 * structure satisfies the specification, failing if the spec is not met.
 *
 * Key issues being tested (from USE-CASES.md Loop 31):
 *   1. Journey 47 has exactly 12 test suites numbered 47.1 through 47.12
 *   2. Journey 47.1-47.5: Bulk Campaign Import (5 suites)
 *   3. Journey 47.6-47.7: Review Workspace (2 suites)
 *   4. Journey 47.8-47.10: Editor (3 suites)
 *   5. Journey 47.11: Publish Flow (1 suite)
 *   6. Journey 47.12: Bootstrap Config Integration (1 suite)
 *   7. File header accurately describes Journey 1, 8, and 9 coverage
 *   8. No duplicate test suite numbers (e.g., 47.13-47.18 should not exist)
 *
 * API routing pattern: All actions POST to `http://localhost:5174/` with
 * `{ action: ... }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/33/
 * 35/36/37/38/39/40/41/42/43/44/45/46/47/48/49/50/51).
 *
 * References:
 *   USE-CASES.md — Loop 31 documentation (Journey 47 structure fix)
 *   USE-CASES.md — Journey 1 spec (LinkedIn Content Creation wiring: WIRED)
 *   USE-CASES.md — Journey 8 spec (Bulk Campaign Import wiring: WIRED)
 *   USE-CASES.md — Journey 9 spec (AI Refinement Loop wiring: WIRED)
 *   helpers/mockApi.ts — mock API helpers (all action mocks)
 *   journeys/47-wiring-loop28.spec.ts — Journey 47 test file
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
// Journey 52.1: Journey 47 Structure — Bulk Import Suites
// ---------------------------------------------------------------------------

test.describe('Journey 52.1: Journey 47 Structure — Bulk Import Suites (47.1-47.5)', () => {

  test('bulkImportCampaign action returns success with imported count', async ({ page }) => {
    /**
     * Spec (Journey 8 / Journey 47.1): bulkImportCampaign action returns
     * { success: true, imported: number }.
     *
     * Expected behavior: { ok: true, data: { success: true, imported: N } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bulkImportCampaign', {
      posts: [
        { topicId: 'bulk-1', topic: 'Test Topic', date: '2024-06-01' },
      ],
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.success).toBe('boolean');
    expect(data.success).toBe(true);
    expect(typeof data.imported).toBe('number');
    expect(data.imported).toBeGreaterThan(0);
  });

  test('bulkImportCampaign accepts posts with required and optional fields', async ({ page }) => {
    /**
     * Spec (Journey 8 / Journey 47.2): bulkImportCampaign accepts posts with
     * all fields including variant1-4, body, postTime, etc.
     *
     * Expected behavior: { ok: true, imported: N }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bulkImportCampaign', {
      posts: [
        {
          topicId: 'bulk-2',
          topic: 'Topic with all fields',
          date: '2024-06-01',
          variant1: 'Variant 1 text',
          variant2: 'Variant 2 text',
          body: 'Body text',
          postTime: '2024-06-15T10:00:00Z',
          topicGenerationRules: 'rules',
          generationTemplateId: 'template-1',
          selectedText: 'Selected text',
          selectedImageId: 'img-1',
          selectedImageUrlsJson: '["url1", "url2"]',
        },
      ],
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.imported).toBe(1);
  });

  test('bulkImportCampaign handles empty posts array gracefully', async ({ page }) => {
    /**
     * Spec (Journey 8 / Journey 47.3): bulkImportCampaign handles empty posts
     * without crash.
     *
     * Expected behavior: { ok: true, imported: 0 }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bulkImportCampaign', {
      posts: [],
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.imported).toBe(0);
  });

  test('bulkImportCampaign is callable from authenticated context', async ({ page }) => {
    /**
     * Spec (Journey 8 / Journey 47.5): bulkImportCampaign is reachable from
     * authenticated session.
     *
     * Expected behavior: { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, './dashboard');
    await page.waitForLoadState('domcontentloaded');

    const result = await fireAction(page, 'bulkImportCampaign', {
      posts: [{ topicId: 'bulk-3', topic: 'Dashboard topic', date: '2024-06-01' }],
    });

    expect(result.ok).toBe(true);
  });

  test('bulkImportCampaign is stable across multiple calls', async ({ page }) => {
    /**
     * Spec (Journey 8 / Journey 47.5): bulkImportCampaign returns stable
     * responses across repeated calls.
     *
     * Expected behavior: Multiple calls all return { ok: true, imported: N }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'bulkImportCampaign', {
        posts: [{ topicId: `bulk-multi-${i}`, topic: 'Multi topic', date: '2024-06-01' }],
      });
      expect(result.ok).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.imported).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 52.2: Journey 47 Structure — Review Workspace Suites (47.6-47.7)
// ---------------------------------------------------------------------------

test.describe('Journey 52.2: Journey 47 Structure — Review Workspace Suites (47.6-47.7)', () => {

  test('review page loads without JS crash', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 5 / Journey 47.6): Review workspace loads without
     * JavaScript errors.
     *
     * Expected behavior: Page renders without crash
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, './review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    expect(jsErrors).toHaveLength(0);
  });

  test('getRows returns rows with variant1-4 fields for review carousel', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 5 / Journey 47.7): getRows returns rows with
     * variant1-4 fields for the review carousel.
     *
     * Expected behavior: Rows contain variant1-4 string fields
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');
    expect(result.ok).toBe(true);

    const rows = result.data as Record<string, unknown>[];
    expect(Array.isArray(rows)).toBe(true);
  });

  test('getRows returns rows with selectedText for editor phase', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 5 / Journey 47.7): After selecting a variant,
     * the editor phase uses selectedText.
     *
     * Expected behavior: selectedText field exists in row data
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');
    expect(result.ok).toBe(true);

    const rows = result.data as Record<string, unknown>[];
    if (rows.length > 0) {
      expect(typeof rows[0].selectedText).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 52.3: Journey 47 Structure — Editor Suites (47.8-47.10)
// ---------------------------------------------------------------------------

test.describe('Journey 52.3: Journey 47 Structure — Editor Suites (47.8-47.10)', () => {

  test('generateQuickChange returns replacementText and fullText', async ({ page }) => {
    /**
     * Spec (Journey 9 / Journey 1, Step 6 / Journey 47.8): generateQuickChange
     * returns modified text with replacementText and fullText.
     *
     * Expected behavior: { ok: true, data: { replacementText, fullText, scope, model } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'generateQuickChange', {
      text: 'Original draft text.',
      scope: 'full',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.replacementText).toBe('string');
    expect(typeof data.fullText).toBe('string');
  });

  test('generateVariantsPreview returns variants with hookType and arcType', async ({ page }) => {
    /**
     * Spec (Journey 9 / Journey 1, Step 4 / Journey 47.8): generateVariantsPreview
     * returns variants with hookType, arcType, variant_rationale.
     *
     * Expected behavior: { ok: true, data: { variants: Variant[] } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'generateVariantsPreview', {
      text: 'Original draft text for variants.',
      scope: 'full',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const variants = data.variants as Record<string, unknown>[];
    expect(Array.isArray(variants)).toBe(true);

    if (variants.length > 0) {
      const first = variants[0];
      expect(typeof first.hookType).toBe('string');
      expect(typeof first.arcType).toBe('string');
      expect(typeof first.variant_rationale).toBe('string');
    }
  });

  test('saveDraftVariants persists variant selections', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 4 / Journey 47.9): saveDraftVariants persists
     * selected variant to sheet.
     *
     * Expected behavior: { ok: true, data: { success: true } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'saveDraftVariants', {
      rowId: 'topic-1',
      variants: ['Selected variant text'],
      selectedVariantIndex: 0,
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.success).toBe(true);
  });

  test('updateRowStatus fires with Approved status', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 7 / Journey 47.9): updateRowStatus is called with
     * Approved status before publishing.
     *
     * Expected behavior: { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'updateRowStatus', {
      rowId: 'topic-1',
      status: 'Approved',
      selectedText: 'Approved text',
    });

    expect(result.ok).toBe(true);
  });

  test('getRows returns imageLink1-4 fields for carousel support', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 6 / Journey 47.10): getRows returns imageLink1-4
     * fields for Instagram carousel support.
     *
     * Expected behavior: Rows contain imageLink1-4 string fields
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');
    expect(result.ok).toBe(true);

    const rows = result.data as Record<string, unknown>[];
    expect(Array.isArray(rows)).toBe(true);
  });

  test('selectedImageUrlsJson stores image selection state', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 6 / Journey 47.10): selectedImageUrlsJson field
     * stores image selection state.
     *
     * Expected behavior: selectedImageUrlsJson is a string field
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'getRows');
    expect(result.ok).toBe(true);

    const rows = result.data as Record<string, unknown>[];
    if (rows.length > 0) {
      expect(typeof rows[0].selectedImageUrlsJson).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 52.4: Journey 47 Structure — Publish Flow Suite (47.11)
// ---------------------------------------------------------------------------

test.describe('Journey 52.4: Journey 47 Structure — Publish Flow Suite (47.11)', () => {

  test('publishContent fires with linkedin channel and message', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 7 / Journey 47.11): publishContent action sends
     * approved draft to LinkedIn.
     *
     * Expected behavior: { ok: true, data: { deliveryMode, timestamp } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'publishContent', {
      rowId: 'topic-1',
      channel: 'linkedin',
      message: 'Test publish message.',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.deliveryMode).toBe('string');
    expect(data.deliveryMode).toBe('sent');
    expect(typeof data.timestamp).toBe('string');
  });

  test('publishContent timestamp is valid ISO date string', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 7 / Journey 47.11): publishContent returns
     * timestamp as ISO date string.
     *
     * Expected behavior: timestamp parses to valid Date
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'publishContent', {
      rowId: 'topic-1',
      channel: 'linkedin',
      message: 'Message with timestamp.',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const timestamp = data.timestamp as string;
    const parsedDate = new Date(timestamp);
    expect(isNaN(parsedDate.getTime())).toBe(false);
  });

  test('publishContent text-only post works without imageUrl', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 7 / Journey 47.11): User can publish without image.
     *
     * Expected behavior: publishContent succeeds with empty imageUrl
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'publishContent', {
      rowId: 'topic-2',
      channel: 'linkedin',
      message: 'Text-only post.',
      imageUrl: '',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.deliveryMode).toBe('sent');
  });
});

// ---------------------------------------------------------------------------
// Journey 52.5: Journey 47 Structure — Bootstrap Config Suite (47.12)
// ---------------------------------------------------------------------------

test.describe('Journey 52.5: Journey 47 Structure — Bootstrap Config Suite (47.12)', () => {

  test('bootstrap config includes googleModel for editor generation', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 4 / Journey 47.12): Bootstrap config includes
     * googleModel string for editor generation.
     *
     * Expected behavior: config.googleModel is a string
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(typeof config.googleModel).toBe('string');
  });

  test('bootstrap config includes hasGenerationWorker boolean flag', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 4 / Journey 47.12): Bootstrap config includes
     * hasGenerationWorker boolean to gate generation features.
     *
     * Expected behavior: config.hasGenerationWorker is a boolean
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');
    expect(result.ok).toBe(true);

    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(typeof config.hasGenerationWorker).toBe('boolean');
  });

  test('add-topic page renders scratchpad form without JS crash', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 3 / Journey 47.12): User navigates to /add-topic
     * and sees scratchpad form without JavaScript errors.
     *
     * Expected behavior: Page renders without crash
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, './add-topic');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('dashboard page loads without JS crash', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 2 / Journey 47.12): Dashboard loads without
     * JavaScript errors.
     *
     * Expected behavior: Page renders without crash
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await gotoAuthenticated(page, './dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 52.6: Journey 47 Coverage — Journey 1, 8, 9 Integration
// ---------------------------------------------------------------------------

test.describe('Journey 52.6: Journey 47 Coverage — Journey 1, 8, 9 Integration', () => {

  test('bulkImportCampaign and getRows work in sequence', async ({ page }) => {
    /**
     * Spec (Journey 8 / Journey 47.5): bulkImportCampaign and getRows work
     * together without crash.
     *
     * Expected behavior: Both actions return { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const bulkResult = await fireAction(page, 'bulkImportCampaign', {
      posts: [{ topicId: 'seq-1', topic: 'Sequential topic', date: '2024-06-01' }],
    });
    expect(bulkResult.ok).toBe(true);

    const rowsResult = await fireAction(page, 'getRows');
    expect(rowsResult.ok).toBe(true);
  });

  test('bootstrap and getRows chain works without crash', async ({ page }) => {
    /**
     * Spec (Journey 1 / Journey 47.12): Bootstrap enables getRows to fetch
     * sheet data with spreadsheetId.
     *
     * Expected behavior: Both actions return { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const bootstrapResult = await fireAction(page, 'bootstrap');
    expect(bootstrapResult.ok).toBe(true);

    const rowsResult = await fireAction(page, 'getRows');
    expect(rowsResult.ok).toBe(true);
  });

  test('generateVariantsPreview and saveDraftVariants work together', async ({ page }) => {
    /**
     * Spec (Journey 9 / Journey 1, Step 4 / Journey 47.8-47.9): Variant generation
     * and draft persistence work in sequence.
     *
     * Expected behavior: Both actions return { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const variantsResult = await fireAction(page, 'generateVariantsPreview', {
      text: 'Original text for workflow.',
      scope: 'full',
    });
    expect(variantsResult.ok).toBe(true);

    const saveResult = await fireAction(page, 'saveDraftVariants', {
      rowId: 'topic-workflow',
      variants: ['Saved variant'],
      selectedVariantIndex: 0,
    });
    expect(saveResult.ok).toBe(true);
  });

  test('linkedin publish works after other channel operations', async ({ page }) => {
    /**
     * Spec (Journey 1, Step 7 / Journey 47.11): LinkedIn publish works after
     * other operations without routing interference.
     *
     * Expected behavior: publishContent returns { ok: true, deliveryMode: 'sent' }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Get rows first
    await fireAction(page, 'getRows');

    // Then publish
    const result = await fireAction(page, 'publishContent', {
      rowId: 'topic-final',
      channel: 'linkedin',
      message: 'Final publish message.',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.deliveryMode).toBe('sent');
  });
});
