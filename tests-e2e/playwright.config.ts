import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:5175';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL,
  },
  projects: [
    {
      name: 'chromium',
    },
  ],
});
