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
 *
 * ⚠️  Timing requirement: After calling `setupSetupApiMocks`, the test MUST
 * call `await page.waitForLoadState('domcontentloaded')` before navigating
 * to the wizard. `Promise.all([page.route(...)])` returns before Chromium's
 * route handler table is fully updated, so without this explicit wait the
 * wizard's `fetch()` calls may bypass the mock handlers and hit the real
 * server. Always pair with a follow-up `await page.waitForTimeout(2000)`
 * after navigation to allow the wizard's async state chain
 * (project-path → state → render) to complete.
 */

import type { Page, Route } from '@playwright/test';

// ─── Shared mock constants ────────────────────────────────────────────────────

export const MOCK_SESSION = {
  email: 'test@example.com',
  isAdmin: true,
  onboardingCompleted: true,
  integrations: [
    { id: 'linkedin-1', type: 'linkedin', provider: 'linkedin', label: 'LinkedIn', displayName: 'Test LinkedIn', connected: true, personUrn: 'urn:li:person:abc123', needsReauth: false },
    { id: 'instagram-1', type: 'instagram', provider: 'instagram', label: 'Instagram', displayName: 'Test Instagram', connected: true, instagramUserId: 'ig-user-123', needsReauth: false },
    { id: 'gmail-1', type: 'gmail', provider: 'gmail', label: 'Gmail', displayName: 'test@example.com', connected: true, gmailEmailAddress: 'test@example.com', needsReauth: false },
    { id: 'telegram-1', type: 'telegram', provider: 'telegram', label: 'Telegram', displayName: '', connected: false, needsReauth: false, chatId: '' },
    { id: 'whatsapp-1', type: 'whatsapp', provider: 'whatsapp', label: 'WhatsApp', displayName: '', connected: false, needsReauth: false, phoneNumberId: '' },
  ],
  config: {
    integrations: [
      { id: 'linkedin-1', type: 'linkedin', provider: 'linkedin', label: 'LinkedIn', displayName: 'Test LinkedIn', connected: true, personUrn: 'urn:li:person:abc123', needsReauth: false },
      { id: 'instagram-1', type: 'instagram', provider: 'instagram', label: 'Instagram', displayName: 'Test Instagram', connected: true, instagramUserId: 'ig-user-123', needsReauth: false },
      { id: 'gmail-1', type: 'gmail', provider: 'gmail', label: 'Gmail', displayName: 'test@example.com', connected: true, gmailEmailAddress: 'test@example.com', needsReauth: false },
      { id: 'telegram-1', type: 'telegram', provider: 'telegram', label: 'Telegram', displayName: '', connected: false, needsReauth: false, chatId: '' },
      { id: 'whatsapp-1', type: 'whatsapp', provider: 'whatsapp', label: 'WhatsApp', displayName: '', connected: false, needsReauth: false, phoneNumberId: '' },
    ],
    googleModel: 'google/gemini-2.0-flash',
    allowedGoogleModels: ['google/gemini-2.0-flash'],
    spreadsheetId: 'test-sheet-id',
    linkedinPersonUrn: 'urn:li:person:abc123',
    hasLinkedInAccessToken: true,
    instagramUserId: 'ig-user-123',
    hasInstagramAccessToken: true,
    hasTelegramBotToken: false,
    telegramRecipients: [],
    whatsappPhoneNumberId: '',
    hasWhatsAppAccessToken: false,
    gmailEmailAddress: 'test@example.com',
    hasGmailAccessToken: true,
    globalRules: '',
    authorProfile: 'Founder and engineer building AI-powered tools.',
    llm: null,
    imageGen: null,
    hasGenerationWorker: true,
  },
};

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
    if (endpoint === 'stt/enable' && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }, body: JSON.stringify({ ok: true, enabled: true }) });
    }

    // ── Action-based POSTs routed through the main worker ──────────────────
    // The setup wizard calls POST /api/setup/* with { action: 'generateVariantsPreview' }
    // or { action: 'generateQuickChange' } bodies. These would otherwise 404 or fall
    // through to the worker. Mock them so wiring tests for generation previews work.
    if (method === 'POST' && typeof body === 'object' && body !== null) {
      const action = String((body as Record<string, unknown>).action ?? '');
      if (action === 'generateVariantsPreview') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' },
          body: JSON.stringify({
            ok: true, data: {
              variants: [
                { id: 'v-1', label: 'Variant 1', replacementText: 'Mock variant 1 text.', fullText: 'Mock variant 1 text. This is the complete first variant.', hookType: 'data_point', arcType: 'problem_agitate_solve', variant_rationale: 'Opens with a bold claim.' },
                { id: 'v-2', label: 'Variant 2', replacementText: 'Mock variant 2 text.', fullText: 'Mock variant 2 text. Here is the second variant with more detail.', hookType: 'contrarian', arcType: 'insight_reveal', variant_rationale: 'Contrarian opener.' },
              ],
            },
          }),
        });
      }
      if (action === 'generateQuickChange') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' },
          body: JSON.stringify({
            ok: true, data: {
              scope: 'full', model: 'google/gemini-2.0-flash', selection: null,
              replacementText: 'Quick-change mock text.',
              fullText: 'Quick-change mock text. Here is the modified full content.',
            },
          }),
        });
      }
    }

    // Unknown endpoint — fall through with 404 so tests notice missing mocks.
    return route.fulfill({ status: 404, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }, body: JSON.stringify({ error: `unmocked: ${endpoint}` }) });
  };

  // Register route handlers for both same-origin (port 3456) and cross-origin
  // (relative /api/setup/**) URLs so Playwright intercepts all wizard fetch calls.
  // The explicit host URL takes precedence in all Chromium contexts.
  // Also register /api/setup/** (relative) so Playwright intercepts the wizard's
  // own relative fetch calls (e.g., fetch('/api/setup/state')), which happen
  // after project-path detection resolves and the wizard calls the state endpoint.
  await Promise.all([
    page.route('http://localhost:3456/api/setup/**', handler),
    page.route('**/api/setup/**', handler),
    page.route('/api/setup/**', handler),
  ]);

  // Guarantee route handlers are fully registered in Chromium before returning.
  // Without this, the wizard's immediate fetch() calls on page load may bypass
  // the mock handlers and hit the real server, causing tests to fail with 0 API
  // calls captured. Calling waitForLoadState here (in addition to any call-site
  // wait) is safe and idempotent — it only ensures the browser's route table is
  // settled before any subsequent navigation.
  await page.waitForLoadState('domcontentloaded');

  return {
    calls,
    reconfigure(updates: Partial<SetupApiOverrides>) {
      // Deep-merge nested state so individual fields can be updated independently.
      const nextState = updates.state
        ? { ...config.state, ...updates.state }
        : config.state;
      Object.assign(config, {
        projectDir: updates.projectDir ?? config.projectDir,
        state: nextState,
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

export function findCallsByUrl(calls: CapturedCall[], urlPattern: string): CapturedCall[] {
  return calls.filter(c => c.url.includes(urlPattern));
}

/**
 * Build a partially-completed setup state for resume scenarios.
 * `progress` is a number 0–100. Required env vars and integrations are
 * marked done in proportion to this value.
 */
export function buildPartialState(progress: number): Partial<SetupState> {
  const numRequiredSet = Math.floor((progress / 100) * 5);
  const numIntegrations = Math.floor((progress / 100) * 4);
  const numWorkersDeployed = Math.floor((progress / 100) * FRESH_STATE.workers.length);
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
    workers: FRESH_STATE.workers.map((w, i) => ({
      ...w,
      deployed: i < numWorkersDeployed,
      status: i < numWorkersDeployed ? 'deployed' : 'not_deployed',
    })),
  };
}

// ---------------------------------------------------------------------------
// Integration tests — validate the mock contract against the real server
// ---------------------------------------------------------------------------

/**
 * Run a contract-validation pass against a real (or mock) setup API base URL.
 * Returns a list of failures: each entry describes a mismatched response shape
 * or missing endpoint.
 *
 * Call this from a Playwright test to catch wiring regressions:
 *   const failures = await validateSetupApiContract(page, 'http://localhost:3456');
 *   expect(failures).toHaveLength(0);
 */
export async function validateSetupApiContract(
  page: Page,
  baseUrl: string,
  projectDir = '/test/project',
): Promise<Array<{ endpoint: string; method: string; error: string }>> {
  const failures: Array<{ endpoint: string; method: string; error: string }> = [];

  // POST /api/setup/write-config
  try {
    const r = await page.request.post(`${baseUrl}/api/setup/write-config`, {
      data: { projectDir, envVars: {} },
    });
    const json = await r.json();
    if (!json || typeof json !== 'object') failures.push({ endpoint: 'write-config', method: 'POST', error: `non-object response: ${JSON.stringify(json)}` });
    if (r.status() === 500 && !json.error) failures.push({ endpoint: 'write-config', method: 'POST', error: `500 without error field: ${JSON.stringify(json)}` });
  } catch (e: unknown) {
    failures.push({ endpoint: 'write-config', method: 'POST', error: String(e) });
  }

  // POST /api/setup/validate-cloudflare
  try {
    const r = await page.request.post(`${baseUrl}/api/setup/validate-cloudflare`, {
      data: { apiToken: 'fake' },
    });
    const json = await r.json();
    if (!json || typeof json !== 'object') failures.push({ endpoint: 'validate-cloudflare', method: 'POST', error: `non-object response: ${JSON.stringify(json)}` });
    if (r.status() === 400 && !json.error) failures.push({ endpoint: 'validate-cloudflare', method: 'POST', error: `400 without error field: ${JSON.stringify(json)}` });
  } catch (e: unknown) {
    failures.push({ endpoint: 'validate-cloudflare', method: 'POST', error: String(e) });
  }

  // POST /api/setup/run-setup-py (expect 500 — no setup.py in /test/project)
  try {
    const r = await page.request.post(`${baseUrl}/api/setup/run-setup-py`, {
      data: { projectDir, args: [] },
    });
    if (r.status() !== 500 && r.status() !== 200) {
      failures.push({ endpoint: 'run-setup-py', method: 'POST', error: `expected 500 or 200, got ${r.status()}` });
    }
  } catch (e: unknown) {
    failures.push({ endpoint: 'run-setup-py', method: 'POST', error: String(e) });
  }

  // POST /api/setup/deployment-mode
  try {
    const r = await page.request.post(`${baseUrl}/api/setup/deployment-mode`, {
      data: { projectDir, mode: 'selfHosted' },
    });
    const json = await r.json();
    if (!json || typeof json !== 'object') failures.push({ endpoint: 'deployment-mode', method: 'POST', error: `non-object response: ${JSON.stringify(json)}` });
  } catch (e: unknown) {
    failures.push({ endpoint: 'deployment-mode', method: 'POST', error: String(e) });
  }

  // GET /api/setup/state?projectDir=...
  try {
    const r = await page.request.get(`${baseUrl}/api/setup/state?projectDir=${encodeURIComponent(projectDir)}`);
    const json = await r.json();
    if (!json || typeof json !== 'object') failures.push({ endpoint: 'state', method: 'GET', error: `non-object response: ${JSON.stringify(json)}` });
    if (r.status() === 400 && !json.error) failures.push({ endpoint: 'state', method: 'GET', error: `400 without error field: ${JSON.stringify(json)}` });
    // Validate required fields in state response
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      const obj = json as Record<string, unknown>;
      if (!Array.isArray(obj.envVars)) failures.push({ endpoint: 'state', method: 'GET', error: 'missing or non-array envVars' });
      if (!Array.isArray(obj.integrations)) failures.push({ endpoint: 'state', method: 'GET', error: 'missing or non-array integrations' });
      if (!Array.isArray(obj.workers)) failures.push({ endpoint: 'state', method: 'GET', error: 'missing or non-array workers' });
      if (typeof obj.overallProgress !== 'number') failures.push({ endpoint: 'state', method: 'GET', error: 'missing or non-number overallProgress' });
    }
  } catch (e: unknown) {
    failures.push({ endpoint: 'state', method: 'GET', error: String(e) });
  }

  // GET /api/setup/project-path
  try {
    const r = await page.request.get(`${baseUrl}/api/setup/project-path`);
    const json = await r.json();
    if (!json || typeof json !== 'object') failures.push({ endpoint: 'project-path', method: 'GET', error: `non-object response: ${JSON.stringify(json)}` });
    if (json && typeof json === 'object' && !('projectDir' in json)) failures.push({ endpoint: 'project-path', method: 'GET', error: 'missing projectDir field' });
  } catch (e: unknown) {
    failures.push({ endpoint: 'project-path', method: 'GET', error: String(e) });
  }

  // POST /api/setup/reset-database
  try {
    const r = await page.request.post(`${baseUrl}/api/setup/reset-database`, {
      data: { projectDir },
    });
    const json = await r.json();
    if (!json || typeof json !== 'object') failures.push({ endpoint: 'reset-database', method: 'POST', error: `non-object response: ${JSON.stringify(json)}` });
  } catch (e: unknown) {
    failures.push({ endpoint: 'reset-database', method: 'POST', error: String(e) });
  }

  // POST /api/setup/regenerate-features
  try {
    const r = await page.request.post(`${baseUrl}/api/setup/regenerate-features`, {
      data: { projectDir },
    });
    const json = await r.json();
    if (!json || typeof json !== 'object') failures.push({ endpoint: 'regenerate-features', method: 'POST', error: `non-object response: ${JSON.stringify(json)}` });
  } catch (e: unknown) {
    failures.push({ endpoint: 'regenerate-features', method: 'POST', error: String(e) });
  }

  // GET /api/setup/stt/config
  try {
    const r = await page.request.get(`${baseUrl}/api/setup/stt/config`);
    const json = await r.json();
    if (!json || typeof json !== 'object') failures.push({ endpoint: 'stt/config', method: 'GET', error: `non-object response: ${JSON.stringify(json)}` });
  } catch (e: unknown) {
    failures.push({ endpoint: 'stt/config', method: 'GET', error: String(e) });
  }

  // GET /api/setup/stt/status
  try {
    const r = await page.request.get(`${baseUrl}/api/setup/stt/status`);
    const json = await r.json();
    if (!json || typeof json !== 'object') failures.push({ endpoint: 'stt/status', method: 'GET', error: `non-object response: ${JSON.stringify(json)}` });
    if (json && typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      if (typeof obj.inProgress !== 'boolean') failures.push({ endpoint: 'stt/status', method: 'GET', error: 'missing or non-boolean inProgress field' });
    }
  } catch (e: unknown) {
    failures.push({ endpoint: 'stt/status', method: 'GET', error: String(e) });
  }

  return failures;
}

/**
 * Verify the mock helper returns expected captured call structure for a given endpoint.
 */
export async function verifyCallCapture(
  page: Page,
  api: MockSetupApi,
  endpoint: string,
  method: string,
  body?: unknown,
): Promise<{ captured: boolean; call?: CapturedCall }> {
  const beforeCount = api.calls.length;
  if (method === 'POST') {
    await page.request.post(`http://localhost:3456/api/setup/${endpoint}`, { data: body ?? {} });
  } else {
    await page.request.get(`http://localhost:3456/api/setup/${endpoint}${endpoint === 'state' ? `?projectDir=${encodeURIComponent('/test/project')}` : ''}`);
  }
  const newCalls = api.calls.slice(beforeCount);
  const found = newCalls.find(c => c.endpoint === endpoint && c.method === method);
  return { captured: Boolean(found), call: found };
}
