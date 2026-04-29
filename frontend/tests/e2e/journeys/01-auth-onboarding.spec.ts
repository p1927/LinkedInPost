import { test, expect, type Page } from '@playwright/test';
import { setupApiMocks, injectFakeToken, gotoAuthenticated, MOCK_SESSION, MOCK_ROWS } from '../helpers/mockApi';

test.describe('Journey 01: Auth & Onboarding', () => {
  test('unauthenticated user sees Google Sign-In', async ({ page }) => {
    // No token injected — app renders the sign-in landing page
    await page.goto('.');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // The landing page renders "Sign in" heading and a features list
    // The Google OAuth iframe is in a sandboxed iframe and cannot be located by text,
    // but we can verify other visible landing-page content
    const signInHeading = page.getByText('Sign in', { exact: true });
    const channelBotHeading = page.getByText('Channel Bot', { exact: true });
    const featureText = page.getByText(/One pipeline for drafts/i);

    await expect(signInHeading.or(channelBotHeading).or(featureText).first()).toBeVisible({ timeout: 10000 });
  });

  test('dev bypass login loads the dashboard', async ({ page }) => {
    await gotoAuthenticated(page, '/', {
      bootstrap: { onboardingCompleted: true },
    });
    await page.waitForLoadState('domcontentloaded');

    // Authenticated workspace renders the sidebar with "Topics" navigation
    const topicsNav = page.getByText('Topics', { exact: true });
    const dashboardContent = topicsNav.or(page.getByText(/topics|connections|automations/i).first());

    await expect(dashboardContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('new user sees onboarding modal', async ({ page }) => {
    await gotoAuthenticated(page, '/', {
      bootstrap: { onboardingCompleted: false },
    });
    await page.waitForLoadState('domcontentloaded');

    // Onboarding modal renders "Connect your accounts" heading in step 1
    const modal = page.getByText('Connect your accounts', { exact: true });

    await expect(modal).toBeVisible({ timeout: 10000 });
  });

  test('onboarding step 1 shows platform cards', async ({ page }) => {
    await gotoAuthenticated(page, '/', {
      bootstrap: { onboardingCompleted: false },
    });
    await page.waitForLoadState('domcontentloaded');

    // Wait for onboarding heading
    await expect(page.getByText('Connect your accounts', { exact: true })).toBeVisible({ timeout: 10000 });

    // Platform names should be visible as text in the grid cards
    await expect(page.getByText(/linkedin/i).first()).toBeVisible({ timeout: 5000 });
    await expect.soft(page.getByText(/instagram/i).first()).toBeVisible({ timeout: 5000 });
    await expect.soft(page.getByText(/gmail/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('onboarding Continue moves to step 2', async ({ page }) => {
    await gotoAuthenticated(page, '/', {
      bootstrap: { onboardingCompleted: false },
    });
    await page.waitForLoadState('domcontentloaded');

    // Step 1: the button reads "Continue →" (connected) or "Skip for now →" (no connections)
    // With MOCK_SESSION integrations are connected so it shows "Continue →"
    await expect(page.getByText('Connect your accounts', { exact: true })).toBeVisible({ timeout: 10000 });

    const continueButton = page.getByRole('button', { name: /continue|skip for now/i }).first();
    await expect(continueButton).toBeVisible({ timeout: 10000 });
    await continueButton.click();

    // Step 2 shows "Content source" heading and spreadsheet URL input
    const step2Heading = page.getByText('Content source', { exact: true });
    const spreadsheetInput = page.getByPlaceholder(/docs\.google\.com\/spreadsheets/i);

    await expect(step2Heading.or(spreadsheetInput).first()).toBeVisible({ timeout: 10000 });
  });

  test('onboarding Skip finishes setup', async ({ page }) => {
    // Use a session with no integrations so the button says "Skip for now →"
    await gotoAuthenticated(page, '/', {
      bootstrap: { onboardingCompleted: false, integrations: [] },
    });
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Connect your accounts', { exact: true })).toBeVisible({ timeout: 10000 });

    // With no integrations the button reads "Skip for now →"; click it
    const skipButton = page.getByRole('button', { name: /skip for now/i }).first();
    await expect(skipButton).toBeVisible({ timeout: 10000 });
    await skipButton.click();

    // Step 2: click "Skip, I'll add later →" to finish
    const finishButton = page.getByRole('button', { name: /skip.*later|connect.*start/i }).first();
    await expect(finishButton).toBeVisible({ timeout: 10000 });
    await finishButton.click();

    // Modal overlay should disappear
    const modalOverlay = page.locator('.fixed.inset-0.z-50');
    await expect(modalOverlay).not.toBeVisible({ timeout: 10000 });
  });
});
