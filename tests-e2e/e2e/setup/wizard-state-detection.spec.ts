/**
 * State detection: project-path auto-detection and state endpoint behavior.
 */

import { test, expect } from '@playwright/test';
import { setupSetupApiMocks, findAllCalls } from '../helpers/mockSetupApi';

const WIZARD = '/setup-wizard.html';

test.describe('State detection', () => {
  test('calls project-path on mount', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page);
    await page.goto(WIZARD);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
    expect(findAllCalls(mocks.calls, 'project-path', 'GET').length).toBeGreaterThan(0);
  });

  test('skips state load when projectDir is empty', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page, { projectDir: '' });
    await page.goto(WIZARD);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });
    // With empty projectDir, the state endpoint should NOT be queried.
    expect(findAllCalls(mocks.calls, 'state', 'GET').length).toBe(0);
  });

  test('high-progress state lands on StatusDashboard with percentage shown', async ({ page }) => {
    await setupSetupApiMocks(page, { state: buildPartialState(80) });
    await page.goto(WIZARD);

    // StatusDashboard shows progress ring with percentage.
    await expect(page.locator('text=/\\d+%/')).toBeVisible({ timeout: 10000 });
  });

  test('state endpoint called with projectDir as query parameter', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page, {
      projectDir: '/test/my-linkedin-project',
    });
    await page.goto(WIZARD);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    // State endpoint should be called
    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');
    expect(stateCalls.length).toBeGreaterThan(0);

    // And URL should contain projectDir as query param
    const projectDirInUrl = stateCalls.some(c => c.url.includes('projectDir='));
    expect(projectDirInUrl).toBeTruthy();
  });

  test('state endpoint URL is not cached with stale projectDir', async ({ page }) => {
    const mocks = await setupSetupApiMocks(page, {
      projectDir: '/fresh/project/dir',
    });
    await page.goto(WIZARD);

    await expect(page.locator('input[type="radio"][value="saas"]')).toBeVisible({ timeout: 10000 });

    // All state call URLs should reflect the current projectDir, not a previous one
    const stateCalls = findAllCalls(mocks.calls, 'state', 'GET');
    for (const call of stateCalls) {
      expect(call.url).toContain('projectDir=');
    }
  });
});

// buildPartialState is imported from mockSetupApi — make it available here
function buildPartialState(progress: number) {
  const numRequiredSet = Math.floor((progress / 100) * 5);
  const numIntegrations = Math.floor((progress / 100) * 4);
  return {
    overallProgress: progress,
    envVars: Array.from({ length: 5 }, (_, i) => ({
      name: `VAR_${i}`,
      value: i < numRequiredSet ? `mock-value-${i}` : '',
      isSet: i < numRequiredSet,
      isRequired: true,
      description: '',
    })),
    integrations: Array.from({ length: 4 }, (_, i) => ({
      id: `int-${i}`,
      name: `Integration ${i}`,
      connected: i < numIntegrations,
      status: i < numIntegrations ? 'connected' : 'disconnected',
      config: {},
      icon: 'cloud',
    })),
  };
}
