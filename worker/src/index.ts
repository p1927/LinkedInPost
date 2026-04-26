import { publishInstagramPost } from './integrations/instagram';
import { publishLinkedInPost } from './integrations/linkedin';
import { fetchImageAsset, normalizeDeliveryImageUrl } from './integrations/media';
import { sendTelegramMessage, verifyTelegramChat as verifyTelegramChatRequest } from './integrations/telegram';
import { sendWhatsAppMessage } from './integrations/whatsapp';
import { sendGmailMessage, GmailAuthError } from './integrations/gmail';
import {
  armScheduledPublish,
  handleCancelScheduledPublishDispatch,
  parseScheduledTimeToTimestamp,
  type ScheduledPublishTask,
} from './scheduled-publish';

import { generateQuickChangePreview, generateVariantsPreview } from './generation/service';
import { callGenerationWorker, callGenerationWorkerStream, isGenerationWorkerConfigured } from './generation/generationWorkerClient';
import type { GenWorkerGenerateRequest, GenWorkerGenerateResponse } from './generation/generationWorkerClient';
import { coerceVariantList } from './generation/normalize';
import { SheetsGateway, coerceBulkCampaignPostsFromPayload } from './persistence/drafts';
import {
  PipelineStore,
  deleteNewsSnapshotsByTopicId,
  getNewsResearchSnapshotById,
  listNewsResearchHistory,
  pruneOldNewsSnapshots,
} from './persistence/pipeline-db';
import { buildServices } from './services';
import { requireTopicId } from './persistence/pipeline-db/mappers';
import { searchNewsResearch } from './researcher/search';
import { trendingSearch } from './researcher/trendingSearch';
import { getNewsProviderKeyStatus, normalizeNewsResearchStored } from './researcher/config';
import type { NewsResearchStored, TrendingSearchRequest } from './researcher/types';
import type { SheetRow } from './generation/types';
import { upsertUser, completeUserOnboarding, setUserSpreadsheetId, setUserTenantSettings, listAllUserTenantSettings } from './db/users';
import { listSocialIntegrations, deleteSocialIntegration, upsertSocialIntegration, getSocialIntegration, PublicIntegration } from './db/socialIntegrations';
import { getUsageSummary, pruneOldLlmUsageLog } from './db/llm-usage';
import { MAX_IMAGES_PER_POST, parseRowImageUrls, serializeRowImageUrls } from './media/selectedImageUrls';
import { tryResolveDevGoogleAuthBypassSession } from './plugins/dev-google-auth-bypass';
import { GOOGLE_MODEL_DEFAULT, resolveAllowedGoogleModelIds, resolveEffectiveGoogleModel } from './google-model-policy';
import { shareFileWithUser } from './google/drivePermissions';
import { handleWebhookRoute, handleAutomationsAdminRoute, handleAutomationsSchedulerRoute, runAutomationCleanup } from './automations';
import { getProviderLabel } from '@repo/llm-core';
import {
  getConfiguredLlmProviderIds,
  getLlmProviderCatalog,
  resolveAllowedGrokModelIds,
  resolveAllowedOpenrouterModelIds,
  resolveAllowedMinimaxModelIds,
  resolveGithubAutomationGeminiModel,
  resolveStoredFallback,
  resolveStoredPrimary,
  workspaceConfigFromStored,
  generateTextJsonWithFallback,
  setLlmSettingInD1,
  seedLlmSettingsIfEmpty,
  LLM_SETTING_KEYS,
  type LlmRef,
  type LlmSettingKey,
  type LlmSettingsMap,
} from './llm';
import { runGithubAutomationGenerateVariants } from './internal/githubAutomationGenerateVariants';
import { syncImageGenCatalog, getImageGenCatalog, seedImageGenCatalogIfEmpty } from './image-gen/model-catalog';
import { listGeminiModels, STATIC_GEMINI_MODELS } from './llm/providers/gemini';
import { listGrokModels, STATIC_GROK_MODELS } from './llm/providers/grok';
import { listOpenrouterModels, STATIC_OPENROUTER_MODELS } from './llm/providers/openrouter';
import { listMinimaxModels, STATIC_MINIMAX_MODELS } from './llm/providers/minimax';

import { FEATURE_CAMPAIGN, FEATURE_CONTENT_FLOW, FEATURE_CONTENT_REVIEW, FEATURE_MULTI_PROVIDER_LLM, FEATURE_NEWS_RESEARCH } from './generated/features';
import { normalizeContentReviewStored, runContentReview } from './features/content-review';
import {
  handleGetPatternAssignment,
  handleListPatternAssignments,
  handleSavePatternMetadata,
  handleGetTestGroup,
} from './routes/patterns';
import {
  handleListCustomWorkflows,
  handleCreateCustomWorkflow,
  handleUpdateCustomWorkflow,
  handleDeleteCustomWorkflow,
} from './features/custom-workflows/customWorkflowActions';
import type { CreateCustomWorkflowPayload, UpdateCustomWorkflowPayload } from './features/custom-workflows/types';
import { nodeRegistry } from './engine/registry/NodeRegistry';
import { lifecycleEventBus } from './engine/events/LifecycleEventBus';
import { buildNodeInsightSummary } from './generation/nodeInsightSummary';
import type { NodeCompletedEvent } from './engine/types';


export { ScheduledPublishAlarm } from './scheduled-publish';



type ChannelId = 'instagram' | 'linkedin' | 'telegram' | 'whatsapp' | 'gmail' | 'youtube';
type AuthProvider = 'instagram' | 'linkedin' | 'whatsapp' | 'gmail' | 'youtube';

export interface Env {
  CONFIG_KV: KVNamespace;
  PIPELINE_DB: D1Database;
  SCHEDULED_LINKEDIN_PUBLISH: DurableObjectNamespace;
  ALLOWED_EMAILS: string;
  ADMIN_EMAILS?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  GOOGLE_CLOUD_STORAGE_BUCKET?: string;
  DELETE_UNUSED_GENERATED_IMAGES?: string;
  GEMINI_API_KEY?: string;
  FAL_API_KEY?: string;
  OPENAI_API_KEY?: string;
  STABILITY_API_KEY?: string;
  SEEDANCE_API_KEY?: string;
  PIXAZO_API_KEY?: string;
  /** xAI Grok API key (optional; multi-provider LLM). */
  XAI_API_KEY?: string;
  SERPAPI_API_KEY?: string;
  /** YouTube Data API v3 key for trending proxy. */
  YOUTUBE_API_KEY?: string;
  /** YouTube OAuth client credentials. */
  YOUTUBE_CLIENT_ID?: string;
  YOUTUBE_CLIENT_SECRET?: string;
  NEWSAPI_KEY?: string;
  GNEWS_API_KEY?: string;
  NEWSDATA_API_KEY?: string;
  /** Comma/newline-separated RSS URLs or JSON array string; merged with Settings feeds. */
  RESEARCHER_RSS_FEEDS?: string;
  GITHUB_TOKEN_ENCRYPTION_KEY?: string;
  CORS_ALLOWED_ORIGINS?: string;
  INSTAGRAM_APP_ID?: string;
  INSTAGRAM_APP_SECRET?: string;
  INSTAGRAM_USER_ID?: string;
  INSTAGRAM_USERNAME?: string;
  INSTAGRAM_ACCESS_TOKEN?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  LINKEDIN_PERSON_URN?: string;
  LINKEDIN_ACCESS_TOKEN?: string;
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_PUBSUB_TOPIC?: string;
  TELEGRAM_BOT_TOKEN?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  WORKER_SCHEDULER_SECRET?: string;
  /** URL of the generation-worker service (e.g. https://linkedin-generation-worker.YOUR.workers.dev). */
  GENERATION_WORKER_URL?: string;
  /** Shared secret for generation-worker Bearer auth. */
  GENERATION_WORKER_SECRET?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  /** Local only (.dev.vars): overrides CONFIG_KV spreadsheetId when preview KV has no config */
  DEV_SPREADSHEET_ID?: string;
  /** Optional: override the base URL used for OAuth redirect URIs (e.g. https://my-worker.example.com). Must match the registered redirect URI in each provider's developer console. */
  OAUTH_REDIRECT_BASE_URL?: string;
  /** Local only: shared secret; client sends as idToken to skip Google Sign-In (see dev-google-auth-bypass plugin) */
  DEV_GOOGLE_AUTH_BYPASS_SECRET?: string;
  /** Optional synthetic email for bypass session (default dev-bypass@local.invalid) */
  DEV_GOOGLE_AUTH_BYPASS_EMAIL?: string;
  /** Max stored news research runs per topic+spreadsheet (D1); default 10 */
  NEWS_SNAPSHOT_MAX_PER_TOPIC?: string;
  /** Optional: delete news_snapshots older than this many days (cron + insert prune) */
  NEWS_SNAPSHOT_MAX_AGE_DAYS?: string;
  /** Service binding for generation worker */
  GENERATION_WORKER?: Fetcher;
}

interface BotConfig {
  spreadsheetId: string;
  githubRepo: string;
  googleModel: string;
  /** Model IDs users may pick from; only admins can change this list. */
  allowedGoogleModels: string[];
  /** When FEATURE_MULTI_PROVIDER_LLM is true. */
  llm?: {
    primary: LlmRef;
    fallback?: LlmRef;
    allowedGrokModels: string[];
    allowedOpenrouterModels: string[];
    allowedMinimaxModels: string[];
  };
  llmProviderKeys?: {
    gemini: boolean;
    grok: boolean;
    openrouter: boolean;
    minimax: boolean;
  };
  generationRules: string;
  /** Workspace author context for LLM; always included when non-empty (not overridden by topic rules). */
  authorProfile: string;
  /** Per-user generation rules (empty = fall back to global generationRules). */
  userRules: string;
  /** Per-user "who am I" author profile (empty = fall back to global authorProfile). */
  userWhoAmI: string;
  hasGitHubToken: boolean;
  hasGenerationWorker: boolean;
  defaultChannel: ChannelId;
  instagramAuthAvailable: boolean;
  instagramUserId: string;
  instagramUsername: string;
  hasInstagramAccessToken: boolean;
  linkedinAuthAvailable: boolean;
  linkedinPersonUrn: string;
  hasLinkedInAccessToken: boolean;
  gmailAuthAvailable: boolean;
  gmailEmailAddress: string;
  hasGmailAccessToken: boolean;
  gmailDefaultTo: string;
  gmailDefaultCc: string;
  gmailDefaultBcc: string;
  gmailDefaultSubject: string;
  hasTelegramBotToken: boolean;
  telegramRecipients: TelegramRecipient[];
  whatsappAuthAvailable: boolean;
  whatsappPhoneNumberId: string;
  hasWhatsAppAccessToken: boolean;
  whatsappRecipients: WhatsAppRecipient[];
  youtubeAuthAvailable: boolean;
  youtubeEmailAddress: string;
  hasYouTubeAccessToken: boolean;
  /** News researcher settings (admin-editable); API keys are Worker secrets only. Omitted when FEATURE_NEWS_RESEARCH is false. */
  newsResearch?: NewsResearchStored;
  newsProviderKeys?: {
    newsapi: boolean;
    gnews: boolean;
    newsdata: boolean;
    serpapi: boolean;
  };
  /** Present when FEATURE_CONTENT_REVIEW is enabled. */
  contentReview?: {
    textRef: LlmRef;
    visionRef: LlmRef;
    newsMode: 'existing' | 'fresh';
  };
  /** Per-feature chosen LlmRef, loaded from D1, seeded from KV on first bootstrap. */
  llmSettings?: LlmSettingsMap;
  imageGen?: {
    provider: string;
    model?: string;
  };
  enrichmentSkills?: Array<{ id: string; enabled?: boolean }>;
}

interface GenerationRulesVersion {
  savedAt: string;
  savedBy: string;
  text: string;
}

export interface StoredConfig {
  spreadsheetId: string;
  githubRepo: string;
  googleModel: string;
  /** When absent, the worker defaults to Gemini 2.5 Flash only. */
  allowedGoogleModels?: string[];
  generationRules: string;
  /** Author “who am I” context for generations; separate from style rules. */
  authorProfile?: string;
  /** Per-user generation rules loaded from D1 (not KV-persisted). Overrides generationRules in generation when non-empty. */
  userRules?: string;
  /** Per-user “who am I” loaded from D1 (not KV-persisted). Overrides authorProfile in generation when non-empty. */
  userWhoAmI?: string;
  /** Prior snapshots when global rules change (newest first). */
  generationRulesHistory?: GenerationRulesVersion[];
  disconnectedAuthProviders?: AuthProvider[];
  githubTokenCiphertext?: string;
  defaultChannel: ChannelId;
  instagramUserId: string;
  instagramUsername: string;
  instagramAccessTokenCiphertext?: string;
  instagramAccessToken?: string;
  linkedinPersonUrn: string;
  linkedinAccessTokenCiphertext?: string;
  linkedinAccessToken?: string;
  gmailEmailAddress: string;
  gmailDefaultTo: string;
  gmailDefaultCc: string;
  gmailDefaultBcc: string;
  gmailDefaultSubject: string;
  gmailAccessTokenCiphertext?: string;
  gmailAccessToken?: string;
  gmailRefreshTokenCiphertext?: string;
  gmailRefreshToken?: string;
  youtubeEmailAddress?: string;
  youtubeAccessTokenCiphertext?: string;
  youtubeAccessToken?: string;
  youtubeRefreshTokenCiphertext?: string;
  youtubeRefreshToken?: string;
  telegramBotTokenCiphertext?: string;
  telegramBotToken?: string;
  telegramRecipients: TelegramRecipient[];
  whatsappPhoneNumberId: string;
  whatsappAccessTokenCiphertext?: string;
  whatsappAccessToken?: string;
  whatsappRecipients: WhatsAppRecipient[];
  newsResearch?: NewsResearchStored;
  llm?: {
    primary?: LlmRef;
    fallback?: LlmRef;
    allowedGrokModels?: string[];
    allowedOpenrouterModels?: string[];
    allowedMinimaxModels?: string[];
  };
  contentReview?: {
    textRef?: LlmRef;
    visionRef?: LlmRef;
    newsMode?: 'existing' | 'fresh';
  };
  imageGen?: {
    provider?: string;
    model?: string;
  };
  enrichmentSkills?: Array<{ id: string; enabled?: boolean }>;
}

interface BotConfigUpdate {
  spreadsheetId?: string;
  githubRepo?: string;
  googleModel?: string;
  allowedGoogleModels?: string[];
  generationRules?: string;
  authorProfile?: string;
  githubToken?: string;
  defaultChannel?: ChannelId;
  instagramUserId?: string;
  instagramUsername?: string;
  instagramAccessToken?: string;
  linkedinPersonUrn?: string;
  linkedinAccessToken?: string;
  gmailEmailAddress?: string;
  gmailDefaultTo?: string;
  gmailDefaultCc?: string;
  gmailDefaultBcc?: string;
  gmailDefaultSubject?: string;
  gmailAccessToken?: string;
  gmailRefreshToken?: string;
  telegramBotToken?: string;
  telegramRecipients?: TelegramRecipient[];
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappRecipients?: WhatsAppRecipient[];
  newsResearch?: NewsResearchStored;
  llm?: {
    primary?: LlmRef;
    fallback?: LlmRef | null;
    allowedGrokModels?: string[];
    allowedOpenrouterModels?: string[];
    allowedMinimaxModels?: string[];
  };
  contentReview?: {
    textRef?: LlmRef;
    visionRef?: LlmRef;
    newsMode?: 'existing' | 'fresh';
  };
  imageGen?: {
    provider?: string;
    model?: string;
  };
  enrichmentSkills?: Array<{ id: string; enabled?: boolean }>;
}

function normalizeDisconnectedAuthProviders(value: unknown): AuthProvider[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value.filter((provider): provider is AuthProvider => provider === 'instagram' || provider === 'linkedin' || provider === 'whatsapp' || provider === 'gmail'),
  ));
}

function withoutDisconnectedAuthProvider(providers: AuthProvider[], provider: AuthProvider): AuthProvider[] {
  return providers.filter((entry) => entry !== provider);
}

function withDisconnectedAuthProvider(providers: AuthProvider[], provider: AuthProvider): AuthProvider[] {
  return providers.includes(provider) ? providers : [...providers, provider];
}

interface TelegramRecipient {
  label: string;
  chatId: string;
}

interface WhatsAppRecipient {
  label: string;
  phoneNumber: string;
}

interface AppSession {
  email: string;
  isAdmin: boolean;
  config: BotConfig;
  onboardingCompleted: boolean;
  integrations: PublicIntegration[];
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface RequestPayload {
  action?: string;
  idToken?: string;
  payload?: Record<string, unknown>;
}















interface VerifiedSession {
  email: string;
  userId: string;   // same as email — Google email is the stable user identifier
  isAdmin: boolean;
}

interface OAuthStateRecord {
  provider: AuthProvider;
  email: string;
  origin: string;
  redirectUri: string;
}

interface WhatsAppPhoneOption {
  businessAccountId: string;
  businessAccountName: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string;
}

interface PendingWhatsAppConnectionRecord {
  email: string;
  origin: string;
  accessTokenCiphertext: string;
  options: WhatsAppPhoneOption[];
}

interface TelegramChatVerificationResult {
  chatId: string;
  title: string;
  username: string;
  type: string;
}

interface LinkedInTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface MetaTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
  };
}

interface InstagramOAuthTokenResponse {
  access_token?: string;
  user_id?: string | number;
  permissions?: string[] | string;
  error_type?: string;
  error_message?: string;
}

interface InstagramMeResponse {
  user_id?: string | number;
  username?: string;
  data?: Array<{
    user_id?: string | number;
    username?: string;
  }>;
}

interface LinkedInMeResponse {
  id?: string;
}

interface LinkedInUserInfoResponse {
  sub?: string;
}

interface GraphDataResponse<T> {
  data?: T[];
  error?: {
    message?: string;
  };
}

interface MetaPhoneNumberNode {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
}

interface MetaPhoneNumberEdge {
  data?: MetaPhoneNumberNode[];
}

interface MetaWhatsAppBusinessAccountNode {
  id?: string;
  name?: string;
  phone_numbers?: MetaPhoneNumberEdge;
}

interface MetaBusinessNode {
  owned_whatsapp_business_accounts?: {
    data?: MetaWhatsAppBusinessAccountNode[];
  };
}

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface GoogleTokenInfo {
  email?: string;
  email_verified?: string | boolean;
  aud?: string;
  name?: string;
  picture?: string;
}

interface GmailTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}



interface DraftImageListResult {
  imageUrls: string[];
}

interface DraftImageUploadResult {
  imageUrl: string;
}

interface DraftImagePromoteResult {
  imageUrl: string;
}

interface SerpApiImageResult {
  original?: string;
  thumbnail?: string;
  link?: string;
}

interface SerpApiSearchResponse {
  images_results?: SerpApiImageResult[];
  error?: string;
}

const CONFIG_KEY = 'shared-config';
const GITHUB_TOKEN_REAUTH_MESSAGE = 'The stored GitHub token can no longer be decrypted. This usually means GITHUB_TOKEN_ENCRYPTION_KEY changed after the token was saved. Ask an admin to open Settings and save the GitHub token again.';
const INSTAGRAM_TOKEN_REAUTH_MESSAGE = 'The stored Instagram access token can no longer be decrypted. Ask an admin to open Settings and save the token again.';
const LINKEDIN_TOKEN_REAUTH_MESSAGE = 'The stored LinkedIn access token can no longer be decrypted. Ask an admin to open Settings and save the token again.';
const TELEGRAM_TOKEN_REAUTH_MESSAGE = 'The stored Telegram bot token can no longer be decrypted. Ask an admin to open Settings and save the token again.';
const WHATSAPP_TOKEN_REAUTH_MESSAGE = 'The stored WhatsApp access token can no longer be decrypted. Ask an admin to open Settings and save the token again.';
const GMAIL_TOKEN_REAUTH_MESSAGE = 'The stored Gmail access token can no longer be decrypted. Ask an admin to open Settings and save the token again.';
const GOOGLE_API_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/devstorage.read_write',
].join(' ');
const OAUTH_STATE_PREFIX = 'oauth-state:';
const WHATSAPP_PENDING_PREFIX = 'whatsapp-pending:';
const OAUTH_STATE_TTL_SECONDS = 60 * 10;
const WHATSAPP_PENDING_TTL_SECONDS = 60 * 10;
const INSTAGRAM_OAUTH_SCOPE = [
  'instagram_business_basic',
  'instagram_business_content_publish',
].join(',');
const LINKEDIN_OAUTH_SCOPE = [
  'openid',
  'profile',
  'w_member_social',
].join(' ');
const META_GRAPH_VERSION = 'v25.0';
const META_OAUTH_SCOPES = [
  'business_management',
  'whatsapp_business_management',
  'whatsapp_business_messaging',
].join(',');
const GMAIL_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'email',
].join(' ');

function newsSnapshotMaxPerTopicFromEnv(env: Env): number {
  const raw = String(env.NEWS_SNAPSHOT_MAX_PER_TOPIC ?? '').trim();
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1) {
    return Math.min(500, Math.floor(n));
  }
  return 10;
}

function newsSnapshotMaxAgeDaysFromEnv(env: Env): number | undefined {
  const raw = String(env.NEWS_SNAPSHOT_MAX_AGE_DAYS ?? '').trim();
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    return Math.floor(n);
  }
  return undefined;
}

