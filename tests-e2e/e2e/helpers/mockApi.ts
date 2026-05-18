/**
 * mockApi.ts — Centralized mock factory for all E2E journey specs.
 *
 * Usage in a spec:
 *   import { setupApiMocks, gotoAuthenticated, MOCK_SESSION, MOCK_ROWS } from './helpers/mockApi';
 *
 *   test('my journey', async ({ page }) => {
 *     await gotoAuthenticated(page, '/topics');
 *   });
 *
 * Types (`SheetRow`, `NodeRunItem`) are defined inline here so that spec files
 * and testData.ts can import them from this module without crossing into the
 * `src/` directory (which is outside the Playwright testDir).
 *
 * API routing: All action-based mocks POST to `/` with `{ action: … }` body.
 * The `fireAction(page, action, body)` helper uses `page.evaluate` so Playwright
 * route handlers intercept correctly — consistent with the pattern established
 * in loops 3/4/9/16/19/20/23/24/25/26/27/28/29/30/33/34/35/36/37/38/39/40/41/
 * 42/43/44/45/46/47/48/49/50/51/52/53/54/55/56/57/58/59/60/61/62/63/64/65/66/67.
 */

import type { Page } from '@playwright/test';

// Inline types (avoids cross-directory imports outside Playwright testDir)
// Exported so testData.ts and spec files can import from mockApi instead of src/
export interface SheetRow {
  rowIndex: number;
  sourceSheet: 'Topics' | 'Draft' | 'Post';
  topicRowIndex?: number;
  topicId: string;
  topic: string;
  date: string;
  status: string;
  variant1: string;
  variant2: string;
  variant3: string;
  variant4: string;
  imageLink1: string;
  imageLink2: string;
  imageLink3: string;
  imageLink4: string;
  selectedText: string;
  selectedImageId: string;
  selectedImageUrlsJson?: string;
  postTime: string;
  emailTo?: string;
  emailCc?: string;
  emailBcc?: string;
  emailSubject?: string;
  topicGenerationRules?: string;
  generationTemplateId?: string;
  publishedAt?: string;
  topicDeliveryChannel?: string;
  topicGenerationModel?: string;
}

export interface NodeRunItem {
  id: string;
  run_id: string;
  node_id: string;
  input_json: string;
  output_json: string;
  model: string;
  duration_ms: number;
  status: string;
  error: string | null;
  created_at: string;
}

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
  ],
  config: {
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
    ],
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
  ...overrides,
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
  imageLink1: overrides.imageLink1 ?? '',
  imageLink2: overrides.imageLink2 ?? '',
  imageLink3: overrides.imageLink3 ?? '',
  imageLink4: overrides.imageLink4 ?? '',
  selectedText: overrides.selectedText ?? '',
  selectedImageId: overrides.selectedImageId ?? '',
  selectedImageUrlsJson: overrides.selectedImageUrlsJson ?? '',
  postTime: overrides.postTime ?? '09:00',
  emailTo: overrides.emailTo ?? '',
  emailCc: overrides.emailCc ?? '',
  emailBcc: overrides.emailBcc ?? '',
  emailSubject: overrides.emailSubject ?? '',
  topicGenerationRules: overrides.topicGenerationRules ?? '',
  generationTemplateId: overrides.generationTemplateId ?? '',
  topicDeliveryChannel: overrides.topicDeliveryChannel ?? '',
  topicGenerationModel: overrides.topicGenerationModel ?? '',
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

export const MOCK_INTEREST_GROUPS = [
  {
    id: 'group-1',
    name: 'AI & Technology',
    topics: ['artificial intelligence', 'machine learning'],
    color: '#6366f1',
    domains: [],
  },
  {
    id: 'group-2',
    name: 'Remote Work',
    topics: ['remote work', 'async collaboration'],
    color: '#10b981',
    domains: [],
  },
];

export const MOCK_FEED_ARTICLES = [
  {
    url: 'https://example.com/ai-article-1',
    title: 'How AI Is Transforming Startup Operations',
    source: 'TechCrunch',
    publishedAt: '2024-01-15',
    snippet: 'AI-powered tools are reshaping how startups operate in 2024.',
    imageUrl: '',
  },
  {
    url: 'https://example.com/remote-work-1',
    title: 'The Future of Remote Work in 2024',
    source: 'Forbes',
    publishedAt: '2024-01-14',
    snippet: 'Remote work continues to evolve with new async practices.',
    imageUrl: '',
  },
];

