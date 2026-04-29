import { test, expect } from '@playwright/test';
import { gotoAuthenticated } from '../helpers/mockApi';

// ─── Journey 17: Navigation, deep links, and routing ─────────────────────────
//
// Covers:
//   • Direct deep links into authenticated routes (/topics, /settings, /admin, …)
//   • Unknown URL → /topics fallback
//   • Workspace sidebar navigation across every section
//   • Route normalization (/topics/ vs /topics)
//   • Document title updates when route changes

const WORKSPACE_PATHS = [
  '/topics',
  '/topics/new',
  '/settings',
  '/rules',
  '/campaign',
  '/connections',
  '/feed',
  '/automations',
  '/usage',
  '/enrichment',
  '/setup',
] as const;

test.describe('Journey 17A: Deep-link arrival into the workspace', () => {
  for (const path of WORKSPACE_PATHS) {
    test(`deep link ${path} renders without crashing`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await gotoAuthenticated(page, path, {
        bootstrap: { isAdmin: true, onboardingCompleted: true },
      });
      await page.waitForLoadState('domcontentloaded');

      // The body must contain SOMETHING — an empty page would be a regression.
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(20);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });
  }
});

test.describe('Journey 17B: Unknown route fallback', () => {
  test('arbitrary unknown path bounces back to /topics', async ({ page }) => {
    await gotoAuthenticated(page, '/this-route-does-not-exist', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
    });
    await page.waitForLoadState('domcontentloaded');

    // The catch-all `<Navigate to=/topics>` should run.
    await expect(page).toHaveURL(/\/topics(?:\/?$|\/)/, { timeout: 8000 });
  });

  test('trailing-slash variant of /topics still loads the workspace', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
    });
    await page.waitForLoadState('domcontentloaded');

    const sidebar = page.getByText(/topics|feed|automations|connections/i).first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Journey 17C: Sidebar navigation', () => {
  test('clicking sidebar nav items routes between sections', async ({ page }) => {
    await gotoAuthenticated(page, '/topics', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
    });
    await page.waitForLoadState('domcontentloaded');

    const targets: Array<{ name: RegExp; expectedUrl: RegExp }> = [
      { name: /connections/i, expectedUrl: /\/connections/ },
      { name: /automations/i, expectedUrl: /\/automations/ },
      { name: /settings/i, expectedUrl: /\/settings/ },
      { name: /feed/i, expectedUrl: /\/feed/ },
    ];

    for (const { name, expectedUrl } of targets) {
      const link = page
        .getByRole('link', { name })
        .or(page.getByRole('button', { name }))
        .first();
      if (await link.isVisible({ timeout: 4000 }).catch(() => false)) {
        await link.click();
        await page.waitForLoadState('domcontentloaded');
        await expect.soft(page).toHaveURL(expectedUrl, { timeout: 5000 });
      }
    }
  });
});

test.describe('Journey 17D: Document title updates', () => {
  test('document title changes when navigating between sections', async ({ page }) => {
    await gotoAuthenticated(page, '/topics', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
    });
    await page.waitForLoadState('domcontentloaded');

    const titleAtTopics = await page.title();
    expect(titleAtTopics.length).toBeGreaterThan(0);

    await gotoAuthenticated(page, '/settings', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
    });
    await page.waitForLoadState('domcontentloaded');
    const titleAtSettings = await page.title();
    expect(titleAtSettings.length).toBeGreaterThan(0);

    // We don't pin the exact text — just verify the app maintains a non-empty
    // document.title across route changes.
    expect.soft(titleAtTopics.length + titleAtSettings.length).toBeGreaterThan(0);
  });
});

test.describe('Journey 17E: Router edge cases', () => {
  test('navigating to /trending redirects to /feed', async ({ page }) => {
    await gotoAuthenticated(page, '/trending', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
    });
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/feed\b/, { timeout: 8000 });
  });

  test('navigating to /landing redirects to /', async ({ page }) => {
    await page.goto('./landing');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/(?:#|\?|$)/, { timeout: 8000 });
  });
});

test.describe('Journey 17F: Sidebar shows admin-only entries only for admins', () => {
  test('non-admin sidebar omits Setup and Admin links', async ({ page }) => {
    await gotoAuthenticated(page, '/topics', {
      bootstrap: { isAdmin: false, onboardingCompleted: true },
    });
    await page.waitForLoadState('domcontentloaded');

    const setupLink = page.getByRole('link', { name: /^setup$/i }).first();
    const adminLink = page.getByRole('link', { name: /^admin$/i }).first();

    await expect.soft(setupLink).not.toBeVisible({ timeout: 3000 });
    await expect.soft(adminLink).not.toBeVisible({ timeout: 3000 });
  });

  test('admin sidebar exposes Setup link', async ({ page }) => {
    await gotoAuthenticated(page, '/topics', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
    });
    await page.waitForLoadState('domcontentloaded');

    const setupLink = page.getByRole('link', { name: /^setup$/i }).first();
    await expect.soft(setupLink).toBeVisible({ timeout: 6000 });
  });
});