export default {
  async fetch(request, env): Promise<Response> {
    const corsHeaders = buildCorsHeaders(request, env);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Automations: webhook receivers (GET for challenge, POST for events)
    if (url.pathname.startsWith('/webhooks/')) {
      const webhookResp = await handleWebhookRoute(request, env, url);
      if (webhookResp) return webhookResp;
    }

    // Automations internal routes (machine callers, scheduler secret auth)
    if (url.pathname.startsWith('/automations/internal/')) {
      const authError = await verifySchedulerSecret(request, env);
      if (authError) return authError;
      const schedulerResp = await handleAutomationsSchedulerRoute(request, env, url);
      return schedulerResp ?? jsonResponse({ ok: false, error: 'Not found.' }, 404, corsHeaders);
    }

    // Automations admin routes (GET/POST/PUT/DELETE, Bearer auth, admin only)
    if (url.pathname.startsWith('/automations/')) {
      const authHeader = request.headers.get('Authorization') || '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      try {
        const s = await verifySession(idToken, env);
        if (!s.isAdmin) return jsonResponse({ ok: false, error: 'Forbidden' }, 403, corsHeaders);
      } catch {
        return jsonResponse({ ok: false, error: 'Unauthorized' }, 401, corsHeaders);
      }
      const adminResp = await handleAutomationsAdminRoute(request, env, url);
      return adminResp ?? jsonResponse({ ok: false, error: 'Not found.' }, 404, corsHeaders);
    }

    if (request.method === 'GET') {
      if (url.pathname === '/') {
        return jsonResponse({ ok: true, data: { status: 'ok', backend: 'cloudflare-worker' } }, 200, corsHeaders);
      }

      if (url.pathname === '/v1/image-gen-catalog') {
        const authHeader = request.headers.get('Authorization') || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        try {
          const s = await verifySession(idToken, env);
          if (!s.isAdmin) return jsonResponse({ ok: false, error: 'Forbidden' }, 403, corsHeaders);
        } catch {
          return jsonResponse({ ok: false, error: 'Unauthorized' }, 401, corsHeaders);
        }
        await seedImageGenCatalogIfEmpty(env.PIPELINE_DB);
        const catalog = await getImageGenCatalog(env.PIPELINE_DB);
        const IMAGE_GEN_PROVIDER_LABELS: Record<string, string> = {
          'flux-kontext': 'FLUX Kontext (FAL)',
          'ideogram': 'Ideogram (FAL)',
          'dall-e': 'DALL-E / GPT Image (OpenAI)',
          'stability': 'Stability AI',
          'gemini': 'Google Gemini',
          'seedance': 'Seedance (ByteDance)',
          'pixazo': 'Pixazo SDXL',
        };
        const providers = Object.entries(catalog).map(([provider, models]) => ({
          provider,
          label: IMAGE_GEN_PROVIDER_LABELS[provider] ?? provider,
          models,
        }));
        return jsonResponse({ ok: true, data: { providers } }, 200, corsHeaders);
      }

      if (url.pathname === '/auth/linkedin/callback') {
        return handleLinkedInCallback(request, env);
      }

      if (url.pathname === '/auth/instagram/callback') {
        return handleInstagramCallback(request, env);
      }

      if (url.pathname === '/auth/whatsapp/callback') {
        return handleWhatsAppCallback(request, env);
      }

      if (url.pathname === '/auth/gmail/callback') {
        return handleGmailCallback(request, env);
      }

      if (url.pathname === '/auth/youtube/callback') {
        return handleYouTubeCallback(request, env);
      }

      return jsonResponse({ ok: false, error: 'Not found.' }, 404, corsHeaders);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405, corsHeaders);
    }

    if (url.pathname === '/internal/schedule-linkedin-publish') {
      return handleScheduledLinkedInPublishRequest(request, env);
    }

    if (url.pathname === '/internal/merged-rows') {
      return handleInternalMergedRowsRequest(request, env);
    }

    if (url.pathname === '/internal/pipeline-upsert') {
      return handleInternalPipelineUpsertRequest(request, env);
    }

    if (url.pathname === '/internal/github-automation-gemini-model') {
      return handleInternalGithubAutomationGeminiModelRequest(request, env);
    }

    if (url.pathname === '/internal/github-automation-generate-variants') {
      return handleInternalGithubAutomationGenerateVariantsRequest(request, env);
    }

    // SSE streaming generation endpoint
    if (url.pathname === '/api/generate/stream') {
      const authHeader = request.headers.get('Authorization') || '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

      let session: Awaited<ReturnType<typeof verifySession>>;
      try {
        session = await verifySession(idToken, env);
      } catch (e) {
        return jsonResponse({ ok: false, error: 'Unauthorized' }, 401, corsHeaders);
      }

      if (!FEATURE_CONTENT_FLOW) {
        return jsonResponse({ ok: false, error: 'Generation worker integration is disabled.' }, 400, corsHeaders);
      }
      if (!isGenerationWorkerConfigured(env)) {
        return jsonResponse({ ok: false, error: 'GENERATION_WORKER_URL is not configured.' }, 400, corsHeaders);
      }

      const storedConfig = await loadStoredConfig(env, session.userId, { isAdmin: session.isAdmin });
      const payload = await request.json() as Record<string, unknown>;

      // Queue for enrichment SSE events — drained by the stream relay below
      const enrichmentQueue: string[] = [];

      const unsubscribeEnrichment = lifecycleEventBus.subscribe<NodeCompletedEvent>(
        'node:completed',
        (event) => {
          // Synchronous handler — push serialised SSE event to queue
          const insightSummary = buildNodeInsightSummary(event.nodeId, '{}');
          enrichmentQueue.push(
            `data: ${JSON.stringify({
              type: 'enrichment:node_completed',
              nodeId: event.nodeId,
              durationMs: event.durationMs,
              insightSummary,
            })}\n\n`,
          );
        },
      );

      let genResponse: Response;
      try {
        genResponse = await callGenerationWorkerStream(env, {
          spreadsheetId: storedConfig.spreadsheetId,
          ...payload,
          ...(storedConfig.imageGen ? { imageGen: storedConfig.imageGen } : {}),
          ...(storedConfig.enrichmentSkills ? { enrichmentSkills: storedConfig.enrichmentSkills } : {}),
        } as GenWorkerGenerateRequest);
      } catch (e) {
        return jsonResponse({ ok: false, error: String(e) }, 502, corsHeaders);
      }

      if (!genResponse.ok || !genResponse.body) {
        const text = await genResponse.text().catch(() => 'unknown error');
        return jsonResponse({ ok: false, error: `Generation worker error: ${text.slice(0, 200)}` }, 502, corsHeaders);
      }

      // Transform stream: intercept 'complete' event to do D1 post-processing
      const { readable: transformedReadable, writable: transformedWritable } = new TransformStream<Uint8Array, Uint8Array>();
      const writer = transformedWritable.getWriter();
      const encoder = new TextEncoder();

      void (async () => {
        const reader = genResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split('\n\n');
            buffer = blocks.pop() ?? '';
            for (const block of blocks) {
              if (!block.trim()) continue;
              const eventMatch = block.match(/^event: (\w+)/m);
              const dataMatch = block.match(/^data: (.+)$/m);

              if (eventMatch?.[1] === 'complete' && dataMatch) {
                // Do D1 post-processing before forwarding
                try {
                  const genResult = JSON.parse(dataMatch[1]) as GenWorkerGenerateResponse;
                  const topicIdForSave = String((payload as Record<string, unknown>).topicId || '').trim();
                  if (topicIdForSave && genResult.primaryPatternId) {
                    try {
                      const { pipeline, sheets } = buildServices(env, session.userId);
                      const rowForSave = await pipeline.getRowByTopicId(sheets, storedConfig.spreadsheetId, topicIdForSave);
                      if (rowForSave) {
                        await pipeline.savePatternMetadata(storedConfig.spreadsheetId, rowForSave, {
                          generationRunId: genResult.runId || '',
                          patternId: genResult.primaryPatternId || '',
                          patternName: rowForSave.patternName || '',
                          patternRationale: genResult.patternRationale || '',
                        });
                      }
                    } catch (e) {
                      console.error('[stream auto-save patternMetadata]', e);
                    }
                  }
                  if (topicIdForSave && genResult.nodeRuns && genResult.nodeRuns.length > 0) {
                    try {
                      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                      await env.PIPELINE_DB.prepare(
                        `DELETE FROM node_runs WHERE expires_at < datetime('now') AND rowid IN
                         (SELECT rowid FROM node_runs WHERE expires_at < datetime('now') LIMIT 500)`,
                      ).run();
                      const stmts = genResult.nodeRuns.map((r) =>
                        env.PIPELINE_DB.prepare(
                          `INSERT OR IGNORE INTO node_runs
                           (id, run_id, topic_id, user_id, node_id, input_json, output_json, model, duration_ms, status, error, expires_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        ).bind(
                          crypto.randomUUID(),
                          genResult.runId || '',
                          topicIdForSave,
                          session.userId,
                          r.nodeId,
                          r.inputJson,
                          r.outputJson,
                          r.model,
                          r.durationMs,
                          r.status,
                          r.error ?? null,
                          expiresAt,
                        ),
                      );
                      await env.PIPELINE_DB.batch(stmts);
                    } catch (e) {
                      console.error('[stream auto-save nodeRuns]', e);
                    }
                  }
                } catch (e) {
                  console.error('[stream complete parse]', e);
                }
              }

              // Drain any queued enrichment events before forwarding the block
              while (enrichmentQueue.length > 0) {
                await writer.write(encoder.encode(enrichmentQueue.shift()!));
              }
              // Forward the block
              await writer.write(encoder.encode(block + '\n\n'));
            }
          }
        } finally {
          unsubscribeEnrichment();
          await writer.close();
        }
      })();

      const streamHeaders = new Headers(corsHeaders);
      streamHeaders.set('Content-Type', 'text/event-stream');
      streamHeaders.set('Cache-Control', 'no-cache');
      streamHeaders.set('Connection', 'keep-alive');
      return new Response(transformedReadable, { headers: streamHeaders });
    }

    try {
      const { action, idToken, payload } = await parseRequest(request);
      if (!action) {
        throw new Error('Missing action.');
      }

      const session = await verifySession(idToken, env);
      if (action === 'downloadDraftImage') {
        const response = await downloadDraftImage(payload ?? {});
        return withCorsHeaders(response, corsHeaders);
      }

      const storedConfig = await loadStoredConfig(env, session.userId, { isAdmin: session.isAdmin });
      const { sheets, pipeline } = buildServices(env, session.userId);

      if (action === 'sendTopicToGeneration') {
        if (!FEATURE_CONTENT_FLOW) {
          return jsonResponse({ ok: false, error: 'Generation worker integration is disabled.' }, 400, corsHeaders);
        }
        if (!isGenerationWorkerConfigured(env)) {
          return jsonResponse({ ok: false, error: 'GENERATION_WORKER_URL is not configured.' }, 400, corsHeaders);
        }
        const topicId = String((payload ?? {}).topicId || '').trim();
        if (!topicId) return jsonResponse({ ok: false, error: 'topicId is required.' }, 400, corsHeaders);
        const row = await pipeline.getRowByTopicId(sheets, storedConfig.spreadsheetId, topicId);
        if (!row) return jsonResponse({ ok: false, error: 'Topic not found.' }, 404, corsHeaders);
        if (row.status?.trim().toLowerCase() !== 'draft') {
          return jsonResponse({ ok: false, error: 'Only Draft topics can be sent to generation.' }, 409, corsHeaders);
        }

        // Build generation request from topicGenerationRules metadata
        const genReq: GenWorkerGenerateRequest = {
          spreadsheetId: storedConfig.spreadsheetId,
          topicId,
          topic: row.topic,
        };
        if (row.topicGenerationRules) {
          try {
            const meta = JSON.parse(row.topicGenerationRules) as Record<string, unknown>;
            const asStr = (v: unknown): string | null =>
              typeof v === 'string' && v.trim() ? v.trim() : null;
            const constraintParts: string[] = [];
            if (asStr(meta.about)) constraintParts.push(`About this post: ${asStr(meta.about)}`);
            if (asStr(meta.meaning)) constraintParts.push(`Message to convey: ${asStr(meta.meaning)}`);
            if (asStr(meta.notes)) constraintParts.push(`Research notes: ${asStr(meta.notes)}`);
            if (Array.isArray(meta.pros) && meta.pros.length > 0) constraintParts.push(`Arguments for this topic: ${(meta.pros as unknown[]).map(String).join(', ')}`);
            if (Array.isArray(meta.cons) && meta.cons.length > 0) constraintParts.push(`Watch out for: ${(meta.cons as unknown[]).map(String).join(', ')}`);
            if (constraintParts.length > 0) genReq.constraints = constraintParts.join('\n');
            if (asStr(meta.style)) genReq.tone = asStr(meta.style)!;
            if (asStr(meta.audience)) genReq.audience = asStr(meta.audience)!;
          } catch {
            // ignore malformed JSON
          }
        }

        // 1. Call generation worker first — may throw on non-ok response
        let genResponse: Response;
        try {
          genResponse = await callGenerationWorkerStream(env, genReq);
        } catch (e) {
          // Revert status back to Draft so the topic isn't stuck in Pending
          await env.PIPELINE_DB.prepare(
            `UPDATE pipeline_rows SET status = 'Draft' WHERE user_id = ? AND topic_id = ?`,
          ).bind(session.userId, topicId).run();
          return jsonResponse({ ok: false, error: String(e) }, 502, corsHeaders);
        }

        // 2. Only flip to Pending after we have a good response
        const updateResult = await env.PIPELINE_DB.prepare(
          `UPDATE pipeline_rows SET status = 'Pending' WHERE user_id = ? AND topic_id = ?`,
        ).bind(session.userId, topicId).run();
        if (updateResult.meta.changes === 0) {
          console.warn('[sendTopicToGeneration] No D1 row updated for topicId:', topicId, '— topic may be Sheet-only');
        }

        if (!genResponse.body) {
          await env.PIPELINE_DB.prepare(
            `UPDATE pipeline_rows SET status = 'Draft' WHERE user_id = ? AND topic_id = ?`,
          ).bind(session.userId, topicId).run();
          const text = await genResponse.text().catch(() => 'unknown error');
          return jsonResponse({ ok: false, error: `Generation worker error: ${text.slice(0, 200)}` }, 502, corsHeaders);
        }

        const { readable: transformedReadable, writable: transformedWritable } = new TransformStream<Uint8Array, Uint8Array>();
        const writer = transformedWritable.getWriter();
        const encoder = new TextEncoder();

        void (async () => {
          const reader = genResponse.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const blocks = buffer.split('\n\n');
              buffer = blocks.pop() ?? '';
              for (const block of blocks) {
                if (!block.trim()) continue;
                await writer.write(encoder.encode(block + '\n\n'));
              }
            }
            if (buffer.trim()) {
              await writer.write(encoder.encode(buffer + '\n\n'));
            }
          } catch (streamErr) {
            console.error('[sendTopicToGeneration] SSE relay error:', streamErr);
          } finally {
            await writer.close();
          }
        })();

        const streamHeaders = new Headers(corsHeaders);
        streamHeaders.set('Content-Type', 'text/event-stream');
        streamHeaders.set('Cache-Control', 'no-cache');
        streamHeaders.set('Connection', 'keep-alive');
        return new Response(transformedReadable, { headers: streamHeaders });
      }

      const data = await dispatchAction(action, payload ?? {}, session, storedConfig, env, sheets, pipeline, request);
      return jsonResponse({ ok: true, data }, 200, corsHeaders);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected backend error.';
      return jsonResponse({ ok: false, error: message }, 400, corsHeaders);
    }
  },
  scheduled(_event, env, ctx) {
    ctx.waitUntil(runAutomationCleanup(env.CONFIG_KV).catch(() => undefined));
    ctx.waitUntil(
      pruneOldNewsSnapshots(
        env.PIPELINE_DB,
        newsSnapshotMaxPerTopicFromEnv(env),
        newsSnapshotMaxAgeDaysFromEnv(env),
      ).catch(() => undefined),
    );
    ctx.waitUntil(
      pruneOldLlmUsageLog(env.PIPELINE_DB).catch(() => undefined),
    );
    ctx.waitUntil(syncImageGenCatalog(env.PIPELINE_DB, env).catch(() => undefined));
    ctx.waitUntil(
      import('./newsletter/scheduler').then(m =>
        m.runNewsletterScheduler(env, env.PIPELINE_DB),
      ).catch(err => console.error('Newsletter scheduler error:', err)),
    );
  },
} satisfies ExportedHandler<Env>;

async function verifySchedulerSecret(request: Request, env: Env): Promise<Response | null> {
  const providedSecret = String(request.headers.get('X-Scheduler-Secret') || '').trim();
  const expectedSecret = String(env.WORKER_SCHEDULER_SECRET || '').trim();
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return Response.json({ ok: false, error: 'Unauthorized scheduler request.' }, { status: 401 });
  }
  return null;
}

async function handleScheduledLinkedInPublishRequest(request: Request, env: Env): Promise<Response> {
  const authError = await verifySchedulerSecret(request, env);
  if (authError) {
    return authError;
  }

  const config = await loadStoredConfig(env);
  ensureSpreadsheetConfigured(config);
  if (!config.linkedinPersonUrn || (!config.linkedinAccessTokenCiphertext && !config.linkedinAccessToken)) {
    return Response.json({ ok: false, error: 'LinkedIn publishing is not configured in the Worker.' }, { status: 400 });
  }

  const payload = await request.json<ScheduledPublishTask & { topic?: string; date?: string }>();
  let topicId = String(payload.topicId || '').trim();
  const scheduledTime = String(payload.scheduledTime || '').trim();
  const topic = String(payload.topic || '').trim();
  const date = String(payload.date || '').trim();

  if (!scheduledTime) {
    return Response.json({ ok: false, error: 'Missing scheduledTime in scheduling payload.' }, { status: 400 });
  }

  if (!topicId && topic && date) {
    const { sheets, pipeline } = buildServices(env);
    const rows = await pipeline.getMergedRows(sheets, config.spreadsheetId);
    const match = rows.find((r) => r.topic.trim() === topic && r.date.trim() === date);
    topicId = String(match?.topicId || '').trim();
  }

  if (!topicId) {
    return Response.json(
      { ok: false, error: 'Missing topicId (or topic + date so the Worker can resolve it).' },
      { status: 400 },
    );
  }

  const response = await armScheduledPublish(env, {
    topicId,
    topic,
    date,
    scheduledTime,
    intent: payload.intent || 'publish',
    channel: payload.channel,
    recipientId: payload.recipientId,
  });
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
    },
  });
}

async function handleInternalMergedRowsRequest(request: Request, env: Env): Promise<Response> {
  const authError = await verifySchedulerSecret(request, env);
  if (authError) {
    return authError;
  }

  const config = await loadStoredConfig(env);
  ensureSpreadsheetConfigured(config);
  const { sheets, pipeline } = buildServices(env);
  const rows = await pipeline.getMergedRows(sheets, config.spreadsheetId);
  return Response.json({ ok: true, data: rows });
}

async function handleInternalPipelineUpsertRequest(request: Request, env: Env): Promise<Response> {
  const authError = await verifySchedulerSecret(request, env);
  if (authError) {
    return authError;
  }

  const config = await loadStoredConfig(env);
  ensureSpreadsheetConfigured(config);
  const body = (await request.json()) as { row?: unknown };
  const row = coerceSheetRow(body.row);
  const { pipeline } = buildServices(env);
  await pipeline.upsertFull(config.spreadsheetId, row);
  return Response.json({ ok: true });
}

/** Same Gemini model id the Worker injects into GitHub `repository_dispatch` for draft automation. */
async function handleInternalGithubAutomationGeminiModelRequest(request: Request, env: Env): Promise<Response> {
  const authError = await verifySchedulerSecret(request, env);
  if (authError) {
    return authError;
  }

  const config = await loadStoredConfig(env);
  ensureSpreadsheetConfigured(config);
  const llmSettings = await seedLlmSettingsIfEmpty(
    env.PIPELINE_DB,
    config.spreadsheetId,
    config,
    GOOGLE_MODEL_DEFAULT,
  );
  const auto = llmSettings.github_automation;
  if (auto.provider === 'gemini') {
    return Response.json({ ok: true, data: { googleModel: auto.model } });
  }
  const ws = workspaceConfigFromStored(config.googleModel, config.allowedGoogleModels, config.llm);
  const googleModel = resolveGithubAutomationGeminiModel(ws, FEATURE_MULTI_PROVIDER_LLM);
  return Response.json({ ok: true, data: { googleModel } });
}

async function handleInternalGithubAutomationGenerateVariantsRequest(request: Request, env: Env): Promise<Response> {
  const authError = await verifySchedulerSecret(request, env);
  if (authError) {
    return authError;
  }

  const config = await loadStoredConfig(env);
  ensureSpreadsheetConfigured(config);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const data = await runGithubAutomationGenerateVariants(
      env,
      config.spreadsheetId,
      config,
      body,
      GOOGLE_MODEL_DEFAULT,
    );
    return Response.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub automation generation failed.';
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}

async function dispatchAction(
  action: string,
  payload: Record<string, unknown>,
  session: VerifiedSession,
  storedConfig: StoredConfig,
  env: Env,
  sheets: SheetsGateway,
  pipeline: PipelineStore,
  request: Request,
): Promise<unknown> {
  switch (action) {
    case 'bootstrap': {
      const llmSettings = storedConfig.spreadsheetId
        ? await seedLlmSettingsIfEmpty(env.PIPELINE_DB, storedConfig.spreadsheetId, storedConfig, GOOGLE_MODEL_DEFAULT)
        : undefined;
      const publicConfig = toPublicConfig(storedConfig, env);
      const [integrations, userRow] = await Promise.all([
        listSocialIntegrations(env.PIPELINE_DB, session.userId),
        env.PIPELINE_DB.prepare('SELECT onboarding_completed FROM users WHERE id = ?1')
          .bind(session.userId).first<{ onboarding_completed: number }>(),
      ]);
      return {
        email: session.email,
        isAdmin: session.isAdmin,
        config: llmSettings ? { ...publicConfig, llmSettings } : publicConfig,
        onboardingCompleted: (userRow?.onboarding_completed ?? 0) === 1,
        integrations,
      } satisfies AppSession;
    }
    case 'getGoogleModels': {
      const full = await listGeminiModels(env);
      if (session.isAdmin) {
        return full;
      }
      const allow = new Set(resolveAllowedGoogleModelIds(storedConfig));
      const filtered = full.filter((m) => allow.has(m.value));
      if (filtered.length > 0) {
        return filtered;
      }
      return STATIC_GEMINI_MODELS.filter((m) => allow.has(m.value));
    }
    case 'listLlmModels': {
      if (!FEATURE_MULTI_PROVIDER_LLM) {
        throw new Error('Multi-provider LLM is disabled for this deployment.');
      }
      const provider = String(payload.provider || '').trim();
      if (provider === 'gemini') {
        const full = await listGeminiModels(env);
        if (session.isAdmin) {
          return full;
        }
        const allow = new Set(resolveAllowedGoogleModelIds(storedConfig));
        const filtered = full.filter((m) => allow.has(m.value));
        return filtered.length > 0 ? filtered : STATIC_GEMINI_MODELS.filter((m) => allow.has(m.value));
      }
      if (provider === 'grok') {
        const full = await listGrokModels(env);
        if (session.isAdmin) {
          return full;
        }
        const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
        const allow = new Set(resolveAllowedGrokModelIds(ws));
        const filtered = full.filter((m) => allow.has(m.value));
        return filtered.length > 0 ? filtered : full.filter((m) => allow.has(m.value));
      }
      if (provider === 'openrouter') {
        const full = await listOpenrouterModels(env);
        if (session.isAdmin) {
          return full;
        }
        const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
        const allow = new Set(resolveAllowedOpenrouterModelIds(ws));
        const filtered = full.filter((m) => allow.has(m.value));
        return filtered.length > 0 ? filtered : STATIC_OPENROUTER_MODELS.filter((m) => allow.has(m.value));
      }
      if (provider === 'minimax') {
        const full = listMinimaxModels(env);
        if (session.isAdmin) {
          return full;
        }
        const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
        const allow = new Set(resolveAllowedMinimaxModelIds(ws));
        const filtered = full.filter((m) => allow.has(m.value));
        return filtered.length > 0 ? filtered : STATIC_MINIMAX_MODELS.filter((m) => allow.has(m.value));
      }
      throw new Error('Unknown LLM provider.');
    }
    case 'getLlmProviderCatalog': {
      if (!FEATURE_MULTI_PROVIDER_LLM) {
        throw new Error('Multi-provider LLM is disabled for this deployment.');
      }
      const catalog = await getLlmProviderCatalog(env);
      const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
      return {
        providers: catalog.map((entry) => {
          let models = entry.models;
          if (!session.isAdmin) {
            if (entry.provider === 'gemini') {
              const allow = new Set(resolveAllowedGoogleModelIds(storedConfig));
              models = models.filter((m) => allow.has(m.value));
              if (models.length === 0) models = STATIC_GEMINI_MODELS.filter((m) => allow.has(m.value));
            } else if (entry.provider === 'grok') {
              const allow = new Set(resolveAllowedGrokModelIds(ws));
              models = models.filter((m) => allow.has(m.value));
              if (models.length === 0) models = STATIC_GROK_MODELS.filter((m) => allow.has(m.value));
            } else if (entry.provider === 'openrouter') {
              const allow = new Set(resolveAllowedOpenrouterModelIds(ws));
              models = models.filter((m) => allow.has(m.value));
              if (models.length === 0) models = STATIC_OPENROUTER_MODELS.filter((m) => allow.has(m.value));
            } else if (entry.provider === 'minimax') {
              const allow = new Set(resolveAllowedMinimaxModelIds(ws));
              models = models.filter((m) => allow.has(m.value));
              if (models.length === 0) models = STATIC_MINIMAX_MODELS.filter((m) => allow.has(m.value));
            }
          }
          return {
            id: entry.provider,
            name: getProviderLabel(entry.provider),
            models,
          };
        }),
        staticFallbacks: {
          gemini: STATIC_GEMINI_MODELS,
          grok: STATIC_GROK_MODELS,
          openrouter: STATIC_OPENROUTER_MODELS,
          minimax: STATIC_MINIMAX_MODELS,
        },
      };
    }
    case 'getLlmSettings': {
      ensureSpreadsheetConfigured(storedConfig);
      const settings = await seedLlmSettingsIfEmpty(env.PIPELINE_DB, storedConfig.spreadsheetId, storedConfig, GOOGLE_MODEL_DEFAULT);
      return settings;
    }
    case 'getUsageSummary': {
      const isAdminReq = session.isAdmin;
      const rows = isAdminReq
        ? await getUsageSummary(env.PIPELINE_DB, { days: 30 })
        : await getUsageSummary(env.PIPELINE_DB, { spreadsheetId: storedConfig.spreadsheetId, userId: session.email, days: 30 });
      return rows;
    }
    case 'getUsageSummaryByRange': {
      const { days } = (payload as { days?: number });
      const daysNum = Math.min(Math.max(Number(days) || 30, 1), 90);
      const isAdminReq = session.isAdmin;
      const rows = isAdminReq
        ? await getUsageSummary(env.PIPELINE_DB, { days: daysNum })
        : await getUsageSummary(env.PIPELINE_DB, { spreadsheetId: storedConfig.spreadsheetId, userId: session.email, days: daysNum });
      return rows;
    }
    case 'saveLlmSetting': {
      ensureAdmin(session);
      ensureSpreadsheetConfigured(storedConfig);
      const key = String(payload.key || '').trim() as LlmSettingKey;
      if (!(LLM_SETTING_KEYS as readonly string[]).includes(key)) {
        throw new Error(`Unknown LLM setting key: ${key}`);
      }
      const ref = payload.ref as { provider?: string; model?: string } | undefined;
      if (!ref?.provider || !ref?.model) {
        throw new Error('saveLlmSetting requires payload.ref with provider and model.');
      }
      const provider = String(ref.provider).trim();
      const model = String(ref.model).trim();
      if (provider !== 'gemini' && provider !== 'grok' && provider !== 'openrouter' && provider !== 'minimax') {
        throw new Error(`Unknown provider: ${provider}`);
      }
      await setLlmSettingInD1(env.PIPELINE_DB, storedConfig.spreadsheetId, key, { provider: provider as import('./llm/types').LlmProviderId, model });
      return { ok: true, key, provider, model };
    }
    case 'getRows': {
      const sid = String(storedConfig.spreadsheetId || '').trim();
      if (!sid) {
        // No sheet configured — return rows from D1 only
        return pipeline.getRowsByUserId();
      }
      // Sheet configured — merge Sheets + D1; fall back to D1 on access errors (e.g. 403)
      try {
        return await pipeline.getMergedRows(sheets, sid);
      } catch (e) {
        console.error('[getRows] Sheets merge failed, falling back to D1:', e);
        return pipeline.getRowsByUserId();
      }
    }
    case 'generateQuickChange':
      ensureSpreadsheetConfigured(storedConfig);
      return generateQuickChangePreview(env, storedConfig, payload, (templateId) =>
        sheets.getPostTemplateRulesById(storedConfig.spreadsheetId, templateId),
      session.userId,
    );
    case 'generateVariantsPreview':
      ensureSpreadsheetConfigured(storedConfig);
      return generateVariantsPreview(env, storedConfig, payload, (templateId) =>
        sheets.getPostTemplateRulesById(storedConfig.spreadsheetId, templateId),
      session.userId,
    );
    case 'saveDraftVariants':
      return pipeline.saveDraftVariants(
        storedConfig.spreadsheetId,
        coerceSheetRow(payload.row),
        coerceVariantList(payload.variants),
        payload.previewSelection &&
        typeof payload.previewSelection === 'object' &&
        payload.previewSelection !== null
          ? {
              selectedText: String((payload.previewSelection as { selectedText?: unknown }).selectedText ?? ''),
              selectedImageId: String((payload.previewSelection as { selectedImageId?: unknown }).selectedImageId ?? ''),
              selectedImageUrlsJson: String(
                (payload.previewSelection as { selectedImageUrlsJson?: unknown }).selectedImageUrlsJson ?? '',
              ),
            }
          : undefined,
      );
    case 'addTopic': {
      const topicText = String(payload.topic || '').trim();
      if (!topicText) throw new Error('topic is required.');
      const topicId = crypto.randomUUID();
      const date = String(payload.date || new Date().toISOString().slice(0, 10)).trim();
      const sid = String(storedConfig.spreadsheetId || '').trim();
      const topicMeta = payload.topicMeta && typeof payload.topicMeta === 'object' ? payload.topicMeta : null;
      const topicGenerationRules = topicMeta ? JSON.stringify(topicMeta) : '';
      if (topicGenerationRules.length > 8000) throw new Error('Topic metadata is too large.');
      // Always write to D1 first (optional Sheets: never fail the request if Google rejects sync)
      const newRow = await pipeline.addTopicToD1(topicText, date, topicId, sid, topicGenerationRules, 'Draft');
      if (sid) {
        try {
          await sheets.addTopic(sid, topicText);
        } catch (e) {
          console.error('[addTopic] Sheets sync failed (D1 row already saved):', e);
        }
      }
      return newRow;
    }
    case 'updateTopicMeta': {
      const topicId = String(payload.topicId || '').trim();
      if (!topicId) throw new Error('topicId is required.');
      const topicText = String(payload.topic || '').trim();
      if (!topicText) throw new Error('topic is required.');
      const topicMeta = payload.topicMeta && typeof payload.topicMeta === 'object' ? payload.topicMeta : null;
      const topicGenerationRules = topicMeta ? JSON.stringify(topicMeta) : '';
      if (topicGenerationRules.length > 8000) throw new Error('Topic metadata is too large.');
      const row = await pipeline.getRowByTopicId(sheets, storedConfig.spreadsheetId, topicId);
      if (!row) throw new Error('Topic not found.');
      const updated: SheetRow = { ...row, topic: topicText, topicGenerationRules };
      await pipeline.upsertFull(storedConfig.spreadsheetId, updated);
      return updated;
    }
    case 'listCustomPersonas': {
      const personas = await pipeline.listCustomPersonas(session.userId);
      return personas;
    }
    case 'createCustomPersona': {
      const name = String(payload.name || '').trim();
      if (!name) throw new Error('name is required.');
      const concerns = Array.isArray(payload.concerns) ? payload.concerns : [];
      const ambitions = Array.isArray(payload.ambitions) ? payload.ambitions : [];
      const currentFocus = String(payload.currentFocus || '');
      const habits = Array.isArray(payload.habits) ? payload.habits : [];
      const language = String(payload.language || '');
      const decisionDrivers = Array.isArray(payload.decisionDrivers) ? payload.decisionDrivers : [];
      const painPoints = Array.isArray(payload.painPoints) ? payload.painPoints : [];
      const id = crypto.randomUUID();
      await pipeline.createCustomPersona(session.userId, {
        id, name, concerns, ambitions, currentFocus, habits, language, decisionDrivers, painPoints,
      });
      return { id, name, concerns, ambitions, currentFocus, habits, language, decisionDrivers, painPoints };
    }
    case 'deleteCustomPersona': {
      const personaId = String(payload.personaId || '').trim();
      if (!personaId) throw new Error('personaId is required.');
      await pipeline.deleteCustomPersona(session.userId, personaId);
      return { success: true };
    }
    case 'listCustomWorkflows': {
      return handleListCustomWorkflows(env.PIPELINE_DB, session.userId);
    }
    case 'createCustomWorkflow': {
      const cwPayload = payload as unknown as CreateCustomWorkflowPayload;
      return handleCreateCustomWorkflow(env.PIPELINE_DB, session.userId, cwPayload);
    }
    case 'updateCustomWorkflow': {
      const cwPayload = payload as unknown as UpdateCustomWorkflowPayload;
      return handleUpdateCustomWorkflow(env.PIPELINE_DB, session.userId, cwPayload);
    }
    case 'deleteCustomWorkflow': {
      const cwId = (payload as { id: string }).id;
      return handleDeleteCustomWorkflow(env.PIPELINE_DB, session.userId, cwId);
    }
    case 'getNodeCatalog': {
      return Response.json({ nodes: nodeRegistry.list().map(n => ({ id: n.id, name: n.name, description: n.description })) });
    }
    case 'analyzeTopicInsights': {
      const topicText = String(payload.topic || '').trim();
      if (!topicText) throw new Error('topic is required.');
      const about = String(payload.about || '').trim();
      const meaning = String(payload.meaning || '').trim();
      const notes = String(payload.notes || '').trim();
      const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
      const primary = resolveStoredPrimary(ws, true);
      const fallback = resolveStoredFallback(ws, true);
      const contextParts = [
        `Topic: ${topicText}`,
        about ? `About: ${about}` : '',
        meaning ? `Meaning to convey: ${meaning}` : '',
        notes ? `Research notes: ${notes}` : '',
      ].filter(Boolean).join('\n');
      const prompt = `You are a content strategy assistant. Analyze the following LinkedIn post topic and generate a balanced list of pros (arguments for writing this post) and cons (potential challenges or counterpoints).

${contextParts}

Return ONLY valid JSON matching this exact shape:
{"pros": ["string", ...], "cons": ["string", ...]}

Rules:
- 3–5 items each
- Each item is a short, punchy insight (max 12 words)
- Pros: reasons this topic will resonate, angles that could go viral, strategic value
- Cons: risks, counterarguments, things to be careful about
- No markdown, no explanation, just the JSON object`;
      const { text } = await generateTextJsonWithFallback(env, primary, fallback, prompt);
      const cleaned = text.replace(/```json|```/g, '').trim();
      let parsed: { pros: string[]; cons: string[] };
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error('AI returned unexpected format. Please try again.');
      }
      return {
        pros: Array.isArray(parsed.pros) ? parsed.pros.map(String).slice(0, 6) : [],
        cons: Array.isArray(parsed.cons) ? parsed.cons.map(String).slice(0, 6) : [],
      };
    }
    case 'updateRowStatus':
      return pipeline.updateRowStatus(
        storedConfig.spreadsheetId,
        coerceSheetRow(payload.row),
        String(payload.status || ''),
        String(payload.selectedText || ''),
        String(payload.selectedImageId || ''),
        String(payload.postTime || ''),
        String(payload.emailTo || ''),
        String(payload.emailCc || ''),
        String(payload.emailBcc || ''),
        String(payload.emailSubject || ''),
        String(payload.selectedImageUrlsJson ?? ''),
      );
    case 'saveEmailFields':
      return pipeline.saveEmailFields(
        storedConfig.spreadsheetId,
        coerceSheetRow(payload.row),
        String(payload.emailTo || ''),
        String(payload.emailCc || ''),
        String(payload.emailBcc || ''),
        String(payload.emailSubject || ''),
      );
    case 'createDraftFromPublished':
      ensureSpreadsheetConfigured(storedConfig);
      return pipeline.createDraftFromPublished(
        sheets,
        storedConfig.spreadsheetId,
        coerceSheetRow(payload.row),
        String(payload.selectedText || ''),
        String(payload.selectedImageId || ''),
        String(payload.postTime || ''),
        String(payload.emailTo || ''),
        String(payload.emailCc || ''),
        String(payload.emailBcc || ''),
        String(payload.emailSubject || ''),
        String(payload.selectedImageUrlsJson ?? ''),
      );
    case 'updatePostSchedule':
      return pipeline.updatePostSchedule(
        storedConfig.spreadsheetId,
        coerceSheetRow(payload.row),
        String(payload.postTime || ''),
      );
    case 'deleteRow': {
      ensureSpreadsheetConfigured(storedConfig);
      const rowToDelete = coerceSheetRow(payload.row);
      const topicIdToDelete = requireTopicId(rowToDelete);
      await deleteGcsObjectsForTopicRow(env, rowToDelete);
      await Promise.all([
        pipeline.deletePipelineRow(storedConfig.spreadsheetId, topicIdToDelete),
        deleteNewsSnapshotsByTopicId(env.PIPELINE_DB, storedConfig.spreadsheetId, topicIdToDelete),
      ]);
      return sheets.deleteRow(storedConfig.spreadsheetId, rowToDelete);
    }
    case 'saveConfig':
      ensureAdmin(session);
      return saveConfig(env, storedConfig, payload as BotConfigUpdate, session);
    case 'saveUserSettings': {
      const p = payload as { userRules?: unknown; userWhoAmI?: unknown };
      await setUserTenantSettings(env.PIPELINE_DB, session.userId, {
        userRules: typeof p.userRules === 'string' ? p.userRules : undefined,
        userWhoAmI: typeof p.userWhoAmI === 'string' ? p.userWhoAmI : undefined,
      });
      return { ok: true };
    }
    case 'adminListTenantSettings': {
      ensureAdmin(session);
      const tenants = await listAllUserTenantSettings(env.PIPELINE_DB);
      return { tenants };
    }
    case 'getGenerationRulesHistory':
      ensureAdmin(session);
      return {
        versions: storedConfig.generationRulesHistory || [],
        current: storedConfig.generationRules || '',
      };
    case 'saveTopicGenerationRules':
      return pipeline.saveTopicGenerationRules(
        storedConfig.spreadsheetId,
        coerceSheetRow(payload.row),
        String(payload.topicRules ?? ''),
      );
    case 'listPostTemplates': {
      const sid = String(storedConfig.spreadsheetId || '').trim();
      if (!sid) {
        return [];
      }
      try {
        return await sheets.listPostTemplates(sid);
      } catch (e) {
        console.error('[listPostTemplates] Sheets read failed:', e);
        return [];
      }
    }
    case 'createPostTemplate':
      ensureSpreadsheetConfigured(storedConfig);
      return sheets.createPostTemplate(
        storedConfig.spreadsheetId,
        String(payload.name || '').trim(),
        String(payload.rules ?? ''),
      );
    case 'updatePostTemplate':
      ensureSpreadsheetConfigured(storedConfig);
      return sheets.updatePostTemplate(
        storedConfig.spreadsheetId,
        String(payload.templateId || '').trim(),
        String(payload.name || '').trim(),
        String(payload.rules ?? ''),
      );
    case 'deletePostTemplate':
      ensureSpreadsheetConfigured(storedConfig);
      return sheets.deletePostTemplate(storedConfig.spreadsheetId, String(payload.templateId || '').trim());
    case 'saveGenerationTemplateId':
      return pipeline.saveGenerationTemplateId(
        storedConfig.spreadsheetId,
        coerceSheetRow(payload.row),
        String(payload.generationTemplateId ?? ''),
      );
    case 'saveTopicDeliveryPreferences':
      return pipeline.saveTopicDeliveryPreferences(storedConfig.spreadsheetId, coerceSheetRow(payload.row), {
        topicDeliveryChannel:
          payload.topicDeliveryChannel !== undefined ? String(payload.topicDeliveryChannel ?? '') : undefined,
        topicGenerationModel:
          payload.topicGenerationModel !== undefined ? String(payload.topicGenerationModel ?? '') : undefined,
      });
    case 'startLinkedInAuth':
      return startLinkedInAuth(request, env, session);
    case 'startInstagramAuth':
      return startInstagramAuth(request, env, session);
    case 'startWhatsAppAuth':
      ensureAdmin(session);
      return startWhatsAppAuth(request, env, session);
    case 'startGmailAuth':
      return startGmailAuth(request, env, session);
    case 'startYouTubeAuth':
      return startYouTubeAuth(request, env, session);
    case 'disconnectChannelAuth':
      ensureAdmin(session);
      return disconnectChannelAuth(env, storedConfig, String(payload.provider || '').trim());
    case 'completeWhatsAppConnection':
      ensureAdmin(session);
      return completeWhatsAppConnection(env, session, payload);
    case 'verifyTelegramChat':
      ensureAdmin(session);
      return verifyTelegramChat(env, storedConfig, payload);
    case 'fetchDraftImages':
      return fetchDraftImages(env, payload);
    case 'promoteDraftImageUrl':
      return promoteDraftImageUrl(env, payload);
    case 'uploadDraftImage':
      return uploadDraftImage(env, payload);
    case 'uploadContextDocument':
      return handleUploadContextDocument(payload);
    case 'generateImageWithReference':
      return generateImageWithReference(env, storedConfig, payload);
    case 'triggerGithubAction':
      return triggerGithubAction(env, storedConfig, payload);
    case 'publishContent':
      ensureSpreadsheetConfigured(storedConfig);
      return publishContent(env, session.userId, storedConfig, payload, sheets, pipeline);
    case 'cancelScheduledPublish':
      ensureSpreadsheetConfigured(storedConfig);
      return handleCancelScheduledPublishDispatch(env, payload);
    case 'searchNewsResearch':
      ensureSpreadsheetConfigured(storedConfig);
      if (!FEATURE_NEWS_RESEARCH) {
        throw new Error('News research is disabled for this deployment.');
      }
      return searchNewsResearch(
        env,
        normalizeNewsResearchStored(storedConfig.newsResearch),
        payload,
        storedConfig.spreadsheetId,
      );
    case 'trendingSearch':
      return trendingSearch(
        env,
        env.PIPELINE_DB,
        normalizeNewsResearchStored(storedConfig.newsResearch),
        storedConfig.spreadsheetId,
        session.userId,
        payload as unknown as TrendingSearchRequest,
      );
    case 'bulkImportCampaign':
      ensureSpreadsheetConfigured(storedConfig);
      if (!FEATURE_CAMPAIGN) {
        throw new Error('Campaign import is disabled for this deployment.');
      }
      return pipeline.bulkImportCampaign(
        sheets,
        storedConfig.spreadsheetId,
        coerceBulkCampaignPostsFromPayload(payload),
      );
    case 'listNewsResearchHistory':
      ensureSpreadsheetConfigured(storedConfig);
      if (!FEATURE_NEWS_RESEARCH) {
        throw new Error('News research is disabled for this deployment.');
      }
      {
        const topicId = String(payload.topicId || '').trim();
        const limitRaw = Number(payload.limit);
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(50, Math.floor(limitRaw)) : 20;
        return listNewsResearchHistory(env.PIPELINE_DB, storedConfig.spreadsheetId, {
          topicId: topicId || undefined,
          limit,
        });
      }
    case 'getNewsResearchSnapshot':
      ensureSpreadsheetConfigured(storedConfig);
      if (!FEATURE_NEWS_RESEARCH) {
        throw new Error('News research is disabled for this deployment.');
      }
      {
        const id = String(payload.id || '').trim();
        if (!id) {
          throw new Error('Snapshot id is required.');
        }
        const snap = await getNewsResearchSnapshotById(env.PIPELINE_DB, storedConfig.spreadsheetId, id);
        if (!snap) {
          throw new Error('Snapshot not found.');
        }
        let articles: unknown[] = [];
        try {
          const parsed = JSON.parse(snap.articles) as unknown;
          articles = Array.isArray(parsed) ? parsed : [];
        } catch {
          articles = [];
        }
        return {
          id: snap.id,
          topicId: snap.topic_id,
          fetchedAt: snap.fetched_at,
          windowStart: snap.window_start,
          windowEnd: snap.window_end,
          customQuery: snap.custom_query,
          providersSummary: snap.providers_summary,
          dedupeRemoved: snap.dedupe_removed,
          articles,
        };
      }
    case 'runContentReview': {
      if (!FEATURE_CONTENT_REVIEW) {
        throw new Error('Content review is disabled for this deployment.');
      }
      ensureSpreadsheetConfigured(storedConfig);
      const baseRow = coerceSheetRow(payload.row);
      const editorText = String(payload.editorText ?? '');
      const urlsRaw = payload.selectedImageUrls;
      const selectedImageUrls = Array.isArray(urlsRaw)
        ? urlsRaw.map((u) => String(u || '').trim()).filter(Boolean)
        : [];
      const { selectedImageId, selectedImageUrlsJson } = serializeRowImageUrls(selectedImageUrls);
      const deliveryCh = String(payload.deliveryChannel || baseRow.topicDeliveryChannel || 'linkedin').trim() || 'linkedin';
      const syntheticRow: SheetRow = {
        ...baseRow,
        selectedText: editorText,
        selectedImageId,
        selectedImageUrlsJson,
        topicDeliveryChannel: deliveryCh,
      };
      const cr = storedConfig.contentReview;
      const report = await runContentReview(
        env,
        storedConfig.spreadsheetId,
        syntheticRow,
        {
          textRef: cr?.textRef,
          visionRef: cr?.visionRef,
          newsMode: cr?.newsMode,
        },
      );
      await pipeline.updateContentReview(
        storedConfig.spreadsheetId,
        baseRow.topicId,
        report.fingerprint,
        report.reviewedAt,
        JSON.stringify(report),
      );
      return report;
    }
    case 'callGenerationWorker': {
      if (!FEATURE_CONTENT_FLOW) {
        throw new Error('Generation worker integration is disabled for this deployment.');
      }
      ensureSpreadsheetConfigured(storedConfig);
      if (!isGenerationWorkerConfigured(env)) {
        throw new Error('GENERATION_WORKER_URL is not configured. Set it in Worker environment.');
      }
      const genResult = await callGenerationWorker(env, {
        spreadsheetId: storedConfig.spreadsheetId,
        ...(payload as Record<string, unknown>),
        ...(storedConfig.imageGen ? { imageGen: storedConfig.imageGen } : {}),
        ...(storedConfig.enrichmentSkills ? { enrichmentSkills: storedConfig.enrichmentSkills } : {}),
      } as Parameters<typeof callGenerationWorker>[1]);

      // C4: Auto-save generation results to D1
      const topicIdForSave = String((payload as Record<string, unknown>).topicId || '').trim();
      if (topicIdForSave && genResult.primaryPatternId) {
        try {
          const rowForSave = await pipeline.getRowByTopicId(sheets, storedConfig.spreadsheetId, topicIdForSave);
          if (rowForSave) {
            await pipeline.savePatternMetadata(storedConfig.spreadsheetId, rowForSave, {
              generationRunId: genResult.runId || '',
              patternId: genResult.primaryPatternId || '',
              patternName: rowForSave.patternName || '', // prevent empty overwrite
              patternRationale: genResult.patternRationale || '',
            });
          }
        } catch (e) {
          console.error('[auto-save patternMetadata]', e);
        }
      }

      // C5: Persist node_runs for pipeline observability (30-day TTL)
      if (topicIdForSave && genResult.nodeRuns && genResult.nodeRuns.length > 0) {
        try {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          // Purge expired rows (best-effort, limit 500 per call)
          await env.PIPELINE_DB.prepare(
            `DELETE FROM node_runs WHERE expires_at < datetime('now') AND rowid IN
             (SELECT rowid FROM node_runs WHERE expires_at < datetime('now') LIMIT 500)`,
          ).run();
          const stmts = genResult.nodeRuns.map((r) =>
            env.PIPELINE_DB.prepare(
              `INSERT OR IGNORE INTO node_runs
               (id, run_id, topic_id, user_id, node_id, input_json, output_json, model, duration_ms, status, error, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ).bind(
              crypto.randomUUID(),
              genResult.runId || '',
              topicIdForSave,
              session.userId,
              r.nodeId,
              r.inputJson,
              r.outputJson,
              r.model,
              r.durationMs,
              r.status,
              r.error ?? null,
              expiresAt,
            ),
          );
          await env.PIPELINE_DB.batch(stmts);
        } catch (e) {
          console.error('[auto-save nodeRuns]', e);
        }
      }

      return genResult;
    }
    case 'getNodeRuns': {
      const topicId = String((payload as Record<string, unknown>).topicId || '').trim();
      if (!topicId) return { nodeRuns: [] };
      // Purge expired rows on read too (best-effort)
      void env.PIPELINE_DB.prepare(
        `DELETE FROM node_runs WHERE expires_at < datetime('now') AND rowid IN
         (SELECT rowid FROM node_runs WHERE expires_at < datetime('now') LIMIT 500)`,
      ).run().catch(() => undefined);
      const result = await env.PIPELINE_DB.prepare(
        `SELECT id, run_id, node_id, input_json, output_json, model, duration_ms, status, error, created_at
         FROM node_runs
         WHERE user_id = ? AND topic_id = ? AND expires_at > datetime('now')
         ORDER BY created_at DESC
         LIMIT 500`,
      ).bind(session.userId, topicId).all<{
        id: string; run_id: string; node_id: string;
        input_json: string; output_json: string; model: string;
        duration_ms: number; status: string; error: string | null; created_at: string;
      }>();
      return { nodeRuns: result.results ?? [] };
    }
    case 'getPatternAssignment': {
      return handleGetPatternAssignment(pipeline, storedConfig.spreadsheetId, payload);
    }
    case 'listPatternAssignments': {
      return handleListPatternAssignments(pipeline, storedConfig.spreadsheetId);
    }
    case 'savePatternMetadata': {
      return handleSavePatternMetadata(pipeline, storedConfig.spreadsheetId, payload, async () => {
        const topicId = String(payload.topicId || '').trim();
        if (!topicId) throw new Error('topicId is required.');
        const row = await pipeline.getRowByTopicId(sheets, storedConfig.spreadsheetId, topicId);
        if (!row) throw new Error(`Row not found for topicId: ${topicId}`);
        return row;
      });
    }
    case 'getTestGroup': {
      return handleGetTestGroup(payload);
    }
    case 'listPatterns': {
      const baseUrl = String(env.GENERATION_WORKER_URL || '').trim().replace(/\/$/, '');
      if (!baseUrl) {
        return [];
      }
      const secret = String(env.GENERATION_WORKER_SECRET || '').trim();
      const response = await fetch(`${baseUrl}/v1/patterns/full`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!response.ok) {
        throw new Error(`Generation worker returned ${response.status}: ${await response.text()}`);
      }
      return (await response.json() as { patterns: unknown[] }).patterns;
    }
    case 'assignPattern': {
      const { row, patternId, patternName, patternRationale, generationRunId } = payload as {
        row: SheetRow;
        patternId: string;
        patternName?: string;
        patternRationale?: string;
        generationRunId?: string;
      };
      return pipeline.savePatternMetadata(storedConfig.spreadsheetId, coerceSheetRow(row), {
        generationRunId: generationRunId || '',
        patternId: String(patternId || '').trim(),
        patternName: patternName || '',
        patternRationale: patternRationale || '',
      });
    }
    case 'trendingYouTube': {
      const apiKey = String(env.YOUTUBE_API_KEY || '').trim();
      if (!apiKey) return { items: [] };
      const { query } = payload as { query: string };
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('q', String(query || ''));
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('order', 'viewCount');
      searchUrl.searchParams.set('maxResults', '10');
      searchUrl.searchParams.set('key', apiKey);
      const res = await fetch(searchUrl.toString());
      if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
      const data = await res.json() as { items?: unknown[] };
      return { items: data.items ?? [] };
    }

    case 'trendingLinkedIn': {
      const apiKey = String(env.LINKEDIN_ACCESS_TOKEN || '').trim();
      const orgId = String(payload?.orgId || '').trim();
      if (!apiKey || !orgId) return { elements: [] };
      const liUrl = new URL('https://api.linkedin.com/v2/organizationalEntityShareStatistics');
      liUrl.searchParams.set('q', 'organizationalEntity');
      liUrl.searchParams.set('organizationalEntity', `urn:li:organization:${orgId}`);
      liUrl.searchParams.set('count', '10');
      const res = await fetch(liUrl.toString(), {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Restli-Protocol-Version': '2.0.0' },
      });
      if (!res.ok) throw new Error(`LinkedIn API error: ${res.status}`);
      const data = await res.json() as { elements?: unknown[] };
      return { elements: data.elements ?? [] };
    }

    case 'trendingInstagram': {
      const accessToken = String(env.INSTAGRAM_ACCESS_TOKEN || '').trim();
      const userId = String(env.INSTAGRAM_USER_ID || '').trim();
      const { query } = payload as { query: string };
      if (!accessToken || !userId) return { data: [] };
      const hashtagUrl = new URL('https://graph.instagram.com/v18.0/ig_hashtag_search');
      hashtagUrl.searchParams.set('user_id', userId);
      hashtagUrl.searchParams.set('q', String(query || ''));
      const hashRes = await fetch(hashtagUrl.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (!hashRes.ok) throw new Error(`Instagram API error: ${hashRes.status}`);
      const hashData = await hashRes.json() as { data?: Array<{ id: string }> };
      const hashtagId = hashData.data?.[0]?.id;
      if (!hashtagId) return { data: [] };
      const mediaUrl = new URL(`https://graph.instagram.com/v18.0/${hashtagId}/recent_media`);
      mediaUrl.searchParams.set('user_id', userId);
      mediaUrl.searchParams.set('fields', 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count');
      mediaUrl.searchParams.set('access_token', accessToken);
      const mediaRes = await fetch(mediaUrl.toString());
      if (!mediaRes.ok) throw new Error(`Instagram media API error: ${mediaRes.status}`);
      const mediaData = await mediaRes.json() as { data?: unknown[] };
      return { data: mediaData.data ?? [] };
    }

    case 'getIntegrations':
      return listSocialIntegrations(env.PIPELINE_DB, session.userId);

    case 'deleteIntegration': {
      const provider = String(payload.provider || '').trim();
      if (!provider) throw new Error('Missing provider.');
      await deleteSocialIntegration(env.PIPELINE_DB, session.userId, provider);
      return { ok: true };
    }

    case 'connectSpreadsheet': {
      const { spreadsheetId, driveAccessToken } = payload as {
        spreadsheetId: string;
        driveAccessToken: string;
      };
      if (!String(spreadsheetId || '').trim()) throw new Error('spreadsheetId is required.');
      if (!String(driveAccessToken || '').trim()) throw new Error('driveAccessToken is required.');
      const sid = String(spreadsheetId).trim();
      const token = String(driveAccessToken).trim();

      // Parse service account email from env
      let saEmail = '';
      try {
        const saJson = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}') as { client_email?: string };
        saEmail = String(saJson.client_email || '').trim();
      } catch {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.');
      }
      if (!saEmail) throw new Error('Service account email not configured on this Worker.');

      // Share sheet with service account using user's Drive token
      await shareFileWithUser(sid, token, saEmail);

      // Verify service account can now access it
      const saToken = await mintGoogleAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const verifyRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sid)}?fields=properties.title`,
        { headers: { Authorization: `Bearer ${saToken}` } },
      );
      if (!verifyRes.ok) {
        throw new Error(
          `Sheet shared but service account still cannot access it (${verifyRes.status}). ` +
          `Please verify the URL is correct and try again.`,
        );
      }
      const meta = await verifyRes.json() as { properties?: { title?: string } };
      const title = String(meta.properties?.title ?? '');

      // Persist spreadsheet ID for this user
      await setUserSpreadsheetId(env.PIPELINE_DB, session.userId, sid);
      return { ok: true, title };
    }

    case 'disconnectSpreadsheet': {
      await setUserSpreadsheetId(env.PIPELINE_DB, session.userId, '');
      return { ok: true };
    }

    case 'syncFromSheets': {
      const sid = String(storedConfig.spreadsheetId || '').trim();
      if (!sid) throw new Error('No Google Sheet is connected. Connect one from the Connections page first.');
      const rows = await pipeline.getMergedRows(sheets, sid);
      return { ok: true, count: rows.length };
    }

    case 'getSpreadsheetStatus': {
      const sid = String(storedConfig.spreadsheetId || '').trim();
      if (!sid) return { accessible: false, title: '' };
      try {
        const saToken = await mintGoogleAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sid)}?fields=properties.title`,
          { headers: { Authorization: `Bearer ${saToken}` } },
        );
        if (!res.ok) return { accessible: false, title: '' };
        const meta = await res.json() as { properties?: { title?: string } };
        return { accessible: true, title: String(meta.properties?.title ?? '') };
      } catch {
        return { accessible: false, title: '' };
      }
    }

    case 'getServiceAccountEmail': {
      try {
        const saJson = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}') as { client_email?: string };
        return { email: String(saJson.client_email || '').trim() };
      } catch {
        return { email: '' };
      }
    }

    case 'completeOnboarding': {
      await completeUserOnboarding(env.PIPELINE_DB, session.userId);
      const spreadsheetId = String(payload.spreadsheetId || '').trim();
      if (spreadsheetId) {
        await setUserSpreadsheetId(env.PIPELINE_DB, session.userId, spreadsheetId);
      }
      return { ok: true };
    }

    case 'newsletter.getConfig': {
      const sid = String(storedConfig.spreadsheetId || '').trim();
      if (!sid) throw new Error('No spreadsheet configured.');
      const { handleGetNewsletterConfig } = await import('./newsletter/handlers');
      return handleGetNewsletterConfig(env.PIPELINE_DB, sid);
    }
    case 'newsletter.saveConfig': {
      const sid = String(storedConfig.spreadsheetId || '').trim();
      if (!sid) throw new Error('No spreadsheet configured.');
      const { handleSaveNewsletterConfig } = await import('./newsletter/handlers');
      await handleSaveNewsletterConfig(env.PIPELINE_DB, sid, payload as unknown as Parameters<typeof handleSaveNewsletterConfig>[2]);
      return { ok: true };
    }
    case 'newsletter.listIssues': {
      const sid = String(storedConfig.spreadsheetId || '').trim();
      if (!sid) throw new Error('No spreadsheet configured.');
      const { handleListNewsletterIssues } = await import('./newsletter/handlers');
      return handleListNewsletterIssues(env.PIPELINE_DB, sid);
    }
    case 'newsletter.approveIssue': {
      const { handleApproveNewsletterIssue } = await import('./newsletter/handlers');
      await handleApproveNewsletterIssue(env.PIPELINE_DB, String(payload.issueId || '').trim());
      return { ok: true };
    }
    case 'newsletter.rejectIssue': {
      const { handleRejectNewsletterIssue } = await import('./newsletter/handlers');
      await handleRejectNewsletterIssue(env.PIPELINE_DB, String(payload.issueId || '').trim());
      return { ok: true };
    }
    case 'newsletter.createDraftNow': {
      const sid = String(storedConfig.spreadsheetId || '').trim();
      if (!sid) throw new Error('No spreadsheet configured.');
      const { handleCreateNewsletterDraftNow } = await import('./newsletter/handlers');
      return handleCreateNewsletterDraftNow(env, env.PIPELINE_DB, sid);
    }
    case 'newsletter.sendApproved': {
      const { handleSendApprovedNewsletterIssue } = await import('./newsletter/handlers');
      await handleSendApprovedNewsletterIssue(env, env.PIPELINE_DB, String(payload.issueId || '').trim());
      return { ok: true };
    }

    case 'newsletter.list': {
      const sid = String(storedConfig.spreadsheetId || '').trim();
      if (!sid) throw new Error('No spreadsheet configured.');
      const { handleListNewsletters } = await import('./newsletter/handlers');
      return handleListNewsletters(env.PIPELINE_DB, sid);
    }
    case 'newsletter.create': {
      const sid = String(storedConfig.spreadsheetId || '').trim();
      if (!sid) throw new Error('No spreadsheet configured.');
      const { handleCreateNewsletter } = await import('./newsletter/handlers');
      return handleCreateNewsletter(
        env,
        env.PIPELINE_DB,
        sid,
        String(payload.name || '').trim(),
        (payload.config as object) ?? {},
        Boolean(payload.autoApprove),
      );
    }
    case 'newsletter.update': {
      const { handleUpdateNewsletter } = await import('./newsletter/handlers');
      await handleUpdateNewsletter(env, env.PIPELINE_DB, String(payload.newsletterId || '').trim(), {
        name: payload.name !== undefined ? String(payload.name) : undefined,
        config: payload.config !== undefined ? (payload.config as object) : undefined,
        autoApprove: payload.autoApprove !== undefined ? Boolean(payload.autoApprove) : undefined,
        active: payload.active !== undefined ? Boolean(payload.active) : undefined,
      });
      return { ok: true };
    }
    case 'newsletter.delete': {
      const { handleDeleteNewsletter } = await import('./newsletter/handlers');
      await handleDeleteNewsletter(env.PIPELINE_DB, String(payload.newsletterId || '').trim());
      return { ok: true };
    }
    case 'newsletter.listIssuesByNewsletter': {
      const { handleListIssuesByNewsletter } = await import('./newsletter/handlers');
      return handleListIssuesByNewsletter(env.PIPELINE_DB, String(payload.newsletterId || '').trim());
    }
    case 'newsletter.createDraftByNewsletter': {
      const { handleCreateDraftByNewsletter } = await import('./newsletter/handlers');
      return handleCreateDraftByNewsletter(env, env.PIPELINE_DB, String(payload.newsletterId || '').trim());
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

function ensureSpreadsheetConfigured(config: StoredConfig): void {
  if (!config.spreadsheetId) {
    throw new Error('Missing spreadsheet configuration. Ask an admin to configure the shared workspace.');
  }
}

function ensureAdmin(session: VerifiedSession): void {
  if (!session.isAdmin) {
    throw new Error('Only admin users can change shared configuration.');
  }
}

export function coerceSheetRow(value: unknown): SheetRow {
  if (!value || typeof value !== 'object') {
    throw new Error('Missing row payload.');
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj['topic'] !== 'string') {
    throw new Error('Row payload is missing required field: topic');
  }
  if (typeof obj['date'] !== 'string') {
    throw new Error('Row payload is missing required field: date');
  }
  if (typeof obj['topicId'] !== 'string') {
    throw new Error('Row payload is missing required field: topicId');
  }
  return value as SheetRow;
}

async function parseRequest(request: Request): Promise<RequestPayload> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return request.json<RequestPayload>();
  }

  const formData = await request.formData();
  const rawPayload = formData.get('payload');
  return {
    action: String(formData.get('action') || ''),
    idToken: String(formData.get('idToken') || ''),
    payload: rawPayload ? (JSON.parse(String(rawPayload)) as Record<string, unknown>) : {},
  };
}

function parseEmailList(value: string | undefined): string[] {
  return String(value || '')
    .split(/[\s,]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** Used when `ADMIN_EMAILS` is missing or empty so we never treat every user as admin. */
const DEFAULT_ADMIN_EMAIL = '99pratyush@gmail.com';

function resolveAdminEmailAllowlist(env: Env): string[] {
  const fromEnv = parseEmailList(env.ADMIN_EMAILS);
  if (fromEnv.length > 0) {
    return fromEnv;
  }
  return [DEFAULT_ADMIN_EMAIL];
}

async function verifySession(idToken: string | undefined, env: Env): Promise<VerifiedSession> {
  if (!idToken) {
    throw new Error('Unauthorized: missing Google ID token.');
  }

  const bypassSession = tryResolveDevGoogleAuthBypassSession(idToken, env);
  if (bypassSession) {
    // Dev bypass: upsert a synthetic user row so the rest of the code works.
    await upsertUser(env.PIPELINE_DB, bypassSession.email, 'Dev User', '').catch(() => undefined);
    return { ...bypassSession, userId: bypassSession.email };
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw new Error('Unauthorized: invalid or expired Google token.');
  }

  const tokenInfo = (await response.json()) as GoogleTokenInfo;
  const email = String(tokenInfo.email || '').toLowerCase();
  const emailVerified = String(tokenInfo.email_verified || '').toLowerCase() === 'true';

  if (!email || !emailVerified) {
    throw new Error('Unauthorized: Google account email is not verified.');
  }

  if (env.GOOGLE_CLIENT_ID && tokenInfo.aud !== env.GOOGLE_CLIENT_ID) {
    throw new Error('Unauthorized: Google token audience does not match this app.');
  }

  // ALLOWED_EMAILS is now optional: if set, acts as an allowlist; if empty, any Google account can log in.
  const allowedEmails = parseEmailList(env.ALLOWED_EMAILS);
  if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
    throw new Error('Unauthorized: this Google account is not on the allowed users list.');
  }

  // Upsert user into D1 on every login (updates name/avatar if they changed).
  const displayName = String(tokenInfo.name || '').trim();
  const avatarUrl = String(tokenInfo.picture || '').trim();
  await upsertUser(env.PIPELINE_DB, email, displayName, avatarUrl).catch(() => undefined);

  const adminEmails = resolveAdminEmailAllowlist(env);
  return {
    email,
    userId: email,
    isAdmin: adminEmails.includes(email),
  };
}

async function loadStoredConfig(
  env: Env,
  userId?: string,
  ctx?: { isAdmin?: boolean },
): Promise<StoredConfig> {
  const config = await env.CONFIG_KV.get<StoredConfig>(CONFIG_KEY, 'json');
  const defaultChannel = config?.defaultChannel === 'whatsapp'
    ? 'whatsapp'
    : config?.defaultChannel === 'telegram'
      ? 'telegram'
    : config?.defaultChannel === 'instagram'
      ? 'instagram'
    : config?.defaultChannel === 'gmail'
      ? 'gmail'
      : 'linkedin';
  const disconnectedAuthProviders = normalizeDisconnectedAuthProviders(config?.disconnectedAuthProviders);
  const instagramDisconnected = disconnectedAuthProviders.includes('instagram');
  const linkedinDisconnected = disconnectedAuthProviders.includes('linkedin');
  const whatsappDisconnected = disconnectedAuthProviders.includes('whatsapp');
  const gmailDisconnected = disconnectedAuthProviders.includes('gmail');

  const devSpreadsheetId = String(env.DEV_SPREADSHEET_ID || '').trim();
  const kvSpreadsheetId = String(config?.spreadsheetId || '').trim();

  // Per-user spreadsheet from D1 when a user session is loaded. Optional Sheets: tenants without a
  // connected sheet use D1 only — we do not fall back to CONFIG_KV spreadsheetId (that caused
  // Google 403s when the global sheet was not shared with every tenant). Admins one-time migrate
  // legacy KV workspace sheet into their D1 row so existing single-tenant setups keep working.
  let userSpreadsheetId = '';
  let userRules = '';
  let userWhoAmI = '';
  if (userId) {
    const userRow = await env.PIPELINE_DB
      .prepare('SELECT spreadsheet_id, user_rules, user_who_am_i FROM users WHERE id = ?1')
      .bind(userId)
      .first<{ spreadsheet_id: string; user_rules: string; user_who_am_i: string }>();
    if (!devSpreadsheetId) {
      userSpreadsheetId = String(userRow?.spreadsheet_id || '').trim();
      if (!userSpreadsheetId && kvSpreadsheetId && ctx?.isAdmin) {
        await setUserSpreadsheetId(env.PIPELINE_DB, userId, kvSpreadsheetId);
        userSpreadsheetId = kvSpreadsheetId;
      }
    }
    userRules = String(userRow?.user_rules || '').trim();
    userWhoAmI = String(userRow?.user_who_am_i || '').trim();
  }

  const spreadsheetId = userId
    ? devSpreadsheetId || userSpreadsheetId
    : devSpreadsheetId || kvSpreadsheetId;

  return {
    spreadsheetId,
    githubRepo: config?.githubRepo || '',
    googleModel: config?.googleModel || GOOGLE_MODEL_DEFAULT,
    allowedGoogleModels: config?.allowedGoogleModels,
    generationRules: config?.generationRules || '',
    authorProfile: config?.authorProfile || '',
    userRules,
    userWhoAmI,
    disconnectedAuthProviders,
    githubTokenCiphertext: config?.githubTokenCiphertext || undefined,
    defaultChannel,
    instagramUserId: instagramDisconnected ? '' : (config?.instagramUserId || String(env.INSTAGRAM_USER_ID || '').trim()),
    instagramUsername: instagramDisconnected ? '' : (config?.instagramUsername || String(env.INSTAGRAM_USERNAME || '').trim()),
    instagramAccessTokenCiphertext: instagramDisconnected ? undefined : (config?.instagramAccessTokenCiphertext || undefined),
    instagramAccessToken: instagramDisconnected ? undefined : (String(env.INSTAGRAM_ACCESS_TOKEN || '').trim() || undefined),
    linkedinPersonUrn: linkedinDisconnected ? '' : (config?.linkedinPersonUrn || String(env.LINKEDIN_PERSON_URN || '').trim()),
    linkedinAccessTokenCiphertext: linkedinDisconnected ? undefined : (config?.linkedinAccessTokenCiphertext || undefined),
    linkedinAccessToken: linkedinDisconnected ? undefined : (String(env.LINKEDIN_ACCESS_TOKEN || '').trim() || undefined),
    gmailEmailAddress: gmailDisconnected ? '' : (config?.gmailEmailAddress || ''),
    gmailDefaultTo: config?.gmailDefaultTo || '',
    gmailDefaultCc: config?.gmailDefaultCc || '',
    gmailDefaultBcc: config?.gmailDefaultBcc || '',
    gmailDefaultSubject: config?.gmailDefaultSubject || '',
    gmailAccessTokenCiphertext: gmailDisconnected ? undefined : (config?.gmailAccessTokenCiphertext || undefined),
    gmailAccessToken: gmailDisconnected ? undefined : (config?.gmailAccessToken || undefined),
    gmailRefreshTokenCiphertext: gmailDisconnected ? undefined : (config?.gmailRefreshTokenCiphertext || undefined),
    gmailRefreshToken: gmailDisconnected ? undefined : (config?.gmailRefreshToken || undefined),
    telegramBotTokenCiphertext: config?.telegramBotTokenCiphertext || undefined,
    telegramBotToken: String(env.TELEGRAM_BOT_TOKEN || '').trim() || undefined,
    telegramRecipients: normalizeTelegramRecipients(config?.telegramRecipients),
    whatsappPhoneNumberId: whatsappDisconnected ? '' : (config?.whatsappPhoneNumberId || String(env.WHATSAPP_PHONE_NUMBER_ID || '').trim()),
    whatsappAccessTokenCiphertext: whatsappDisconnected ? undefined : (config?.whatsappAccessTokenCiphertext || undefined),
    whatsappAccessToken: whatsappDisconnected ? undefined : (String(env.WHATSAPP_ACCESS_TOKEN || '').trim() || undefined),
    whatsappRecipients: normalizeWhatsAppRecipients(config?.whatsappRecipients),
    generationRulesHistory: config?.generationRulesHistory || [],
    newsResearch: normalizeNewsResearchStored(config?.newsResearch),
    llm: config?.llm,
    contentReview: FEATURE_CONTENT_REVIEW
      ? normalizeContentReviewStored(config?.contentReview)
      : config?.contentReview,
  };
}

function toPublicConfig(config: StoredConfig, env: Env): BotConfig {
  const allowedGoogleModels = resolveAllowedGoogleModelIds(config);
  let base: BotConfig = {
    spreadsheetId: config.spreadsheetId,
    githubRepo: config.githubRepo,
    googleModel: resolveEffectiveGoogleModel(config, config.googleModel),
    allowedGoogleModels,
    generationRules: config.generationRules || '',
    authorProfile: config.authorProfile || '',
    userRules: config.userRules || '',
    userWhoAmI: config.userWhoAmI || '',
    hasGitHubToken: Boolean(config.githubTokenCiphertext),
    hasGenerationWorker: isGenerationWorkerConfigured(env),
    defaultChannel: config.defaultChannel,
    instagramAuthAvailable: hasInstagramOAuthConfig(env),
    instagramUserId: config.instagramUserId,
    instagramUsername: config.instagramUsername,
    hasInstagramAccessToken: Boolean(config.instagramAccessTokenCiphertext || config.instagramAccessToken),
    linkedinAuthAvailable: hasLinkedInOAuthConfig(env),
    linkedinPersonUrn: config.linkedinPersonUrn,
    hasLinkedInAccessToken: Boolean(config.linkedinAccessTokenCiphertext || config.linkedinAccessToken),
    gmailAuthAvailable: hasGmailOAuthConfig(env),
    gmailEmailAddress: config.gmailEmailAddress,
    hasGmailAccessToken: Boolean(config.gmailAccessTokenCiphertext || config.gmailAccessToken),
    gmailDefaultTo: config.gmailDefaultTo || '',
    gmailDefaultCc: config.gmailDefaultCc || '',
    gmailDefaultBcc: config.gmailDefaultBcc || '',
    gmailDefaultSubject: config.gmailDefaultSubject || '',
    hasTelegramBotToken: Boolean(config.telegramBotTokenCiphertext || config.telegramBotToken),
    telegramRecipients: normalizeTelegramRecipients(config.telegramRecipients),
    whatsappAuthAvailable: hasMetaOAuthConfig(env),
    whatsappPhoneNumberId: config.whatsappPhoneNumberId,
    hasWhatsAppAccessToken: Boolean(config.whatsappAccessTokenCiphertext || config.whatsappAccessToken),
    whatsappRecipients: normalizeWhatsAppRecipients(config.whatsappRecipients),
    youtubeAuthAvailable: hasYouTubeOAuthConfig(env),
    youtubeEmailAddress: config.youtubeEmailAddress || '',
    hasYouTubeAccessToken: Boolean(config.youtubeAccessTokenCiphertext || config.youtubeAccessToken),
  };
  if (FEATURE_MULTI_PROVIDER_LLM) {
    const ws = workspaceConfigFromStored(config.googleModel, config.allowedGoogleModels, config.llm);
    base = {
      ...base,
      llm: {
        primary: resolveStoredPrimary(ws, true),
        fallback: resolveStoredFallback(ws, true),
        allowedGrokModels: resolveAllowedGrokModelIds(ws),
        allowedOpenrouterModels: resolveAllowedOpenrouterModelIds(ws),
        allowedMinimaxModels: resolveAllowedMinimaxModelIds(ws),
      },
      llmProviderKeys: (() => {
        const ids = getConfiguredLlmProviderIds(env);
        return { gemini: ids.includes('gemini'), grok: ids.includes('grok'), openrouter: ids.includes('openrouter'), minimax: ids.includes('minimax') };
      })(),
    };
  }
  if (!FEATURE_NEWS_RESEARCH && !FEATURE_CONTENT_REVIEW) {
    return base;
  }
  let out: BotConfig = base;
  if (FEATURE_NEWS_RESEARCH) {
    out = {
      ...out,
      newsResearch: normalizeNewsResearchStored(config.newsResearch),
      newsProviderKeys: getNewsProviderKeyStatus(env),
    };
  }
  if (FEATURE_CONTENT_REVIEW) {
    out = {
      ...out,
      contentReview: normalizeContentReviewStored(config.contentReview),
    };
  }
  if (config.imageGen) {
    out = { ...out, imageGen: { provider: config.imageGen.provider ?? 'pixazo', model: config.imageGen.model } };
  }
  if (config.enrichmentSkills) {
    out = { ...out, enrichmentSkills: config.enrichmentSkills };
  }
  return out;
}

function hasInstagramOAuthConfig(env: Env): boolean {
  return Boolean(String(env.INSTAGRAM_APP_ID || '').trim() && String(env.INSTAGRAM_APP_SECRET || '').trim());
}

function hasLinkedInOAuthConfig(env: Env): boolean {
  return Boolean(String(env.LINKEDIN_CLIENT_ID || '').trim() && String(env.LINKEDIN_CLIENT_SECRET || '').trim());
}

function hasMetaOAuthConfig(env: Env): boolean {
  return Boolean(String(env.META_APP_ID || '').trim() && String(env.META_APP_SECRET || '').trim());
}

function hasGmailOAuthConfig(env: Env): boolean {
  return Boolean(String(env.GMAIL_CLIENT_ID || '').trim() && String(env.GMAIL_CLIENT_SECRET || '').trim());
}

function hasYouTubeOAuthConfig(env: Env): boolean {
  return Boolean(String(env.YOUTUBE_CLIENT_ID || '').trim() && String(env.YOUTUBE_CLIENT_SECRET || '').trim());
}

function buildWorkerOrigin(request: Request, env?: Pick<Env, 'OAUTH_REDIRECT_BASE_URL'>): string {
  const override = String(env?.OAUTH_REDIRECT_BASE_URL || '').trim().replace(/\/$/, '');
  if (override) return override;
  return new URL(request.url).origin;
}

function requireFrontendOrigin(request: Request): string {
  const origin = String(request.headers.get('origin') || '').trim();
  if (!origin) {
    throw new Error('Missing frontend origin. Open the dashboard in a browser and try again.');
  }

  return origin;
}

function createRandomToken(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

async function storeOAuthState(env: Env, state: string, record: OAuthStateRecord): Promise<void> {
  await env.CONFIG_KV.put(`${OAUTH_STATE_PREFIX}${state}`, JSON.stringify(record), {
    expirationTtl: OAUTH_STATE_TTL_SECONDS,
  });
}

async function consumeOAuthState(env: Env, state: string, provider: AuthProvider): Promise<OAuthStateRecord> {
  const key = `${OAUTH_STATE_PREFIX}${state}`;
  const record = await env.CONFIG_KV.get<OAuthStateRecord>(key, 'json');
  await env.CONFIG_KV.delete(key);

  if (!record || record.provider !== provider) {
    throw new Error('The OAuth session is missing or expired. Start the connection again.');
  }

  return record;
}

async function startLinkedInAuth(request: Request, env: Env, session: VerifiedSession): Promise<{ authorizationUrl: string; callbackOrigin: string }> {
  if (!hasLinkedInOAuthConfig(env)) {
    throw new Error('LinkedIn OAuth is not configured in the Worker environment. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET first.');
  }

  const state = createRandomToken();
  const callbackOrigin = buildWorkerOrigin(request, env);
  const redirectUri = `${callbackOrigin}/auth/linkedin/callback`;
  await storeOAuthState(env, state, {
    provider: 'linkedin',
    email: session.email,
    origin: requireFrontendOrigin(request),
    redirectUri,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: String(env.LINKEDIN_CLIENT_ID || '').trim(),
    redirect_uri: redirectUri,
    state,
    scope: LINKEDIN_OAUTH_SCOPE,
  });

  return {
    authorizationUrl: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`,
    callbackOrigin,
  };
}

async function startInstagramAuth(request: Request, env: Env, session: VerifiedSession): Promise<{ authorizationUrl: string; callbackOrigin: string }> {
  if (!hasInstagramOAuthConfig(env)) {
    throw new Error('Instagram OAuth is not configured in the Worker environment. Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET first.');
  }

  const state = createRandomToken();
  const callbackOrigin = buildWorkerOrigin(request, env);
  const redirectUri = `${callbackOrigin}/auth/instagram/callback`;
  await storeOAuthState(env, state, {
    provider: 'instagram',
    email: session.email,
    origin: requireFrontendOrigin(request),
    redirectUri,
  });

  const params = new URLSearchParams({
    client_id: String(env.INSTAGRAM_APP_ID || '').trim(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: INSTAGRAM_OAUTH_SCOPE,
    state,
  });

  return {
    authorizationUrl: `https://www.instagram.com/oauth/authorize?${params.toString()}`,
    callbackOrigin,
  };
}

async function startWhatsAppAuth(request: Request, env: Env, session: VerifiedSession): Promise<{ authorizationUrl: string; callbackOrigin: string }> {
  if (!hasMetaOAuthConfig(env)) {
    throw new Error('Meta OAuth is not configured in the Worker environment. Add META_APP_ID and META_APP_SECRET first.');
  }

  const state = createRandomToken();
  const callbackOrigin = buildWorkerOrigin(request, env);
  const redirectUri = `${callbackOrigin}/auth/whatsapp/callback`;
  await storeOAuthState(env, state, {
    provider: 'whatsapp',
    email: session.email,
    origin: requireFrontendOrigin(request),
    redirectUri,
  });

  const params = new URLSearchParams({
    client_id: String(env.META_APP_ID || '').trim(),
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    scope: META_OAUTH_SCOPES,
  });

  return {
    authorizationUrl: `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`,
    callbackOrigin,
  };
}

async function startGmailAuth(request: Request, env: Env, session: VerifiedSession): Promise<{ authorizationUrl: string; callbackOrigin: string }> {
  if (!hasGmailOAuthConfig(env)) {
    throw new Error('Gmail OAuth is not configured in the Worker environment. Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET first.');
  }

  const state = createRandomToken();
  const callbackOrigin = buildWorkerOrigin(request, env);
  const redirectUri = `${callbackOrigin}/auth/gmail/callback`;
  await storeOAuthState(env, state, {
    provider: 'gmail',
    email: session.email,
    origin: requireFrontendOrigin(request),
    redirectUri,
  });

  const params = new URLSearchParams({
    client_id: String(env.GMAIL_CLIENT_ID || '').trim(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_OAUTH_SCOPES,
    access_type: 'offline', // We need a refresh token
    prompt: 'consent', // Force consent to ensure we get a refresh token
    state,
  });

  return {
    authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    callbackOrigin,
  };
}

const YOUTUBE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'email',
].join(' ');

async function startYouTubeAuth(request: Request, env: Env, session: VerifiedSession): Promise<{ authorizationUrl: string; callbackOrigin: string }> {
  if (!hasYouTubeOAuthConfig(env)) {
    throw new Error('YouTube OAuth is not configured in the Worker environment. Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET first.');
  }

  const state = createRandomToken();
  const callbackOrigin = buildWorkerOrigin(request, env);
  const redirectUri = `${callbackOrigin}/auth/youtube/callback`;
  await storeOAuthState(env, state, {
    provider: 'youtube',
    email: session.email,
    origin: requireFrontendOrigin(request),
    redirectUri,
  });

  const params = new URLSearchParams({
    client_id: String(env.YOUTUBE_CLIENT_ID || '').trim(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_OAUTH_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return {
    authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    callbackOrigin,
  };
}

async function completeWhatsAppConnection(
  env: Env,
  session: VerifiedSession,
  payload: Record<string, unknown>,
): Promise<BotConfig> {
  const connectionId = String(payload.connectionId || '').trim();
  const phoneNumberId = String(payload.phoneNumberId || '').trim();

  if (!connectionId || !phoneNumberId) {
    throw new Error('Missing WhatsApp phone selection.');
  }

  const key = `${WHATSAPP_PENDING_PREFIX}${connectionId}`;
  const pending = await env.CONFIG_KV.get<PendingWhatsAppConnectionRecord>(key, 'json');
  if (!pending) {
    throw new Error('The WhatsApp connection session expired. Start the connection again.');
  }

  if (pending.email !== session.email) {
    throw new Error('This WhatsApp connection belongs to a different admin session. Start the connection again.');
  }

  const selectedOption = pending.options.find((option) => option.phoneNumberId === phoneNumberId);
  if (!selectedOption) {
    throw new Error('The selected WhatsApp phone number is no longer available. Start the connection again.');
  }

  const accessToken = await decryptSecret(
    pending.accessTokenCiphertext,
    requireSecretEncryptionKey(env),
    WHATSAPP_TOKEN_REAUTH_MESSAGE,
  );

  await env.CONFIG_KV.delete(key);
  return persistWhatsAppConnection(env, accessToken, selectedOption.phoneNumberId);
}

async function handleLinkedInCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const state = String(url.searchParams.get('state') || '').trim();
  if (!state) {
    return oauthPopupResponse(null, {
      source: 'channel-bot-oauth',
      provider: 'linkedin',
      ok: false,
      error: 'Missing LinkedIn OAuth state.',
    });
  }

  let oauthState: OAuthStateRecord;
  try {
    oauthState = await consumeOAuthState(env, state, 'linkedin');
  } catch (error) {
    return oauthPopupResponse(null, {
      source: 'channel-bot-oauth',
      provider: 'linkedin',
      ok: false,
      error: error instanceof Error ? error.message : 'The LinkedIn OAuth session expired.',
    });
  }

  const errorMessage = String(url.searchParams.get('error_description') || url.searchParams.get('error') || '').trim();
  if (errorMessage) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'linkedin',
      ok: false,
      error: decodeURIComponent(errorMessage),
    });
  }

  const code = String(url.searchParams.get('code') || '').trim();
  if (!code) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'linkedin',
      ok: false,
      error: 'LinkedIn did not return an authorization code.',
    });
  }

  try {
    const accessToken = await exchangeLinkedInCodeForToken(code, oauthState.redirectUri, env);
    const personUrn = await fetchLinkedInPersonUrn(accessToken);
    await persistLinkedInConnection(env, accessToken, personUrn);
    // Also store per-user token in D1
    const encKey = requireSecretEncryptionKey(env);
    await upsertSocialIntegration(env.PIPELINE_DB, {
      userId: oauthState.email,
      provider: 'linkedin',
      internalId: personUrn,
      displayName: '',
      profilePicture: '',
      accessTokenEnc: await encryptSecret(accessToken, encKey),
      refreshTokenEnc: '',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
      scopes: 'openid profile w_member_social r_basicprofile',
    }).catch(() => undefined);
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'linkedin',
      ok: true,
    });
  } catch (error) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'linkedin',
      ok: false,
      error: error instanceof Error ? error.message : 'LinkedIn connection failed.',
    });
  }
}

