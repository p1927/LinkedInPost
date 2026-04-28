import type { FullConfig } from '@playwright/test';
import type http from 'http';

export default async function globalTeardown(_config: FullConfig) {
  const server = (globalThis as Record<string, unknown>).__deploymentProxyServer as http.Server | undefined;
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
