import { defineConfig, devices } from '@playwright/test';

const isCloudMode = Boolean(process.env.TEST_CLOUD_MODE);
const baseURL = process.env.BASE_URL || 'http://localhost:5175';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: isCloudMode ? 2 : (process.env.CI ? 2 : 0),
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: './test-results',
  use: {
    baseURL,
    trace: isCloudMode ? 'on-all-retries' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: isCloudMode ? 15000 : 10000,
    navigationTimeout: isCloudMode ? 30000 : 15000,
  },
  expect: {
    timeout: isCloudMode ? 20000 : 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox', '--disable-extensions', '--disable-background-networking', '--disable-sync', '--disable-features=Translate,AudioServiceOutOfProcess', '--disable-software-rasterizer'] } },
    },
  ],
  // Disable webServer when targeting a remote/cloud URL — the server isn't local
  ...(isCloudMode ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5174',
      reuseExistingServer: true,
      timeout: 120000,
    },
  }),
});