async function handleInstagramCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const state = String(url.searchParams.get('state') || '').trim();
  if (!state) {
    return oauthPopupResponse(null, {
      source: 'channel-bot-oauth',
      provider: 'instagram',
      ok: false,
      error: 'Missing Instagram OAuth state.',
    });
  }

  let oauthState: OAuthStateRecord;
  try {
    oauthState = await consumeOAuthState(env, state, 'instagram');
  } catch (error) {
    return oauthPopupResponse(null, {
      source: 'channel-bot-oauth',
      provider: 'instagram',
      ok: false,
      error: error instanceof Error ? error.message : 'The Instagram OAuth session expired.',
    });
  }

  const errorMessage = String(url.searchParams.get('error_description') || url.searchParams.get('error') || '').trim();
  if (errorMessage) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'instagram',
      ok: false,
      error: decodeURIComponent(errorMessage),
    });
  }

  const code = String(url.searchParams.get('code') || '').replace(/#_$/, '').trim();
  if (!code) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'instagram',
      ok: false,
      error: 'Instagram did not return an authorization code.',
    });
  }

  try {
    const accessToken = await exchangeInstagramCodeForLongLivedToken(code, oauthState.redirectUri, env);
    const instagramAccount = await fetchInstagramAccount(accessToken);
    await persistInstagramConnection(env, accessToken, instagramAccount.userId, instagramAccount.username);
    // Also store per-user token in D1
    const encKey = requireSecretEncryptionKey(env);
    await upsertSocialIntegration(env.PIPELINE_DB, {
      userId: oauthState.email,
      provider: 'instagram',
      internalId: instagramAccount.userId,
      displayName: instagramAccount.username,
      profilePicture: '',
      accessTokenEnc: await encryptSecret(accessToken, encKey),
      refreshTokenEnc: '',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
      scopes: 'instagram_basic,instagram_content_publish,pages_show_list',
    }).catch(() => undefined);
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'instagram',
      ok: true,
    });
  } catch (error) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'instagram',
      ok: false,
      error: error instanceof Error ? error.message : 'Instagram connection failed.',
    });
  }
}

