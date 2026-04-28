import { defineConfig, devices } from '@playwright/test';
import { PROXY_PORT } from './tests/e2e/helpers/deployment-proxy';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: false,
  retries: 1,
  workers: 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-deployment', open: 'never' }],
  ],
  outputDir: './test-results-deployment',
  globalSetup: './tests/e2e/helpers/deployment-global-setup.ts',
  globalTeardown: './tests/e2e/helpers/deployment-global-teardown.ts',
  use: {
    // The local proxy forwards /* → https://p1927.github.io/LinkedInPost/*
    // so all page.goto('/topics') calls hit the correct deployed path.
    baseURL: `http://localhost:${PROXY_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Exclude specs that require a local backend server (localhost:3456)
  testIgnore: [
    '**/setup-flow.spec.ts',
    '**/setup/*.spec.ts',
    '**/integration/worker-routes.spec.ts',
    '**/integration/worker-auth.spec.ts',
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
