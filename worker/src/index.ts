import { publishLinkedInPost } from './integrations/linkedin';
import { sendWhatsAppMessage } from './integrations/whatsapp';

type ManagedSheetName = 'Topics' | 'Draft' | 'Post';

type ChannelId = 'linkedin' | 'whatsapp';

interface Env {
  CONFIG_KV: KVNamespace;
  ALLOWED_EMAILS: string;
  ADMIN_EMAILS?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  GEMINI_API_KEY?: string;
  GITHUB_TOKEN_ENCRYPTION_KEY?: string;
  CORS_ALLOWED_ORIGINS?: string;
}

interface BotConfig {
  spreadsheetId: string;
  githubRepo: string;
  googleModel: string;
  hasGitHubToken: boolean;
  defaultChannel: ChannelId;
  linkedinPersonUrn: string;
  hasLinkedInAccessToken: boolean;
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
  linkedinPersonUrn: string;
  linkedinAccessTokenCiphertext?: string;
  whatsappPhoneNumberId: string;
  whatsappAccessTokenCiphertext?: string;
  whatsappRecipients: WhatsAppRecipient[];
}

interface BotConfigUpdate {
  spreadsheetId?: string;
  githubRepo?: string;
  googleModel?: string;
  githubToken?: string;
  defaultChannel?: ChannelId;
  linkedinPersonUrn?: string;
  linkedinAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappRecipients?: WhatsAppRecipient[];
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
const GOOGLE_MODEL_DEFAULT = 'gemini-1.5-flash';
const GITHUB_TOKEN_REAUTH_MESSAGE = 'The stored GitHub token can no longer be decrypted. This usually means GITHUB_TOKEN_ENCRYPTION_KEY changed after the token was saved. Ask an admin to open Settings and save the GitHub token again.';
const LINKEDIN_TOKEN_REAUTH_MESSAGE = 'The stored LinkedIn access token can no longer be decrypted. Ask an admin to open Settings and save the token again.';
const WHATSAPP_TOKEN_REAUTH_MESSAGE = 'The stored WhatsApp access token can no longer be decrypted. Ask an admin to open Settings and save the token again.';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
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
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

export default {
  async fetch(request, env): Promise<Response> {
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === 'GET') {
      return jsonResponse({ ok: true, data: { status: 'ok', backend: 'cloudflare-worker' } }, 200, corsHeaders);
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
      const data = await dispatchAction(action, payload ?? {}, session, storedConfig, env, sheets);
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
): Promise<unknown> {
  switch (action) {
    case 'bootstrap':
      return {
        email: session.email,
        isAdmin: session.isAdmin,
        config: toPublicConfig(storedConfig),
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
  return {
    spreadsheetId: config?.spreadsheetId || '',
    githubRepo: config?.githubRepo || '',
    googleModel: config?.googleModel || GOOGLE_MODEL_DEFAULT,
    githubTokenCiphertext: config?.githubTokenCiphertext || undefined,
    defaultChannel: config?.defaultChannel === 'whatsapp' ? 'whatsapp' : 'linkedin',
    linkedinPersonUrn: config?.linkedinPersonUrn || '',
    linkedinAccessTokenCiphertext: config?.linkedinAccessTokenCiphertext || undefined,
    whatsappPhoneNumberId: config?.whatsappPhoneNumberId || '',
    whatsappAccessTokenCiphertext: config?.whatsappAccessTokenCiphertext || undefined,
    whatsappRecipients: normalizeWhatsAppRecipients(config?.whatsappRecipients),
  };
}

function toPublicConfig(config: StoredConfig): BotConfig {
  return {
    spreadsheetId: config.spreadsheetId,
    githubRepo: config.githubRepo,
    googleModel: config.googleModel || GOOGLE_MODEL_DEFAULT,
    hasGitHubToken: Boolean(config.githubTokenCiphertext),
    defaultChannel: config.defaultChannel,
    linkedinPersonUrn: config.linkedinPersonUrn,
    hasLinkedInAccessToken: Boolean(config.linkedinAccessTokenCiphertext),
    whatsappPhoneNumberId: config.whatsappPhoneNumberId,
    hasWhatsAppAccessToken: Boolean(config.whatsappAccessTokenCiphertext),
    whatsappRecipients: normalizeWhatsAppRecipients(config.whatsappRecipients),
  };
}

async function saveConfig(env: Env, current: StoredConfig, update: BotConfigUpdate): Promise<BotConfig> {
  const nextConfig: StoredConfig = {
    spreadsheetId: typeof update.spreadsheetId === 'string' ? update.spreadsheetId.trim() : current.spreadsheetId,
    githubRepo: typeof update.githubRepo === 'string' ? update.githubRepo.trim() : current.githubRepo,
    googleModel: typeof update.googleModel === 'string' && update.googleModel.trim() ? update.googleModel.trim() : current.googleModel,
    githubTokenCiphertext: current.githubTokenCiphertext,
    defaultChannel: update.defaultChannel === 'whatsapp'
      ? 'whatsapp'
      : update.defaultChannel === 'linkedin'
        ? 'linkedin'
        : current.defaultChannel,
    linkedinPersonUrn: typeof update.linkedinPersonUrn === 'string' ? update.linkedinPersonUrn.trim() : current.linkedinPersonUrn,
    linkedinAccessTokenCiphertext: current.linkedinAccessTokenCiphertext,
    whatsappPhoneNumberId: typeof update.whatsappPhoneNumberId === 'string' ? update.whatsappPhoneNumberId.trim() : current.whatsappPhoneNumberId,
    whatsappAccessTokenCiphertext: current.whatsappAccessTokenCiphertext,
    whatsappRecipients: Array.isArray(update.whatsappRecipients)
      ? normalizeWhatsAppRecipients(update.whatsappRecipients)
      : current.whatsappRecipients,
  };

  if (update.githubToken) {
    nextConfig.githubTokenCiphertext = await encryptSecret(update.githubToken.trim(), requireSecretEncryptionKey(env));
  }

  if (update.linkedinAccessToken) {
    nextConfig.linkedinAccessTokenCiphertext = await encryptSecret(update.linkedinAccessToken.trim(), requireSecretEncryptionKey(env));
  }

  if (update.whatsappAccessToken) {
    nextConfig.whatsappAccessTokenCiphertext = await encryptSecret(update.whatsappAccessToken.trim(), requireSecretEncryptionKey(env));
  }

  await env.CONFIG_KV.put(CONFIG_KEY, JSON.stringify(nextConfig));
  return toPublicConfig(nextConfig);
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
): Promise<{ success: true; channel: ChannelId; recipientPhoneNumber: string | null; messageId: string | null; deliveryMode: 'queued' | 'sent' }> {
  const row = coerceSheetRow(payload.row);
  const channel = coerceChannelId(payload.channel);
  const recipientPhoneNumber = normalizePhoneNumber(String(payload.recipientPhoneNumber || ''));
  const message = String(payload.message || row.selectedText || '').trim();
  const imageUrl = String(payload.imageUrl || row.selectedImageId || '').trim();

  if (!message) {
    throw new Error('Approved content text is empty. Approve or edit the draft before sending it.');
  }

  if (channel === 'linkedin') {
    if (!config.linkedinPersonUrn || !config.linkedinAccessTokenCiphertext) {
      throw new Error('LinkedIn publishing is not configured. Ask an admin to complete the LinkedIn settings.');
    }

    let linkedinAccessToken: string;
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

    const publishResult = await publishLinkedInPost({
      accessToken: linkedinAccessToken,
      personUrn: config.linkedinPersonUrn,
      text: message,
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
      recipientPhoneNumber: null,
      messageId: publishResult.postId,
      deliveryMode: 'sent',
    };
  }

  if (!recipientPhoneNumber) {
    throw new Error('A valid WhatsApp recipient phone number is required.');
  }

  if (!config.whatsappPhoneNumberId || !config.whatsappAccessTokenCiphertext) {
    throw new Error('WhatsApp delivery is not configured. Ask an admin to add the phone number ID and access token.');
  }

  let accessToken: string;
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

  const sendResult = await sendWhatsAppMessage({
    accessToken,
    phoneNumberId: config.whatsappPhoneNumberId,
    to: recipientPhoneNumber,
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
    recipientPhoneNumber,
    messageId: sendResult.messageId,
    deliveryMode: 'sent',
  };
}

function coerceChannelId(value: unknown): ChannelId {
  if (value !== 'whatsapp' && value !== 'linkedin') {
    throw new Error('Unsupported delivery channel.');
  }

  return value;
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