async function handleWhatsAppCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const state = String(url.searchParams.get('state') || '').trim();
  if (!state) {
    return oauthPopupResponse(null, {
      source: 'channel-bot-oauth',
      provider: 'whatsapp',
      ok: false,
      error: 'Missing Meta OAuth state.',
    });
  }

  let oauthState: OAuthStateRecord;
  try {
    oauthState = await consumeOAuthState(env, state, 'whatsapp');
  } catch (error) {
    return oauthPopupResponse(null, {
      source: 'channel-bot-oauth',
      provider: 'whatsapp',
      ok: false,
      error: error instanceof Error ? error.message : 'The WhatsApp connection session expired.',
    });
  }

  const errorMessage = String(url.searchParams.get('error_description') || url.searchParams.get('error') || '').trim();
  if (errorMessage) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'whatsapp',
      ok: false,
      error: decodeURIComponent(errorMessage),
    });
  }

  const code = String(url.searchParams.get('code') || '').trim();
  if (!code) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'whatsapp',
      ok: false,
      error: 'Meta did not return an authorization code.',
    });
  }

  try {
    const accessToken = await exchangeMetaCodeForLongLivedToken(code, oauthState.redirectUri, env);
    const options = await discoverWhatsAppPhoneOptions(accessToken);

    if (options.length === 0) {
      throw new Error('No WhatsApp Business phone numbers were found for this Meta account.');
    }

    if (options.length === 1) {
      await persistWhatsAppConnection(env, accessToken, options[0].phoneNumberId);
      return oauthPopupResponse(oauthState.origin, {
        source: 'channel-bot-oauth',
        provider: 'whatsapp',
        ok: true,
      });
    }

    const connectionId = createRandomToken();
    const accessTokenCiphertext = await encryptSecret(accessToken, requireSecretEncryptionKey(env));
    await env.CONFIG_KV.put(
      `${WHATSAPP_PENDING_PREFIX}${connectionId}`,
      JSON.stringify({
        email: oauthState.email,
        origin: oauthState.origin,
        accessTokenCiphertext,
        options,
      } satisfies PendingWhatsAppConnectionRecord),
      { expirationTtl: WHATSAPP_PENDING_TTL_SECONDS },
    );

    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'whatsapp',
      ok: true,
      payload: {
        connectionId,
        options,
      },
    });
  } catch (error) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'whatsapp',
      ok: false,
      error: error instanceof Error ? error.message : 'WhatsApp connection failed.',
    });
  }
}

