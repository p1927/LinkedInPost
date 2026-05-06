import { defineConfig } from '@playwright/test';

/**
 * Smoke-test config for the generation-worker.
 *
 * Does NOT spin up any webServer — the test runner simply hits a
 * pre-running wrangler dev instance (default: http://127.0.0.1:8788).
 *
 * Usage:
 *   npm run dev                        # in one terminal, start wrangler dev
 *   npm run test:smoke                 # in another terminal, run tests
 *
 * Override base URL:
 *   SMOKE_BASE_URL=http://localhost:9999 npm run test:smoke
 */
export default defineConfig({
  testDir: '.',
  testMatch: ['tests/smoke.spec.ts'],
  use: {
    baseURL: process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8788',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // target the same Chromium browser config as the frontend suite
      use: { browserName: 'chromium' },
    },
  ],
});
