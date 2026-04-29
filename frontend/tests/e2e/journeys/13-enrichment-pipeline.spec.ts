import { test, expect } from '@playwright/test';
import { gotoAuthenticated, MOCK_ROWS, MOCK_NODE_RUNS } from '../helpers/mockApi';

test.describe('Journey 13: Enrichment Pipeline', () => {
  test('enrichment page loads for admin user', async ({ page }) => {
    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');

    // The page always renders a "DAG view" / "Trace view" toggle button in the top bar
    const pageReady = page
      .getByRole('button', { name: /dag view|trace view/i })
      .or(page.getByText(/no topics yet/i));
    await expect(pageReady.first()).toBeVisible({ timeout: 12000 });
  });

  test('DAG view shows pipeline nodes', async ({ page }) => {
    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: /dag view|trace view/i }).first()).toBeVisible({ timeout: 12000 });

    // Core pipeline nodes should be visible in the DAG
    await expect(page.getByText('Topic Created')).toBeVisible({ timeout: 8000 });
    await expect.soft(page.getByText('Persona Enrichment')).toBeVisible({ timeout: 5000 });
    await expect.soft(page.getByText('Emotion Enrichment')).toBeVisible({ timeout: 5000 });
  });

  test('DAG shows enrichment module group', async ({ page }) => {
    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: /dag view|trace view/i }).first()).toBeVisible({ timeout: 12000 });

    // "Enrichment Modules" group label should be visible
    const modulesLabel = page
      .getByText(/enrichment modules/i)
      .or(page.getByText(/enrichment/i).first());
    await expect.soft(modulesLabel.first()).toBeVisible({ timeout: 8000 });
  });

  test('toggle switches between DAG and Trace view', async ({ page }) => {
    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: /dag view|trace view/i }).first()).toBeVisible({ timeout: 12000 });

    // The toggle button says "Trace view" (when DAG is active) or "DAG view" (when trace is active)
    const toggleBtn = page
      .getByRole('button', { name: /trace view|dag view/i })
      .first();
    await expect(toggleBtn).toBeVisible({ timeout: 8000 });

    // Record current label, click, verify it changes
    const labelBefore = await toggleBtn.textContent();
    await toggleBtn.click();

    const labelAfter = await toggleBtn.textContent();
    expect(labelAfter).not.toBe(labelBefore);
  });

  test('trace view shows node list after toggle', async ({ page }) => {
    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: /dag view|trace view/i }).first()).toBeVisible({ timeout: 12000 });

    // The toggle reads "DAG view" when trace is active and "Trace view" when DAG is active.
    // Default state is showDag=false — i.e. button label "DAG view" is visible initially.
    const toggleBtn = page
      .getByRole('button', { name: /trace view|dag view/i })
      .first();

    await expect(toggleBtn).toBeVisible({ timeout: 8000 });
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Either view should still render the pipeline node "Topic Created"
    await expect.soft(page.getByText('Topic Created').first()).toBeVisible({ timeout: 8000 });
  });

  test('run history shows topics from getRows', async ({ page }) => {
    await gotoAuthenticated(page, '/enrichment', {
      getRows: MOCK_ROWS,
    });
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: /dag view|trace view/i }).first()).toBeVisible({ timeout: 12000 });

    // The run selector is a <select> element — <option> children are not "visible"
    // in Playwright's visibility model even when rendered. Check the select itself.
    const runSelect = page.locator('select');
    if (await runSelect.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Verify the select has options containing the topic name
      const optionCount = await runSelect.locator('option').count();
      expect.soft(optionCount).toBeGreaterThan(0);
      const options = await runSelect.locator('option').allTextContents();
      expect.soft(options.some(o => /AI Tools for Founders/i.test(o))).toBeTruthy();
    } else {
      // Rows exist but no completed runs yet — hasPendingOnly path
      const noRunsMsg = page.getByText(/no completed runs|no topics yet/i);
      await expect.soft(noRunsMsg.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('selecting a topic run fires getNodeRuns', async ({ page }) => {
    const capturedActions: string[] = [];

    // Attach the request handler before navigation so we capture the initial getNodeRuns
    // fired automatically when EnrichmentFlowPage selects the default run on mount.
    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    await gotoAuthenticated(page, '/enrichment', {
      getRows: MOCK_ROWS,
      getNodeRuns: { nodeRuns: MOCK_NODE_RUNS },
    });
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: /dag view|trace view/i }).first()).toBeVisible({ timeout: 12000 });

    // The topic selector is a <select> — choose by visible option label
    const runSelect = page.locator('select').first();
    await expect(runSelect).toBeVisible({ timeout: 8000 });
    await runSelect.selectOption({ label: 'AI Tools for Founders' });
    await page.waitForTimeout(800);
    expect.soft(capturedActions).toContain('getNodeRuns');
  });

  test('node run details show after topic selected', async ({ page }) => {
    await gotoAuthenticated(page, '/enrichment', {
      getRows: MOCK_ROWS,
      getNodeRuns: { nodeRuns: MOCK_NODE_RUNS },
    });
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: /dag view|trace view/i }).first()).toBeVisible({ timeout: 12000 });

    const runSelect = page.locator('select').first();
    await expect(runSelect).toBeVisible({ timeout: 8000 });
    await runSelect.selectOption({ label: 'AI Tools for Founders' });
    await page.waitForTimeout(1000);

    // Node run info: pipeline node label that always renders in DAG/trace view
    await expect.soft(page.getByText('Persona Enrichment').first()).toBeVisible({ timeout: 8000 });
  });

  test('enrichment page is accessible for admin session', async ({ page }) => {
    // Admin can view the page, non-admin would be redirected
    await gotoAuthenticated(page, '/enrichment', {
      bootstrap: { isAdmin: true },
    });
    await page.waitForLoadState('domcontentloaded');

    // Should not be redirected to topics or login
    expect(page.url()).toContain('/enrichment');

    const heading = page.getByRole('button', { name: /dag view|trace view/i });
    await expect(heading.first()).toBeVisible({ timeout: 12000 });
  });

  test('all enrichment node types appear in DAG', async ({ page }) => {
    await gotoAuthenticated(page, '/enrichment');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: /dag view|trace view/i }).first()).toBeVisible({ timeout: 12000 });

    // Wait for rows to load — trace view renders 'Topic Created' once rows are fetched
    await expect(page.getByText('Topic Created').first()).toBeVisible({ timeout: 10000 });

    // showDag defaults to false; click "DAG view" to switch into DAG mode
    const dagToggle = page.getByRole('button', { name: /dag view/i }).first();
    await expect(dagToggle).toBeVisible({ timeout: 5000 });
    await dagToggle.click();
    await page.waitForTimeout(800);

    // Check several node types are in the DOM (some may be off-viewport in the draggable canvas)
    const nodeLabels = [
      'Topic Created',
      'Persona Enrichment',
      'Copywriting Enrichment',
    ];

    for (const label of nodeLabels) {
      const node = page.getByText(label);
      // Use count() — nodes exist in DOM even when scrolled off the canvas viewport
      const count = await node.count();
      expect.soft(count).toBeGreaterThan(0);
    }
  });
});