async function handleGmailCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const state = String(url.searchParams.get('state') || '').trim();
  if (!state) {
    return oauthPopupResponse(null, {
      source: 'channel-bot-oauth',
      provider: 'gmail',
      ok: false,
      error: 'Missing Gmail OAuth state.',
    });
  }

  let oauthState: OAuthStateRecord;
  try {
    oauthState = await consumeOAuthState(env, state, 'gmail');
  } catch (error) {
    return oauthPopupResponse(null, {
      source: 'channel-bot-oauth',
      provider: 'gmail',
      ok: false,
      error: error instanceof Error ? error.message : 'The Gmail OAuth session expired.',
    });
  }

  const errorMessage = String(url.searchParams.get('error') || '').trim();
  if (errorMessage) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'gmail',
      ok: false,
      error: decodeURIComponent(errorMessage),
    });
  }

  const code = String(url.searchParams.get('code') || '').trim();
  if (!code) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'gmail',
      ok: false,
      error: 'Gmail did not return an authorization code.',
    });
  }

  try {
    const tokens = await exchangeGmailCodeForToken(code, oauthState.redirectUri, env);
    const profile = await fetchGmailProfile(tokens.access_token);
    await persistGmailConnection(env, tokens.access_token, tokens.refresh_token || '', profile.email);
    // Also store per-user token in D1
    const encKey = requireSecretEncryptionKey(env);
    const refreshToken = tokens.refresh_token || '';
    await upsertSocialIntegration(env.PIPELINE_DB, {
      userId: oauthState.email,
      provider: 'gmail',
      internalId: profile.email,
      displayName: profile.email,
      profilePicture: '',
      accessTokenEnc: await encryptSecret(tokens.access_token, encKey),
      refreshTokenEnc: refreshToken ? await encryptSecret(refreshToken, encKey) : '',
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      scopes: GMAIL_OAUTH_SCOPES,
    }).catch(() => undefined);
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'gmail',
      ok: true,
    });
  } catch (error) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'gmail',
      ok: false,
      error: error instanceof Error ? error.message : 'Gmail connection failed.',
    });
  }
}

async function handleYouTubeCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const state = String(url.searchParams.get('state') || '').trim();
  if (!state) {
    return oauthPopupResponse(null, {
      source: 'channel-bot-oauth',
      provider: 'youtube',
      ok: false,
      error: 'Missing YouTube OAuth state.',
    });
  }

  let oauthState: OAuthStateRecord;
  try {
    oauthState = await consumeOAuthState(env, state, 'youtube');
  } catch (error) {
    return oauthPopupResponse(null, {
      source: 'channel-bot-oauth',
      provider: 'youtube',
      ok: false,
      error: error instanceof Error ? error.message : 'The YouTube OAuth session expired.',
    });
  }

  const errorMessage = String(url.searchParams.get('error') || '').trim();
  if (errorMessage) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'youtube',
      ok: false,
      error: decodeURIComponent(errorMessage),
    });
  }

  const code = String(url.searchParams.get('code') || '').trim();
  if (!code) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'youtube',
      ok: false,
      error: 'YouTube did not return an authorization code.',
    });
  }

  try {
    const tokens = await exchangeYouTubeCodeForToken(code, oauthState.redirectUri, env);
    const channel = await fetchYouTubeChannel(tokens.access_token);
    await persistYouTubeConnection(env, tokens.access_token, tokens.refresh_token || '', channel.title);
    const encKey = requireSecretEncryptionKey(env);
    const refreshToken = tokens.refresh_token || '';
    await upsertSocialIntegration(env.PIPELINE_DB, {
      userId: oauthState.email,
      provider: 'youtube',
      internalId: channel.channelId,
      displayName: channel.title,
      profilePicture: '',
      accessTokenEnc: await encryptSecret(tokens.access_token, encKey),
      refreshTokenEnc: refreshToken ? await encryptSecret(refreshToken, encKey) : '',
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      scopes: YOUTUBE_OAUTH_SCOPES,
    }).catch(() => undefined);
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'youtube',
      ok: true,
    });
  } catch (error) {
    return oauthPopupResponse(oauthState.origin, {
      source: 'channel-bot-oauth',
      provider: 'youtube',
      ok: false,
      error: error instanceof Error ? error.message : 'YouTube connection failed.',
    });
  }
}

async function exchangeLinkedInCodeForToken(code: string, redirectUri: string, env: Env): Promise<string> {
  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: String(env.LINKEDIN_CLIENT_ID || '').trim(),
      client_secret: String(env.LINKEDIN_CLIENT_SECRET || '').trim(),
      redirect_uri: redirectUri,
    }),
  });

  const payload = (await response.json().catch(() => null)) as LinkedInTokenResponse | null;
  const accessToken = String(payload?.access_token || '').trim();
  if (!response.ok || !accessToken) {
    throw new Error(payload?.error_description || payload?.error || `LinkedIn token exchange failed with status ${response.status}.`);
  }

  return accessToken;
}

async function exchangeGmailCodeForToken(code: string, redirectUri: string, env: Env): Promise<{ access_token: string; refresh_token?: string }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: String(env.GMAIL_CLIENT_ID || '').trim(),
      client_secret: String(env.GMAIL_CLIENT_SECRET || '').trim(),
      redirect_uri: redirectUri,
    }),
  });

  const payload = (await response.json().catch(() => null)) as GmailTokenResponse | null;
  const accessToken = String(payload?.access_token || '').trim();
  if (!response.ok || !accessToken) {
    throw new Error(payload?.error_description || payload?.error || `Gmail token exchange failed with status ${response.status}.`);
  }

  return {
    access_token: accessToken,
    refresh_token: payload?.refresh_token ? String(payload.refresh_token).trim() : undefined,
  };
}

async function exchangeYouTubeCodeForToken(code: string, redirectUri: string, env: Env): Promise<{ access_token: string; refresh_token?: string }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: String(env.YOUTUBE_CLIENT_ID || '').trim(),
      client_secret: String(env.YOUTUBE_CLIENT_SECRET || '').trim(),
      redirect_uri: redirectUri,
    }),
  });

  const payload = (await response.json().catch(() => null)) as GmailTokenResponse | null;
  const accessToken = String(payload?.access_token || '').trim();
  if (!response.ok || !accessToken) {
    throw new Error(payload?.error_description || payload?.error || `YouTube token exchange failed with status ${response.status}.`);
  }

  return {
    access_token: accessToken,
    refresh_token: payload?.refresh_token ? String(payload.refresh_token).trim() : undefined,
  };
}

async function fetchYouTubeChannel(accessToken: string): Promise<{ channelId: string; title: string }> {
  const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as { items?: Array<{ id: string; snippet: { title: string } }> } | null;
  const item = payload?.items?.[0];
  const channelId = String(item?.id || '').trim();
  const title = String(item?.snippet?.title || '').trim();

  if (!response.ok || !channelId) {
    throw new Error(`YouTube channel lookup failed with status ${response.status}.`);
  }

  return { channelId, title };
}

