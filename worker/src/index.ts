import { publishInstagramPost } from './integrations/instagram';
import { publishLinkedInPost } from './integrations/linkedin';
import { sendTelegramMessage, verifyTelegramChat as verifyTelegramChatRequest } from './integrations/telegram';
import { sendWhatsAppMessage } from './integrations/whatsapp';

type ManagedSheetName = 'Topics' | 'Draft' | 'Post';

type ChannelId = 'instagram' | 'linkedin' | 'telegram' | 'whatsapp';
type AuthProvider = 'instagram' | 'linkedin' | 'whatsapp';

interface Env {
  CONFIG_KV: KVNamespace;
  ALLOWED_EMAILS: string;
  ADMIN_EMAILS?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  GEMINI_API_KEY?: string;
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
  TELEGRAM_BOT_TOKEN?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
}

interface BotConfig {
  spreadsheetId: string;
  githubRepo: string;
  googleModel: string;
  hasGitHubToken: boolean;
  defaultChannel: ChannelId;
  instagramAuthAvailable: boolean;
  instagramUserId: string;
  instagramUsername: string;
  hasInstagramAccessToken: boolean;
  linkedinAuthAvailable: boolean;
  linkedinPersonUrn: string;
  hasLinkedInAccessToken: boolean;
  hasTelegramBotToken: boolean;
  telegramRecipients: TelegramRecipient[];
  whatsappAuthAvailable: boolean;
  whatsappPhoneNumberId: string;
  hasWhatsAppAccessToken: boolean;
  whatsappRecipients: WhatsAppRecipient[];
}

interface StoredConfig {
  spreadsheetId: string;
  githubRepo: string;
  googleModel: string;
  githubTokenCiphertext?: string;
  defaultChannel: ChannelId;
  instagramUserId: string;
  instagramUsername: string;
  instagramAccessTokenCiphertext?: string;
  instagramAccessToken?: string;
  linkedinPersonUrn: string;
  linkedinAccessTokenCiphertext?: string;
  linkedinAccessToken?: string;
  telegramBotTokenCiphertext?: string;
  telegramBotToken?: string;
  telegramRecipients: TelegramRecipient[];
  whatsappPhoneNumberId: string;
  whatsappAccessTokenCiphertext?: string;
  whatsappAccessToken?: string;
  whatsappRecipients: WhatsAppRecipient[];
}

