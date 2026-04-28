import type { FullConfig } from '@playwright/test';
import { startDeploymentProxy } from './deployment-proxy';

export default async function globalSetup(_config: FullConfig) {
  const server = await startDeploymentProxy();
  // Store the server reference so globalTeardown can stop it
  (globalThis as Record<string, unknown>).__deploymentProxyServer = server;
}
