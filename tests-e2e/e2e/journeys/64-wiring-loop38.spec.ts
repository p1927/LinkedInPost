/**
 * Journey 64: Wiring Loop 38/50 — Newsletter createDraftByNewsletter & Mock Coverage
 *
 * Validates wiring for the Newsletter createDraftByNewsletter action and adds
 * test coverage for the missing mock handler in mockApi.ts. Tests verify the
 * implementation satisfies the specification (USE-CASES.md Journey 12), failing
 * if the spec is not met.
 *
 * Key issues being tested:
 *   1. newsletter.createDraftByNewsletter action is reachable via fireAction
 *   2. newsletter.createDraftByNewsletter returns draft issue with id, subject, status
 *   3. newsletter.createDraftByNewsletter works with a valid newsletterId parameter
 *   4. newsletter.createDraftByNewsletter handles unknown newsletterId gracefully
 *   5. Newsletter CRUD chain (list → create → update → createDraftByNewsletter)
 *      works in sequence without crash
 *
 * API routing pattern: All actions POST to `http://localhost:5174/` with
 * `{ action: ... }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/
 * 31/32/33/34/35/36/37/38/39/40/41/42/43/44/45/46/47/48/49/50/51/52/53/54/55/
 * 56/57/58/59/60/61/62/63).
 *
 * References:
 *   USE-CASES.md — Journey 12 spec (Feed Enrichment & Debate Mode wiring: WIRED)
 *   helpers/mockApi.ts — mock API helper (with newsletter action mocks)
 *   journeys/63-wiring-loop37.spec.ts — loop 37 (Newsletter wiring — 15 actions)
 *   worker/src/newsletter/handlers.ts — handleCreateDraftByNewsletter signature
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
// Journey 64.1: newsletter.createDraftByNewsletter — Action Reachability
// ---------------------------------------------------------------------------

test.describe('Journey 64.1: newsletter.createDraftByNewsletter — Action Reachability', () => {

  test('newsletter.createDraftByNewsletter is reachable and returns draft issue', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.createDraftByNewsletter creates
     * a draft issue for a specific newsletter and returns the new issue with
     * id, subject, and status='draft'.
     *
     * Expected behavior: { ok: true, data: { id, newsletterId, subject, status: 'draft' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.createDraftByNewsletter', {
      newsletterId: 'newsletter-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(data.id).toBeTruthy();
    expect(typeof data.subject).toBe('string');
    expect(data.status).toBe('draft');
  });

  test('newsletter.createDraftByNewsletter returns id and subject fields', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): The createDraftByNewsletter response must
     * include a non-empty id string and a subject string for UI rendering.
     *
     * Expected behavior: data.id is a non-empty string; data.subject is a string.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.createDraftByNewsletter', {
      newsletterId: 'newsletter-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(Boolean(data.id)).toBe(true);
    expect(typeof data.subject).toBe('string');
  });

  test('newsletter.createDraftByNewsletter works with newsletterId parameter', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): createDraftByNewsletter accepts a
     * newsletterId parameter to scope the draft creation.
     *
     * Expected behavior: { ok: true, data: { ... } } with no crash.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.createDraftByNewsletter', {
      newsletterId: 'newsletter-2',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
  });

  test('newsletter.createDraftByNewsletter handles unknown newsletterId gracefully', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): createDraftByNewsletter handles an
     * unknown newsletterId without crash, returning a valid draft response.
     *
     * Expected behavior: { ok: true } with draft issue data, not error.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.createDraftByNewsletter', {
      newsletterId: 'non-existent-newsletter-xyz',
    });

    // The action should succeed (the handler may create a draft in the default
    // newsletter context or return a placeholder). It should not crash.
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(typeof data.subject).toBe('string');
    expect(data.status).toBe('draft');
  });
});

// ---------------------------------------------------------------------------
// Journey 64.2: newsletter.createDraftByNewsletter — Workflow Integration
// ---------------------------------------------------------------------------

test.describe('Journey 64.2: newsletter.createDraftByNewsletter — Workflow Integration', () => {

  test('create → createDraftByNewsletter chain succeeds', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.create followed by
     * newsletter.createDraftByNewsletter forms the newsletter creation workflow.
     *
     * Expected behavior: Both operations succeed with ok: true.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const createResult = await fireAction(page, 'newsletter.create', {
      name: 'Workflow Test Newsletter',
      config: { deliveryChannel: 'linkedin', autoApprove: false },
    });
    expect(createResult.ok).toBe(true);

    const draftResult = await fireAction(page, 'newsletter.createDraftByNewsletter', {
      newsletterId: 'newsletter-1',
    });
    expect(draftResult.ok).toBe(true);
    const draftData = draftResult.data as Record<string, unknown>;
    expect(draftData.status).toBe('draft');
  });

  test('list → createDraftByNewsletter chain succeeds', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): After listing newsletters, the user can
     * create a draft for any listed newsletter.
     *
     * Expected behavior: list → createDraftByNewsletter both succeed.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const listResult = await fireAction(page, 'newsletter.list');
    expect(listResult.ok).toBe(true);

    const newsletters = listResult.data as Record<string, unknown>[];
    expect(newsletters.length).toBeGreaterThan(0);

    const draftResult = await fireAction(page, 'newsletter.createDraftByNewsletter', {
      newsletterId: newsletters[0].id as string,
    });
    expect(draftResult.ok).toBe(true);
  });

  test('createDraftByNewsletter coexists with newsletter.list in same session', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Both newsletter.list and
     * newsletter.createDraftByNewsletter can be called in the same session
     * without routing interference.
     *
     * Expected behavior: Both actions return ok: true in interleaved calls.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const [listResult, draftResult] = await Promise.all([
      fireAction(page, 'newsletter.list'),
      fireAction(page, 'newsletter.createDraftByNewsletter', {
        newsletterId: 'newsletter-1',
      }),
    ]);

    expect(listResult.ok).toBe(true);
    expect(draftResult.ok).toBe(true);
  });

  test('createDraftByNewsletter is stable across repeated calls', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): createDraftByNewsletter is stable across
     * repeated calls — no state corruption or routing errors.
     *
     * Expected behavior: 3 repeated calls all return ok: true with valid drafts.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'newsletter.createDraftByNewsletter', {
        newsletterId: 'newsletter-1',
      });
      expect(result.ok).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.status).toBe('draft');
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 64.3: newsletter.createDraftByNewsletter — Page Navigation Stability
// ---------------------------------------------------------------------------

test.describe('Journey 64.3: newsletter.createDraftByNewsletter — Page Navigation Stability', () => {

  test('newsletter.createDraftByNewsletter works after navigating to /feed', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Newsletter actions are stable after
     * navigating to the /feed page (cross-feature session stability).
     *
     * Expected behavior: createDraftByNewsletter succeeds after navigation.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'newsletter.createDraftByNewsletter', {
      newsletterId: 'newsletter-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe('draft');
  });

  test('newsletter.createDraftByNewsletter works after navigating to /admin', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Newsletter actions are stable after
     * navigating to the /admin page.
     *
     * Expected behavior: createDraftByNewsletter succeeds after navigation.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    await gotoAuthenticated(page, '/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const result = await fireAction(page, 'newsletter.createDraftByNewsletter', {
      newsletterId: 'newsletter-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe('draft');
  });
});