interface BotConfigUpdate {
  spreadsheetId?: string;
  githubRepo?: string;
  googleModel?: string;
  githubToken?: string;
  defaultChannel?: ChannelId;
  instagramUserId?: string;
  instagramUsername?: string;
  instagramAccessToken?: string;
  linkedinPersonUrn?: string;
  linkedinAccessToken?: string;
  telegramBotToken?: string;
  telegramRecipients?: TelegramRecipient[];
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappRecipients?: WhatsAppRecipient[];
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

interface SheetRow {
  rowIndex: number;
  sourceSheet: ManagedSheetName;
  topicRowIndex?: number;
  draftRowIndex?: number;
  postRowIndex?: number;
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
  postTime: string;
}

interface VerifiedSession {
  email: string;
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
}

interface SpreadsheetMetadataResponse {
  sheets?: SpreadsheetSheetMetadata[];
}

interface SpreadsheetSheetMetadata {
  properties?: {
    sheetId?: number;
    title?: string;
  };
}

interface GoogleModelOption {
  value: string;
  label: string;
}

interface GeminiModelsResponse {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
}

const CONFIG_KEY = 'shared-config';
const GOOGLE_MODEL_DEFAULT = 'gemini-2.5-flash';
const GITHUB_TOKEN_REAUTH_MESSAGE = 'The stored GitHub token can no longer be decrypted. This usually means GITHUB_TOKEN_ENCRYPTION_KEY changed after the token was saved. Ask an admin to open Settings and save the GitHub token again.';
const INSTAGRAM_TOKEN_REAUTH_MESSAGE = 'The stored Instagram access token can no longer be decrypted. Ask an admin to open Settings and save the token again.';
const LINKEDIN_TOKEN_REAUTH_MESSAGE = 'The stored LinkedIn access token can no longer be decrypted. Ask an admin to open Settings and save the token again.';
const TELEGRAM_TOKEN_REAUTH_MESSAGE = 'The stored Telegram bot token can no longer be decrypted. Ask an admin to open Settings and save the token again.';
const WHATSAPP_TOKEN_REAUTH_MESSAGE = 'The stored WhatsApp access token can no longer be decrypted. Ask an admin to open Settings and save the token again.';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
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
const TOPICS_SHEET = 'Topics';
const DRAFT_SHEET = 'Draft';
const POST_SHEET = 'Post';
const TOPICS_HEADERS = ['Topic', 'Date'];
const PIPELINE_HEADERS = [
  'Topic',
  'Date',
  'Status',
  'Variant 1',
  'Variant 2',
  'Variant 3',
  'Variant 4',
  'Image Link 1',
  'Image Link 2',
  'Image Link 3',
  'Image Link 4',
  'Selected Text',
  'Selected Image ID',
  'Post Time',
];
const AVAILABLE_GOOGLE_MODELS: GoogleModelOption[] = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

export default {
  async fetch(request, env): Promise<Response> {
    const corsHeaders = buildCorsHeaders(request, env);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === 'GET') {
      if (url.pathname === '/') {
        return jsonResponse({ ok: true, data: { status: 'ok', backend: 'cloudflare-worker' } }, 200, corsHeaders);
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

      return jsonResponse({ ok: false, error: 'Not found.' }, 404, corsHeaders);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405, corsHeaders);
    }

    try {
      const { action, idToken, payload } = await parseRequest(request);
      if (!action) {
        throw new Error('Missing action.');
      }

      const session = await verifySession(idToken, env);
      const storedConfig = await loadStoredConfig(env);
      const sheets = new SheetsGateway(env);
      const data = await dispatchAction(action, payload ?? {}, session, storedConfig, env, sheets, request);
      return jsonResponse({ ok: true, data }, 200, corsHeaders);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected backend error.';
      return jsonResponse({ ok: false, error: message }, 400, corsHeaders);
    }
  },
} satisfies ExportedHandler<Env>;

