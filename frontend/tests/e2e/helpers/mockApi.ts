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
import type { NodeRunItem } from '../../src/services/backendApi';

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
    assignedPostIds: [],
    versions: [],
    createdAt: new Date().toISOString(),
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
          assignedPostIds: [],
          versions: [],
          createdAt: new Date().toISOString(),
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
        data = { articles: MOCK_FEED_ARTICLES, stale: false };
        break;

      case 'refreshFeedArticles':
        data = { articles: MOCK_FEED_ARTICLES, stale: false, trendingWords: [], relatedTopics: [] };
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

      case 'deleteCustomPersona':
        data = { success: true };
        break;

      // -----------------------------------------------------------------------
      // Custom workflows / writing styles
      // -----------------------------------------------------------------------
      case 'listCustomWorkflows':
        data = [];
        break;

      case 'createCustomWorkflow':
        data = { id: 'workflow-custom-1' };
        break;

      case 'updateCustomWorkflow':
        data = { id: (body as Record<string, unknown>).id ?? 'workflow-custom-1' };
        break;

      case 'deleteCustomWorkflow':
        data = { success: true };
        break;

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
  // Convert absolute paths to base-URL-relative so Playwright resolves them
  // correctly for both local (baseURL='http://localhost:5174') and sub-path
  // deployments (baseURL='https://host/LinkedInPost/'). A leading '/' would
  // always resolve against the origin, bypassing the sub-path prefix.
  const relativePath = path === '/' ? '.' : path.startsWith('/') ? `.${path}` : path;
  await page.goto(relativePath);
  await page.waitForLoadState('domcontentloaded');
}
