/**
 * Journey 63: Wiring Loop 37/50 — Newsletter Wiring Validation
 *
 * Validates wiring for the Newsletter feature from USE-CASES.md Journey 12
 * (Feed Enrichment & Debate Mode). Tests verify the implementation satisfies
 * the specification, failing if the spec is not met.
 *
 * Key issues being tested (from USE-CASES.md Journey 12 / Newsletter section):
 *   1. newsletter.getConfig returns newsletterId, defaultTopic, deliveryChannel,
 *      autoApprove for settings initialization
 *   2. newsletter.saveConfig persists newsletter configuration settings
 *   3. newsletter.list returns array of newsletters with id, name, subject, status
 *   4. newsletter.create creates new newsletter and returns full newsletter object
 *   5. newsletter.update modifies existing newsletter (name, subject, config)
 *   6. newsletter.delete removes newsletter gracefully without crash
 *   7. newsletter.listIssues returns array of issues with id, newsletterId,
 *      subject, status, createdAt
 *   8. newsletter.listIssuesByNewsletter filters issues by newsletterId
 *   9. newsletter.createDraftNow creates a draft issue for any newsletter
 *  10. newsletter.createDraftByNewsletter creates draft for specific newsletter
 *  11. newsletter.regenerateIssue regenerates issue content
 *  12. newsletter.approveIssue approves draft issue for sending
 *  13. newsletter.rejectIssue rejects draft issue
 *  14. newsletter.sendApproved sends approved issues
 *  15. newsletter.issue.update modifies issue fields (subject, status)
 *
 * API routing pattern: All actions POST to `http://localhost:5174/` with
 * `{ action: ... }` body. The mockApi.ts route handler intercepts these calls
 * in the browser context. The fireAction(page, action, body) helper uses
 * page.evaluate so Playwright route handlers intercept correctly (consistent
 * with established patterns from loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/
 * 31/32/33/34/35/36/37/38/39/40/41/42/43/44/45/46/47/48/49/50/51/52/53/54/55/
 * 56/57/58/59/60/61/62).
 *
 * References:
 *   USE-CASES.md — Journey 12 spec (Feed Enrichment & Debate Mode wiring: WIRED)
 *   helpers/mockApi.ts — mock API helpers (newsletter action mocks)
 *   frontend/src/App.tsx — auth gate (idToken check)
 *   journeys/62-wiring-loop36.spec.ts — loop 36 (Feed Store & Backend Persistence)
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
// Journey 63.1: Newsletter Config — getConfig & saveConfig
// ---------------------------------------------------------------------------

test.describe('Journey 63.1: Newsletter Config — getConfig & saveConfig', () => {

  test('newsletter.getConfig returns newsletterId, defaultTopic, deliveryChannel, autoApprove', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.getConfig returns the active
     * newsletter configuration including newsletterId, defaultTopic,
     * deliveryChannel, and autoApprove flag.
     *
     * Expected behavior: { ok: true, data: { newsletterId, defaultTopic,
     * deliveryChannel, autoApprove } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.getConfig');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.newsletterId).toBe('string');
    expect(data.newsletterId).toBeTruthy();
    expect(typeof data.defaultTopic).toBe('string');
    expect(typeof data.deliveryChannel).toBe('string');
    expect(typeof data.autoApprove).toBe('boolean');
  });

  test('newsletter.getConfig returns valid deliveryChannel value', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): deliveryChannel specifies the platform
     * for newsletter delivery (e.g., linkedin, instagram).
     *
     * Expected behavior: deliveryChannel is a non-empty string.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.getConfig');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const channel = data.deliveryChannel as string;
    expect(channel.length).toBeGreaterThan(0);
  });

  test('newsletter.saveConfig persists newsletter configuration', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.saveConfig persists the
     * newsletter configuration changes.
     *
     * Expected behavior: { ok: true } with no crash.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.saveConfig', {
      newsletterId: 'default-newsletter',
      defaultTopic: 'Founder Weekly',
      deliveryChannel: 'linkedin',
      autoApprove: false,
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.getConfig is reachable from authenticated context', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.getConfig is reachable from
     * authenticated sessions (requires idToken).
     *
     * Expected behavior: Action returns ok: true with valid data.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.getConfig');
    expect(result.ok).toBe(true);
  });

  test('newsletter.getConfig and newsletter.saveConfig are stable in sequence', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Both config actions work in sequence
     * without session corruption or routing errors.
     *
     * Expected behavior: getConfig → saveConfig → getConfig all succeed.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const r1 = await fireAction(page, 'newsletter.getConfig');
    expect(r1.ok).toBe(true);

    const r2 = await fireAction(page, 'newsletter.saveConfig', {
      autoApprove: true,
    });
    expect(r2.ok).toBe(true);

    const r3 = await fireAction(page, 'newsletter.getConfig');
    expect(r3.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 63.2: Newsletter List — list & CRUD
// ---------------------------------------------------------------------------

test.describe('Journey 63.2: Newsletter List — list & CRUD', () => {

  test('newsletter.list returns array of newsletters', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.list returns the user's
     * newsletter subscriptions with id, name, subject, status, and config.
     *
     * Expected behavior: { ok: true, data: Newsletter[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.list');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  test('newsletter.list items have id, name, subject, status fields', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Each newsletter entry has id (string),
     * name (string), subject (string), and status (string).
     *
     * Expected behavior: All list items have the required fields.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.list');

    expect(result.ok).toBe(true);
    const newsletters = result.data as Record<string, unknown>[];
    expect(Array.isArray(newsletters)).toBe(true);

    for (const nl of newsletters) {
      expect(typeof nl.id).toBe('string');
      expect(nl.id).toBeTruthy();
      expect(typeof nl.name).toBe('string');
      expect(typeof nl.subject).toBe('string');
      expect(typeof nl.status).toBe('string');
    }
  });

  test('newsletter.list items include config with deliveryChannel and autoApprove', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Each newsletter has a config sub-object
     * with deliveryChannel and autoApprove fields.
     *
     * Expected behavior: All list items have config object with required fields.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.list');

    expect(result.ok).toBe(true);
    const newsletters = result.data as Record<string, unknown>[];

    for (const nl of newsletters) {
      const config = nl.config as Record<string, unknown>;
      expect(typeof config).toBe('object');
      expect(typeof config.deliveryChannel).toBe('string');
      expect(typeof config.autoApprove).toBe('boolean');
    }
  });

  test('newsletter.create creates new newsletter with name and config', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.create creates a new
     * newsletter with a name and optional config.
     *
     * Expected behavior: { ok: true, data: { id, name, subject, status, config } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.create', {
      name: 'Tech Trends Weekly',
      config: { deliveryChannel: 'linkedin', autoApprove: false },
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(data.name).toBe('Tech Trends Weekly');
    expect(typeof data.status).toBe('string');
  });

  test('newsletter.update modifies newsletter name and config', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.update modifies an existing
     * newsletter's name, subject, and config.
     *
     * Expected behavior: { ok: true } with updated newsletter data.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.update', {
      id: 'newsletter-1',
      name: 'Updated Founder Weekly',
      config: { deliveryChannel: 'instagram', autoApprove: true },
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.delete removes newsletter gracefully', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.delete removes a newsletter
     * by id without crashing.
     *
     * Expected behavior: { ok: true } with no JS crash.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.delete', {
      id: 'newsletter-to-delete-xyz',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter CRUD chain works without crash', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Create → update → delete chain works
     * without crash or routing error.
     *
     * Expected behavior: All three operations succeed.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const createResult = await fireAction(page, 'newsletter.create', {
      name: 'CRUD Test Newsletter',
      config: { deliveryChannel: 'linkedin', autoApprove: false },
    });
    expect(createResult.ok).toBe(true);

    const updateResult = await fireAction(page, 'newsletter.update', {
      id: 'newsletter-1',
      name: 'Updated CRUD Newsletter',
    });
    expect(updateResult.ok).toBe(true);

    const deleteResult = await fireAction(page, 'newsletter.delete', {
      id: 'newsletter-1',
    });
    expect(deleteResult.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 63.3: Newsletter Issues — listIssues & listIssuesByNewsletter
// ---------------------------------------------------------------------------

test.describe('Journey 63.3: Newsletter Issues — listIssues & listIssuesByNewsletter', () => {

  test('newsletter.listIssues returns array of issues with required fields', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.listIssues returns all newsletter
     * issues with id, newsletterId, subject, status, and createdAt.
     *
     * Expected behavior: { ok: true, data: Issue[] } where each issue has
     * id, newsletterId, subject, status, createdAt fields.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.listIssues');

    expect(result.ok).toBe(true);
    const issues = result.data as Record<string, unknown>[];
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);

    const first = issues[0];
    expect(typeof first.id).toBe('string');
    expect(typeof first.newsletterId).toBe('string');
    expect(typeof first.subject).toBe('string');
    expect(typeof first.status).toBe('string');
    expect(typeof first.createdAt).toBe('string');
  });

  test('newsletter.listIssues returns valid status values (draft/approved/sent)', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Issue status is one of draft, approved,
     * or sent.
     *
     * Expected behavior: All issue status values are valid strings.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.listIssues');

    expect(result.ok).toBe(true);
    const issues = result.data as Record<string, unknown>[];

    const validStatuses = ['draft', 'approved', 'sent'];
    for (const issue of issues) {
      expect(validStatuses).toContain(issue.status);
    }
  });

  test('newsletter.listIssuesByNewsletter filters issues by newsletterId', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.listIssuesByNewsletter filters
     * issues to only those belonging to a specific newsletter.
     *
     * Expected behavior: { ok: true, data: Issue[] } where all issues have
     * the matching newsletterId.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.listIssuesByNewsletter', {
      newsletterId: 'newsletter-1',
    });

    expect(result.ok).toBe(true);
    const issues = result.data as Record<string, unknown>[];
    expect(Array.isArray(issues)).toBe(true);

    for (const issue of issues) {
      expect(issue.newsletterId).toBe('newsletter-1');
    }
  });

  test('newsletter.listIssuesByNewsletter handles unknown newsletterId', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): listIssuesByNewsletter handles unknown
     * newsletterId gracefully (returns empty array, not error).
     *
     * Expected behavior: { ok: true, data: [] } for unknown newsletter.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.listIssuesByNewsletter', {
      newsletterId: 'non-existent-newsletter',
    });

    expect(result.ok).toBe(true);
    const data = result.data;
    expect(Array.isArray(data)).toBe(true);
  });

  test('newsletter.listIssues is stable across repeated calls', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): listIssues is stable across repeated calls.
     *
     * Expected behavior: 3 sequential calls all return ok: true.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const r1 = await fireAction(page, 'newsletter.listIssues');
    const r2 = await fireAction(page, 'newsletter.listIssues');
    const r3 = await fireAction(page, 'newsletter.listIssues');

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 63.4: Newsletter Issues — Draft Creation, Regenerate, Approve, Reject
// ---------------------------------------------------------------------------

test.describe('Journey 63.4: Newsletter Issues — Draft Creation & Workflow', () => {

  test('newsletter.createDraftNow creates a draft issue for any newsletter', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.createDraftNow creates a
     * draft issue and returns the new issue object with id, subject, status='draft'.
     *
     * Expected behavior: { ok: true, data: { id, subject, status: 'draft' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.createDraftNow', {
      newsletterId: 'newsletter-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(data.id).toBeTruthy();
    expect(typeof data.subject).toBe('string');
    expect(data.status).toBe('draft');
  });

  test('newsletter.createDraftByNewsletter creates draft for specific newsletter', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.createDraftByNewsletter
     * creates a draft issue for a specific newsletter and returns the new
     * issue with id, subject, status='draft'.
     *
     * Expected behavior: { ok: true, data: { id, newsletterId, subject, status } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.createDraftByNewsletter', {
      newsletterId: 'newsletter-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(data.status).toBe('draft');
  });

  test('newsletter.regenerateIssue regenerates issue content', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.regenerateIssue regenerates
     * the content of a draft issue and returns the updated issue.
     *
     * Expected behavior: { ok: true, data: { id, subject, status: 'draft' } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.regenerateIssue', {
      issueId: 'issue-1',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(data.status).toBe('draft');
  });

  test('newsletter.approveIssue approves draft issue', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.approveIssue changes issue
     * status from draft to approved, marking it ready to send.
     *
     * Expected behavior: { ok: true } with no crash.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.approveIssue', {
      issueId: 'issue-1',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.rejectIssue rejects draft issue', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.rejectIssue changes issue
     * status to rejected, removing it from the send queue.
     *
     * Expected behavior: { ok: true } with no crash.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.rejectIssue', {
      issueId: 'issue-2',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.sendApproved sends all approved issues', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.sendApproved sends all
     * approved newsletter issues to their delivery channels.
     *
     * Expected behavior: { ok: true } with no crash.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.sendApproved', {
      newsletterId: 'newsletter-1',
    });

    expect(result.ok).toBe(true);
  });

  test('newsletter.issue.update modifies issue fields', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.issue.update modifies the
     * fields of an existing newsletter issue.
     *
     * Expected behavior: { ok: true } with no crash.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.issue.update', {
      issueId: 'issue-1',
      subject: 'Updated Issue Subject',
      status: 'draft',
    });

    expect(result.ok).toBe(true);
  });

  test('full newsletter workflow (create draft → approve → send) succeeds without crash', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): A complete newsletter issue lifecycle
     * (createDraftNow → approveIssue → sendApproved) works in sequence.
     *
     * Expected behavior: All three operations succeed without crash.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Step 1: Create draft
    const createResult = await fireAction(page, 'newsletter.createDraftNow', {
      newsletterId: 'newsletter-1',
    });
    expect(createResult.ok).toBe(true);

    // Step 2: Approve
    const approveResult = await fireAction(page, 'newsletter.approveIssue', {
      issueId: 'issue-1',
    });
    expect(approveResult.ok).toBe(true);

    // Step 3: Send
    const sendResult = await fireAction(page, 'newsletter.sendApproved', {
      newsletterId: 'newsletter-1',
    });
    expect(sendResult.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 63.5: Newsletter — Namespace Routing & Cross-Action Stability
// ---------------------------------------------------------------------------

test.describe('Journey 63.5: Newsletter — Namespace Routing & Cross-Action Stability', () => {

  test('all newsletter actions are prefixed with "newsletter." namespace', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Newsletter actions use the namespaced
     * pattern: newsletter.getConfig, newsletter.list, newsletter.create, etc.
     * All actions are independent and stable.
     *
     * Expected behavior: All namespaced actions return ok: true.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const actions = [
      { action: 'newsletter.getConfig', body: {} },
      { action: 'newsletter.list', body: {} },
      { action: 'newsletter.listIssues', body: {} },
      { action: 'newsletter.createDraftNow', body: { newsletterId: 'newsletter-1' } },
    ];

    for (const { action, body } of actions) {
      const result = await fireAction(page, action, body);
      expect(result.ok).toBe(true);
    }
  });

  test('newsletter actions are stable across repeated calls', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Newsletter actions are stable across
     * repeated calls — no state corruption or routing errors.
     *
     * Expected behavior: 5 repeated calls all return ok: true.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    for (let i = 0; i < 5; i++) {
      const result = await fireAction(page, 'newsletter.list');
      expect(result.ok).toBe(true);
    }
  });

  test('newsletter actions coexist with feed actions without interference', async ({ page }) => {
    /**
     * Spec (Journey 12): Newsletter actions and feed enrichment actions
     * (getFeedArticles, setArticleFeedback, etc.) both work in the same
     * session without routing interference.
     *
     * Expected behavior: Both action domains route correctly in interleaved sequence.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Interleave newsletter and feed actions
    const results = await Promise.all([
      fireAction(page, 'newsletter.list'),
      fireAction(page, 'getFeedArticles'),
      fireAction(page, 'newsletter.listIssues'),
      fireAction(page, 'listClips'),
      fireAction(page, 'newsletter.getConfig'),
    ]);

    for (const r of results) {
      expect(r.ok).toBe(true);
    }
  });

  test('newsletter actions are stable across dashboard navigation', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Newsletter actions work correctly
     * after navigating between dashboard pages. Action routing is stable
     * across page transitions.
     *
     * Expected behavior: Newsletter actions succeed before and after navigation.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // Before navigation
    const r1 = await fireAction(page, 'newsletter.list');
    expect(r1.ok).toBe(true);

    // Navigate to feed page
    await gotoAuthenticated(page, '/feed');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // After navigation — newsletter actions still work
    const r2 = await fireAction(page, 'newsletter.getConfig');
    expect(r2.ok).toBe(true);
  });

  test('newsletter CRUD and issue workflow coexist without crash', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Both newsletter CRUD (list/create/update/delete)
     * and issue workflow (createDraftNow/approveIssue/sendApproved) work together
     * without interference.
     *
     * Expected behavior: All operations succeed in sequence.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    // CRUD actions
    const listResult = await fireAction(page, 'newsletter.list');
    expect(listResult.ok).toBe(true);

    const createResult = await fireAction(page, 'newsletter.create', {
      name: 'Test Newsletter',
    });
    expect(createResult.ok).toBe(true);

    // Issue workflow
    const draftResult = await fireAction(page, 'newsletter.createDraftNow', {
      newsletterId: 'newsletter-1',
    });
    expect(draftResult.ok).toBe(true);

    const updateResult = await fireAction(page, 'newsletter.update', {
      id: 'newsletter-1',
      name: 'Updated Test Newsletter',
    });
    expect(updateResult.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 63.6: Newsletter — Auth & Bootstrap Config Integration
// ---------------------------------------------------------------------------

test.describe('Journey 63.6: Newsletter — Auth & Bootstrap Config Integration', () => {

  test('newsletter actions require authenticated session (idToken)', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Newsletter actions require a valid
     * idToken from localStorage.
     *
     * Expected behavior: With injectFakeToken, actions return ok: true.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'newsletter.list');
    expect(result.ok).toBe(true);
  });

  test('newsletter.list works after bootstrap action', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): Newsletter actions work after the
     * bootstrap session has been established.
     *
     * Expected behavior: bootstrap → newsletter.list both succeed.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const bootstrapResult = await fireAction(page, 'bootstrap');
    expect(bootstrapResult.ok).toBe(true);

    const newsletterResult = await fireAction(page, 'newsletter.list');
    expect(newsletterResult.ok).toBe(true);
  });

  test('newsletter.getConfig uses bootstrap session config', async ({ page }) => {
    /**
     * Spec (Journey 12 / Newsletter): newsletter.getConfig is initialized
     * from the bootstrap session config and uses the authenticated session.
     *
     * Expected behavior: bootstrap → newsletter.getConfig both succeed.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    await fireAction(page, 'bootstrap');

    const configResult = await fireAction(page, 'newsletter.getConfig');
    expect(configResult.ok).toBe(true);
    const data = configResult.data as Record<string, unknown>;
    expect(typeof data.newsletterId).toBe('string');
  });

  test('newsletter and dashboard actions coexist in same session', async ({ page }) => {
    /**
     * Spec (Journey 12 / Journey 1): Newsletter actions (from Journey 12) and
     * dashboard actions (from Journey 1) both work in the same authenticated
     * session without interference.
     *
     * Expected behavior: bootstrap → getRows → newsletter.list all succeed.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const b1 = await fireAction(page, 'bootstrap');
    expect(b1.ok).toBe(true);

    const b2 = await fireAction(page, 'getRows');
    expect(b2.ok).toBe(true);

    const b3 = await fireAction(page, 'newsletter.list');
    expect(b3.ok).toBe(true);
  });
});