async function dispatchAction(
  action: string,
  payload: Record<string, unknown>,
  session: VerifiedSession,
  storedConfig: StoredConfig,
  env: Env,
  sheets: SheetsGateway,
  request: Request,
): Promise<unknown> {
  switch (action) {
    case 'bootstrap':
      return {
        email: session.email,
        isAdmin: session.isAdmin,
        config: toPublicConfig(storedConfig, env),
      } satisfies AppSession;
    case 'getGoogleModels':
      return listGoogleModels(env);
    case 'getRows':
      ensureSpreadsheetConfigured(storedConfig);
      return sheets.getRows(storedConfig.spreadsheetId);
    case 'addTopic':
      ensureSpreadsheetConfigured(storedConfig);
      return sheets.addTopic(storedConfig.spreadsheetId, String(payload.topic || '').trim());
    case 'updateRowStatus':
      ensureSpreadsheetConfigured(storedConfig);
      return sheets.updateRowStatus(
        storedConfig.spreadsheetId,
        coerceSheetRow(payload.row),
        String(payload.status || ''),
        String(payload.selectedText || ''),
        String(payload.selectedImageId || ''),
        String(payload.postTime || ''),
      );
    case 'deleteRow':
      ensureSpreadsheetConfigured(storedConfig);
      return sheets.deleteRow(storedConfig.spreadsheetId, coerceSheetRow(payload.row));
    case 'saveConfig':
      ensureAdmin(session);
      return saveConfig(env, storedConfig, payload as BotConfigUpdate);
    case 'startLinkedInAuth':
      ensureAdmin(session);
      return startLinkedInAuth(request, env, session);
    case 'startInstagramAuth':
      ensureAdmin(session);
      return startInstagramAuth(request, env, session);
    case 'startWhatsAppAuth':
      ensureAdmin(session);
      return startWhatsAppAuth(request, env, session);
    case 'completeWhatsAppConnection':
      ensureAdmin(session);
      return completeWhatsAppConnection(env, session, payload);
    case 'verifyTelegramChat':
      ensureAdmin(session);
      return verifyTelegramChat(env, storedConfig, payload);
    case 'triggerGithubAction':
      return triggerGithubAction(env, storedConfig, payload);
    case 'publishContent':
      ensureSpreadsheetConfigured(storedConfig);
      return publishContent(env, storedConfig, payload, sheets);
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

function coerceSheetRow(value: unknown): SheetRow {
  if (!value || typeof value !== 'object') {
    throw new Error('Missing row payload.');
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

async function verifySession(idToken: string | undefined, env: Env): Promise<VerifiedSession> {
  if (!idToken) {
    throw new Error('Unauthorized: missing Google ID token.');
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

  const allowedEmails = parseEmailList(env.ALLOWED_EMAILS);
  if (allowedEmails.length === 0) {
    throw new Error('Access is disabled until ALLOWED_EMAILS is configured in the Worker environment.');
  }

  if (!allowedEmails.includes(email)) {
    throw new Error('Unauthorized: this Google account is not on the allowed users list.');
  }

  const adminEmails = parseEmailList(env.ADMIN_EMAILS);
  return {
    email,
    isAdmin: adminEmails.length === 0 || adminEmails.includes(email),
  };
}

async function loadStoredConfig(env: Env): Promise<StoredConfig> {
  const config = await env.CONFIG_KV.get<StoredConfig>(CONFIG_KEY, 'json');
  const defaultChannel = config?.defaultChannel === 'whatsapp'
    ? 'whatsapp'
    : config?.defaultChannel === 'telegram'
      ? 'telegram'
    : config?.defaultChannel === 'instagram'
      ? 'instagram'
      : 'linkedin';

  return {
    spreadsheetId: config?.spreadsheetId || '',
    githubRepo: config?.githubRepo || '',
    googleModel: config?.googleModel || GOOGLE_MODEL_DEFAULT,
    githubTokenCiphertext: config?.githubTokenCiphertext || undefined,
    defaultChannel,
    instagramUserId: config?.instagramUserId || String(env.INSTAGRAM_USER_ID || '').trim(),
    instagramUsername: config?.instagramUsername || String(env.INSTAGRAM_USERNAME || '').trim(),
    instagramAccessTokenCiphertext: config?.instagramAccessTokenCiphertext || undefined,
    instagramAccessToken: String(env.INSTAGRAM_ACCESS_TOKEN || '').trim() || undefined,
    linkedinPersonUrn: config?.linkedinPersonUrn || String(env.LINKEDIN_PERSON_URN || '').trim(),
    linkedinAccessTokenCiphertext: config?.linkedinAccessTokenCiphertext || undefined,
    linkedinAccessToken: String(env.LINKEDIN_ACCESS_TOKEN || '').trim() || undefined,
    telegramBotTokenCiphertext: config?.telegramBotTokenCiphertext || undefined,
    telegramBotToken: String(env.TELEGRAM_BOT_TOKEN || '').trim() || undefined,
    telegramRecipients: normalizeTelegramRecipients(config?.telegramRecipients),
    whatsappPhoneNumberId: config?.whatsappPhoneNumberId || String(env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
    whatsappAccessTokenCiphertext: config?.whatsappAccessTokenCiphertext || undefined,
    whatsappAccessToken: String(env.WHATSAPP_ACCESS_TOKEN || '').trim() || undefined,
    whatsappRecipients: normalizeWhatsAppRecipients(config?.whatsappRecipients),
  };
}

function toPublicConfig(config: StoredConfig, env: Env): BotConfig {
  return {
    spreadsheetId: config.spreadsheetId,
    githubRepo: config.githubRepo,
    googleModel: config.googleModel || GOOGLE_MODEL_DEFAULT,
    hasGitHubToken: Boolean(config.githubTokenCiphertext),
    defaultChannel: config.defaultChannel,
    instagramAuthAvailable: hasInstagramOAuthConfig(env),
    instagramUserId: config.instagramUserId,
    instagramUsername: config.instagramUsername,
    hasInstagramAccessToken: Boolean(config.instagramAccessTokenCiphertext || config.instagramAccessToken),
    linkedinAuthAvailable: hasLinkedInOAuthConfig(env),
    linkedinPersonUrn: config.linkedinPersonUrn,
    hasLinkedInAccessToken: Boolean(config.linkedinAccessTokenCiphertext || config.linkedinAccessToken),
    hasTelegramBotToken: Boolean(config.telegramBotTokenCiphertext || config.telegramBotToken),
    telegramRecipients: normalizeTelegramRecipients(config.telegramRecipients),
    whatsappAuthAvailable: hasMetaOAuthConfig(env),
    whatsappPhoneNumberId: config.whatsappPhoneNumberId,
    hasWhatsAppAccessToken: Boolean(config.whatsappAccessTokenCiphertext || config.whatsappAccessToken),
    whatsappRecipients: normalizeWhatsAppRecipients(config.whatsappRecipients),
  };
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

function buildWorkerOrigin(request: Request): string {
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
  const callbackOrigin = buildWorkerOrigin(request);
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
  const callbackOrigin = buildWorkerOrigin(request);
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
  const callbackOrigin = buildWorkerOrigin(request);
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
    whatsappPhoneNumberId: phoneNumberId,
    whatsappAccessTokenCiphertext: await encryptSecret(accessToken, requireSecretEncryptionKey(env)),
    whatsappAccessToken: undefined,
  };
  await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
  return toPublicConfig(nextConfig, env);
}

async function persistTelegramToken(env: Env, botToken: string): Promise<BotConfig> {
  const current = await loadStoredConfig(env);
  const nextConfig: StoredConfig = {
    ...current,
    telegramBotTokenCiphertext: await encryptSecret(botToken, requireSecretEncryptionKey(env)),
    telegramBotToken: undefined,
  };
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
    if (targetOrigin && window.opener && !window.opener.closed) {
      window.opener.postMessage(message, targetOrigin);
      window.setTimeout(() => window.close(), 120);
    }
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

async function saveConfig(env: Env, current: StoredConfig, update: BotConfigUpdate): Promise<BotConfig> {
  const nextConfig: StoredConfig = {
    spreadsheetId: typeof update.spreadsheetId === 'string' ? update.spreadsheetId.trim() : current.spreadsheetId,
    githubRepo: typeof update.githubRepo === 'string' ? update.githubRepo.trim() : current.githubRepo,
    googleModel: typeof update.googleModel === 'string' && update.googleModel.trim() ? update.googleModel.trim() : current.googleModel,
    githubTokenCiphertext: current.githubTokenCiphertext,
    defaultChannel: update.defaultChannel === 'whatsapp'
      ? 'whatsapp'
      : update.defaultChannel === 'telegram'
        ? 'telegram'
      : update.defaultChannel === 'instagram'
        ? 'instagram'
      : update.defaultChannel === 'linkedin'
        ? 'linkedin'
        : current.defaultChannel,
    instagramUserId: typeof update.instagramUserId === 'string' ? update.instagramUserId.trim() : current.instagramUserId,
    instagramUsername: typeof update.instagramUsername === 'string' ? update.instagramUsername.trim() : current.instagramUsername,
    instagramAccessTokenCiphertext: current.instagramAccessTokenCiphertext,
    linkedinPersonUrn: typeof update.linkedinPersonUrn === 'string' ? update.linkedinPersonUrn.trim() : current.linkedinPersonUrn,
    linkedinAccessTokenCiphertext: current.linkedinAccessTokenCiphertext,
    telegramBotTokenCiphertext: current.telegramBotTokenCiphertext,
    telegramRecipients: Array.isArray(update.telegramRecipients)
      ? normalizeTelegramRecipients(update.telegramRecipients)
      : current.telegramRecipients,
    whatsappPhoneNumberId: typeof update.whatsappPhoneNumberId === 'string' ? update.whatsappPhoneNumberId.trim() : current.whatsappPhoneNumberId,
    whatsappAccessTokenCiphertext: current.whatsappAccessTokenCiphertext,
    whatsappRecipients: Array.isArray(update.whatsappRecipients)
      ? normalizeWhatsAppRecipients(update.whatsappRecipients)
      : current.whatsappRecipients,
  };

  if (update.githubToken) {
    nextConfig.githubTokenCiphertext = await encryptSecret(update.githubToken.trim(), requireSecretEncryptionKey(env));
  }

  if (update.instagramAccessToken) {
    nextConfig.instagramAccessTokenCiphertext = await encryptSecret(update.instagramAccessToken.trim(), requireSecretEncryptionKey(env));
  }

  if (update.linkedinAccessToken) {
    nextConfig.linkedinAccessTokenCiphertext = await encryptSecret(update.linkedinAccessToken.trim(), requireSecretEncryptionKey(env));
  }

  if (update.telegramBotToken) {
    nextConfig.telegramBotTokenCiphertext = await encryptSecret(update.telegramBotToken.trim(), requireSecretEncryptionKey(env));
  }

  if (update.whatsappAccessToken) {
    nextConfig.whatsappAccessTokenCiphertext = await encryptSecret(update.whatsappAccessToken.trim(), requireSecretEncryptionKey(env));
  }

  await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
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
      client_payload: payload.payload ?? {},
    }),
  });

  if (response.status !== 204) {
    const message = await response.text();
    throw new Error(`GitHub dispatch failed: ${message || response.status}`);
  }

  return { success: true };
}

async function publishContent(
  env: Env,
  config: StoredConfig,
  payload: Record<string, unknown>,
  sheets: SheetsGateway,
): Promise<{ success: true; channel: ChannelId; recipientId: string | null; messageId: string | null; deliveryMode: 'queued' | 'sent'; mediaMode: 'image' | 'text' }> {
  const row = coerceSheetRow(payload.row);
  const channel = coerceChannelId(payload.channel);
  const rawRecipientId = String(payload.recipientId || payload.recipientPhoneNumber || '').trim();
  const recipientId = channel === 'telegram'
    ? normalizeTelegramChatId(rawRecipientId)
    : normalizePhoneNumber(rawRecipientId);
  const message = String(payload.message || row.selectedText || '').trim();
  const imageUrl = String(payload.imageUrl || row.selectedImageId || '').trim();

  if (!message) {
    throw new Error('Approved content text is empty. Approve or edit the draft before sending it.');
  }

  if (channel === 'instagram') {
    if (!imageUrl) {
      throw new Error('Instagram publishing requires a selected image.');
    }

    if (!config.instagramUserId || (!config.instagramAccessTokenCiphertext && !config.instagramAccessToken)) {
      throw new Error('Instagram publishing is not configured. Ask an admin to complete the Instagram settings.');
    }

    let instagramAccessToken: string;
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

    const publishResult = await publishInstagramPost({
      accessToken: instagramAccessToken,
      instagramUserId: config.instagramUserId,
      caption: message,
      imageUrl,
      altText: row.topic,
    });

    const publishedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    await sheets.markRowPublished(config.spreadsheetId, {
      ...row,
      status: 'Published',
      selectedText: message,
      selectedImageId: imageUrl,
      postTime: publishedAt,
    });

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
    if (!config.linkedinPersonUrn || (!config.linkedinAccessTokenCiphertext && !config.linkedinAccessToken)) {
      throw new Error('LinkedIn publishing is not configured. Ask an admin to complete the LinkedIn settings.');
    }

    let linkedinAccessToken: string;
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

    const publishResult = await publishLinkedInPost({
      accessToken: linkedinAccessToken,
      personUrn: config.linkedinPersonUrn,
      text: message,
      imageUrl: imageUrl || undefined,
    });

    const publishedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    await sheets.markRowPublished(config.spreadsheetId, {
      ...row,
      status: 'Published',
      selectedText: message,
      selectedImageId: imageUrl,
      postTime: publishedAt,
    });

    return {
      success: true,
      channel,
      recipientId: null,
      messageId: publishResult.postId,
      deliveryMode: 'sent',
      mediaMode: imageUrl ? 'image' : 'text',
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
      imageUrl: imageUrl || undefined,
    });

    const publishedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    await sheets.markRowPublished(config.spreadsheetId, {
      ...row,
      status: 'Published',
      selectedText: message,
      selectedImageId: imageUrl,
      postTime: publishedAt,
    });

    return {
      success: true,
      channel,
      recipientId,
      messageId: sendResult.messageId,
      deliveryMode: 'sent',
      mediaMode: imageUrl ? 'image' : 'text',
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
    imageUrl: imageUrl || undefined,
  });

  const publishedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  await sheets.markRowPublished(config.spreadsheetId, {
    ...row,
    status: 'Published',
    selectedText: message,
    selectedImageId: imageUrl,
    postTime: publishedAt,
  });

  return {
    success: true,
    channel,
    recipientId,
    messageId: sendResult.messageId,
    deliveryMode: 'sent',
    mediaMode: imageUrl ? 'image' : 'text',
  };
}

function coerceChannelId(value: unknown): ChannelId {
  if (value !== 'instagram' && value !== 'linkedin' && value !== 'telegram' && value !== 'whatsapp') {
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

async function listGoogleModels(env: Env): Promise<GoogleModelOption[]> {
  const apiKey = String(env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return AVAILABLE_GOOGLE_MODELS;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    );

    if (!response.ok) {
      throw new Error(`Gemini model discovery failed with status ${response.status}`);
    }

    const payload = (await response.json()) as GeminiModelsResponse;
    return normalizeGoogleModels(payload.models ?? []);
  } catch {
    return AVAILABLE_GOOGLE_MODELS;
  }
}

function normalizeGoogleModels(models: GeminiModelsResponse['models']): GoogleModelOption[] {
  const filtered = (models ?? [])
    .filter((model) => typeof model?.name === 'string')
    .filter((model) => model.name?.startsWith('models/gemini'))
    .filter((model) => Array.isArray(model.supportedGenerationMethods))
    .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
    .map((model) => {
      const value = String(model.name).replace(/^models\//, '');
      return {
        value,
        label: formatGoogleModelLabel(value),
      };
    });

  const deduped = Array.from(new Map(filtered.map((model) => [model.value, model])).values());
  return deduped.length > 0 ? deduped : AVAILABLE_GOOGLE_MODELS;
}

function formatGoogleModelLabel(modelName: string): string {
  return modelName
    .split('-')
    .map((part) => {
      if (!part) {
        return part;
      }

      if (/^\d/.test(part)) {
        return part;
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ')
    .replace(/\bLive\b/g, 'Live')
    .replace(/\bTts\b/g, 'TTS');
}

class SheetsGateway {
  private env: Env;
  private accessTokenPromise: Promise<string> | null = null;

  constructor(env: Env) {
    this.env = env;
  }

  async getRows(spreadsheetId: string): Promise<SheetRow[]> {
    await this.ensureRequiredSheets(spreadsheetId);

    const [topicRows, draftRows, postRows] = await Promise.all([
      this.getValues(spreadsheetId, `${TOPICS_SHEET}!A2:B`),
      this.getValues(spreadsheetId, `${DRAFT_SHEET}!A2:N`),
      this.getValues(spreadsheetId, `${POST_SHEET}!A2:N`),
    ]);

    const topics = topicRows
      .map((row, index) => {
        const [topic = '', date = ''] = padRow(row, 2);
        return { rowIndex: index + 2, topic, date };
      })
      .filter((row) => row.topic.trim());

    const drafts = draftRows
      .map((row, index) => this.mapDraftOrPostRow(row, index, 'Draft'))
      .filter((row) => row.topic.trim());

    const posts = postRows
      .map((row, index) => this.mapDraftOrPostRow(row, index, 'Post'))
      .filter((row) => row.topic.trim());

    return this.mergeRows(topics, drafts, posts);
  }

  async addTopic(spreadsheetId: string, topic: string): Promise<{ success: true }> {
    if (!topic) {
      throw new Error('Topic is required.');
    }

    await this.ensureRequiredSheets(spreadsheetId);
    await this.appendValues(spreadsheetId, `${TOPICS_SHEET}!A:B`, [[topic, new Date().toISOString().slice(0, 10)]]);
    return { success: true };
  }

  async updateRowStatus(
    spreadsheetId: string,
    row: SheetRow,
    status: string,
    selectedText: string,
    selectedImageId: string,
    postTime: string,
  ): Promise<{ success: true }> {
    await this.ensureRequiredSheets(spreadsheetId);

    const draftRowIndex = row.draftRowIndex ?? row.rowIndex;
    if (!draftRowIndex) {
      throw new Error('Draft row not found for this topic.');
    }

    await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!C${draftRowIndex}`, [[status || 'Pending']]);
    if (status === 'Approved') {
      await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!L${draftRowIndex}:N${draftRowIndex}`, [[selectedText, selectedImageId, postTime]]);
    }

    return { success: true };
  }

  async markRowPublished(spreadsheetId: string, row: SheetRow): Promise<{ success: true }> {
    await this.ensureRequiredSheets(spreadsheetId);

    const draftRowIndex = row.draftRowIndex ?? row.rowIndex;
    if (draftRowIndex) {
      await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!C${draftRowIndex}`, [[row.status || 'Published']]);
      await this.updateValues(
        spreadsheetId,
        `${DRAFT_SHEET}!L${draftRowIndex}:N${draftRowIndex}`,
        [[row.selectedText, row.selectedImageId, row.postTime]],
      );
    }

    const postValues = [[
      row.topic,
      row.date,
      row.status || 'Published',
      row.variant1,
      row.variant2,
      row.variant3,
      row.variant4,
      row.imageLink1,
      row.imageLink2,
      row.imageLink3,
      row.imageLink4,
      row.selectedText,
      row.selectedImageId,
      row.postTime,
    ]];

    if (row.postRowIndex) {
      await this.updateValues(spreadsheetId, `${POST_SHEET}!A${row.postRowIndex}:N${row.postRowIndex}`, postValues);
    } else {
      await this.appendValues(spreadsheetId, `${POST_SHEET}!A:N`, postValues);
    }

    return { success: true };
  }

  async deleteRow(spreadsheetId: string, row: SheetRow): Promise<{ success: true }> {
    await this.ensureRequiredSheets(spreadsheetId);

    const metadata = await this.getSpreadsheetMetadata(spreadsheetId);
    const deletions: Array<{ sheetTitle: ManagedSheetName; rowIndex?: number }> = [
      { sheetTitle: POST_SHEET, rowIndex: row.postRowIndex },
      { sheetTitle: DRAFT_SHEET, rowIndex: row.draftRowIndex },
      { sheetTitle: TOPICS_SHEET, rowIndex: row.topicRowIndex },
    ];

    for (const deletion of deletions) {
      if (!deletion.rowIndex) {
        continue;
      }

      const sheetId = metadata.find((sheet) => sheet.properties?.title === deletion.sheetTitle)?.properties?.sheetId;
      if (sheetId === undefined) {
        continue;
      }

      await this.batchUpdate(spreadsheetId, {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: deletion.rowIndex - 1,
                endIndex: deletion.rowIndex,
              },
            },
          },
        ],
      });
    }

    return { success: true };
  }

  private mapDraftOrPostRow(row: string[], index: number, sourceSheet: 'Draft' | 'Post'): SheetRow {
    const paddedRow = padRow(row, 14);
    return {
      rowIndex: index + 2,
      sourceSheet,
      topic: paddedRow[0],
      date: paddedRow[1],
      status: paddedRow[2] || 'Pending',
      variant1: paddedRow[3],
      variant2: paddedRow[4],
      variant3: paddedRow[5],
      variant4: paddedRow[6],
      imageLink1: paddedRow[7],
      imageLink2: paddedRow[8],
      imageLink3: paddedRow[9],
      imageLink4: paddedRow[10],
      selectedText: paddedRow[11],
      selectedImageId: paddedRow[12],
      postTime: paddedRow[13],
      draftRowIndex: sourceSheet === 'Draft' ? index + 2 : undefined,
      postRowIndex: sourceSheet === 'Post' ? index + 2 : undefined,
    };
  }

  private mergeRows(
    topics: Array<{ rowIndex: number; topic: string; date: string }>,
    drafts: SheetRow[],
    posts: SheetRow[],
  ): SheetRow[] {
    const merged = new Map<string, SheetRow>();

    for (const topicRow of topics) {
      merged.set(buildTopicKey(topicRow.topic, topicRow.date), {
        rowIndex: topicRow.rowIndex,
        sourceSheet: 'Topics',
        topicRowIndex: topicRow.rowIndex,
        topic: topicRow.topic,
        date: topicRow.date,
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
        postTime: '',
      });
    }

    for (const draftRow of drafts) {
      const key = buildTopicKey(draftRow.topic, draftRow.date);
      const existing = merged.get(key);
      merged.set(key, {
        ...(existing ?? ({} as SheetRow)),
        ...draftRow,
        sourceSheet: 'Draft',
        rowIndex: draftRow.draftRowIndex ?? draftRow.rowIndex,
        topicRowIndex: existing?.topicRowIndex,
        draftRowIndex: draftRow.draftRowIndex ?? draftRow.rowIndex,
      });
    }

    for (const postRow of posts) {
      const key = buildTopicKey(postRow.topic, postRow.date);
      const existing = merged.get(key);
      merged.set(key, {
        ...(existing ?? ({} as SheetRow)),
        ...postRow,
        sourceSheet: 'Post',
        rowIndex: postRow.postRowIndex ?? postRow.rowIndex,
        topicRowIndex: existing?.topicRowIndex,
        draftRowIndex: existing?.draftRowIndex,
        postRowIndex: postRow.postRowIndex ?? postRow.rowIndex,
      });
    }

    return Array.from(merged.values());
  }

  private async ensureRequiredSheets(spreadsheetId: string): Promise<void> {
    await this.ensureSheetExists(spreadsheetId, TOPICS_SHEET, TOPICS_HEADERS);
    await this.ensureSheetExists(spreadsheetId, DRAFT_SHEET, PIPELINE_HEADERS);
    await this.ensureSheetExists(spreadsheetId, POST_SHEET, PIPELINE_HEADERS);
  }

  private async ensureSheetExists(spreadsheetId: string, sheetTitle: ManagedSheetName, headers: string[]): Promise<void> {
    const metadata = await this.getSpreadsheetMetadata(spreadsheetId);
    const existingTitles = new Set(metadata.map((sheet) => sheet.properties?.title).filter(Boolean));

    if (!existingTitles.has(sheetTitle)) {
      await this.batchUpdate(spreadsheetId, {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetTitle,
              },
            },
          },
        ],
      });
    }

    const currentHeaders = await this.getValues(spreadsheetId, `${sheetTitle}!A1`);
    if (!currentHeaders.length) {
      await this.updateValues(spreadsheetId, `${sheetTitle}!A1`, [headers]);
    }
  }

  private async getSpreadsheetMetadata(spreadsheetId: string): Promise<SpreadsheetSheetMetadata[]> {
    const response = await this.fetchGoogleJson<SpreadsheetMetadataResponse>(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`,
    );

    return response.sheets || [];
  }

  private async getValues(spreadsheetId: string, range: string): Promise<string[][]> {
    const response = await this.fetchGoogleJson<{ values?: string[][] }>(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    );

    return response.values || [];
  }

  private async updateValues(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
    await this.fetchGoogleJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values }),
      },
    );
  }

  private async appendValues(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
    await this.fetchGoogleJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        body: JSON.stringify({ values }),
      },
    );
  }

  private async batchUpdate(spreadsheetId: string, body: Record<string, unknown>): Promise<void> {
    await this.fetchGoogleJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async fetchGoogleJson<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
    const accessToken = await this.getAccessToken();
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Google Sheets request failed: ${message || response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json<T>();
  }

  private async getAccessToken(): Promise<string> {
    if (!this.accessTokenPromise) {
      this.accessTokenPromise = mintGoogleAccessToken(this.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    }

    return this.accessTokenPromise;
  }
}

async function mintGoogleAccessToken(serviceAccountJson: string): Promise<string> {
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
      scope: SHEETS_SCOPE,
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

function buildTopicKey(topic: string, date: string): string {
  return `${topic.trim()}::${date.trim()}`;
}

function padRow(row: string[], width: number): string[] {
  const padded = [...row];
  while (padded.length < width) {
    padded.push('');
  }
  return padded;
}

function buildCorsHeaders(request: Request, env: Env): Headers {
  const origin = request.headers.get('Origin');
  const allowedOrigins = parseEmailList(env.CORS_ALLOWED_ORIGINS).map((value) => value.toLowerCase());
  const allowAnyOrigin = allowedOrigins.length === 0 || allowedOrigins.includes('*');
  const allowOrigin = allowAnyOrigin
    ? '*'
    : origin && allowedOrigins.includes(origin.toLowerCase())
      ? origin
      : '';

  const headers = new Headers({
    'Access-Control-Allow-Headers': 'Content-Type',
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