/**
 * cloud.spec.ts — E2E tests against the real deployed cloud application.
 *
 * These tests run WITH mocks disabled and authenticate using the E2E bypass
 * secret. They hit the actual Cloudflare Worker and GitHub Pages deployment.
 *
 * Pre-requisites:
 * 1. Set DEV_GOOGLE_AUTH_BYPASS_SECRET in your Cloudflare Workers dashboard
 *    (same value as E2E_BYPASS_SECRET below)
 * 2. Add E2E_BYPASS_SECRET to GitHub repo secrets
 * 3. CI build will have VITE_E2E_BYPASS_SECRET injected
 *
 * Run locally:
 *   TEST_CLOUD_MODE=true BASE_URL=https://p1927.github.io/LinkedInPost \
 *     VITE_E2E_BYPASS_SECRET=<secret> \
 *     npx playwright test cloud.spec.ts
 *
 * These tests are skipped in normal CI runs (no mocks = real backend required).
 */

import { test, expect } from '@playwright/test';
import { gotoCloudAuthenticated } from '../helpers/mockApi';

test.describe('Cloud Auth Bypass — against real deployment', () => {
  // Skip all tests unless TEST_CLOUD_MODE is explicitly set
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_CLOUD_MODE) {
      test.skip();
      return;
    }
  });

  // -------------------------------------------------------------------------
  // Topics list page
  // -------------------------------------------------------------------------

  test('topics page loads with real data', async ({ page }) => {
    await gotoCloudAuthenticated(page, '/topics');
    await page.waitForLoadState('networkidle');

    // The sidebar should show the Posts navigation item
    const postsNav = page.getByRole('link', { name: /posts/i });
    await expect(postsNav).toBeVisible({ timeout: 20000 });
  });

  test('topics page shows the queue table', async ({ page }) => {
    await gotoCloudAuthenticated(page, '/topics');
    await page.waitForLoadState('networkidle');

    // Wait for the dashboard to render
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 15000 });
  });

  // -------------------------------------------------------------------------
  // Add Topic / New Post page
  // -------------------------------------------------------------------------

  test('add-topic page loads the editor form', async ({ page }) => {
    await gotoCloudAuthenticated(page, '/topics/new');
    await page.waitForLoadState('networkidle');

    const titleInput = page.getByPlaceholder(/untitled post/i);
    await expect(titleInput).toBeVisible({ timeout: 20000 });
  });

  test('add-topic page has all section dividers', async ({ page }) => {
    await gotoCloudAuthenticated(page, '/topics/new');
    await page.waitForLoadState('networkidle');

    for (const label of ['About this post', 'Message to convey', 'Content style', 'Research notes']) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible({ timeout: 20000 });
    }
  });

  test('add-topic save draft button is disabled when title is empty', async ({ page }) => {
    await gotoCloudAuthenticated(page, '/topics/new');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.getByRole('button', { name: /save draft/i });
    await expect(submitBtn).toBeVisible({ timeout: 20000 });
    await expect(submitBtn).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  test('sidebar navigation to settings works', async ({ page }) => {
    await gotoCloudAuthenticated(page, '/topics');
    await page.waitForLoadState('networkidle');

    const settingsLink = page.getByRole('link', { name: /settings/i });
    await settingsLink.click();
    await page.waitForLoadState('networkidle');

    // Should be on settings page
    await expect(page).toHaveURL(/settings/, { timeout: 10000 });
  });

  test('sidebar navigation to feed works', async ({ page }) => {
    await gotoCloudAuthenticated(page, '/topics');
    await page.waitForLoadState('networkidle');

    const feedLink = page.getByRole('link', { name: /feed/i });
    await feedLink.click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/feed/, { timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Auth gate — ensure unauthenticated requests are handled
  // -------------------------------------------------------------------------

  test('topics page redirects to root when not authenticated', async ({ page }) => {
    // Clear any existing auth
    await page.addInitScript(() => {
      localStorage.removeItem('google_id_token');
    });

    await page.goto('./topics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should redirect to landing page (auth required)
    const url = page.url();
    expect(url).toMatch(/\/(?:[#?]|$)/);
  });
});