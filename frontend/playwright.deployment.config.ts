import { defineConfig, devices } from '@playwright/test';

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
  use: {
    // Trailing slash is required so that relative paths like './topics' resolve
    // to https://p1927.github.io/LinkedInPost/topics (not the parent directory).
    baseURL: 'https://p1927.github.io/LinkedInPost/',
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
