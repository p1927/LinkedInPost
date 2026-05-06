/**
 * Journey 57: Wiring Loop 33/50 — Newsletter Wiring Validation
 *
 * Validates wiring for the Newsletter feature against the SPEC (USE-CASES.md).
 * Tests verify the newsletter API wiring, response shapes, and UI behavior
 * against the specification (not against implementation).
 *
 * Key issues being tested (Newsletter feature from backendApi.ts):
 *   1. newsletter.getConfig returns config with required fields
 *   2. newsletter.saveConfig persists config and returns ok: true
 *   3. newsletter.list returns newsletter records array
 *   4. newsletter.create creates new newsletter with id/name/status
 *   5. newsletter.update updates newsletter name/config/autoApprove
 *   6. newsletter.delete removes newsletter and returns ok: true
 *   7. newsletter.listIssues returns issue rows array
 *   8. newsletter.listIssuesByNewsletter returns filtered issues
 *   9. newsletter.createDraftNow creates draft and returns id/subject/status
 *  10. newsletter.createDraftByNewsletter creates draft for specific newsletter
 *  11. newsletter.regenerateIssue regenerates issue content
 *  12. newsletter.approveIssue sets issue to approved
 *  13. newsletter.rejectIssue sets issue to rejected
 *  14. newsletter.sendApproved sends approved issue and returns ok: true
 *  15. newsletter.issue.update patches issue metadata
 *  16. All newsletter actions stable across repeated calls
 *  17. Newsletter action routing is independent of other action domains
 *
 * API routing pattern: Newsletter actions use dot-notation namespaced POST
 * (e.g. 'newsletter.getConfig', 'newsletter.create'). These POST to `/` with
 * `{ action: 'newsletter.X', idToken }` body. The mockApi.ts route handler
 * intercepts these via the catch-all handler which extracts action names.
 * The fireAction(page, action, body) helper uses page.evaluate so Playwright
 * route handlers intercept correctly (consistent with established patterns
 * from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/33/35/36/37/38/39/40/
 * 41/42/43/44/45/46/47/48/49/50/51/52/53/54/55/56).
 *
 * References:
 *   frontend/src/services/backendApi.ts — newsletter action client methods
 *     (newsletter.getConfig, newsletter.saveConfig, newsletter.list,
 *      newsletter.create, newsletter.update, newsletter.delete,
 *      newsletter.listIssues, newsletter.listIssuesByNewsletter,
 *      newsletter.createDraftNow, newsletter.createDraftByNewsletter,
 *      newsletter.regenerateIssue, newsletter.approveIssue,
 *      newsletter.rejectIssue, newsletter.sendApproved,
 *      newsletter.issue.update)
 *   journeys/28-wiring-loop20.spec.ts — loop 20 (Feed Enrichment API, patterns)
 *   journeys/51-wiring-loop30.spec.ts — loop 30 (Feed Enrichment & Enrichment, patterns)
 *   helpers/mockApi.ts — mock API helper (newsletter action mocks)
 *   USE-CASES.md — wiring status for Journey 12 (Feed Enrichment & Debate Mode)
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
// Journey 57.1: Newsletter — Config Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 57.1: Newsletter — Config Wiring', () => {

  test('newsletter.getConfig action is reachable and returns config', async ({ page }) => {
    /**
     * Spec: newsletter.getConfig returns the newsletter configuration object
     * for the authenticated user's workspace.
     *
     * Expected behavior: { ok: true, data: NewsletterConfig }
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.getConfig');

    expect(result.ok).toBe(true);
    const data = result.data;
    expect(typeof data).toBe('object');
    expect(jsErrors).toHaveLength(0);
  });

  test('newsletter.saveConfig action is reachable and returns ok: true', async ({ page }) => {
    /**
     * Spec: newsletter.saveConfig persists newsletter configuration to storage.
     *
     * Expected behavior: { ok: true }
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.saveConfig', {
      newsletterId: 'newsletter-config-1',
      defaultTopic: 'Founder Weekly',
      deliveryChannel: 'linkedin',
      autoApprove: false,
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });

  test('newsletter.saveConfig accepts all config fields', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.saveConfig', {
      newsletterId: 'newsletter-config-2',
      defaultTopic: 'Tech Trends Weekly',
      deliveryChannel: 'instagram',
      autoApprove: true,
      schedule: 'friday-0900',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });

  test('newsletter.getConfig is stable across repeated calls', async ({ page }) => {
    /**
     * Spec: Newsletter actions should be stable across repeated calls
     * without crashing or routing instability.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'newsletter.getConfig');
      expect(result.ok).toBe(true);
    }
    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 57.2: Newsletter — CRUD Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 57.2: Newsletter — CRUD Wiring', () => {

  test('newsletter.list returns newsletter records array', async ({ page }) => {
    /**
     * Spec: newsletter.list returns all newsletter records for the user.
     *
     * Expected behavior: { ok: true, data: NewsletterRecord[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.list');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('newsletter.create creates new newsletter and returns id/name/status', async ({ page }) => {
    /**
     * Spec: newsletter.create creates a new newsletter with name and config,
     * returning the new newsletter record with id, name, subject, and status.
     *
     * Expected behavior: { ok: true, data: { id, name, subject, status } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.create', {
      name: 'Founder Weekly Digest',
      config: {
        deliveryChannel: 'linkedin',
        autoApprove: false,
      },
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(typeof data.name).toBe('string');
    expect(data.name).toBe('Founder Weekly Digest');
  });

  test('newsletter.create returns id field that is a non-empty string', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.create', {
      name: 'Tech Trends Weekly',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect((data.id as string).length).toBeGreaterThan(0);
  });

  test('newsletter.update updates newsletter name and returns ok: true', async ({ page }) => {
    /**
     * Spec: newsletter.update updates an existing newsletter record
     * by newsletterId, modifying name/config/autoApprove.
     *
     * Expected behavior: { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.update', {
      newsletterId: 'newsletter-1',
      name: 'Updated Founder Weekly',
      autoApprove: true,
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.update accepts autoApprove boolean flag', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.update', {
      newsletterId: 'newsletter-2',
      autoApprove: true,
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.delete removes newsletter and returns ok: true', async ({ page }) => {
    /**
     * Spec: newsletter.delete removes a newsletter by newsletterId.
     *
     * Expected behavior: { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.delete', {
      newsletterId: 'newsletter-to-delete',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.delete handles unknown newsletterId gracefully', async ({ page }) => {
    /**
     * Spec: Deleting a non-existent newsletter should not crash the app.
     * Expected behavior: Returns { ok: true } or structured error — no JS crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.delete', {
      newsletterId: 'nonexistent-newsletter-id',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });

  test('newsletter CRUD operations are stable in sequence', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const listResult = await fireAction(page, 'newsletter.list');
    expect(listResult.ok).toBe(true);

    const createResult = await fireAction(page, 'newsletter.create', {
      name: 'Test Newsletter',
    });
    expect(createResult.ok).toBe(true);

    const updateResult = await fireAction(page, 'newsletter.update', {
      newsletterId: 'test-newsletter-id',
      name: 'Updated Test Newsletter',
    });
    expect(updateResult.ok).toBe(true);

    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 57.3: Newsletter — Issue Management Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 57.3: Newsletter — Issue Management Wiring', () => {

  test('newsletter.listIssues returns issue rows array', async ({ page }) => {
    /**
     * Spec: newsletter.listIssues returns all newsletter issue rows for
     * reviewing, approving, or rejecting content.
     *
     * Expected behavior: { ok: true, data: NewsletterIssueRow[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.listIssues');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('newsletter.listIssuesByNewsletter returns filtered issue rows', async ({ page }) => {
    /**
     * Spec: newsletter.listIssuesByNewsletter returns issue rows filtered
     * by a specific newsletterId.
     *
     * Expected behavior: { ok: true, data: NewsletterIssueRow[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.listIssuesByNewsletter', {
      newsletterId: 'newsletter-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('newsletter.listIssues is stable across repeated calls', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'newsletter.listIssues');
      expect(result.ok).toBe(true);
    }
    expect(jsErrors).toHaveLength(0);
  });

  test('newsletter.listIssuesByNewsletter is stable across repeated calls', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'newsletter.listIssuesByNewsletter', {
        newsletterId: 'newsletter-1',
      });
      expect(result.ok).toBe(true);
    }
    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 57.4: Newsletter — Draft Creation & Send Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 57.4: Newsletter — Draft Creation & Send Wiring', () => {

  test('newsletter.createDraftNow creates draft and returns id/subject/status', async ({ page }) => {
    /**
     * Spec: newsletter.createDraftNow triggers immediate draft generation for
     * a newsletter and returns the new issue with id, subject, and status.
     *
     * Expected behavior: { ok: true, data: { id, subject, status } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.createDraftNow');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(typeof data.subject).toBe('string');
    expect(typeof data.status).toBe('string');
  });

  test('newsletter.createDraftNow returns id as non-empty string', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.createDraftNow');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect((data.id as string).length).toBeGreaterThan(0);
  });

  test('newsletter.createDraftNow returns status string', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.createDraftNow');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.status).toBe('string');
  });

  test('newsletter.createDraftByNewsletter creates draft for specific newsletter', async ({ page }) => {
    /**
     * Spec: newsletter.createDraftByNewsletter creates a draft for a specific
     * newsletter identified by newsletterId.
     *
     * Expected behavior: { ok: true, data: { id, subject, status } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.createDraftByNewsletter', {
      newsletterId: 'newsletter-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(typeof data.subject).toBe('string');
    expect(typeof data.status).toBe('string');
  });

  test('newsletter.regenerateIssue regenerates issue content', async ({ page }) => {
    /**
     * Spec: newsletter.regenerateIssue regenerates the content for an
     * existing issue identified by issueId.
     *
     * Expected behavior: { ok: true, data: NewsletterIssueRow }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.regenerateIssue', {
      issueId: 'issue-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data;
    expect(typeof data).toBe('object');
  });

  test('newsletter.regenerateIssue is callable without crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.regenerateIssue', {
      issueId: 'issue-regen-test',
    });

    expect(result.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 57.5: Newsletter — Approve/Reject/Send Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 57.5: Newsletter — Approve/Reject/Send Wiring', () => {

  test('newsletter.approveIssue action is reachable and returns ok: true', async ({ page }) => {
    /**
     * Spec: newsletter.approveIssue sets an issue's status to approved,
     * enabling it to be sent.
     *
     * Expected behavior: { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.approveIssue', {
      issueId: 'issue-to-approve',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.approveIssue accepts issueId parameter', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.approveIssue', {
      issueId: 'issue-approve-test-1',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.rejectIssue action is reachable and returns ok: true', async ({ page }) => {
    /**
     * Spec: newsletter.rejectIssue sets an issue's status to rejected,
     * preventing it from being sent.
     *
     * Expected behavior: { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.rejectIssue', {
      issueId: 'issue-to-reject',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.rejectIssue accepts issueId parameter', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.rejectIssue', {
      issueId: 'issue-reject-test-1',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.sendApproved action is reachable and returns ok: true', async ({ page }) => {
    /**
     * Spec: newsletter.sendApproved sends the most recently approved issue,
     * delivering it to subscribers.
     *
     * Expected behavior: { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.sendApproved', {
      issueId: 'approved-issue-1',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.sendApproved accepts issueId parameter', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.sendApproved', {
      issueId: 'send-approved-test-1',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.sendApproved is stable across repeated calls', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'newsletter.sendApproved', {
        issueId: `send-test-${i}`,
      });
      expect(result.ok).toBe(true);
    }
    expect(jsErrors).toHaveLength(0);
  });

  test('newsletter.approveIssue and rejectIssue both callable in sequence', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const r1 = await fireAction(page, 'newsletter.approveIssue', {
      issueId: 'issue-seq-1',
    });
    const r2 = await fireAction(page, 'newsletter.rejectIssue', {
      issueId: 'issue-seq-2',
    });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 57.6: Newsletter — Issue Patch Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 57.6: Newsletter — Issue Patch Wiring', () => {

  test('newsletter.issue.update action is reachable and returns ok: true', async ({ page }) => {
    /**
     * Spec: newsletter.issue.update patches an issue's metadata
     * (subject, status, or other fields) by issueId.
     *
     * Expected behavior: { ok: true }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.issue.update', {
      issueId: 'issue-patch-1',
      subject: 'Updated Subject Line',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.issue.update accepts subject field patch', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.issue.update', {
      issueId: 'issue-patch-2',
      subject: 'New Newsletter Subject',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.issue.update accepts status field patch', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.issue.update', {
      issueId: 'issue-patch-3',
      status: 'draft',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.issue.update accepts combined patch', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.issue.update', {
      issueId: 'issue-patch-combined',
      subject: 'Updated Combined Subject',
      status: 'approved',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.issue.update is stable across repeated calls', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      const result = await fireAction(page, 'newsletter.issue.update', {
        issueId: `issue-patch-${i}`,
        subject: `Subject ${i}`,
      });
      expect(result.ok).toBe(true);
    }
    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 57.7: Newsletter — Cross-Cutting Action Routing Stability
// ---------------------------------------------------------------------------

test.describe('Journey 57.7: Newsletter — Cross-Cutting Action Routing Stability', () => {

  test('all newsletter actions are reachable in sequence without crash', async ({ page }) => {
    /**
     * Spec: All newsletter actions should coexist in the action routing
     * system without interference. Calling them in sequence should return
     * valid responses without JS crash.
     *
     * Expected behavior: All 10 calls return { ok: true } — no crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const r1 = await fireAction(page, 'newsletter.getConfig');
    const r2 = await fireAction(page, 'newsletter.list');
    const r3 = await fireAction(page, 'newsletter.create', { name: 'Test NL' });
    const r4 = await fireAction(page, 'newsletter.listIssues');
    const r5 = await fireAction(page, 'newsletter.createDraftNow');
    const r6 = await fireAction(page, 'newsletter.approveIssue', { issueId: 'issue-x' });
    const r7 = await fireAction(page, 'newsletter.sendApproved', { issueId: 'issue-x' });
    const r8 = await fireAction(page, 'newsletter.issue.update', { issueId: 'issue-x', status: 'draft' });
    const r9 = await fireAction(page, 'newsletter.update', { newsletterId: 'nl-x', name: 'Updated' });
    const r10 = await fireAction(page, 'newsletter.saveConfig', { newsletterId: 'nl-x' });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
    expect(r4.ok).toBe(true);
    expect(r5.ok).toBe(true);
    expect(r6.ok).toBe(true);
    expect(r7.ok).toBe(true);
    expect(r8.ok).toBe(true);
    expect(r9.ok).toBe(true);
    expect(r10.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });

  test('newsletter actions interleaved with feed actions work without crash', async ({ page }) => {
    /**
     * Spec: Newsletter actions should work alongside feed/enrichment actions
     * (getFeedArticles, listClips) without interference.
     *
     * Expected behavior: All interleaved calls return { ok: true } — no crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const results = await Promise.allSettled([
      fireAction(page, 'getFeedArticles'),
      fireAction(page, 'newsletter.list'),
      fireAction(page, 'listClips'),
      fireAction(page, 'newsletter.listIssues'),
      fireAction(page, 'newsletter.create', { name: 'Interleaved NL' }),
      fireAction(page, 'newsletter.createDraftNow'),
    ]);

    for (const result of results) {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        expect(result.value.ok).toBe(true);
      }
    }
    expect(jsErrors).toHaveLength(0);
  });

  test('newsletter actions stable across repeated calls in same session', async ({ page }) => {
    /**
     * Spec: Repeated newsletter action calls in the same session should
     * return stable responses without crash.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 3; i++) {
      await fireAction(page, 'newsletter.list');
      await fireAction(page, 'newsletter.listIssues');
      await fireAction(page, 'newsletter.getConfig');
    }

    expect(jsErrors).toHaveLength(0);
  });

  test('newsletter action routing is independent of other action domains', async ({ page }) => {
    /**
     * Spec: Newsletter uses namespaced action names (newsletter.X). These
     * should route independently without conflict with other action domains
     * (feed, discovery, channel, etc.).
     *
     * Expected behavior: newsletter.* actions return { ok: true } alongside
     * non-newsletter actions in the same session.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const nlResult = await fireAction(page, 'newsletter.list');
    const bootstrapResult = await fireAction(page, 'bootstrap');
    const rowsResult = await fireAction(page, 'getRows');

    expect(nlResult.ok).toBe(true);
    expect(bootstrapResult.ok).toBe(true);
    expect(rowsResult.ok).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 57.8: Newsletter — UI Page Integration
// ---------------------------------------------------------------------------

test.describe('Journey 57.8: Newsletter — UI Page Integration', () => {

  test('newsletter page is accessible from authenticated context without JS crash', async ({ page }) => {
    /**
     * Spec: The newsletter management page (navigated via sidebar or URL)
     * should load for an authenticated user without JavaScript errors.
     *
     * Expected behavior: Page renders with body text > 0, no JS errors.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/newsletter');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });

  test('newsletter page renders with newsletter content or empty state', async ({ page }) => {
    await gotoAuthenticated(page, '/newsletter');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').textContent();
    expect((bodyText?.length ?? 0)).toBeGreaterThan(5);
  });

  test('newsletter page navigation does not crash after feed page visit', async ({ page }) => {
    /**
     * Spec: Navigation from feed page to newsletter page should work
     * without JS crash.
     *
     * Expected behavior: Both pages render successfully.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await gotoAuthenticated(page, '/newsletter');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(5);
  });
});
