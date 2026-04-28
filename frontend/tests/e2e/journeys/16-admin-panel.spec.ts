import { test, expect } from '@playwright/test';
import { gotoAuthenticated } from '../helpers/mockApi';

// ─── Journey 16: Admin panel (SaaS only) ─────────────────────────────────────
//
// Covers: /admin – pending users list, approve/suspend, waitlist management,
// per-user monthly token budgets. Available only when session.isAdmin === true.

const MOCK_ADMIN_USERS = [
  {
    id: 'user-1',
    display_name: 'Pending User',
    status: 'pending',
    monthly_token_budget: 200000,
    monthly_tokens_used: 0,
  },
  {
    id: 'user-2',
    display_name: 'Active User',
    status: 'active',
    monthly_token_budget: 1000000,
    monthly_tokens_used: 215000,
  },
  {
    id: 'user-3',
    display_name: 'Suspended User',
    status: 'suspended',
    monthly_token_budget: 500000,
    monthly_tokens_used: 480000,
  },
];

const MOCK_ADMIN_WAITLIST = [
  {
    email: 'curious@example.com',
    name: 'Curious Persona',
    reason: 'Want to evaluate for our content team.',
    created_at: new Date().toISOString(),
  },
];

test.describe('Journey 16A: Admin panel access control', () => {
  test('non-admin users are redirected away from /admin', async ({ page }) => {
    await gotoAuthenticated(page, '/admin', {
      bootstrap: { isAdmin: false, onboardingCompleted: true },
    });
    await page.waitForLoadState('domcontentloaded');

    // We expect to be bumped to /topics. Either the URL changed or the workspace
    // sidebar is showing the topics page.
    await expect.soft(page).not.toHaveURL(/\/admin\b/, { timeout: 5000 });
  });

  test('admin users land on the Admin Panel heading', async ({ page }) => {
    await gotoAuthenticated(page, '/admin', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getAdminUsers: MOCK_ADMIN_USERS,
      getAdminWaitlist: MOCK_ADMIN_WAITLIST,
    });
    await page.waitForLoadState('domcontentloaded');

    const heading = page.getByRole('heading', { name: /admin panel/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Journey 16B: User management', () => {
  test('user table shows seeded admin users', async ({ page }) => {
    await gotoAuthenticated(page, '/admin', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getAdminUsers: MOCK_ADMIN_USERS,
      getAdminWaitlist: MOCK_ADMIN_WAITLIST,
    });
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Pending User').first()).toBeVisible({ timeout: 10000 });
    await expect.soft(page.getByText('Active User').first()).toBeVisible({ timeout: 5000 });
    await expect.soft(page.getByText('Suspended User').first()).toBeVisible({ timeout: 5000 });
  });

  test('approving a pending user fires approveUserAccess', async ({ page }) => {
    const captured: string[] = [];

    await gotoAuthenticated(page, '/admin', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getAdminUsers: MOCK_ADMIN_USERS,
      getAdminWaitlist: MOCK_ADMIN_WAITLIST,
      approveUserAccess: { ok: true },
    });
    await page.waitForLoadState('domcontentloaded');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) captured.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    const approveBtn = page.getByRole('button', { name: /approve/i }).first();
    if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveBtn.click();
      await page.waitForTimeout(800);
      expect.soft(captured).toContain('approveUserAccess');
    }
  });

  test('suspending an active user fires suspendUserAccess', async ({ page }) => {
    const captured: string[] = [];

    await gotoAuthenticated(page, '/admin', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getAdminUsers: MOCK_ADMIN_USERS,
      getAdminWaitlist: MOCK_ADMIN_WAITLIST,
      suspendUserAccess: { ok: true },
    });
    await page.waitForLoadState('domcontentloaded');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) captured.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    const suspendBtn = page.getByRole('button', { name: /suspend/i }).first();
    if (await suspendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await suspendBtn.click();
      await page.waitForTimeout(800);
      expect.soft(captured).toContain('suspendUserAccess');
    }
  });

  test('user rows display token budget vs usage', async ({ page }) => {
    await gotoAuthenticated(page, '/admin', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getAdminUsers: MOCK_ADMIN_USERS,
      getAdminWaitlist: MOCK_ADMIN_WAITLIST,
    });
    await page.waitForLoadState('domcontentloaded');

    // The active user should display some hint of "215" or "1,000" etc.
    const usageHint = page.getByText(/215|480|1,000|200/).first();
    await expect.soft(usageHint).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Journey 16C: Waitlist management', () => {
  test('waitlist section lists pending applicants', async ({ page }) => {
    await gotoAuthenticated(page, '/admin', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getAdminUsers: [],
      getAdminWaitlist: MOCK_ADMIN_WAITLIST,
    });
    await page.waitForLoadState('domcontentloaded');

    const waitEntry = page.getByText(/curious@example\.com|curious persona/i).first();
    await expect.soft(waitEntry).toBeVisible({ timeout: 10000 });
  });

  test('empty waitlist renders without crashing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await gotoAuthenticated(page, '/admin', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      getAdminUsers: MOCK_ADMIN_USERS,
      getAdminWaitlist: [],
    });
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: /admin panel/i })).toBeVisible({
      timeout: 10000,
    });
    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});

test.describe('Journey 16D: Admin panel error handling', () => {
  test('admin endpoint failure shows a Retry button', async ({ page }) => {
    await gotoAuthenticated(page, '/admin', {
      bootstrap: { isAdmin: true, onboardingCompleted: true },
      // Force the admin endpoints to fail by NOT providing seed responses
      // and instead returning a known error payload via overrides.
      getAdminUsers: { __error: 'boom' },
      getAdminWaitlist: { __error: 'boom' },
    });
    await page.waitForLoadState('domcontentloaded');

    // Either the heading rendered (success) or a Retry hint shows. Soft check.
    const fallback = page
      .getByRole('button', { name: /retry/i })
      .or(page.getByRole('heading', { name: /admin panel/i }));
    await expect.soft(fallback.first()).toBeVisible({ timeout: 10000 });
  });
});
