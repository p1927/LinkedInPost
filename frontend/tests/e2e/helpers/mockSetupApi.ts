/**
 * Mock helpers for the setup wizard's Express API (`/api/setup/*` on port 3456).
 *
 * The wizard runs in the real browser at `localhost:3456/setup`. Each test
 * calls `setupSetupApiMocks(page, overrides)` BEFORE navigating to install
 * route handlers that intercept every `/api/setup/*` request. Tests can then:
 *
 *   • Override individual endpoint responses (e.g. force a Cloudflare
 *     validation failure)
 *   • Inspect the `calls[]` array to assert on what the wizard sent
 *   • Pre-seed setup state for resume scenarios
 *
 * No real Express server is hit during tests.
 */

import type { Page, Route } from '@playwright/test';

export interface CapturedCall {
  endpoint: string;
  method: string;
  url: string;
  body?: any;
  query?: Record<string, string>;
}

export interface SetupState {
  envVars: Array<{ name: string; value: string; isSet: boolean; isRequired: boolean; description: string }>;
  integrations: Array<{ id: string; name: string; connected: boolean; status: string; config: any; icon: string }>;
  workers: Array<{ id: string; name: string; deployed: boolean; status: string; url?: string }>;
  overallProgress: number;
  lastUpdated: string;
}

export interface SetupApiOverrides {
  /** Project directory returned by the path-detection endpoint. Empty string = not detected. */
  projectDir?: string;
  /** Setup state for /api/setup/state. Default: empty fresh install (0% progress). */
  state?: Partial<SetupState>;
  /** Cloudflare validation outcome. */
  cloudflare?: { ok: boolean; error?: string };
  /** setup.py outcome. */
  setupPy?: { ok: boolean; output?: string; error?: string; status?: number };
  /** write-config outcome. Set status to 500 to simulate filesystem error. */
  writeConfig?: { ok: boolean; status?: number; error?: string };
  /** STT model status. */
  sttStatus?: { inProgress: boolean; downloaded: number; total: number; done: boolean };
  /** STT config defaults. */
  sttConfig?: { enabled: boolean; model: string; shortcut: string };
}

const FRESH_STATE: SetupState = {
  envVars: [
    { name: 'VITE_GOOGLE_CLIENT_ID', value: '', isSet: false, isRequired: true, description: 'Google OAuth Client ID' },
    { name: 'VITE_WORKER_URL', value: '', isSet: false, isRequired: true, description: 'Cloudflare Worker URL' },
    { name: 'GOOGLE_CLIENT_ID', value: '', isSet: false, isRequired: true, description: 'Google service account client ID' },
    { name: 'GOOGLE_CREDENTIALS_JSON', value: '', isSet: false, isRequired: true, description: 'Google service account credentials JSON' },
    { name: 'GEMINI_API_KEY', value: '', isSet: false, isRequired: true, description: 'Gemini API key' },
  ],
  integrations: [
    { id: 'google', name: 'Google Workspace', connected: false, status: 'disconnected', config: {}, icon: 'mail' },
    { id: 'linkedin', name: 'LinkedIn', connected: false, status: 'disconnected', config: {}, icon: 'linkedin' },
    { id: 'github', name: 'GitHub', connected: false, status: 'disconnected', config: {}, icon: 'github' },
    { id: 'cloudflare', name: 'Cloudflare Workers', connected: false, status: 'disconnected', config: {}, icon: 'cloud' },
  ],
  workers: [
    { id: 'api-worker', name: 'API Worker', deployed: false, status: 'unknown' },
    { id: 'generation-worker', name: 'Generation Worker', deployed: false, status: 'unknown' },
  ],
  overallProgress: 0,
  lastUpdated: new Date().toISOString(),
};

export interface MockSetupApi {
  calls: CapturedCall[];
  /** Mutate the response config mid-test (e.g. flip Cloudflare from fail → success). */
  reconfigure(overrides: Partial<SetupApiOverrides>): void;
}