async function refreshGmailAccessToken(env: Env, config: StoredConfig): Promise<string> {
  const refreshToken = config.gmailRefreshTokenCiphertext
    ? await decryptSecret(config.gmailRefreshTokenCiphertext, requireSecretEncryptionKey(env), GMAIL_TOKEN_REAUTH_MESSAGE)
    : String(config.gmailRefreshToken || '').trim();

  if (!refreshToken) {
    throw new Error(GMAIL_TOKEN_REAUTH_MESSAGE);
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: String(env.GMAIL_CLIENT_ID || '').trim(),
      client_secret: String(env.GMAIL_CLIENT_SECRET || '').trim(),
    }),
  });

  const payload = (await response.json().catch(() => null)) as GmailTokenResponse | null;
  const newAccessToken = String(payload?.access_token || '').trim();
  if (!response.ok || !newAccessToken) {
    throw new Error(payload?.error_description || payload?.error || 'Gmail token refresh failed. Reconnect Gmail in Settings.');
  }

  return newAccessToken;
}

async function fetchGmailProfile(accessToken: string): Promise<{ email: string }> {
  // Use OAuth userinfo — `gmail.send` does not authorize gmail.googleapis.com/users/me/profile (403).
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as { email?: string } | null;
  const email = String(payload?.email || '').trim();

  if (!response.ok || !email) {
    throw new Error(`Gmail profile lookup failed with status ${response.status}.`);
  }

  return { email };
}

async function exchangeInstagramCodeForLongLivedToken(code: string, redirectUri: string, env: Env): Promise<string> {
  const shortResponse = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: String(env.INSTAGRAM_APP_ID || '').trim(),
      client_secret: String(env.INSTAGRAM_APP_SECRET || '').trim(),
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });

  const shortPayload = (await shortResponse.json().catch(() => null)) as InstagramOAuthTokenResponse | null;
  const shortToken = String(shortPayload?.access_token || '').trim();
  if (!shortResponse.ok || !shortToken) {
    throw new Error(shortPayload?.error_message || shortPayload?.error_type || `Instagram token exchange failed with status ${shortResponse.status}.`);
  }

  const longResponse = await fetch(
    `https://graph.instagram.com/access_token?${new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: String(env.INSTAGRAM_APP_SECRET || '').trim(),
      access_token: shortToken,
    }).toString()}`,
  );
  const longPayload = (await longResponse.json().catch(() => null)) as MetaTokenResponse | null;
  const longToken = String(longPayload?.access_token || '').trim();
  return longResponse.ok && longToken ? longToken : shortToken;
}

async function fetchInstagramAccount(accessToken: string): Promise<{ userId: string; username: string }> {
  const response = await fetch(
    `https://graph.instagram.com/${META_GRAPH_VERSION}/me?fields=user_id,username&access_token=${encodeURIComponent(accessToken)}`,
  );
  const payload = (await response.json().catch(() => null)) as InstagramMeResponse | null;
  const firstRecord = payload?.data?.[0];
  const userId = String(firstRecord?.user_id ?? payload?.user_id ?? '').trim();
  const username = String(firstRecord?.username ?? payload?.username ?? '').trim();

  if (!response.ok || !userId) {
    throw new Error(`Instagram profile lookup failed with status ${response.status}.`);
  }

  return { userId, username };
}

async function fetchLinkedInPersonUrn(accessToken: string): Promise<string> {
  const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const userInfoPayload = (await userInfoResponse.json().catch(() => null)) as LinkedInUserInfoResponse | null;
  const subjectId = String(userInfoPayload?.sub || '').trim();
  if (userInfoResponse.ok && subjectId) {
    return `urn:li:person:${subjectId}`;
  }

  const response = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as LinkedInMeResponse | null;
  const id = String(payload?.id || '').trim();
  if (!response.ok || !id) {
    if (response.status === 403) {
      if (userInfoResponse.status === 403) {
        throw new Error('LinkedIn profile lookup failed with status 403. The app is not returning member identity from either the OpenID userinfo endpoint or the legacy profile endpoint. Ensure the LinkedIn app has OpenID Connect profile access, then reconnect the channel.');
      }

      throw new Error('LinkedIn profile lookup failed with status 403. The OAuth token is missing legacy profile-read permission. The Worker now prefers OpenID identity lookup, so reconnect the channel and ensure the app keeps the openid and profile scopes enabled.');
    }

    throw new Error(`LinkedIn profile lookup failed with status ${response.status}.`);
  }

  return `urn:li:person:${id}`;
}

async function exchangeMetaCodeForLongLivedToken(code: string, redirectUri: string, env: Env): Promise<string> {
  const baseParams = new URLSearchParams({
    client_id: String(env.META_APP_ID || '').trim(),
    client_secret: String(env.META_APP_SECRET || '').trim(),
    redirect_uri: redirectUri,
  });

  const shortResponse = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${new URLSearchParams({
      ...Object.fromEntries(baseParams.entries()),
      code,
    }).toString()}`,
  );
  const shortPayload = (await shortResponse.json().catch(() => null)) as MetaTokenResponse | null;
  const shortToken = String(shortPayload?.access_token || '').trim();
  if (!shortResponse.ok || !shortToken) {
    throw new Error(shortPayload?.error?.message || `Meta token exchange failed with status ${shortResponse.status}.`);
  }

  const longResponse = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: String(env.META_APP_ID || '').trim(),
      client_secret: String(env.META_APP_SECRET || '').trim(),
      fb_exchange_token: shortToken,
    }).toString()}`,
  );
  const longPayload = (await longResponse.json().catch(() => null)) as MetaTokenResponse | null;
  const longToken = String(longPayload?.access_token || '').trim();
  return longResponse.ok && longToken ? longToken : shortToken;
}

async function discoverWhatsAppPhoneOptions(accessToken: string): Promise<WhatsAppPhoneOption[]> {
  const assignedAccounts = await graphApiGet<MetaWhatsAppBusinessAccountNode>(
    '/me/assigned_whatsapp_business_accounts?fields=id,name,phone_numbers{id,display_phone_number,verified_name}',
    accessToken,
  );
  const businesses = await graphApiGet<MetaBusinessNode>(
    '/me/businesses?fields=owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}',
    accessToken,
  );

  const options = [
    ...extractWhatsAppPhoneOptions(assignedAccounts.data ?? []),
    ...extractWhatsAppPhoneOptionsFromBusinesses(businesses.data ?? []),
  ];

  return Array.from(new Map(options.map((option) => [option.phoneNumberId, option])).values());
}

async function graphApiGet<T>(path: string, accessToken: string): Promise<GraphDataResponse<T>> {
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}${path}${separator}access_token=${encodeURIComponent(accessToken)}`);
  const payload = (await response.json().catch(() => null)) as GraphDataResponse<T> | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Meta Graph request failed with status ${response.status}.`);
  }

  return payload || {};
}

function extractWhatsAppPhoneOptions(accounts: MetaWhatsAppBusinessAccountNode[]): WhatsAppPhoneOption[] {
  return accounts.flatMap((account) =>
    (account.phone_numbers?.data ?? [])
      .filter((phone) => Boolean(phone?.id))
      .map((phone) => ({
        businessAccountId: String(account.id || '').trim(),
        businessAccountName: String(account.name || 'WhatsApp Business Account').trim(),
        phoneNumberId: String(phone.id || '').trim(),
        displayPhoneNumber: String(phone.display_phone_number || '').trim(),
        verifiedName: String(phone.verified_name || '').trim(),
      })),
  );
}

function extractWhatsAppPhoneOptionsFromBusinesses(businesses: MetaBusinessNode[]): WhatsAppPhoneOption[] {
  return businesses.flatMap((business) => extractWhatsAppPhoneOptions(business.owned_whatsapp_business_accounts?.data ?? []));
}

async function persistLinkedInConnection(env: Env, accessToken: string, personUrn: string): Promise<BotConfig> {
  const current = await loadStoredConfig(env);
  const nextConfig: StoredConfig = {
    ...current,
    disconnectedAuthProviders: withoutDisconnectedAuthProvider(current.disconnectedAuthProviders || [], 'linkedin'),
    linkedinPersonUrn: personUrn,
    linkedinAccessTokenCiphertext: await encryptSecret(accessToken, requireSecretEncryptionKey(env)),
    linkedinAccessToken: undefined,
  };
  await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
  return toPublicConfig(nextConfig, env);
}

async function persistInstagramConnection(env: Env, accessToken: string, instagramUserId: string, instagramUsername: string): Promise<BotConfig> {
  const current = await loadStoredConfig(env);
  const nextConfig: StoredConfig = {
    ...current,
    disconnectedAuthProviders: withoutDisconnectedAuthProvider(current.disconnectedAuthProviders || [], 'instagram'),
    instagramUserId,
    instagramUsername,
    instagramAccessTokenCiphertext: await encryptSecret(accessToken, requireSecretEncryptionKey(env)),
    instagramAccessToken: undefined,
  };
  await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
  return toPublicConfig(nextConfig, env);
}

async function persistWhatsAppConnection(env: Env, accessToken: string, phoneNumberId: string): Promise<BotConfig> {
  const current = await loadStoredConfig(env);
  const nextConfig: StoredConfig = {
    ...current,
    disconnectedAuthProviders: withoutDisconnectedAuthProvider(current.disconnectedAuthProviders || [], 'whatsapp'),
    whatsappPhoneNumberId: phoneNumberId,
    whatsappAccessTokenCiphertext: await encryptSecret(accessToken, requireSecretEncryptionKey(env)),
    whatsappAccessToken: undefined,
  };
  await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
  return toPublicConfig(nextConfig, env);
}

async function persistGmailConnection(env: Env, accessToken: string, refreshToken: string, email: string): Promise<BotConfig> {
  const current = await loadStoredConfig(env);
  const nextConfig: StoredConfig = {
    ...current,
    disconnectedAuthProviders: withoutDisconnectedAuthProvider(current.disconnectedAuthProviders || [], 'gmail'),
    gmailEmailAddress: email,
    gmailAccessTokenCiphertext: await encryptSecret(accessToken, requireSecretEncryptionKey(env)),
    gmailAccessToken: undefined,
  };

  if (refreshToken) {
    nextConfig.gmailRefreshTokenCiphertext = await encryptSecret(refreshToken, requireSecretEncryptionKey(env));
    nextConfig.gmailRefreshToken = undefined;
  }

  await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
  return toPublicConfig(nextConfig, env);
}

async function persistYouTubeConnection(env: Env, accessToken: string, refreshToken: string, title: string): Promise<BotConfig> {
  const current = await loadStoredConfig(env);
  const nextConfig: StoredConfig = {
    ...current,
    disconnectedAuthProviders: withoutDisconnectedAuthProvider(current.disconnectedAuthProviders || [], 'youtube'),
    youtubeEmailAddress: title,
    youtubeAccessTokenCiphertext: await encryptSecret(accessToken, requireSecretEncryptionKey(env)),
    youtubeAccessToken: undefined,
  };

  if (refreshToken) {
    nextConfig.youtubeRefreshTokenCiphertext = await encryptSecret(refreshToken, requireSecretEncryptionKey(env));
    nextConfig.youtubeRefreshToken = undefined;
  }

  await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
  return toPublicConfig(nextConfig, env);
}

async function disconnectChannelAuth(env: Env, current: StoredConfig, provider: string): Promise<BotConfig> {
  if (provider !== 'instagram' && provider !== 'linkedin' && provider !== 'whatsapp' && provider !== 'gmail' && provider !== 'youtube') {
    throw new Error('Choose a valid OAuth channel to disconnect.');
  }

  const nextConfig: StoredConfig = {
    ...current,
    disconnectedAuthProviders: withDisconnectedAuthProvider(current.disconnectedAuthProviders || [], provider),
  };

  if (provider === 'instagram') {
    nextConfig.instagramUserId = '';
    nextConfig.instagramUsername = '';
    nextConfig.instagramAccessTokenCiphertext = undefined;
    nextConfig.instagramAccessToken = undefined;
  }

  if (provider === 'linkedin') {
    nextConfig.linkedinPersonUrn = '';
    nextConfig.linkedinAccessTokenCiphertext = undefined;
    nextConfig.linkedinAccessToken = undefined;
  }

  if (provider === 'gmail') {
    nextConfig.gmailEmailAddress = '';
    nextConfig.gmailAccessTokenCiphertext = undefined;
    nextConfig.gmailAccessToken = undefined;
    nextConfig.gmailRefreshTokenCiphertext = undefined;
    nextConfig.gmailRefreshToken = undefined;
  }

  if (provider === 'whatsapp') {
    nextConfig.whatsappPhoneNumberId = '';
    nextConfig.whatsappAccessTokenCiphertext = undefined;
    nextConfig.whatsappAccessToken = undefined;
  }

  if (provider === 'youtube') {
    nextConfig.youtubeEmailAddress = '';
    nextConfig.youtubeAccessTokenCiphertext = undefined;
    nextConfig.youtubeAccessToken = undefined;
    nextConfig.youtubeRefreshTokenCiphertext = undefined;
    nextConfig.youtubeRefreshToken = undefined;
  }

  await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
  return toPublicConfig(nextConfig, env);
}


async function resolveTelegramBotToken(env: Env, config: StoredConfig): Promise<string> {
  if (!config.telegramBotTokenCiphertext && !config.telegramBotToken) {
    throw new Error('Telegram delivery is not configured. Ask an admin to add the bot token.');
  }

  if (config.telegramBotTokenCiphertext) {
    try {
      return await decryptSecret(
        config.telegramBotTokenCiphertext,
        requireSecretEncryptionKey(env),
        TELEGRAM_TOKEN_REAUTH_MESSAGE,
      );
    } catch (error) {
      if (error instanceof Error && error.message === TELEGRAM_TOKEN_REAUTH_MESSAGE) {
        const nextConfig: StoredConfig = {
          ...config,
          telegramBotTokenCiphertext: undefined,
        };
        await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
      }
      throw error;
    }
  }

  return String(config.telegramBotToken || '').trim();
}

async function verifyTelegramChat(
  env: Env,
  config: StoredConfig,
  payload: Record<string, unknown>,
): Promise<TelegramChatVerificationResult> {
  const chatId = normalizeTelegramChatId(String(payload.chatId || ''));
  if (!chatId) {
    throw new Error('Enter a valid Telegram chat ID or @channel username.');
  }

  const providedToken = String(payload.botToken || '').trim();
  const botToken = providedToken || await resolveTelegramBotToken(env, config);
  return verifyTelegramChatRequest({ botToken, chatId });
}

function oauthPopupResponse(origin: string | null, message: Record<string, unknown>): Response {
  const messageJson = JSON.stringify(message).replace(/</g, '\\u003c');
  const originJson = origin ? JSON.stringify(origin) : 'null';
  const statusText = JSON.stringify(
    message.ok
      ? 'Connection finished. You can close this window.'
      : String(message.error || 'Connection failed.'),
  );

  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Channel Connection</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif; background: #f7f9fc; color: #0f172a; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .panel { width: min(440px, 100%); background: white; border-radius: 20px; padding: 24px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12); }
    h1 { margin: 0 0 8px; font-size: 1.1rem; }
    p { margin: 0; line-height: 1.6; color: #475569; }
  </style>
</head>
<body>
  <main>
    <section class="panel">
      <h1>Returning to Channel Bot</h1>
      <p id="status">Finishing the connection...</p>
    </section>
  </main>
  <script>
    const message = ${messageJson};
    const targetOrigin = ${originJson};
    if (targetOrigin && window.opener) {
      try {
        window.opener.postMessage(message, targetOrigin);
      } catch (e) {
        console.error(e);
      }
    }
    window.setTimeout(() => { try { window.close(); } catch (e) { console.error(e); } }, 120);
    document.getElementById('status').textContent = ${statusText};
  </script>
</body>
</html>`,
    {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    },
  );
}

async function normalizeAllowedGrokModelsAgainstCatalog(env: Env, raw: unknown[]): Promise<string[]> {
  const catalogModels = await listGrokModels(env);
  const catalog = new Set<string>();
  for (const m of catalogModels) {
    catalog.add(m.value);
  }
  for (const m of STATIC_GROK_MODELS) {
    catalog.add(m.value);
  }
  const picked = [...new Set(
    raw
      .map((x) => String(x ?? '').trim())
      .filter(Boolean)
      .filter((id) => catalog.has(id)),
  )];
  if (picked.length === 0) {
    throw new Error('Choose at least one allowed Grok model from the catalog.');
  }
  return picked;
}

async function normalizeAllowedOpenrouterModelsAgainstCatalog(env: Env, raw: unknown[]): Promise<string[]> {
  const catalogModels = await listOpenrouterModels(env);
  const catalog = new Set<string>();
  for (const m of catalogModels) {
    catalog.add(m.value);
  }
  for (const m of STATIC_OPENROUTER_MODELS) {
    catalog.add(m.value);
  }
  const picked = [...new Set(
    raw
      .map((x) => String(x ?? '').trim())
      .filter(Boolean)
      .filter((id) => catalog.has(id)),
  )];
  if (picked.length === 0) {
    throw new Error('Choose at least one allowed OpenRouter model from the catalog.');
  }
  return picked;
}

function normalizeAllowedMinimaxModelsAgainstCatalog(env: Env, raw: unknown[]): string[] {
  const catalog = new Set<string>(STATIC_MINIMAX_MODELS.map((m) => m.value));
  for (const m of listMinimaxModels(env)) {
    catalog.add(m.value);
  }
  const picked = [...new Set(
    raw
      .map((x) => String(x ?? '').trim())
      .filter(Boolean)
      .filter((id) => catalog.has(id)),
  )];
  if (picked.length === 0) {
    throw new Error('Choose at least one allowed MiniMax model from the catalog.');
  }
  return picked;
}

async function normalizeAllowedGoogleModelsAgainstCatalog(env: Env, raw: unknown[]): Promise<string[]> {
  const catalogModels = await listGeminiModels(env);
  const catalog = new Set<string>();
  for (const m of catalogModels) {
    catalog.add(m.value);
  }
  for (const m of STATIC_GEMINI_MODELS) {
    catalog.add(m.value);
  }
  const picked = [...new Set(
    raw
      .map((x) => String(x ?? '').trim())
      .filter(Boolean)
      .filter((id) => catalog.has(id)),
  )];
  if (picked.length === 0) {
    throw new Error('Choose at least one allowed Gemini model from the catalog.');
  }
  return picked;
}

async function computeNextAllowedGoogleModels(env: Env, current: StoredConfig, update: BotConfigUpdate): Promise<string[]> {
  if (Array.isArray(update.allowedGoogleModels)) {
    return normalizeAllowedGoogleModelsAgainstCatalog(env, update.allowedGoogleModels);
  }
  return resolveAllowedGoogleModelIds(current);
}

async function computeNextAllowedGrokModels(
  env: Env,
  current: StoredConfig,
  update: BotConfigUpdate,
  nextAllowedGoogle: string[],
  resolvedGoogleModel: string,
): Promise<string[]> {
  if (!FEATURE_MULTI_PROVIDER_LLM) {
    return resolveAllowedGrokModelIds(
      workspaceConfigFromStored(resolvedGoogleModel, nextAllowedGoogle, current.llm),
    );
  }
  if (Array.isArray(update.llm?.allowedGrokModels) && update.llm.allowedGrokModels.length > 0) {
    return normalizeAllowedGrokModelsAgainstCatalog(env, update.llm.allowedGrokModels);
  }
  return resolveAllowedGrokModelIds(
    workspaceConfigFromStored(resolvedGoogleModel, nextAllowedGoogle, current.llm),
  );
}

async function computeNextAllowedOpenrouterModels(
  env: Env,
  current: StoredConfig,
  update: BotConfigUpdate,
): Promise<string[]> {
  if (!FEATURE_MULTI_PROVIDER_LLM) {
    return resolveAllowedOpenrouterModelIds(
      workspaceConfigFromStored(current.googleModel, current.allowedGoogleModels, current.llm),
    );
  }
  if (Array.isArray(update.llm?.allowedOpenrouterModels) && update.llm.allowedOpenrouterModels.length > 0) {
    return normalizeAllowedOpenrouterModelsAgainstCatalog(env, update.llm.allowedOpenrouterModels);
  }
  return resolveAllowedOpenrouterModelIds(
    workspaceConfigFromStored(current.googleModel, current.allowedGoogleModels, current.llm),
  );
}

async function computeNextAllowedMinimaxModels(
  env: Env,
  current: StoredConfig,
  update: BotConfigUpdate,
): Promise<string[]> {
  if (!FEATURE_MULTI_PROVIDER_LLM) {
    return resolveAllowedMinimaxModelIds(
      workspaceConfigFromStored(current.googleModel, current.allowedGoogleModels, current.llm),
    );
  }
  if (Array.isArray(update.llm?.allowedMinimaxModels) && update.llm.allowedMinimaxModels.length > 0) {
    return normalizeAllowedMinimaxModelsAgainstCatalog(env, update.llm.allowedMinimaxModels);
  }
  return resolveAllowedMinimaxModelIds(
    workspaceConfigFromStored(current.googleModel, current.allowedGoogleModels, current.llm),
  );
}

async function computeNextLlmStored(
  env: Env,
  current: StoredConfig,
  update: BotConfigUpdate,
  nextAllowedGoogle: string[],
  resolvedGoogleModel: string,
): Promise<StoredConfig['llm'] | undefined> {
  if (!FEATURE_MULTI_PROVIDER_LLM) {
    return undefined;
  }
  const grokAllowed = await computeNextAllowedGrokModels(env, current, update, nextAllowedGoogle, resolvedGoogleModel);
  const openrouterAllowed = await computeNextAllowedOpenrouterModels(env, current, update);
  const minimaxAllowed = await computeNextAllowedMinimaxModels(env, current, update);
  const geminiPolicy = { googleModel: resolvedGoogleModel, allowedGoogleModels: nextAllowedGoogle };
  const ws = workspaceConfigFromStored(resolvedGoogleModel, nextAllowedGoogle, {
    ...current.llm,
    allowedGrokModels: grokAllowed,
    allowedOpenrouterModels: openrouterAllowed,
    allowedMinimaxModels: minimaxAllowed,
  });

  let primary: LlmRef = update.llm?.primary ?? current.llm?.primary ?? resolveStoredPrimary(ws, true);
  if (primary.provider === 'grok' && !grokAllowed.includes(primary.model)) {
    primary = resolveStoredPrimary(ws, true);
  }
  if (primary.provider === 'openrouter' && !openrouterAllowed.includes(primary.model)) {
    primary = resolveStoredPrimary(ws, true);
  }
  if (primary.provider === 'minimax' && !minimaxAllowed.includes(primary.model)) {
    primary = resolveStoredPrimary(ws, true);
  }
  if (primary.provider === 'gemini') {
    primary = {
      provider: 'gemini',
      model: resolveEffectiveGoogleModel(geminiPolicy, primary.model),
    };
  }

  let fallback: LlmRef | undefined =
    update.llm?.fallback === null ? undefined : (update.llm?.fallback ?? current.llm?.fallback);
  if (fallback) {
    if (fallback.provider === 'gemini') {
      fallback = {
        provider: 'gemini',
        model: resolveEffectiveGoogleModel(geminiPolicy, fallback.model),
      };
    }
    if (fallback && fallback.provider === primary.provider && fallback.model === primary.model) {
      fallback = undefined;
    }
  }

  return { primary, fallback, allowedGrokModels: grokAllowed, allowedOpenrouterModels: openrouterAllowed, allowedMinimaxModels: minimaxAllowed };
}

async function saveConfig(env: Env, current: StoredConfig, update: BotConfigUpdate, session: VerifiedSession): Promise<BotConfig> {
  let nextHistory = [...(current.generationRulesHistory || [])];
  if (typeof update.generationRules === 'string') {
    const trimmedNew = update.generationRules.trim();
    const trimmedOld = (current.generationRules || '').trim();
    if (trimmedNew !== trimmedOld) {
      nextHistory.unshift({
        savedAt: new Date().toISOString(),
        savedBy: session.email,
        text: current.generationRules || '',
      });
      nextHistory = nextHistory.slice(0, 50);
    }
  }

  const nextAllowed = await computeNextAllowedGoogleModels(env, current, update);
  const candidateGoogleModel = typeof update.googleModel === 'string' && update.googleModel.trim() ? update.googleModel.trim() : current.googleModel;
  const resolvedGoogleModel = resolveEffectiveGoogleModel(
    { googleModel: candidateGoogleModel, allowedGoogleModels: nextAllowed },
    candidateGoogleModel,
  );

  const nextLlm = await computeNextLlmStored(env, current, update, nextAllowed, resolvedGoogleModel);

  const nextConfig: StoredConfig = {
    spreadsheetId: typeof update.spreadsheetId === 'string' ? update.spreadsheetId.trim() : current.spreadsheetId,
    githubRepo: typeof update.githubRepo === 'string' ? update.githubRepo.trim() : current.githubRepo,
    googleModel: resolvedGoogleModel,
    allowedGoogleModels: nextAllowed,
    generationRules: typeof update.generationRules === 'string' ? update.generationRules.trim() : current.generationRules,
    authorProfile: typeof update.authorProfile === 'string' ? update.authorProfile.trim() : (current.authorProfile || ''),
    disconnectedAuthProviders: current.disconnectedAuthProviders || [],
    githubTokenCiphertext: current.githubTokenCiphertext,
    defaultChannel: update.defaultChannel === 'whatsapp'
      ? 'whatsapp'
      : update.defaultChannel === 'telegram'
        ? 'telegram'
      : update.defaultChannel === 'instagram'
        ? 'instagram'
      : update.defaultChannel === 'gmail'
        ? 'gmail'
      : update.defaultChannel === 'linkedin'
        ? 'linkedin'
        : current.defaultChannel,
    instagramUserId: typeof update.instagramUserId === 'string' ? update.instagramUserId.trim() : current.instagramUserId,
    instagramUsername: typeof update.instagramUsername === 'string' ? update.instagramUsername.trim() : current.instagramUsername,
    instagramAccessTokenCiphertext: current.instagramAccessTokenCiphertext,
    linkedinPersonUrn: typeof update.linkedinPersonUrn === 'string' ? update.linkedinPersonUrn.trim() : current.linkedinPersonUrn,
    linkedinAccessTokenCiphertext: current.linkedinAccessTokenCiphertext,
    gmailEmailAddress: typeof update.gmailEmailAddress === 'string' ? update.gmailEmailAddress.trim() : current.gmailEmailAddress,
    gmailDefaultTo: typeof update.gmailDefaultTo === 'string' ? update.gmailDefaultTo.trim() : (current.gmailDefaultTo || ''),
    gmailDefaultCc: typeof update.gmailDefaultCc === 'string' ? update.gmailDefaultCc.trim() : (current.gmailDefaultCc || ''),
    gmailDefaultBcc: typeof update.gmailDefaultBcc === 'string' ? update.gmailDefaultBcc.trim() : (current.gmailDefaultBcc || ''),
    gmailDefaultSubject: typeof update.gmailDefaultSubject === 'string' ? update.gmailDefaultSubject.trim() : (current.gmailDefaultSubject || ''),
    gmailAccessTokenCiphertext: current.gmailAccessTokenCiphertext,
    gmailRefreshTokenCiphertext: current.gmailRefreshTokenCiphertext,
    telegramBotTokenCiphertext: current.telegramBotTokenCiphertext,
    telegramRecipients: Array.isArray(update.telegramRecipients)
      ? normalizeTelegramRecipients(update.telegramRecipients)
      : current.telegramRecipients,
    whatsappPhoneNumberId: typeof update.whatsappPhoneNumberId === 'string' ? update.whatsappPhoneNumberId.trim() : current.whatsappPhoneNumberId,
    whatsappAccessTokenCiphertext: current.whatsappAccessTokenCiphertext,
    whatsappRecipients: Array.isArray(update.whatsappRecipients)
      ? normalizeWhatsAppRecipients(update.whatsappRecipients)
      : current.whatsappRecipients,
    generationRulesHistory: nextHistory,
    newsResearch:
      FEATURE_NEWS_RESEARCH && update.newsResearch !== undefined
        ? normalizeNewsResearchStored(update.newsResearch)
        : normalizeNewsResearchStored(current.newsResearch),
    llm: nextLlm,
    contentReview: FEATURE_CONTENT_REVIEW
      ? (update.contentReview !== undefined
          ? normalizeContentReviewStored({ ...(current.contentReview || {}), ...update.contentReview })
          : normalizeContentReviewStored(current.contentReview))
      : current.contentReview,
    imageGen: update.imageGen !== undefined
      ? { provider: update.imageGen.provider || current.imageGen?.provider, model: update.imageGen.model }
      : current.imageGen,
    enrichmentSkills: update.enrichmentSkills !== undefined
      ? update.enrichmentSkills
      : current.enrichmentSkills,
  };

  if (update.githubToken) {
    nextConfig.githubTokenCiphertext = await encryptSecret(update.githubToken.trim(), requireSecretEncryptionKey(env));
  }

  if (update.instagramAccessToken) {
    nextConfig.instagramAccessTokenCiphertext = await encryptSecret(update.instagramAccessToken.trim(), requireSecretEncryptionKey(env));
    nextConfig.disconnectedAuthProviders = withoutDisconnectedAuthProvider(nextConfig.disconnectedAuthProviders || [], 'instagram');
  }

  if (update.linkedinAccessToken) {
    nextConfig.linkedinAccessTokenCiphertext = await encryptSecret(update.linkedinAccessToken.trim(), requireSecretEncryptionKey(env));
    nextConfig.disconnectedAuthProviders = withoutDisconnectedAuthProvider(nextConfig.disconnectedAuthProviders || [], 'linkedin');
  }

  if (update.gmailAccessToken) {
    nextConfig.gmailAccessTokenCiphertext = await encryptSecret(update.gmailAccessToken.trim(), requireSecretEncryptionKey(env));
    nextConfig.disconnectedAuthProviders = withoutDisconnectedAuthProvider(nextConfig.disconnectedAuthProviders || [], 'gmail');
  }

  if (update.gmailRefreshToken) {
    nextConfig.gmailRefreshTokenCiphertext = await encryptSecret(update.gmailRefreshToken.trim(), requireSecretEncryptionKey(env));
  }

  if (update.telegramBotToken) {
    nextConfig.telegramBotTokenCiphertext = await encryptSecret(update.telegramBotToken.trim(), requireSecretEncryptionKey(env));
  }

  if (update.whatsappAccessToken) {
    nextConfig.whatsappAccessTokenCiphertext = await encryptSecret(update.whatsappAccessToken.trim(), requireSecretEncryptionKey(env));
    nextConfig.disconnectedAuthProviders = withoutDisconnectedAuthProvider(nextConfig.disconnectedAuthProviders || [], 'whatsapp');
  }

  await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
  await setUserSpreadsheetId(env.PIPELINE_DB, session.userId, String(nextConfig.spreadsheetId || '').trim());
  return toPublicConfig(nextConfig, env);
}

async function triggerGithubAction(env: Env, config: StoredConfig, payload: Record<string, unknown>): Promise<{ success: true }> {
  if (!config.githubRepo || !config.githubTokenCiphertext) {
    throw new Error('GitHub dispatch is not configured. Ask an admin to complete the shared settings.');
  }

  const eventType = String(payload.eventType || '');
  if (!eventType) {
    throw new Error('Missing repository dispatch event type.');
  }

  let githubToken: string;
  try {
    githubToken = await decryptSecret(config.githubTokenCiphertext, requireSecretEncryptionKey(env), GITHUB_TOKEN_REAUTH_MESSAGE);
  } catch (error) {
    if (error instanceof Error && error.message === GITHUB_TOKEN_REAUTH_MESSAGE) {
      const nextConfig: StoredConfig = {
        ...config,
        githubTokenCiphertext: undefined,
      };
      await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
    }
    throw error;
  }

  const innerBase =
    payload.payload && typeof payload.payload === 'object' && !Array.isArray(payload.payload)
      ? (payload.payload as Record<string, unknown>)
      : {};
  const innerPayload = { ...innerBase };
  const ws = workspaceConfigFromStored(config.googleModel, config.allowedGoogleModels, config.llm);
  const llmSettings = await seedLlmSettingsIfEmpty(
    env.PIPELINE_DB,
    config.spreadsheetId,
    config,
    GOOGLE_MODEL_DEFAULT,
  );
  const auto = llmSettings.github_automation;
  const automationGemini =
    auto.provider === 'gemini'
      ? auto.model
      : resolveGithubAutomationGeminiModel(ws, FEATURE_MULTI_PROVIDER_LLM);
  const requested = String(innerPayload.google_model ?? '').trim();
  innerPayload.google_model = requested
    ? resolveEffectiveGoogleModel(
        { googleModel: config.googleModel, allowedGoogleModels: config.allowedGoogleModels },
        requested,
      )
    : automationGemini;

  const response = await fetch(`https://api.github.com/repos/${config.githubRepo}/dispatches`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubToken}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'linkedin-bot-worker',
    },
    body: JSON.stringify({
      event_type: eventType,
      client_payload: innerPayload,
    }),
  });

  if (response.status !== 204) {
    const message = await response.text();
    throw new Error(`GitHub dispatch failed: ${message || response.status}`);
  }

  return { success: true };
}

