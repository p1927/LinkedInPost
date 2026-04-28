import { test, expect } from '@playwright/test';
import { gotoAuthenticated } from '../helpers/mockApi';

// ─── Journey 19: Token usage / metering ─────────────────────────────────────
//
// Covers:
//   • Header UsageMeter chip (SaaS only)
//   • /usage page rendering with breakdowns
//   • Reset date display

test.describe('Journey 19A: Header usage meter (SaaS)', () => {
  test('header shows the usage meter when token usage is available', async ({ page }) => {
    await gotoAuthenticated(page, '/topics', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getTokenUsage: {
        used: 125000,
        budget: 1000000,
        resetDate: '2026-05-01',
      },
    });
    await page.waitForLoadState('domcontentloaded');

    // The UsageMeter typically renders the percentage or the raw "k tokens" digits.
    const meter = page
      .getByText(/12%|125|1,?000|tokens|usage/i)
      .first();
    await expect.soft(meter).toBeVisible({ timeout: 10000 });
  });

  test('header gracefully omits the meter when usage call fails', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await gotoAuthenticated(page, '/topics', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getTokenUsage: { __error: 'usage-unavailable' },
    });
    await page.waitForLoadState('domcontentloaded');

    // App must NOT crash even if /getTokenUsage fails.
    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});

test.describe('Journey 19B: /usage page', () => {
  test('/usage page is reachable', async ({ page }) => {
    await gotoAuthenticated(page, '/usage', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getTokenUsage: {
        used: 215000,
        budget: 1000000,
        resetDate: '2026-05-15',
      },
    });
    await page.waitForLoadState('domcontentloaded');

    const heading = page
      .getByRole('heading', { name: /usage|token|billing/i })
      .or(page.getByText(/used|budget|tokens/i))
      .first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('/usage shows a numeric token figure', async ({ page }) => {
    await gotoAuthenticated(page, '/usage', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getTokenUsage: {
        used: 215000,
        budget: 1000000,
        resetDate: '2026-05-15',
      },
    });
    await page.waitForLoadState('domcontentloaded');

    const numeric = page
      .getByText(/215|1,000,000|1000000|1m|215k/i)
      .first();
    await expect.soft(numeric).toBeVisible({ timeout: 8000 });
  });

  test('/usage page shows a reset date hint when provided', async ({ page }) => {
    await gotoAuthenticated(page, '/usage', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getTokenUsage: {
        used: 1500,
        budget: 200000,
        resetDate: '2026-05-15',
      },
    });
    await page.waitForLoadState('domcontentloaded');

    const resetHint = page
      .getByText(/reset|2026|may|next month|cycle/i)
      .first();
    await expect.soft(resetHint).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Journey 19C: 100% usage UX', () => {
  test('full budget consumption renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await gotoAuthenticated(page, '/usage', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getTokenUsage: {
        used: 1000000,
        budget: 1000000,
        resetDate: '2026-05-01',
      },
    });
    await page.waitForLoadState('domcontentloaded');

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('over-quota usage (used > budget) does not crash the meter', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await gotoAuthenticated(page, '/topics', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getTokenUsage: {
        used: 1500000,
        budget: 1000000,
        resetDate: '2026-05-01',
      },
    });
    await page.waitForLoadState('domcontentloaded');

    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});
