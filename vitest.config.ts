import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./frontend/src/test/setup.ts'],
    globals: true,
    include: [
      'frontend/src/**/*.test.ts',
      'frontend/src/**/*.test.tsx',
      'frontend/src/**/__tests__/**/*.test.ts',
      'frontend/src/**/__tests__/**/*.test.tsx',
      'worker/src/**/*.test.ts',
      'worker/src/**/__tests__/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/tests-e2e/**',
      '**/frontend/tests/**',
      '**/__tests__/**/*.spec.ts',
    ],
  },
});
