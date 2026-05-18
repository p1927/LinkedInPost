import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:5175';

export default defineConfig({
  testDir: './e2e',
  retries: 2,
  workers: 4,
  fullyParallel: true,
  use: {
    baseURL,
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
        '--disable-gpu',
        '--disk-cache-size=1',
        '--media-cache-size=1',
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
    },
  ],
});