export async function executeScheduledPublish(env: Env, task: ScheduledPublishTask): Promise<void> {
  const config = await loadStoredConfig(env);
  ensureSpreadsheetConfigured(config);

  const { sheets, pipeline } = buildServices(env);
  const topicId = String(task.topicId || '').trim();
  if (!topicId) {
    return;
  }
  const row = await pipeline.getRowByTopicId(sheets, config.spreadsheetId, topicId);
  if (!row) {
    return;
  }

  const normalizedStatus = String(row.status || '').trim().toLowerCase();
  if (normalizedStatus === 'blocked') {
    return;
  }
  const intent = task.intent || 'publish';

  if (intent === 'publish' && (normalizedStatus === 'published' || normalizedStatus !== 'approved')) {
    return;
  }
  if (intent === 'republish' && normalizedStatus !== 'published') {
    return;
  }

  if (String(row.postTime || '').trim() !== task.scheduledTime.trim()) {
    return;
  }

  if (!String(row.selectedText || '').trim()) {
    return;
  }

  await publishContent(
    env,
    task.userId || '',
    config,
    {
      row,
      channel: task.channel || 'linkedin',
      recipientId: task.recipientId,
      message: row.selectedText,
      isScheduledExecution: true,
    },
    sheets,
    pipeline,
  );
}

function resolvePublishImageUrls(payload: Record<string, unknown>, row: SheetRow): string[] {
  const raw = payload.imageUrls;
  if (Array.isArray(raw) && raw.length > 0) {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const x of raw) {
      const u = String(x || '').trim();
      if (u && !seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    }
    if (out.length > 0) {
      return out.slice(0, MAX_IMAGES_PER_POST);
    }
  }
  const one = String(payload.imageUrl || '').trim();
  if (one) {
    return [one];
  }
  return parseRowImageUrls(row);
}

async function publishContent(
  env: Env,
  userId: string,
  config: StoredConfig,
  payload: Record<string, unknown>,
  _sheets: SheetsGateway,
  pipeline: PipelineStore,
): Promise<{
  success: true;
  channel: ChannelId;
  recipientId: string | null;
  messageId: string | null;
  deliveryMode: 'queued' | 'sent';
  mediaMode: 'image' | 'text';
  scheduledTime?: string;
}> {
  const row = coerceSheetRow(payload.row);
  const channel = coerceChannelId(payload.channel);
  const rawRecipientId = String(payload.recipientId || payload.recipientPhoneNumber || '').trim();
  const recipientId = channel === 'telegram'
    ? normalizeTelegramChatId(rawRecipientId)
    : normalizePhoneNumber(rawRecipientId);
  const message = String(payload.message || row.selectedText || '').trim();
  const imageUrls = resolvePublishImageUrls(payload, row);
  const publishedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

  async function markPublishedForChannel(): Promise<void> {
    const cleanedRow = await cleanupUnusedGeneratedImages(env, row, imageUrls);
    const { selectedImageId, selectedImageUrlsJson } = serializeRowImageUrls(imageUrls);
    await pipeline.markRowPublished(config.spreadsheetId, {
      ...cleanedRow,
      status: 'Published',
      selectedText: message,
      selectedImageId,
      selectedImageUrlsJson,
      postTime: publishedAt,
    });
  }

  if (!message) {
    throw new Error('Approved content text is empty. Approve or edit the draft before sending it.');
  }

  const scheduledAt = parseScheduledTimeToTimestamp(row.postTime || '');
  if (!payload.isScheduledExecution && scheduledAt && scheduledAt > Date.now() + 60000) {
    const intent = String(row.status || '').trim().toLowerCase() === 'published' ? 'republish' : 'publish';
    await armScheduledPublish(env, {
      topicId: requireTopicId(row),
      topic: row.topic,
      date: row.date,
      scheduledTime: row.postTime!,
      intent,
      channel,
      recipientId: recipientId || undefined,
      userId,
    });
    return {
      success: true,
      channel,
      recipientId: recipientId || null,
      messageId: null,
      deliveryMode: 'queued',
      mediaMode: imageUrls.length > 0 ? 'image' : 'text',
      scheduledTime: row.postTime!.trim(),
    };
  }

  if (channel === 'instagram') {
    if (imageUrls.length === 0) {
      throw new Error('Instagram publishing requires a selected image.');
    }

    // Try per-user D1 token first
    let instagramAccessToken: string | undefined;
    let instagramUserId: string | undefined;
    const userInstagram = await getSocialIntegration(env.PIPELINE_DB, userId, 'instagram');
    if (userInstagram && !userInstagram.needs_reauth) {
      try {
        instagramAccessToken = await decryptSecret(
          userInstagram.access_token_enc,
          requireSecretEncryptionKey(env),
          'Instagram token could not be decrypted.',
        );
        instagramUserId = userInstagram.internal_id;
      } catch {
        // Fall through to shared config
      }
    }

    if (!instagramAccessToken) {
      if (!config.instagramUserId || (!config.instagramAccessTokenCiphertext && !config.instagramAccessToken)) {
        throw new Error('Instagram publishing is not configured. Ask an admin to complete the Instagram settings.');
      }
      if (config.instagramAccessTokenCiphertext) {
        try {
          instagramAccessToken = await decryptSecret(
            config.instagramAccessTokenCiphertext,
            requireSecretEncryptionKey(env),
            INSTAGRAM_TOKEN_REAUTH_MESSAGE,
          );
        } catch (error) {
          if (error instanceof Error && error.message === INSTAGRAM_TOKEN_REAUTH_MESSAGE) {
            const nextConfig: StoredConfig = {
              ...config,
              instagramAccessTokenCiphertext: undefined,
            };
            await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
          }
          throw error;
        }
      } else {
        instagramAccessToken = String(config.instagramAccessToken || '').trim();
      }
      instagramUserId = config.instagramUserId;
    }

    const publishResult = await publishInstagramPost({
      accessToken: instagramAccessToken,
      instagramUserId: instagramUserId!,
      caption: message,
      imageUrls,
      altText: row.topic,
    });

    await markPublishedForChannel();

    return {
      success: true,
      channel,
      recipientId: null,
      messageId: publishResult.postId,
      deliveryMode: 'sent',
      mediaMode: 'image',
    };
  }

  if (channel === 'linkedin') {
    // Try per-user D1 token first
    let linkedinAccessToken: string | undefined;
    let linkedinPersonUrn: string | undefined;
    const userLinkedin = await getSocialIntegration(env.PIPELINE_DB, userId, 'linkedin');
    if (userLinkedin && !userLinkedin.needs_reauth) {
      try {
        linkedinAccessToken = await decryptSecret(
          userLinkedin.access_token_enc,
          requireSecretEncryptionKey(env),
          'LinkedIn token could not be decrypted.',
        );
        linkedinPersonUrn = userLinkedin.internal_id;
      } catch {
        // Fall through to shared config
      }
    }

    if (!linkedinAccessToken) {
      if (!config.linkedinPersonUrn || (!config.linkedinAccessTokenCiphertext && !config.linkedinAccessToken)) {
        throw new Error('LinkedIn publishing is not configured. Ask an admin to complete the LinkedIn settings.');
      }
      if (config.linkedinAccessTokenCiphertext) {
        try {
          linkedinAccessToken = await decryptSecret(
            config.linkedinAccessTokenCiphertext,
            requireSecretEncryptionKey(env),
            LINKEDIN_TOKEN_REAUTH_MESSAGE,
          );
        } catch (error) {
          if (error instanceof Error && error.message === LINKEDIN_TOKEN_REAUTH_MESSAGE) {
            const nextConfig: StoredConfig = {
              ...config,
              linkedinAccessTokenCiphertext: undefined,
            };
            await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
          }
          throw error;
        }
      } else {
        linkedinAccessToken = String(config.linkedinAccessToken || '').trim();
      }
      linkedinPersonUrn = config.linkedinPersonUrn;
    }

    const publishResult = await publishLinkedInPost({
      accessToken: linkedinAccessToken,
      personUrn: linkedinPersonUrn!,
      text: message,
      imageUrl: imageUrls.length === 1 ? imageUrls[0] : undefined,
      imageUrls: imageUrls.length > 1 ? imageUrls : undefined,
    });

    await markPublishedForChannel();

    return {
      success: true,
      channel,
      recipientId: null,
      messageId: publishResult.postId,
      deliveryMode: 'sent',
      mediaMode: imageUrls.length > 0 ? 'image' : 'text',
    };
  }

  if (channel === 'telegram') {
    if (!recipientId) {
      throw new Error('A valid Telegram chat ID is required.');
    }

    const botToken = await resolveTelegramBotToken(env, config);

    const sendResult = await sendTelegramMessage({
      botToken,
      chatId: recipientId,
      text: message,
      imageUrl: imageUrls.length === 1 ? imageUrls[0] : undefined,
      imageUrls: imageUrls.length > 1 ? imageUrls : undefined,
    });

    await markPublishedForChannel();

    return {
      success: true,
      channel,
      recipientId,
      messageId: sendResult.messageId,
      deliveryMode: 'sent',
      mediaMode: imageUrls.length > 0 ? 'image' : 'text',
    };
  }

  if (channel === 'gmail') {
    // Try per-user D1 token first
    let accessToken: string | undefined;
    const userGmail = await getSocialIntegration(env.PIPELINE_DB, userId, 'gmail');
    if (userGmail && !userGmail.needs_reauth) {
      try {
        accessToken = await decryptSecret(
          userGmail.access_token_enc,
          requireSecretEncryptionKey(env),
          'Gmail token could not be decrypted.',
        );
      } catch {
        // Fall through to shared config
      }
    }

    if (!accessToken) {
      if (!config.gmailEmailAddress || (!config.gmailAccessTokenCiphertext && !config.gmailAccessToken)) {
        throw new Error('Gmail delivery is not configured. Ask an admin to connect a Gmail account.');
      }
      if (config.gmailAccessTokenCiphertext) {
        try {
          accessToken = await decryptSecret(
            config.gmailAccessTokenCiphertext,
            requireSecretEncryptionKey(env),
            GMAIL_TOKEN_REAUTH_MESSAGE,
          );
        } catch (error) {
          if (error instanceof Error && error.message === GMAIL_TOKEN_REAUTH_MESSAGE) {
            const nextConfig: StoredConfig = {
              ...config,
              gmailAccessTokenCiphertext: undefined,
            };
            await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
          }
          throw error;
        }
      } else {
        accessToken = String(config.gmailAccessToken || '').trim();
      }
    }

    const gmailRequest: Parameters<typeof sendGmailMessage>[0] = {
      accessToken,
      to: String(payload.emailTo || row.emailTo || ''),
      cc: String(payload.emailCc || row.emailCc || ''),
      bcc: String(payload.emailBcc || row.emailBcc || ''),
      subject: String(payload.emailSubject || row.emailSubject || row.topic || 'New Message'),
      body: message,
    };
    if (imageUrls.length > 0) {
      const assets = await Promise.all(imageUrls.map((u) => fetchImageAsset(u)));
      gmailRequest.inlineImages = assets.map((a) => ({ contentType: a.contentType, bytes: a.bytes }));
    }

    let sendResult: { messageId: string | null };
    try {
      sendResult = await sendGmailMessage(gmailRequest);
    } catch (error) {
      if (error instanceof GmailAuthError) {
        const newAccessToken = await refreshGmailAccessToken(env, config);
        const encryptionKey = requireSecretEncryptionKey(env);
        const nextConfig: StoredConfig = {
          ...config,
          gmailAccessTokenCiphertext: await encryptSecret(newAccessToken, encryptionKey),
          gmailAccessToken: undefined,
        };
        await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
        sendResult = await sendGmailMessage({ ...gmailRequest, accessToken: newAccessToken });
      } else {
        throw error;
      }
    }

    await markPublishedForChannel();

    const gmailTo = String(payload.emailTo || row.emailTo || '').trim();

    return {
      success: true,
      channel,
      recipientId: gmailTo || null,
      messageId: sendResult.messageId,
      deliveryMode: 'sent',
      mediaMode: imageUrls.length > 0 ? 'image' : 'text',
    };
  }

  if (!recipientId) {
    throw new Error('A valid WhatsApp recipient phone number is required.');
  }

  if (!config.whatsappPhoneNumberId || (!config.whatsappAccessTokenCiphertext && !config.whatsappAccessToken)) {
    throw new Error('WhatsApp delivery is not configured. Ask an admin to add the phone number ID and access token.');
  }

  let accessToken: string;
  if (config.whatsappAccessTokenCiphertext) {
    try {
      accessToken = await decryptSecret(
        config.whatsappAccessTokenCiphertext,
        requireSecretEncryptionKey(env),
        WHATSAPP_TOKEN_REAUTH_MESSAGE,
      );
    } catch (error) {
      if (error instanceof Error && error.message === WHATSAPP_TOKEN_REAUTH_MESSAGE) {
        const nextConfig: StoredConfig = {
          ...config,
          whatsappAccessTokenCiphertext: undefined,
        };
        await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
      }
      throw error;
    }
  } else {
    accessToken = String(config.whatsappAccessToken || '').trim();
  }

  const sendResult = await sendWhatsAppMessage({
    accessToken,
    phoneNumberId: config.whatsappPhoneNumberId,
    to: recipientId,
    text: message,
    imageUrl: imageUrls.length === 1 ? imageUrls[0] : undefined,
    imageUrls: imageUrls.length > 1 ? imageUrls : undefined,
  });

  await markPublishedForChannel();

  return {
    success: true,
    channel,
    recipientId,
    messageId: sendResult.messageId,
    deliveryMode: 'sent',
    mediaMode: imageUrls.length > 0 ? 'image' : 'text',
  };
}

function shouldDeleteUnusedGeneratedImages(env: Env): boolean {
  const raw = String(env.DELETE_UNUSED_GENERATED_IMAGES || 'true').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'no';
}

