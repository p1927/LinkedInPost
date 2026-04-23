/**
 * mockApi.ts — Centralized mock factory for all E2E journey specs.
 *
 * Usage in a spec:
 *   import { setupApiMocks, gotoAuthenticated, MOCK_SESSION, MOCK_ROWS } from './helpers/mockApi';
 *
 *   test('my journey', async ({ page }) => {
 *     await gotoAuthenticated(page, '/topics');
 *   });
 */

import type { Page } from '@playwright/test';
import type { SheetRow } from '../../src/services/sheets';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

export const MOCK_SESSION = {
  email: 'test@example.com',
  isAdmin: true,
  onboardingCompleted: true,
  integrations: [
    {
      id: 'linkedin-1',
      type: 'linkedin',
      provider: 'linkedin',
      label: 'LinkedIn',
      displayName: 'Test LinkedIn',
      connected: true,
      personUrn: 'urn:li:person:abc123',
      needsReauth: false,
    },
    {
      id: 'instagram-1',
      type: 'instagram',
      provider: 'instagram',
      label: 'Instagram',
      displayName: 'Test Instagram',
      connected: true,
      instagramUserId: 'ig-user-123',
      needsReauth: false,
    },
    {
      id: 'gmail-1',
      type: 'gmail',
      provider: 'gmail',
      label: 'Gmail',
      displayName: 'test@example.com',
      connected: true,
      gmailEmailAddress: 'test@example.com',
      needsReauth: false,
    },
  ],
  config: {
    googleModel: 'google/gemini-2.0-flash',
    allowedGoogleModels: ['google/gemini-2.0-flash', 'anthropic/claude-3-5-haiku-20241022'],
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

const makeRow = (
  overrides: Partial<SheetRow> & Pick<SheetRow, 'topicId' | 'topic' | 'status'>,
  rowIndex: number,
): SheetRow => ({
  rowIndex,
  sourceSheet: 'Topics',
  topicId: overrides.topicId,
  topic: overrides.topic,
  date: '2024-06-01',
  status: overrides.status,
  variant1: overrides.variant1 ?? '',
  variant2: overrides.variant2 ?? '',
  variant3: overrides.variant3 ?? '',
  variant4: overrides.variant4 ?? '',
  imageLink1: '',
  imageLink2: '',
  imageLink3: '',
  imageLink4: '',
  selectedText: '',
  selectedImageId: '',
  selectedImageUrlsJson: '',
  postTime: '09:00',
  emailTo: '',
  emailCc: '',
  emailBcc: '',
  emailSubject: '',
  topicGenerationRules: '',
  generationTemplateId: '',
  topicDeliveryChannel: '',
  topicGenerationModel: '',
  ...overrides,
});

export const MOCK_ROWS: SheetRow[] = [
  makeRow(
    {
      topicId: 'topic-1',
      topic: 'AI Tools for Founders',
      status: 'Pending',
      variant1: 'AI tools are reshaping how founders build products. Here\'s what you need to know in 2024.',
      variant2: 'The founder\'s guide to AI productivity — 5 tools that saved us 20 hours per week.',
      variant3: 'Controversial take: Most AI tools are just noise. Here are the 3 that actually matter.',
      variant4: 'Thread: How we built our startup using AI — from idea to launch in 6 weeks.',
    },
    0,
  ),
  makeRow(
    {
      topicId: 'topic-2',
      topic: 'Remote Work Culture',
      status: 'Approved',
      variant1: 'Remote work changed everything. Here\'s how to build culture across time zones.',
      variant2: '5 async rituals that replaced our standups — and why we never looked back.',
      variant3: 'The hidden cost of "flexible" work: what nobody tells you about remote culture.',
      variant4: 'How we onboarded 10 remote hires in 3 months without a single in-person meeting.',
    },
    1,
  ),
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApiMockOverrides = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/** Wires all API mocks onto the page. Call before page.goto(). */
export async function setupApiMocks(
  page: Page,
  overrides: ApiMockOverrides = {},
): Promise<void> {
  // -------------------------------------------------------------------------
  // SSE stream for content generation
  // -------------------------------------------------------------------------
  await page.route('**/api/generate/stream', (route) => {
    route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
      body: [
        'data: {"type":"progress","label":"Researching topic…"}\n\n',
        'data: {"type":"progress","label":"Drafting variants…"}\n\n',
        'data: {"type":"complete","result":{"variants":["Variant 1: AI tools are reshaping how founders build products. Here\'s what you need to know in 2024.","Variant 2: The founder\'s guide to AI productivity — 5 tools that saved us 20 hours per week.","Variant 3: Controversial take: Most AI tools are just noise. Here are the 3 that actually matter.","Variant 4: Thread: How we built our startup using AI — from idea to launch in 6 weeks."]}}\n\n',
      ].join(''),
    });
  });

  // -------------------------------------------------------------------------
  // Automations / webhook routes — path-based, not action-based
  // -------------------------------------------------------------------------
  await page.route('**/automations/rules**', async (route) => {
    const req = route.request();
    const method = req.method().toUpperCase();
    const url = req.url();

    if (method === 'GET' && url.includes('/lookup')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: null }),
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: [] }),
      });
      return;
    }

    if (method === 'POST') {
      const responseData = 'upsertRule' in overrides ? overrides['upsertRule'] : { ok: true, data: [] };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseData),
      });
      return;
    }

    if (method === 'DELETE') {
      const responseData = 'deleteRule' in overrides ? overrides['deleteRule'] : { ok: true };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseData),
      });
      return;
    }

    await route.continue();
  });

  // -------------------------------------------------------------------------
  // Primary catch-all action-based POST interceptor
  // -------------------------------------------------------------------------
  await page.route('**', async (route) => {
    const req = route.request();

    if (req.method().toUpperCase() !== 'POST') {
      await route.continue();
      return;
    }

    let body: Record<string, unknown>;
    try {
      body = await req.postDataJSON();
    } catch {
      await route.continue();
      return;
    }

    const action = String(body?.action ?? '');
    if (!action) {
      await route.continue();
      return;
    }

    // Check overrides first — bootstrap merges with MOCK_SESSION so partial overrides don't crash the app
    if (action in overrides) {
      const overrideData = action === 'bootstrap'
        ? { ...MOCK_SESSION, ...(overrides[action] as Record<string, unknown>) }
        : overrides[action];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: overrideData }),
      });
      return;
    }

    let data: unknown;

    switch (action) {
      case 'bootstrap':
        data = MOCK_SESSION;
        break;

      case 'getRows':
        data = MOCK_ROWS;
        break;

      case 'addTopic':
        data = {
          rowIndex: 0,
          topicId: 'test-topic-1',
          topic: body.topic ?? '',
          date: new Date().toISOString().slice(0, 10),
          status: 'Pending',
          variant1: '',
          variant2: '',
          variant3: '',
          variant4: '',
          imageLink1: '',
          imageLink2: '',
          imageLink3: '',
          imageLink4: '',
          selectedText: '',
          selectedImageId: '',
          selectedImageUrlsJson: '',
          postTime: '',
          emailTo: '',
          emailCc: '',
          emailBcc: '',
          emailSubject: '',
          topicGenerationRules: '',
          generationTemplateId: '',
          topicDeliveryChannel: '',
          topicGenerationModel: '',
          sourceSheet: 'Topics' as const,
        };
        break;

      case 'analyzeTopicInsights':
        data = {
          pros: ['Strong hook potential', 'Relevant to founders'],
          cons: ['Competitive topic', 'Needs data'],
        };
        break;

      case 'saveDraftVariants':
        data = { success: true };
        break;

      case 'updateRowStatus':
        data = { success: true };
        break;

      case 'publishContent':
        data = {
          deliveryMode: 'sent',
          timestamp: new Date().toISOString(),
        };
        break;

      case 'getIntegrations':
        data = [
          {
            id: 'linkedin-1',
            type: 'linkedin',
            provider: 'linkedin',
            label: 'LinkedIn',
            displayName: 'Test LinkedIn',
            connected: true,
            needsReauth: false,
            personUrn: 'urn:li:person:abc123',
          },
          {
            id: 'instagram-1',
            type: 'instagram',
            provider: 'instagram',
            label: 'Instagram',
            displayName: 'Test Instagram',
            connected: true,
            needsReauth: false,
            instagramUserId: 'ig-user-123',
          },
          {
            id: 'gmail-1',
            type: 'gmail',
            provider: 'gmail',
            label: 'Gmail',
            displayName: 'test@example.com',
            connected: true,
            needsReauth: false,
            gmailEmailAddress: 'test@example.com',
          },
          {
            id: 'telegram-1',
            type: 'telegram',
            provider: 'telegram',
            label: 'Telegram',
            displayName: '',
            connected: false,
            needsReauth: false,
            chatId: '',
          },
          {
            id: 'whatsapp-1',
            type: 'whatsapp',
            provider: 'whatsapp',
            label: 'WhatsApp',
            displayName: '',
            connected: false,
            needsReauth: false,
            phoneNumberId: '',
          },
        ];
        break;

      case 'listRules':
        data = [];
        break;

      case 'verifyTelegramChat':
        data = {
          chatId: '-100123456',
          title: 'Test Chat',
          username: 'testchat',
          type: 'group',
        };
        break;

      case 'saveEmailFields':
        data = { success: true };
        break;

      case 'saveConfig':
        data = { ok: true };
        break;

      case 'getLlmSettings':
        data = { settings: [] };
        break;

      case 'listLlmModels':
        data = [
          { value: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
          { value: 'anthropic/claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
        ];
        break;

      case 'getSpreadsheetStatus':
        data = { accessible: true, title: 'Test Sheet' };
        break;

      case 'searchNewsResearch':
        data = {
          articles: [
            {
              title: 'AI Trends 2024',
              url: 'https://example.com/ai',
              source: 'TechCrunch',
              publishedAt: '2024-01-01',
              snippet: 'AI is transforming...',
            },
          ],
        };
        break;

      case 'cancelScheduledPublish':
        data = { success: true, cancelled: true };
        break;

      case 'deleteIntegration':
        data = { ok: true };
        break;

      case 'startLinkedInAuth':
        data = {
          authorizationUrl: 'https://linkedin.com/oauth',
          callbackOrigin: 'http://localhost:5174',
        };
        break;

      case 'startInstagramAuth':
        data = { authorizationUrl: 'https://instagram.com/oauth' };
        break;

      case 'startGmailAuth':
        data = { authorizationUrl: 'https://accounts.google.com/oauth' };
        break;

      case 'startWhatsAppAuth':
        data = { authorizationUrl: 'https://facebook.com/oauth' };
        break;

      default:
        // Unknown action — let it fall through to the real worker / 404
        await route.continue();
        return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data }),
    });
  });
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Injects a fake Google ID token into localStorage so the app treats the
 * session as authenticated without a real OAuth round-trip.
 */
export async function injectFakeToken(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('google_id_token', 'e2e-test-token');
  });
}

/**
 * Full authenticated navigation helper:
 * 1. Sets up all API mocks (with optional per-test overrides)
 * 2. Injects the fake auth token
 * 3. Navigates to the given path
 * 4. Waits for DOM content to be loaded
 */
export async function gotoAuthenticated(
  page: Page,
  path: string,
  overrides: ApiMockOverrides = {},
): Promise<void> {
  await setupApiMocks(page, overrides);
  await injectFakeToken(page);
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
}
