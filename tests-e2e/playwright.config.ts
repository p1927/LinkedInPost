import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5175';

export default defineConfig({
  testDir: './e2e',
  retries: 2,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL,
    actionTimeout: 15000,
    navigationTimeout: 20000,
    launchOptions: {
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--js-flags=--max-old-space-size=512',
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
    },
  ],
});