function parseGcsObjectReference(url: string): { bucketName: string; objectName: string } {
  const value = String(url || '').trim();
  if (!value) {
    return { bucketName: '', objectName: '' };
  }

  if (value.startsWith('gs://')) {
    const withoutScheme = value.slice(5);
    const slashIndex = withoutScheme.indexOf('/');
    if (slashIndex === -1) {
      return { bucketName: withoutScheme, objectName: '' };
    }
    return {
      bucketName: withoutScheme.slice(0, slashIndex),
      objectName: withoutScheme.slice(slashIndex + 1),
    };
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.replace(/^\//, '');

    if (host === 'storage.googleapis.com') {
      const slashIndex = path.indexOf('/');
      if (slashIndex === -1) {
        return { bucketName: path, objectName: '' };
      }
      return {
        bucketName: decodeURIComponent(path.slice(0, slashIndex)),
        objectName: decodeURIComponent(path.slice(slashIndex + 1)),
      };
    }

    if (host.endsWith('.storage.googleapis.com')) {
      return {
        bucketName: host.slice(0, -'.storage.googleapis.com'.length),
        objectName: decodeURIComponent(path),
      };
    }
  } catch {
    return { bucketName: '', objectName: '' };
  }

  return { bucketName: '', objectName: '' };
}

async function cleanupUnusedGeneratedImages(env: Env, row: SheetRow, selectedImageUrls: string[]): Promise<SheetRow> {
  const configuredBucket = String(env.GOOGLE_CLOUD_STORAGE_BUCKET || '').trim();
  if (!configuredBucket || !shouldDeleteUnusedGeneratedImages(env)) {
    return row;
  }

  const candidateUrls = [row.imageLink1, row.imageLink2, row.imageLink3, row.imageLink4]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  if (candidateUrls.length === 0) {
    return row;
  }

  const keep = new Set(selectedImageUrls.map((u) => u.trim()).filter(Boolean));
  const accessToken = await mintGoogleAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const deletedUrls = new Set<string>();

  for (const candidate of candidateUrls) {
    if (keep.has(candidate)) {
      continue;
    }

    const { bucketName, objectName } = parseGcsObjectReference(candidate);
    if (bucketName !== configuredBucket || !objectName) {
      continue;
    }

    const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}`;
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok || response.status === 404) {
      deletedUrls.add(candidate);
      continue;
    }

    const message = await response.text();
    console.warn(`Unable to delete unused GCS image ${candidate}: ${message || response.status}`);
  }

  if (deletedUrls.size === 0) {
    return row;
  }

  return {
    ...row,
    imageLink1: deletedUrls.has(row.imageLink1) ? '' : row.imageLink1,
    imageLink2: deletedUrls.has(row.imageLink2) ? '' : row.imageLink2,
    imageLink3: deletedUrls.has(row.imageLink3) ? '' : row.imageLink3,
    imageLink4: deletedUrls.has(row.imageLink4) ? '' : row.imageLink4,
  };
}

/** Best-effort: remove all row image URLs that live in the configured GCS bucket before sheet rows are deleted. Respects DELETE_UNUSED_GENERATED_IMAGES like publish-time cleanup. */
async function deleteGcsObjectsForTopicRow(env: Env, row: SheetRow): Promise<void> {
  const configuredBucket = String(env.GOOGLE_CLOUD_STORAGE_BUCKET || '').trim();
  if (!configuredBucket || !shouldDeleteUnusedGeneratedImages(env)) {
    return;
  }

  const fromSlots = [row.imageLink1, row.imageLink2, row.imageLink3, row.imageLink4]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const fromSelected = parseRowImageUrls(row);
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const u of [...fromSlots, ...fromSelected]) {
    const t = String(u || '').trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      candidates.push(t);
    }
  }
  if (candidates.length === 0) {
    return;
  }

  let accessToken: string;
  try {
    accessToken = await mintGoogleAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch (error) {
    console.warn('deleteGcsObjectsForTopicRow: failed to mint access token', {
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  for (const candidate of candidates) {
    const { bucketName, objectName } = parseGcsObjectReference(candidate);
    if (bucketName !== configuredBucket || !objectName) {
      continue;
    }

    const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}`;
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok || response.status === 404) {
      continue;
    }

    const message = await response.text();
    console.warn(`Unable to delete GCS object for removed topic (${candidate}): ${message || response.status}`);
  }
}

function coerceChannelId(value: unknown): ChannelId {
  if (
    value !== 'instagram' &&
    value !== 'linkedin' &&
    value !== 'telegram' &&
    value !== 'whatsapp' &&
    value !== 'gmail'
  ) {
    throw new Error('Unsupported delivery channel.');
  }

  return value;
}

function normalizeTelegramRecipients(value: unknown): TelegramRecipient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      label: String((entry as TelegramRecipient).label || '').trim(),
      chatId: normalizeTelegramChatId(String((entry as TelegramRecipient).chatId || '')),
    }))
    .filter((entry) => entry.label && entry.chatId);
}

function normalizeWhatsAppRecipients(value: unknown): WhatsAppRecipient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      label: String((entry as WhatsAppRecipient).label || '').trim(),
      phoneNumber: normalizePhoneNumber(String((entry as WhatsAppRecipient).phoneNumber || '')),
    }))
    .filter((entry) => entry.label && entry.phoneNumber);
}

function normalizeTelegramChatId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('@')) {
    return /^@[A-Za-z0-9_]{4,}$/.test(trimmed) ? trimmed : '';
  }

  const compact = trimmed.replace(/\s+/g, '');
  return /^-?\d+$/.test(compact) ? compact : '';
}

function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const hasPlusPrefix = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return digits ? `${hasPlusPrefix ? '+' : ''}${digits}` : '';
}

function requireSecretEncryptionKey(env: Env): string {
  if (!env.GITHUB_TOKEN_ENCRYPTION_KEY) {
    throw new Error('Missing GITHUB_TOKEN_ENCRYPTION_KEY in the Worker environment.');
  }

  return env.GITHUB_TOKEN_ENCRYPTION_KEY;
}



























/** Hosts whose image URLs usually fail in browser <img> (hotlink / tracking / auth) or spam the console. */
const SERP_IMAGE_HOTLINK_BLOCKED_HOST_SUFFIXES = [
  'tiktok.com',
  'tiktokcdn.com',
  'tiktokv.com',
  'instagram.com',
  'cdninstagram.com',
  'facebook.com',
  'fb.com',
] as const;

function isSerpImageHotlinkBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return SERP_IMAGE_HOTLINK_BLOCKED_HOST_SUFFIXES.some((suff) => h === suff || h.endsWith(`.${suff}`));
}

function isLikelyBrowserHotlinkableImageUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return false;
    }
    const host = u.hostname.toLowerCase();
    if (isSerpImageHotlinkBlockedHost(host)) {
      return false;
    }
    if ((host === 'www.google.com' || host === 'google.com') && u.pathname.startsWith('/url')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Prefer thumbnail first (often Google's cached copy on gstatic), then original, then link —
 * so topic-based search does not surface TikTok originals that break in the media panel.
 */
function pickHotlinkFriendlySerpImageUrl(item: SerpApiImageResult): string | null {
  const candidates = [item.thumbnail, item.original, item.link];
  for (const raw of candidates) {
    if (typeof raw !== 'string') {
      continue;
    }
    const trimmed = raw.trim();
    if (isLikelyBrowserHotlinkableImageUrl(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

function collectHotlinkFriendlySerpImageUrls(results: SerpApiImageResult[] | undefined, maxUrls: number): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const item of results || []) {
    if (urls.length >= maxUrls) {
      break;
    }
    const url = pickHotlinkFriendlySerpImageUrl(item);
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

function normalizeSearchText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function deriveSearchSubject(topic: string): string {
  let subject = normalizeSearchText(topic);
  if (!subject) {
    return '';
  }

  subject = subject
    .replace(/\b\d+\s*(?:word|words|sentence|sentences|line|lines|caption|captions)\b/gi, ' ')
    .replace(/\b(?:in|within|under)\s+\d+\s*words?\b/gi, ' ')
    .replace(/\bwith\s+[^.?!,;]{0,120}?\bimages?\b.*$/gi, ' ')
    .replace(/\bwith\s+[^.?!,;]{0,120}?\bpictures?\b.*$/gi, ' ');
  subject = normalizeSearchText(subject);

  const lowered = subject.toLowerCase();
  for (const separator of [' about ', ' on ']) {
    const index = lowered.indexOf(separator);
    if (index > -1 && subject.slice(0, index).trim().split(/\s+/).length <= 6) {
      subject = subject.slice(index + separator.length);
      break;
    }
  }

  subject = subject
    .replace(/^(?:write|draft|create|generate|make|give|prepare|find|show)\s+/i, '')
    .replace(/^(?:a|an|the)\s+/i, '')
    .replace(/^(?:topic|caption|captions|post|posts|sentence|sentences)\s+/i, '')
    .replace(/^(?:about|on)\s+/i, '')
    .replace(/\bfor\s+linkedin\b/gi, ' ');

  return normalizeSearchText(subject.replace(/^[\s\-:,.]+|[\s\-:,.]+$/g, '')) || normalizeSearchText(topic);
}

function buildSearchQueries(topic: string, imageSearch = false): string[] {
  const subject = deriveSearchSubject(topic);
  const queries: string[] = [];
  const seen = new Set<string>();

  const addQuery = (value: string) => {
    const normalized = normalizeSearchText(value);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      return;
    }

    seen.add(key);
    queries.push(normalized);
  };

  addQuery(subject);
  if (imageSearch) {
    addQuery(`${subject} image`);
    addQuery(`${subject} cartoon image`);
    addQuery(`${subject} characters`);
  } else {
    addQuery(`${subject} cartoon`);
    addQuery(`${subject} characters`);
    addQuery(`${subject} background`);
  }
  addQuery(topic);

  return queries;
}

function requireSerpApiKey(env: Env): string {
  const apiKey = String(env.SERPAPI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing SERPAPI_API_KEY in the Worker environment. Add it before requesting alternate images.');
  }

  return apiKey;
}

function requireStorageBucket(env: Env): string {
  const bucketName = String(env.GOOGLE_CLOUD_STORAGE_BUCKET || '').trim();
  if (!bucketName) {
    throw new Error('Missing GOOGLE_CLOUD_STORAGE_BUCKET in the Worker environment. Add it before uploading or refreshing images.');
  }

  return bucketName;
}

async function runSerpApiSearch(env: Env, query: string, numResults: number, imageSearch = false): Promise<SerpApiSearchResponse> {
  const apiKey = requireSerpApiKey(env);
  const params = new URLSearchParams({
    api_key: apiKey,
    q: query,
    num: String(Math.max(1, numResults)),
    safe: 'active',
    hl: 'en',
    no_cache: 'true',
    engine: imageSearch ? 'google_images' : 'google',
  });

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`SerpApi image search failed with status ${response.status}. Verify SERPAPI_API_KEY and available credits. ${message.slice(0, 240)}`.trim());
  }

  const payload = (await response.json()) as SerpApiSearchResponse;
  if (payload.error) {
    throw new Error(`SerpApi image search failed: ${payload.error}`);
  }

  return payload;
}

async function fetchCandidateImageUrls(env: Env, topic: string, count: number): Promise<string[]> {
  const collected: string[] = [];
  const seen = new Set<string>();

  for (const query of buildSearchQueries(topic, true)) {
    if (collected.length >= count) {
      break;
    }

    const payload = await runSerpApiSearch(env, query, Math.max(count * 12, 36), true);
    const batch = collectHotlinkFriendlySerpImageUrls(payload.images_results, Number.MAX_SAFE_INTEGER);
    for (const url of batch) {
      if (seen.has(url)) {
        continue;
      }
      seen.add(url);
      collected.push(url);
      if (collected.length >= count) {
        break;
      }
    }
  }

  return collected;
}

function guessFileExtension(contentType: string, fileName = ''): string {
  const normalizedType = contentType.toLowerCase();
  if (normalizedType.includes('png')) {
    return '.png';
  }
  if (normalizedType.includes('webp')) {
    return '.webp';
  }
  if (normalizedType.includes('gif')) {
    return '.gif';
  }
  if (normalizedType.includes('svg')) {
    return '.svg';
  }
  if (normalizedType.includes('jpeg') || normalizedType.includes('jpg')) {
    return '.jpg';
  }

  const explicitExtension = fileName.match(/\.[a-zA-Z0-9]+$/)?.[0]?.toLowerCase();
  return explicitExtension || '.jpg';
}

function gcsObjectPrefixFromTopicId(topicId: string): string {
  const s = topicId.replace(/-/g, '').slice(0, 40);
  return s || 'img';
}

function buildPublicGcsUrl(bucketName: string, objectName: string): string {
  const encodedPath = objectName
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
}

function buildDraftImageObjectName(topicKey: string, ordinal: number, contentType: string, fileName = ''): string {
  const extension = guessFileExtension(contentType, fileName);
  const time = Date.now().toString(36);
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  const suffix = `-${time}-${random}-${ordinal}${extension}`;
  return `${topicKey}${suffix}`;
}

async function uploadBytesToGcs(
  env: Env,
  topicKey: string,
  ordinal: number,
  bytes: ArrayBuffer,
  contentType: string,
  fileName = '',
): Promise<string> {
  const bucketName = requireStorageBucket(env);
  const objectName = buildDraftImageObjectName(topicKey, ordinal, contentType, fileName);
  const accessToken = await mintGoogleAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const response = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucketName)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
      },
      body: bytes,
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Cloud Storage upload failed: ${message || response.status}`);
  }

  return buildPublicGcsUrl(bucketName, objectName);
}

function decodeDataUrl(dataUrl: string): { bytes: ArrayBuffer; contentType: string } {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid uploaded image payload.');
  }

  const contentType = match[1]?.trim() || 'image/jpeg';
  const bytes = Uint8Array.from(atob(match[2] || ''), (character) => character.charCodeAt(0));
  return {
    bytes: bytes.buffer,
    contentType,
  };
}

async function fetchDraftImages(env: Env, payload: Record<string, unknown>): Promise<DraftImageListResult> {
  const topic = String(payload.topic || '').trim();
  const searchQuery = String(payload.searchQuery ?? '').trim();
  const requestedCount = Number(payload.count || 8);
  const count = Number.isFinite(requestedCount) ? Math.min(8, Math.max(1, Math.trunc(requestedCount))) : 8;

  if (!topic) {
    throw new Error('Topic is required to fetch alternate images.');
  }

  let candidates: string[];

  if (searchQuery) {
    const serpPayload = await runSerpApiSearch(env, searchQuery, Math.max(count * 12, 36), true);
    candidates = collectHotlinkFriendlySerpImageUrls(serpPayload.images_results, count);
    if (candidates.length === 0) {
      throw new Error(`No images found for "${searchQuery}".`);
    }
  } else {
    candidates = await fetchCandidateImageUrls(env, topic, count);
    if (candidates.length === 0) {
      throw new Error(`No alternate images were found for "${topic}".`);
    }
  }

  return { imageUrls: candidates.slice(0, count) };
}

async function promoteDraftImageUrl(env: Env, payload: Record<string, unknown>): Promise<DraftImagePromoteResult> {
  const topicId = String(payload.topicId || '').trim();
  const sourceUrl = String(payload.sourceUrl || '').trim();

  if (!topicId) {
    throw new Error('topicId is required to save the selected image.');
  }
  if (!sourceUrl) {
    throw new Error('Image URL is required.');
  }

  const asset = await fetchImageAsset(normalizeDeliveryImageUrl(sourceUrl));
  const imageUrl = await uploadBytesToGcs(env, gcsObjectPrefixFromTopicId(topicId), 1, asset.bytes, asset.contentType);
  return { imageUrl };
}

async function uploadDraftImage(env: Env, payload: Record<string, unknown>): Promise<DraftImageUploadResult> {
  const topicId = String(payload.topicId || '').trim();
  const fileName = String(payload.fileName || '').trim();
  const fallbackContentType = String(payload.contentType || '').trim() || 'image/jpeg';
  const dataUrl = String(payload.dataUrl || '').trim();

  if (!topicId) {
    throw new Error('topicId is required to upload an image.');
  }

  if (!dataUrl) {
    throw new Error('Missing uploaded image payload.');
  }

  const decoded = decodeDataUrl(dataUrl);
  const contentType = decoded.contentType || fallbackContentType;
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error('Only image uploads are supported.');
  }

  const imageUrl = await uploadBytesToGcs(env, gcsObjectPrefixFromTopicId(topicId), 1, decoded.bytes, contentType, fileName);
  return { imageUrl };
}

async function handleUploadContextDocument(payload: Record<string, unknown>): Promise<{ documentId: string; extractedText: string; charCount: number }> {
  // Fix 1: Size check before allocating (base64 encodes ~4/3 ratio)
  const MAX_CONTEXT_DOC_BYTES = 2 * 1024 * 1024; // 2 MB
  const contentBase64 = String(payload.contentBase64 ?? '').trim();
  if (!contentBase64) {
    throw new Error('contentBase64 is required.');
  }
  const estimatedBytes = Math.ceil(contentBase64.length * 3 / 4);
  if (estimatedBytes > MAX_CONTEXT_DOC_BYTES) {
    throw new Error(`File too large (${(estimatedBytes / 1024 / 1024).toFixed(1)} MB). Maximum is 2 MB.`);
  }

  // Fix 3: mimeType allowlist
  const ALLOWED_MIME_TYPES = new Set(['text/plain', 'text/markdown', 'application/pdf', 'text/x-markdown']);
  const mimeType = String(payload.mimeType ?? 'text/plain').trim();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Allowed: txt, md, pdf.`);
  }

  const bytes = Uint8Array.from(atob(contentBase64), c => c.charCodeAt(0));
  let text: string;

  if (mimeType === 'application/pdf') {
    // Simple PDF text extraction: find runs of printable ASCII chars
    const decoder = new TextDecoder('latin1');
    const raw = decoder.decode(bytes);
    // Extract text runs between PDF stream markers
    const runs: string[] = [];
    // Fix 2: ReDoS-safe linear indexOf approach instead of backtracking regex
    let pos = 0;
    while (pos < raw.length) {
      const streamStart = raw.indexOf('stream', pos);
      if (streamStart === -1) break;
      const contentStart = streamStart + 6;
      const streamEnd = raw.indexOf('endstream', contentStart);
      if (streamEnd === -1) break;
      const chunk = raw.slice(contentStart, streamEnd);
      const printable = chunk.match(/[ -~]{4,}/g) ?? [];
      runs.push(...printable);
      pos = streamEnd + 9;
    }
    // Also extract parenthesized strings (PDF text objects)
    const parenRegex = /\(([^)]{3,})\)/g;
    let match;
    while ((match = parenRegex.exec(raw)) !== null) {
      runs.push(match[1]);
    }
    text = runs.join(' ').replace(/\s+/g, ' ').trim();
  } else {
    // Plain text / markdown
    text = new TextDecoder('utf-8').decode(bytes);
  }

  const truncated = text.slice(0, 8000);
  return {
    documentId: crypto.randomUUID(),
    extractedText: truncated,
    charCount: truncated.length,
  };
}

async function generateImageWithReference(
  env: Env,
  storedConfig: StoredConfig,
  payload: Record<string, unknown>,
): Promise<DraftImageUploadResult> {
  const referenceImageUrl = String(payload.referenceImageUrl || '').trim();
  const instructions = String(payload.instructions || '').trim();
  const topicId = String(payload.topicId || '').trim();

  if (!referenceImageUrl) throw new Error('referenceImageUrl is required.');
  if (!instructions) throw new Error('instructions are required.');
  if (!topicId) throw new Error('topicId is required.');

  const provider = storedConfig.imageGen?.provider;
  if (provider !== 'gemini') {
    throw new Error(`Reference image generation is only supported for the Gemini provider, not "${provider ?? 'unknown'}".`);
  }

  const model = storedConfig.imageGen?.model ?? 'gemini-2.0-flash-preview-image-generation';
  const apiKey = String(env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured for image generation.');

  // Fetch reference image and convert to base64
  const refAsset = await fetchImageAsset(normalizeDeliveryImageUrl(referenceImageUrl));
  const refBase64 = bytesToBase64(new Uint8Array(refAsset.bytes));

  // Call Gemini image generation API with reference image + instructions
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: refAsset.contentType || 'image/jpeg', data: refBase64 } },
              { text: instructions },
            ],
          },
        ],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini image generation failed with status ${response.status}: ${message.slice(0, 280)}`);
  }

  const result = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
    promptFeedback?: { blockReason?: string };
  };

  if (result.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the image generation request: ${result.promptFeedback.blockReason}.`);
  }

  const imagePart = result.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini did not return an image in the response.');
  }

  const imgContentType = imagePart.inlineData.mimeType ?? 'image/png';
  const imgBytes = Uint8Array.from(atob(imagePart.inlineData.data), (c) => c.charCodeAt(0));
  const imageUrl = await uploadBytesToGcs(env, gcsObjectPrefixFromTopicId(topicId), 1, imgBytes.buffer, imgContentType);
  return { imageUrl };
}

function sanitizeDownloadFileName(fileName: string, contentType: string): string {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (cleaned) {
    return cleaned;
  }

  return `linkedin-post-image${guessFileExtension(contentType, fileName)}`;
}

async function downloadDraftImage(payload: Record<string, unknown>): Promise<Response> {
  const rawUrl = String(payload.url || '').trim();
  const suggestedFileName = String(payload.fileName || '').trim();

  if (!rawUrl) {
    throw new Error('Image URL is required to download an image.');
  }

  const asset = await fetchImageAsset(normalizeDeliveryImageUrl(rawUrl));
  const fileName = sanitizeDownloadFileName(suggestedFileName, asset.contentType);
  return new Response(asset.bytes, {
    status: 200,
    headers: {
      'Content-Type': asset.contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}



export async function mintGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  let credentials: ServiceAccountCredentials;
  try {
    credentials = JSON.parse(serviceAccountJson) as ServiceAccountCredentials;
  } catch {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON value in Worker secrets.');
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must include client_email and private_key.');
  }

  const tokenUri = credentials.token_uri || 'https://oauth2.googleapis.com/token';
  const issuedAt = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: credentials.client_email,
      scope: GOOGLE_API_SCOPES,
      aud: tokenUri,
      exp: issuedAt + 3600,
      iat: issuedAt,
    },
    credentials.private_key,
  );

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to mint Google access token: ${message || response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error('Google token endpoint did not return an access token.');
  }

  return payload.access_token;
}

async function signJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  privateKeyPem: string,
): Promise<string> {
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, textEncoder.encode(signingInput));
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function normalizeOriginForCors(value: string): string {
  return value.trim().toLowerCase().replace(/\/+$/, '');
}

function buildCorsHeaders(request: Request, env: Env): Headers {
  const origin = request.headers.get('Origin');
  const allowedOrigins = parseEmailList(env.CORS_ALLOWED_ORIGINS).map(normalizeOriginForCors);
  const allowAnyOrigin = allowedOrigins.length === 0 || allowedOrigins.includes('*');
  const originNorm = origin ? normalizeOriginForCors(origin) : '';
  const allowOrigin = allowAnyOrigin
    ? '*'
    : originNorm && allowedOrigins.includes(originNorm)
      ? origin
      : '';

  const headers = new Headers({
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  });

  if (allowOrigin) {
    headers.set('Access-Control-Allow-Origin', allowOrigin);
  }

  return headers;
}

function jsonResponse<T>(payload: ApiEnvelope<T>, status: number, corsHeaders: Headers): Response {
  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(payload), { status, headers });
}

function withCorsHeaders(response: Response, corsHeaders: Headers): Response {
  const headers = new Headers(response.headers);
  corsHeaders.forEach((value, key) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function encryptSecret(plaintext: string, base64Key: string): Promise<string> {
  const key = await importAesKey(base64Key, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plaintext));

  const payload = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ciphertext), iv.byteLength);
  return bytesToBase64(payload);
}

async function decryptSecret(ciphertext: string, base64Key: string, reauthMessage: string): Promise<string> {
  const key = await importAesKey(base64Key, ['decrypt']);
  const bytes = base64ToBytes(ciphertext);
  const iv = bytes.slice(0, 12);
  const payload = bytes.slice(12);

  if (iv.byteLength !== 12 || payload.byteLength === 0) {
    throw new Error(reauthMessage);
  }

  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, payload);
    return textDecoder.decode(plaintext);
  } catch {
    throw new Error(reauthMessage);
  }
}

async function importAesKey(base64Key: string, usages: Array<'encrypt' | 'decrypt'>): Promise<CryptoKey> {
  const keyBytes = base64ToBytes(base64Key);
  if (keyBytes.byteLength !== 32) {
    throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }

  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, usages);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')
    .replace(/\s+/g, '');

  const bytes = base64ToBytes(normalized);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function base64UrlEncode(value: string | ArrayBuffer): string {
  const bytes = typeof value === 'string' ? textEncoder.encode(value) : new Uint8Array(value);
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();