export const MOCK_CLIPS = [
  {
    id: 'clip-1',
    type: 'passage',
    articleTitle: 'How AI Is Transforming Startup Operations',
    articleUrl: 'https://example.com/ai-article-1',
    source: 'TechCrunch',
    publishedAt: '2024-01-15',
    thumbnailUrl: '',
    passageText: 'AI-powered tools are reshaping how startups operate in 2024.',
    clippedAt: new Date().toISOString(),
    assignedPostIds: [],
    versions: [],
  },
];

export const MOCK_NODE_RUNS: NodeRunItem[] = [
  {
    id: 'node-run-1',
    run_id: 'run-abc123',
    node_id: 'enrichment_persona',
    input_json: JSON.stringify({ topic: 'AI Tools for Founders' }),
    output_json: JSON.stringify({ angle: 'Founder perspective', voiceTone: 'Authoritative', targetAudience: 'Early-stage founders' }),
    model: 'google/gemini-2.0-flash',
    duration_ms: 1200,
    status: 'completed',
    error: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'node-run-2',
    run_id: 'run-abc123',
    node_id: 'enrichment_emotion',
    input_json: JSON.stringify({ topic: 'AI Tools for Founders' }),
    output_json: JSON.stringify({ primaryEmotion: 'curiosity', secondaryEmotions: ['excitement'], emotionalHook: 'The tools changing everything' }),
    model: 'google/gemini-2.0-flash',
    duration_ms: 980,
    status: 'completed',
    error: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'node-run-4',
    run_id: 'run-abc123',
    node_id: 'enrichment_copywriting',
    input_json: JSON.stringify({ topic: 'AI Tools for Founders' }),
    output_json: JSON.stringify({ hook: '5 AI tools that changed how we build', headline: 'The founder\'s toolkit just got smarter' }),
    model: 'google/gemini-2.0-flash',
    duration_ms: 1050,
    status: 'completed',
    error: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'node-run-3',
    run_id: 'run-abc123',
    node_id: 'review_generation',
    input_json: JSON.stringify({ topic: 'AI Tools for Founders', enrichment: {} }),
    output_json: JSON.stringify({ draft: 'AI tools are reshaping how founders build products.' }),
    model: 'google/gemini-2.0-flash',
    duration_ms: 2100,
    status: 'completed',
    error: null,
    created_at: new Date().toISOString(),
  },
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
  // Clear any pre-existing route handlers from prior tests in the same worker.
  // Without this, handlers from error-states.spec.ts (page.route('**', ...)) or
  // other earlier tests leak into subsequent tests and cause crashes — e.g.
  // J1 passes then J2 gets "Page.goto: Page crashed" because a stale handler
  // intercepts the navigation and returns a response that corrupts React state.
  await page.unrouteAll();

  // -------------------------------------------------------------------------
  // Token usage endpoint — GET /api/usage (not a POST action)
  // -------------------------------------------------------------------------
  await page.route('**/api/usage', async (route) => {
    const req = route.request();
    if (req.method().toUpperCase() !== 'GET') {
      await route.continue();
      return;
    }
    const tokenOverride = overrides['getTokenUsage'] as Record<string, unknown> | undefined;
    if (tokenOverride && '__error' in tokenOverride) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'usage-unavailable' }) });
      return;
    }
    const data = tokenOverride ?? { used: 0, budget: 1000000, resetDate: '2026-05-01' };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data }) });
  });

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
      let postBody: Record<string, unknown> = {};
      try {
        postBody = await req.postDataJSON() as Record<string, unknown> ?? {};
      } catch { /* ignore */ }
      const responseData = 'upsertRule' in overrides ? overrides['upsertRule'] : {
        ok: true,
        data: {
          id: 'rule-new-' + Date.now(),
          name: postBody.name ?? 'Test Automation Rule',
          platform: postBody.platform ?? 'linkedin',
          channel: postBody.channel ?? 'linkedin',
          trigger: postBody.trigger ?? 'schedule',
        },
      };
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

      case 'getSession':
        // Alias for bootstrap — returns the same session config for connection status checks
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
          success: true,
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
          pros: [
            'Strong hook potential with data-driven opener',
            'Highly relevant to target audience (founders and operators)',
            'Versatile angle that supports multiple content formats',
          ],
          cons: [
            'Competitive topic space with many existing takes',
            'Requires supporting data to avoid generic feel',
            'May need a unique differentiator to stand out',
          ],
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
          success: true,
          channel: (body.channel as string) ?? 'linkedin',
          recipientId: null,
          messageId: null,
          deliveryMode: 'sent',
          mediaMode: 'text',
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

      case 'lookupEffectiveRule':
        // Returns null when no effective rule found for context
        data = null;
        break;

      case 'upsertRule': {
        data = {
          id: `rule-${Date.now()}`,
          name: (body.name as string) ?? 'Test Automation Rule',
          platform: (body.platform as string) ?? 'linkedin',
          channel: (body.channel as string) ?? 'linkedin',
          trigger: (body.trigger as string) ?? 'schedule',
          schedule: (body.schedule as string) ?? '',
          days: (body.days as string[]) ?? [],
        };
        break;
      }

      case 'deleteRule':
        data = { success: true };
        break;

      case 'verifyTelegramChat':
        data = {
          chatId: '-100123456',
          title: 'Test Chat',
          username: 'testchat',
          type: 'group',
        };
        break;

      case 'fetchDraftImages':
        // Returns image candidates for ImageAssetManager (Media tab in editor)
        data = {
          imageUrls: [
            'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
            'https://images.unsplash.com/photo-1676252391188-296f54d921a8?w=400',
            'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400',
            'https://images.unsplash.com/photo-1655720037046-3b6f2a8d7b35?w=400',
          ],
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
        data = { authorizationUrl: 'https://instagram.com/oauth', callbackOrigin: 'http://localhost:5174' };
        break;

      case 'startGmailAuth':
        data = { authorizationUrl: 'https://accounts.google.com/oauth', callbackOrigin: 'http://localhost:5174' };
        break;

      case 'startWhatsAppAuth':
        data = { authorizationUrl: 'https://facebook.com/oauth', callbackOrigin: 'http://localhost:5174' };
        break;

      case 'startYouTubeAuth':
        data = { authorizationUrl: 'https://accounts.google.com/oauth', callbackOrigin: 'http://localhost:5174' };
        break;

      // OAuth URL getters (Journeys 6/38)
      case 'getLinkedInOAuthUrl':
        data = {
          url: 'https://linkedin.com/oauth/authorize?client_id=test&redirect_uri=http%3A%2F%2Flocalhost%3A5174%2Fauth%2Flinkedin&scope=r_liteprofile%20w_member_social&response_type=code',
        };
        break;

      case 'getGmailOAuthUrl':
        data = {
          url: 'https://accounts.google.com/oauth/v2/auth?client_id=test&redirect_uri=http%3A%2F%2Flocalhost%3A5174%2Fauth%2Fgmail&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send&response_type=code',
        };
        break;

      case 'getInstagramOAuthUrl':
        data = {
          url: 'https://api.instagram.com/oauth/authorize?client_id=test&redirect_uri=http%3A%2F%2Flocalhost%3A5174%2Fauth%2Finstagram&scope=user_profile%20user_media&response_type=code',
        };
        break;

      // Complete OAuth flows (Journeys 5/34/38/39)
      case 'completeWhatsAppConnection':
        data = {
          phoneNumberId: (body.phoneNumberId as string) ?? 'wa-test-phone-id',
          displayName: (body.displayName as string) ?? 'Test WhatsApp',
        };
        break;

      case 'completeInstagramConnection':
        data = {
          instagramUserId: (body.instagramUserId as string) ?? 'ig-test-user',
          username: (body.username as string) ?? 'test_user',
        };
        break;

      case 'completeGmailConnection':
        data = {
          gmailEmailAddress: (body.email as string) ?? 'test@example.com',
        };
        break;

      // -----------------------------------------------------------------------
      // Feed
      // -----------------------------------------------------------------------
      case 'listInterestGroups':
        data = MOCK_INTEREST_GROUPS;
        break;

      case 'createInterestGroup':
        data = {
          id: 'group-new',
          name: (body.name as string) ?? 'New Group',
          topics: ((body.topics as string) ?? '').split(',').map((t: string) => t.trim()).filter(Boolean),
          color: (body.color as string) ?? '#6366f1',
          domains: [],
        };
        break;

      case 'updateInterestGroup':
        data = {
          id: (body.id as string) ?? 'group-1',
          name: (body.name as string) ?? 'Updated Group',
          topics: ((body.topics as string) ?? '').split(',').map((t: string) => t.trim()).filter(Boolean),
          color: (body.color as string) ?? '#6366f1',
          domains: [],
        };
        break;

      case 'deleteInterestGroup':
        data = { success: true };
        break;

      case 'listClips':
        data = MOCK_CLIPS;
        break;

      case 'createClip':
        data = {
          id: 'clip-new',
          type: (body.type as string) ?? 'passage',
          articleTitle: (body.articleTitle as string) ?? '',
          articleUrl: (body.articleUrl as string) ?? '',
          source: (body.source as string) ?? '',
          publishedAt: (body.publishedAt as string) ?? '',
          thumbnailUrl: (body.thumbnailUrl as string) ?? '',
          passageText: (body.passageText as string) ?? '',
          clippedAt: new Date().toISOString(),
          assignedPostIds: [],
          versions: [],
        };
        break;

      case 'updateClip':
        data = {
          ...MOCK_CLIPS[0],
          id: (body.id as string) ?? 'clip-1',
          passageText: (body.passageText as string) ?? MOCK_CLIPS[0].passageText,
        };
        break;

      case 'deleteClip':
        data = { success: true };
        break;

      case 'assignClipToPost':
        data = { ...MOCK_CLIPS[0], assignedPostIds: [(body.postId as string) ?? 'topic-1'] };
        break;

      case 'unassignClipFromPost':
        data = { ...MOCK_CLIPS[0], assignedPostIds: [] };
        break;

      case 'getFeedArticles':
        data = { articles: MOCK_FEED_ARTICLES, fetchedAt: new Date().toISOString(), stale: false };
        break;

      case 'refreshFeedArticles':
        data = { articles: MOCK_FEED_ARTICLES, fetchedAt: new Date().toISOString(), stale: false, trendingWords: [], relatedTopics: [] };
        break;

      case 'setArticleFeedback':
        data = { vote: (body.vote as string) ?? 'up' };
        break;

      case 'getArticleFeedback':
        data = {};
        break;

      // -----------------------------------------------------------------------
      // Personas
      // -----------------------------------------------------------------------
      case 'listCustomPersonas':
        data = [];
        break;

      case 'createCustomPersona':
        data = {
          id: 'persona-custom-1',
          name: (body as Record<string, unknown>).name ?? 'Test Persona',
          currentFocus: (body as Record<string, unknown>).currentFocus ?? '',
          language: (body as Record<string, unknown>).language ?? '',
          concerns: [],
          ambitions: [],
          habits: [],
          decisionDrivers: [],
          painPoints: [],
        };
        break;

      case 'updateCustomPersona': {
        const pBody = (body as Record<string, unknown>);
        data = {
          id: pBody.id ?? 'persona-custom-1',
          name: pBody.name ?? 'Updated Persona',
          currentFocus: pBody.currentFocus ?? '',
          language: pBody.language ?? '',
          concerns: [],
          ambitions: [],
          habits: [],
          decisionDrivers: [],
          painPoints: [],
        };
        break;
      }

      case 'deleteCustomPersona':
        data = { success: true };
        break;

      // -----------------------------------------------------------------------
      // Custom workflows / writing styles
      // -----------------------------------------------------------------------
      case 'listCustomWorkflows':
        data = [
          {
            id: 'workflow-custom-1',
            name: 'Founder Voice',
            templateId: 'linkedin-professional',
            steps: [],
          },
          {
            id: 'workflow-custom-2',
            name: 'Executive Brief',
            templateId: 'linkedin-executive',
            steps: [],
          },
        ];
        break;

      case 'createCustomWorkflow':
        data = {
          id: 'workflow-custom-1',
          name: (body as Record<string, unknown>).name ?? 'Test Workflow',
          templateId: (body as Record<string, unknown>).templateId ?? '',
        };
        break;

      case 'updateCustomWorkflow': {
        const wfBody = (body as Record<string, unknown>);
        data = {
          id: wfBody.id ?? 'workflow-custom-1',
          name: wfBody.name ?? 'Updated Workflow',
          templateId: wfBody.templateId ?? '',
        };
        break;
      }

      case 'deleteCustomWorkflow':
        data = { success: true, id: (body as Record<string, unknown>).id ?? 'workflow-custom-1' };
        break;

      // -----------------------------------------------------------------------
      // Topic Discovery & Trending Research
      // -----------------------------------------------------------------------
      case 'getTrendingTopics': {
        const platform = (body.platform as string) ?? '';
        const category = (body.category as string) ?? '';
        const trendingTopics = [
          { id: 'topic-1', name: 'AI Tools for Founders', category: 'technology', volume: 52000, trend: 0.92, source: platform || 'linkedin', platform: 'linkedin', engagement: 8400, views: 125000 },
          { id: 'topic-2', name: 'Remote Work Culture', category: 'workplace', volume: 48000, trend: 0.78, source: 'youtube', platform: 'youtube', engagement: 6200, views: 98000 },
          { id: 'topic-3', name: 'Startup Growth Strategies', category: 'business', volume: 39000, trend: 0.85, source: 'news', platform: 'news', engagement: 4100, views: 76000 },
        ];
        const filtered = platform || category
          ? trendingTopics.filter(t => platform ? t.platform === platform || t.source === platform : true).filter(t => category ? t.category === category : true)
          : trendingTopics;
        data = { data: filtered, stale: false };
        break;
      }

      case 'searchTopics': {
        const query = String((body.query as string) ?? '').toLowerCase();
        const sortBy = (body.sortBy as string) ?? 'relevance';
        const searchTopics = [
          { id: 'topic-search-1', name: 'AI Productivity Tools', snippet: 'The best AI tools for startup productivity in 2024.', category: 'technology', source: 'linkedin' },
          { id: 'topic-search-2', name: 'Remote Team Management', snippet: 'How to manage remote teams effectively.', category: 'workplace', source: 'youtube' },
          { id: 'topic-search-3', name: 'Startup Funding Trends', snippet: 'Latest trends in startup funding rounds.', category: 'business', source: 'news' },
        ];
        data = {
          data: query
            ? searchTopics.filter(t => t.name.toLowerCase().includes(query) || t.snippet.toLowerCase().includes(query))
            : searchTopics,
        };
        break;
      }

      case 'discoverTopics': {
        const limit = (body.limit as number) ?? 10;
        const interests = (body.interests as string[]) ?? [];
        const discovered = [
          { id: 'disc-1', name: 'AI Agent Frameworks', category: 'technology', source: 'linkedin', sources: ['TechCrunch', 'Forbes'], score: 0.95 },
          { id: 'disc-2', name: 'Creator Economy Trends', category: 'business', source: 'youtube', sources: ['YouTube trending'], score: 0.88 },
          { id: 'disc-3', name: 'Sustainable Business Practices', category: 'sustainability', source: 'news', sources: ['Reuters', 'Bloomberg'], score: 0.82 },
          { id: 'disc-4', name: 'B2B SaaS Growth Hacks', category: 'business', source: 'linkedin', sources: ['LinkedIn News'], score: 0.79 },
          { id: 'disc-5', name: 'Async Communication Tools', category: 'workplace', source: 'youtube', sources: ['YouTube trending'], score: 0.75 },
        ];
        data = { topics: discovered.slice(0, limit), sources: ['LinkedIn', 'YouTube', 'News'] };
        break;
      }

      case 'getTopicDetails': {
        const topicId = (body.topicId as string) ?? '';
        data = {
          id: topicId || 'topic-ai-tools-1',
          name: 'AI Tools for Founders',
          description: 'Trending discussion about AI productivity tools for startup founders.',
          category: 'technology',
          sources: ['TechCrunch', 'Forbes', 'LinkedIn'],
          relatedTopics: [
            { id: 'rel-1', name: 'AI Productivity', score: 0.92 },
            { id: 'rel-2', name: 'Startup Automation', score: 0.85 },
            { id: 'rel-3', name: 'Founder Tools', score: 0.78 },
          ],
          sentimentBreakdown: { positive: 72, neutral: 18, negative: 10 },
          volume: 52000,
          trend: 0.92,
        };
        break;
      }

      case 'getLinkedInTrending': {
        const timeframe = (body.timeframe as string) ?? '30d';
        data = [
          { id: 'li-trend-1', name: 'AI Tools for Founders', title: 'AI Tools for Founders', engagement: 12400, views: 189000, trend: 0.95, timeframe },
          { id: 'li-trend-2', name: 'Startup Funding Strategies', title: 'Startup Funding Strategies', engagement: 9800, views: 145000, trend: 0.88, timeframe },
          { id: 'li-trend-3', name: 'Remote Team Culture', title: 'Remote Team Culture', engagement: 7600, views: 112000, trend: 0.82, timeframe },
        ];
        break;
      }

      case 'getYouTubeTrending': {
        const timeframe = (body.timeframe as string) ?? '30d';
        data = [
          { id: 'yt-trend-1', name: 'How to Build an AI Startup', title: 'How to Build an AI Startup', views: 520000, engagement: 45000, trend: 0.91, timeframe },
          { id: 'yt-trend-2', name: 'Productivity Systems for Founders', title: 'Productivity Systems for Founders', views: 380000, engagement: 32000, trend: 0.85, timeframe },
          { id: 'yt-trend-3', name: 'Remote Work Best Practices', title: 'Remote Work Best Practices', views: 290000, engagement: 24000, trend: 0.79, timeframe },
        ];
        break;
      }

      case 'saveTopicToQueue': {
        data = {
          rowIndex: 2,
          topicId: `topic-${Date.now()}`,
          topic: (body.name as string) ?? 'Discovered Topic',
          date: new Date().toISOString().slice(0, 10),
          status: 'Pending',
          source: (body.source as string) ?? 'discovery',
          category: (body.category as string) ?? '',
          notes: (body.notes as string) ?? '',
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
      }

      // -----------------------------------------------------------------------
      // Generation (quick change / variants)
      // -----------------------------------------------------------------------
      case 'generateQuickChange':
        data = {
          scope: 'full',
          model: 'google/gemini-2.0-flash',
          selection: null,
          replacementText: 'AI tools have quietly become the unfair advantage every founder needs. Here\'s what the data says.',
          fullText: 'AI tools have quietly become the unfair advantage every founder needs. Here\'s what the data says.',
        };
        break;

      case 'generateVariantsPreview':
        data = {
          scope: 'full',
          model: 'google/gemini-2.0-flash',
          selection: null,
          variants: [
            {
              id: 'v-1',
              label: 'Variant 1',
              replacementText: 'In 2024, I replaced 3 full-time roles with AI. Here\'s the exact stack.',
              fullText: 'In 2024, I replaced 3 full-time roles with AI. Here\'s the exact stack.',
              hookType: 'data_point',
              arcType: 'problem_agitate_solve',
              variant_rationale: 'Opens with a bold claim backed by a specific year.',
            },
            {
              id: 'v-2',
              label: 'Variant 2',
              replacementText: 'Most founders are sleeping on the AI tools that actually matter. Let me show you why.',
              fullText: 'Most founders are sleeping on the AI tools that actually matter. Let me show you why.',
              hookType: 'contrarian',
              arcType: 'insight_reveal',
              variant_rationale: 'Contrarian opener to provoke curiosity.',
            },
            {
              id: 'v-3',
              label: 'Variant 3',
              replacementText: '6 months ago I was drowning in ops work. Today AI handles 80% of it.',
              fullText: '6 months ago I was drowning in ops work. Today AI handles 80% of it.',
              hookType: 'transformation',
              arcType: 'before_after',
              variant_rationale: 'Before/after framing for relatability.',
            },
            {
              id: 'v-4',
              label: 'Variant 4',
              replacementText: 'The AI tool stack that helped us scale from 0 to $1M ARR — no fluff.',
              fullText: 'The AI tool stack that helped us scale from 0 to $1M ARR — no fluff.',
              hookType: 'milestone',
              arcType: 'story',
              variant_rationale: 'Social proof with a specific milestone.',
            },
          ],
        };
        break;

      // -----------------------------------------------------------------------
      // Enrichment
      // -----------------------------------------------------------------------
      case 'getNodeRuns':
        data = { nodeRuns: MOCK_NODE_RUNS };
        break;

      case 'analyzeFeedArticle':
        data = {
          angle: 'Founder productivity angle',
          hook: 'The unfair advantage every founder needs in 2024',
          keyFacts: [
            'AI tools reduce operational overhead by 40%',
            'Early adopters gain 3x productivity gains',
            'Cost of AI tools has dropped 60% year-over-year',
          ],
        };
        break;

      case 'findDebateArticle':
        data = {
          article: {
            url: 'https://example.com/debate-ai-tools',
            title: 'Why Most AI Tools Are Just Noise — Here\'s What Actually Works',
            source: 'TechCrunch',
            publishedAt: '2024-01-10',
            snippet: 'Most AI productivity claims don\'t hold up to scrutiny. Here\'s the data.',
          },
          angle: 'contrarian',
        };
        break;

      case 'crossDomainInsight':
        data = {
          insight: 'In healthcare, AI diagnostic tools reduced physician burnout by 35% — a parallel to how content automation can reduce creator burnout.',
          source: 'Healthcare AI Case Study',
          domain: 'healthcare',
        };
        break;

      case 'opinionLeaderInsights':
        data = {
          insights: [
            {
              leader: 'Sam Altman',
              position: 'AI will be the most transformative technology of our lifetime',
              source: 'OpenAI Blog',
            },
            {
              leader: 'Elad Gil',
              position: 'The key to AI adoption is finding the 10% of work that creates 90% of the value',
              source: 'High Growth Handbook',
            },
          ],
        };
        break;

      case 'findDraftConnections':
        data = {
          connections: [
            {
              topicId: 'topic-1',
              topic: 'AI Tools for Founders',
              relevanceScore: 0.92,
            },
          ],
        };
        break;

      // -----------------------------------------------------------------------
      // Enrichment workspace — clusterDraftClips (Journey 12)
      // -----------------------------------------------------------------------
      case 'clusterDraftClips': {
        const topicId = (body.topicId as string) ?? '';
        // Returns clusters grouped by theme for the editor sidebar
        const clusters = [
          {
            name: 'AI Productivity',
            theme: 'ai-productivity',
            clips: [
              {
                id: 'clip-1',
                type: 'passage',
                articleTitle: 'How AI Is Transforming Startup Operations',
                articleUrl: 'https://example.com/ai-article-1',
                passageText: 'AI-powered tools are reshaping how startups operate.',
                assignedPostIds: [topicId || 'topic-1'],
              },
              {
                id: 'clip-2',
                type: 'passage',
                articleTitle: 'The Future of Remote Work in 2024',
                articleUrl: 'https://example.com/remote-work-1',
                passageText: 'Remote work continues to evolve with async practices.',
                assignedPostIds: [],
              },
            ],
          },
        ];
        data = { clusters };
        break;
      }

      // -----------------------------------------------------------------------
      // Editor Media tab — uploadDraftImage (Journey 1 Step 6)
      // -----------------------------------------------------------------------
      case 'uploadDraftImage': {
        const fileName = (body.fileName as string) ?? 'uploaded-image.jpg';
        const mimeType = (body.mimeType as string) ?? 'image/jpeg';
        const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        // Return a data URI as the image URL (mirrors real R2 storage URL pattern)
        data = {
          imageId,
          imageUrl: `https://storage.example.com/${imageId}/${fileName}`,
          url: `https://storage.example.com/${imageId}/${fileName}`,
          fileName,
          mimeType,
        };
        break;
      }

      // -----------------------------------------------------------------------
      // Admin panel (action '__admin__' with __path routing)
      // -----------------------------------------------------------------------
      case '__admin__': {
        // __path and __method are in body.payload (the post() method wraps extras in payload)
        const payload = (body.payload ?? body) as Record<string, unknown>;
        const path = String(payload.__path ?? body.__path ?? '');
        const method = String(payload.__method ?? body.__method ?? 'GET');

        if (path === '/api/admin/users' && method === 'GET') {
          const ov = overrides['getAdminUsers'];
          if (ov && typeof ov === 'object' && '__error' in (ov as object)) {
            await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'boom' }) });
            return;
          }
          data = ov ?? [
            { id: 'user-default', display_name: 'Default User', status: 'active', monthly_token_budget: 1000000, monthly_tokens_used: 0 },
          ];
        } else if (path === '/api/admin/waitlist' && method === 'GET') {
          const ov = overrides['getAdminWaitlist'];
          if (ov && typeof ov === 'object' && '__error' in (ov as object)) {
            await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'boom' }) });
            return;
          }
          data = ov ?? [];
        } else if (path.includes('/approve')) {
          data = overrides['approveUserAccess'] ?? { ok: true };
        } else if (path.includes('/suspend')) {
          data = overrides['suspendUserAccess'] ?? { ok: true };
        } else if (path.includes('/budget')) {
          data = { ok: true };
        } else {
          data = { ok: true };
        }
        break;
      }

      case 'getUsageSummaryByRange':
        data = [
          {
            date: new Date().toISOString().slice(0, 10),
            provider: 'google',
            model: 'google/gemini-2.0-flash',
            user_id: 'test@example.com',
            calls: 12,
            prompt_tokens: 180000,
            completion_tokens: 35000,
            estimated_cost_usd: 0.04,
          },
        ];
        break;

      // -----------------------------------------------------------------------
      // Bulk Campaign Import (Journey 8)
      // -----------------------------------------------------------------------
      case 'bulkImportCampaign': {
        const posts = (body.posts as unknown[]) ?? [];
        // Real worker validates posts.length > 0 at pipeline.ts:594-596
        if (posts.length === 0) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ ok: false, error: 'At least one post is required.' }),
          });
          return;
        }
        data = {
          success: true,
          imported: posts.length,
        };
        break;
      }

      // ---------------------------------------------------------------------------
      // Newsletter (namespaced actions — action name starts with 'newsletter.')
      // ---------------------------------------------------------------------------
      case 'newsletter.getConfig':
        data = {
          newsletterId: 'default-newsletter',
          defaultTopic: 'Founder Weekly',
          deliveryChannel: 'linkedin',
          autoApprove: false,
        };
        break;

      case 'newsletter.saveConfig':
        data = { ok: true };
        break;

      case 'newsletter.list':
        data = [
          {
            id: 'newsletter-1',
            name: 'Founder Weekly Digest',
            subject: 'Your weekly founder insights',
            status: 'active',
            config: { deliveryChannel: 'linkedin', autoApprove: false },
          },
          {
            id: 'newsletter-2',
            name: 'Tech Trends Weekly',
            subject: 'This week in tech',
            status: 'draft',
            config: { deliveryChannel: 'instagram', autoApprove: false },
          },
        ];
        break;

      case 'newsletter.create': {
        const nlBody = (body as Record<string, unknown>);
        data = {
          id: `newsletter-${Date.now()}`,
          name: (nlBody.name as string) ?? 'New Newsletter',
          subject: (nlBody.name as string) ?? 'New Newsletter',
          status: 'draft',
          config: (nlBody.config as Record<string, unknown>) ?? {},
        };
        break;
      }

      case 'newsletter.update':
        data = { ok: true };
        break;

      case 'newsletter.delete':
        data = { ok: true };
        break;

      case 'newsletter.listIssues':
        data = [
          {
            id: 'issue-1',
            newsletterId: 'newsletter-1',
            subject: 'Founder Weekly — Issue 1',
            status: 'draft',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'issue-2',
            newsletterId: 'newsletter-1',
            subject: 'Founder Weekly — Issue 2',
            status: 'approved',
            createdAt: new Date().toISOString(),
          },
        ];
        break;

      case 'newsletter.listIssuesByNewsletter': {
        const nlBody = (body as Record<string, unknown>);
        const filteredIssues = [
          {
            id: 'issue-filtered-1',
            newsletterId: (nlBody.newsletterId as string) ?? 'newsletter-1',
            subject: 'Filtered Issue 1',
            status: 'draft',
            createdAt: new Date().toISOString(),
          },
        ];
        data = filteredIssues;
        break;
      }

      case 'newsletter.createDraftNow':
        data = {
          id: `issue-${Date.now()}`,
          subject: 'New Draft Issue',
          status: 'draft',
        };
        break;

      case 'newsletter.createDraftByNewsletter':
        data = {
          id: `issue-${Date.now()}`,
          subject: 'Draft for Newsletter',
          status: 'draft',
        };
        break;

      case 'newsletter.regenerateIssue':
        data = {
          id: (body.issueId as string) ?? 'issue-1',
          subject: 'Regenerated Issue Subject',
          status: 'draft',
          createdAt: new Date().toISOString(),
        };
        break;

      case 'newsletter.approveIssue':
        data = { ok: true };
        break;

      case 'newsletter.rejectIssue':
        data = { ok: true };
        break;

      case 'newsletter.sendApproved':
        data = { ok: true };
        break;

      case 'newsletter.issue.update':
        data = { ok: true };
        break;

      // ---------------------------------------------------------------------------
      // Scheduled Publishing (Journey 7)
      // ---------------------------------------------------------------------------
      case 'updatePostSchedule':
        data = { success: true, scheduledTime: (body.scheduledTime as string) ?? null };
        break;

      case 'scheduleContent':
        data = {
          jobId: `job-${Date.now()}`,
          status: 'scheduled',
        };
        break;

      case 'cancelScheduled':
        data = { ok: true };
        break;

      case 'listScheduled':
        data = [
          {
            jobId: 'job-1',
            id: 'job-1',
            rowId: 'topic-1',
            channel: 'linkedin',
            postTime: '2027-01-01T09:00:00.000Z',
            status: 'scheduled',
          },
        ];
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
  // setupApiMocks() calls unrouteAll() internally to clear stale handlers
  // from prior tests before registering fresh mocks — no additional
  // unrouteAll() needed here (would remove the mocks we just registered).
  await setupApiMocks(page, overrides);
  await injectFakeToken(page);
  // Convert absolute paths to base-URL-relative so Playwright resolves them
  // correctly for both local (baseURL='http://localhost:5174') and sub-path
  // deployments (baseURL='https://host/LinkedInPost/'). A leading '/' would
  // always resolve against the origin, bypassing the sub-path prefix.
  // path === '/' must come first because '/' matches startsWith('/').
  // Use absolute path relative to baseURL; ensure it starts with '/'
  const finalPath = path.startsWith('/') ? path : '/' + path;
  await page.goto(`http://localhost:5175${finalPath}`);
  await page.waitForLoadState('domcontentloaded');
}