export async function setupSetupApiMocks(
  page: Page,
  overrides: SetupApiOverrides = {},
): Promise<MockSetupApi> {
  const calls: CapturedCall[] = [];
  const config: Required<SetupApiOverrides> = {
    projectDir: overrides.projectDir ?? '/test/project',
    state: { ...FRESH_STATE, ...(overrides.state || {}) },
    cloudflare: overrides.cloudflare ?? { ok: true },
    setupPy: overrides.setupPy ?? { ok: true, output: 'mock setup.py output' },
    writeConfig: overrides.writeConfig ?? { ok: true },
    sttStatus: overrides.sttStatus ?? { inProgress: false, downloaded: 0, total: 0, done: false },
    sttConfig: overrides.sttConfig ?? { enabled: false, model: 'base.en', shortcut: 'Mod+Shift+M' },
  };

  const handler = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const endpoint = url.pathname.replace(/^\/api\/setup\//, '');
    const method = request.method();

    // Handle CORS preflight quickly
    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'content-type',
        },
      });
    }

    let body: any;
    try {
      body = method === 'POST' ? request.postDataJSON() : undefined;
    } catch {
      body = request.postData();
    }

    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { query[k] = v; });
    calls.push({ endpoint, method, url: request.url(), body, query });

    // Route table
    if (endpoint === 'project-path' && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }, body: JSON.stringify({ projectDir: config.projectDir }) });
    }
    if (endpoint === 'state' && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }, body: JSON.stringify(config.state) });
    }
    if (endpoint === 'write-config' && method === 'POST') {
      const status = config.writeConfig.status ?? (config.writeConfig.ok ? 200 : 500);
      return route.fulfill({
        status,
        contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' },
        body: JSON.stringify(config.writeConfig.ok
          ? { ok: true, message: 'Config files written successfully' }
          : { error: config.writeConfig.error || 'mock filesystem error' }),
      });
    }
    if (endpoint === 'validate-cloudflare' && method === 'POST') {
      return route.fulfill({
        status: config.cloudflare.ok ? 200 : 400,
        contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' },
        body: JSON.stringify(config.cloudflare.ok
          ? { ok: true, result: { account: { id: 'mock-cf-account' } } }
          : { ok: false, error: config.cloudflare.error || 'Invalid token' }),
      });
    }
    if (endpoint === 'run-setup-py' && method === 'POST') {
      const status = config.setupPy.status ?? (config.setupPy.ok ? 200 : 500);
      return route.fulfill({
        status,
        contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' },
        body: JSON.stringify(config.setupPy.ok
          ? { ok: true, output: config.setupPy.output || '' }
          : { ok: false, error: config.setupPy.error || 'setup.py failed' }),
      });
    }
    if (endpoint === 'deployment-mode' && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }, body: JSON.stringify({ ok: true }) });
    }
    if (endpoint === 'reset-database' && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }, body: JSON.stringify({ ok: true, message: 'reset' }) });
    }
    if (endpoint === 'regenerate-features' && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }, body: JSON.stringify({ ok: true, message: 'regenerated' }) });
    }
    if (endpoint === 'stt/config' && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }, body: JSON.stringify(config.sttConfig) });
    }
    if (endpoint === 'stt/status' && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }, body: JSON.stringify(config.sttStatus) });
    }
    if (endpoint === 'stt/disable' && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }, body: JSON.stringify({ ok: true }) });
    }
    if (endpoint === 'stt/download' && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }, body: JSON.stringify({ ok: true, started: true }) });
    }

    // Unknown endpoint — fall through with 404 so tests notice missing mocks.
    return route.fulfill({ status: 404, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }, body: JSON.stringify({ error: `unmocked: ${endpoint}` }) });
  };

  // Match both same-origin (when served at port 3456) and cross-origin
  // (the wizard hardcodes `http://localhost:3456` for path-detection).
  await page.route(/\/api\/setup\//, handler);

  return {
    calls,
    reconfigure(updates: Partial<SetupApiOverrides>) {
      Object.assign(config, {
        projectDir: updates.projectDir ?? config.projectDir,
        state: updates.state ? { ...config.state, ...updates.state } : config.state,
        cloudflare: updates.cloudflare ?? config.cloudflare,
        setupPy: updates.setupPy ?? config.setupPy,
        writeConfig: updates.writeConfig ?? config.writeConfig,
        sttStatus: updates.sttStatus ?? config.sttStatus,
        sttConfig: updates.sttConfig ?? config.sttConfig,
      });
    },
  };
}

/**
 * Helper to find a captured call to a given endpoint.
 */
export function findCall(calls: CapturedCall[], endpoint: string, method = 'POST'): CapturedCall | undefined {
  return calls.find(c => c.endpoint === endpoint && c.method === method);
}

export function findAllCalls(calls: CapturedCall[], endpoint: string, method?: string): CapturedCall[] {
  return calls.filter(c => c.endpoint === endpoint && (method ? c.method === method : true));
}

/**
 * Build a partially-completed setup state for resume scenarios.
 * `progress` is a number 0–100. Required env vars and integrations are
 * marked done in proportion to this value.
 */
export function buildPartialState(progress: number): Partial<SetupState> {
  const numRequiredSet = Math.floor((progress / 100) * 5);
  const numIntegrations = Math.floor((progress / 100) * 4);
  return {
    overallProgress: progress,
    envVars: FRESH_STATE.envVars.map((v, i) => ({
      ...v,
      value: i < numRequiredSet ? `mock-${v.name}` : '',
      isSet: i < numRequiredSet,
    })),
    integrations: FRESH_STATE.integrations.map((g, i) => ({
      ...g,
      connected: i < numIntegrations,
      status: i < numIntegrations ? 'connected' : 'disconnected',
    })),
  };
}
