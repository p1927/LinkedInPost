import type { BotConfig, BotConfigUpdate, GoogleModelOption, LlmProviderId, LlmSettingKey } from './configService';
import { normalizeBotConfig } from './configService';
import type { ChannelId } from '../integrations/channels';
import type { DraftPreviewSelection, SheetRow } from './sheets';
import type { ContentReviewReport } from '../features/content-review/types';

export interface SocialIntegration {
  provider: string;
  internalId: string;
  displayName: string;
  profilePicture: string;
  needsReauth: boolean;
  connectedAt: string;
}

export interface AppSession {
  email: string;
  isAdmin: boolean;
  config: BotConfig;
  onboardingCompleted: boolean;
  integrations: SocialIntegration[];
}

export interface PublishContentRequest {
  row: SheetRow;
  channel: ChannelId;
  recipientId?: string;
  message: string;
  imageUrl?: string;
  /** When set, takes precedence over single `imageUrl` / row columns for publishing. */
  imageUrls?: string[];
}

export interface PublishContentResult {
  success: true;
  channel: ChannelId;
  recipientId: string | null;
  messageId: string | null;
  deliveryMode: 'queued' | 'sent';
  mediaMode: 'image' | 'text';
  /** Present when `deliveryMode === 'queued'` (future `postTime` armed on the worker). */
  scheduledTime?: string;
}

export interface CancelScheduledPublishRequest {
  topicId: string;
  scheduledTime: string;
  channel?: ChannelId;
}

export interface CancelScheduledPublishResult {
  success: true;
  cancelled: boolean;
}

/** Payload item for campaign bulk import (worker coerces to sheet rows). */
export interface BulkImportCampaignPostPayload {
  topicId: string;
  topic: string;
  date: string;
  status?: string;
  variant1?: string;
  variant2?: string;
  variant3?: string;
  variant4?: string;
  body?: string;
  variants?: string[];
  postTime?: string;
  topicGenerationRules?: string;
  generationTemplateId?: string;
  selectedText?: string;
  selectedImageId?: string;
  selectedImageUrlsJson?: string;
}

export interface BulkImportCampaignResult {
  success: true;
  imported: number;
}

export interface OAuthStartResult {
  authorizationUrl: string;
  callbackOrigin: string;
}

export type OAuthProvider = 'instagram' | 'linkedin' | 'whatsapp' | 'gmail';

export interface WhatsAppPhoneOption {
  businessAccountId: string;
  businessAccountName: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string;
}

export interface TelegramChatVerificationResult {
  chatId: string;
  title: string;
  username: string;
  type: string;
}

export interface DraftImageListResult {
  imageUrls: string[];
}

export interface DraftImageUploadResult {
  imageUrl: string;
}

export interface DraftImagePromoteResult {
  imageUrl: string;
}

export type GenerationScope = 'selection' | 'whole-post';

export interface TextSelectionRange {
  start: number;
  end: number;
  text: string;
}

export interface ResearchArticleRef {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  snippet: string;
}

export interface NewsResearchSearchPayload {
  topicId: string;
  topic: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  customQuery?: string;
}

export type NewsApiProviderId = 'rss' | 'newsapi' | 'gnews' | 'newsdata' | 'serpapi_news';

export interface ResearchArticleHit {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
  provider: NewsApiProviderId;
}

export interface NewsResearchSearchResult {
  articles: ResearchArticleHit[];
  dedupedCount: number;
  providersUsed: NewsApiProviderId[];
  warnings: string[];
}

export interface NewsResearchHistoryItem {
  id: string;
  topicId: string;
  fetchedAt: string;
  windowStart: string;
  windowEnd: string;
  customQuery: string;
  providersSummary: string;
  articleCount: number;
  dedupeRemoved: string;
}

export interface NewsResearchSnapshotDetail {
  id: string;
  topicId: string;
  fetchedAt: string;
  windowStart: string;
  windowEnd: string;
  customQuery: string;
  providersSummary: string;
  dedupeRemoved: string;
  articles: unknown[];
}

export interface GenerationRequest {
  row: SheetRow;
  editorText: string;
  scope: GenerationScope;
  selection: TextSelectionRange | null;
  instruction?: string;
  googleModel?: string;
  llm?: { provider: LlmProviderId; model: string };
  researchArticles?: ResearchArticleRef[];
}

export interface RunContentReviewRequest {
  row: SheetRow;
  editorText: string;
  selectedImageUrls: string[];
  /** Effective delivery channel for prompt context (e.g. linkedin). */
  deliveryChannel?: string;
}

export type { ContentReviewReport };

export interface GenWorkerGenerateRequest {
  topicId: string;
  topic: string;
  channel?: string;
  audience?: string;
  tone?: string;
  jtbd?: string;
  factual?: boolean;
  mustInclude?: string[];
  mustAvoid?: string[];
  cta?: string;
  constraints?: string;
  newsWindowStart?: string;
  newsWindowEnd?: string;
  /** Matches generation worker catalog; forwarded by the API worker. */
  llm?: { provider: LlmProviderId; model: string };
  newsResearchConfig?: unknown;
  composableAssets?: {
    brandContext?: string;
    globalRules?: string;
    fewShotExamples?: string;
    reviewChecklist?: string[];
    authorProfile?: string;
  };
  skipImages?: boolean;
  selectedImageId?: string;
  selectedImageUrlsJson?: string;
}

export interface TextVariant {
  index: number;
  label: string;
  text: string;
}

export interface ImageCandidate {
  id: string;
  url?: string;
  searchQuery?: string;
  generationPrompt?: string;
  visualBrief: string;
  score: number;
  variantIndex?: number;
}

export interface PerVariantImageCandidates {
  variantIndex: number;
  candidates: ImageCandidate[];
}

export interface GenWorkerGenerateResponse {
  runId: string;
  primaryPatternId: string;
  runnerUpPatternId: string;
  patternRationale: string;
  variants: TextVariant[];
  imageCandidates: ImageCandidate[];
  perVariantImageCandidates: PerVariantImageCandidates[];
  review: { passed: boolean; verdict: string; summary: string };
}

export interface QuickChangePreviewResult {
  scope: GenerationScope;
  model: string;
  llmProvider?: LlmProviderId;
  selection: TextSelectionRange | null;
  replacementText: string;
  fullText: string;
}

export interface VariantPreviewResult {
  id: string;
  label: string;
  replacementText: string;
  fullText: string;
}

export interface VariantsPreviewResponse {
  scope: GenerationScope;
  model: string;
  llmProvider?: LlmProviderId;
  selection: TextSelectionRange | null;
  variants: VariantPreviewResult[];
}

export interface PostTemplate {
  id: string;
  name: string;
  rules: string;
}

/**
 * ContentPattern extends PostTemplate with channel and usage metadata.
 * The worker may return these fields if stored; otherwise they are optional.
 */
export interface ContentPattern extends PostTemplate {
  /** Optional delivery channel this pattern is optimised for (e.g. 'linkedin'). */
  deliveryChannel?: string;
  /** Tags for categorisation (e.g. ['thought-leadership', 'short-form']). */
  tags?: string[];
  /** Human-readable guidance on when to use this pattern. */
  whenToUse?: string;
}

export interface GenerationRulesVersion {
  savedAt: string;
  savedBy: string;
  text: string;
}

export interface UsageSummaryRow {
  date: string;
  provider: string;
  model: string;
  user_id: string;
  calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
}

export interface GenerationRulesHistoryResult {
  versions: GenerationRulesVersion[];
  current: string;
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

const AUTH_ERROR_PATTERN = /unauthorized|invalid token|expired|sign in again|not allowed/i;

function formatBackendConnectionError(endpointUrl: string): string {
  let host = endpointUrl || 'the configured backend URL';
  if (endpointUrl) {
    try {
      host = new URL(endpointUrl).host;
    } catch {
      host = endpointUrl;
    }
  }
  return `Failed to reach the backend at ${host}. The URL may point to a static site instead of the Cloudflare Worker, or the Worker CORS allowlist may not include this site.`;
}

/** Explains fetch() rejection (network, mixed content, extensions) — CORS is only one possibility. */
function formatFetchNetworkFailure(endpointUrl: string, reason: unknown): string {
  const base = formatBackendConnectionError(endpointUrl);
  const bits: string[] = [base];
  if (reason instanceof Error && reason.message) {
    bits.push(`Browser reported: ${reason.message}`);
  }
  try {
    const pageHttps =
      typeof globalThis !== 'undefined' &&
      'location' in globalThis &&
      globalThis.location?.protocol === 'https:';
    const u = new URL(endpointUrl);
    const local = /^(localhost|127\.0\.0\.1)$/i.test(u.hostname);
    if (pageHttps && u.protocol === 'http:' && !local) {
      bits.push(
        'This page is HTTPS but the worker URL uses http:// — mixed content is blocked. Set VITE_WORKER_URL to https://… and rebuild.',
      );
    }
    if (
      typeof globalThis !== 'undefined' &&
      'location' in globalThis &&
      globalThis.location?.hostname &&
      globalThis.location?.origin
    ) {
      const loc = globalThis.location;
      const pageIsLocalDev = /^(localhost|127\.0\.0\.1)$/i.test(loc.hostname);
      const workerIsRemote = !/^(localhost|127\.0\.0\.1)$/i.test(u.hostname);
      if (pageIsLocalDev && workerIsRemote) {
        bits.push(
          `If this is CORS, add ${loc.origin} to the Worker environment variable CORS_ALLOWED_ORIGINS (exact scheme, host, and port), redeploy, and include http://127.0.0.1:5174 if you open the app via 127.0.0.1 instead of localhost.`,
        );
      }
    }
  } catch {
    /* ignore */
  }
  bits.push('If the worker URL is correct, check ad blockers, privacy extensions, and VPN/firewall rules for *.workers.dev.');
  return bits.join(' ');
}

export function isAuthErrorMessage(message: string): boolean {
  return AUTH_ERROR_PATTERN.test(message);
}

/**
 * API is always POST JSON at the worker origin; strip accidental paths (e.g. `/topics`) from env.
 * Relative values (e.g. `/topics`) are rejected — they would POST to the frontend host and 404.
 */
export function normalizeWorkerApiUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return '';
    }
    return u.origin;
  } catch {
    return '';
  }
}

export class BackendApi {
  private endpointUrl: string;

  constructor(endpointUrl: string = import.meta.env.VITE_WORKER_URL || '') {
    this.endpointUrl = normalizeWorkerApiUrl(endpointUrl);
  }

  isConfigured(): boolean {
    return Boolean(this.endpointUrl);
  }

  private async post<T>(action: string, idToken: string, payload: Record<string, unknown> = {}): Promise<T> {
    if (!this.endpointUrl) {
      throw new Error('Missing VITE_WORKER_URL. Add your deployed Cloudflare Worker URL to the frontend environment.');
    }

    let response: Response;
    try {
      response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          idToken,
          payload,
        }),
      });
    } catch (reason) {
      throw new Error(formatFetchNetworkFailure(this.endpointUrl, reason));
    }

    let parsed: ApiEnvelope<T>;
    try {
      parsed = (await response.json()) as ApiEnvelope<T>;
    } catch {
      throw new Error(
        'The backend returned HTML or another non-JSON response. The configured URL is likely serving a static site instead of the Cloudflare Worker API.',
      );
    }

    if (!response.ok || !parsed.ok || parsed.data === undefined) {
      throw new Error(parsed.error || `Request failed with status ${response.status}.`);
    }

    return parsed.data;
  }

  private async postForBlob(action: string, idToken: string, payload: Record<string, unknown> = {}): Promise<Blob> {
    if (!this.endpointUrl) {
      throw new Error('Missing VITE_WORKER_URL. Add your deployed Cloudflare Worker URL to the frontend environment.');
    }

    let response: Response;
    try {
      response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          idToken,
          payload,
        }),
      });
    } catch (reason) {
      throw new Error(formatFetchNetworkFailure(this.endpointUrl, reason));
    }

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const parsed = (await response.json()) as ApiEnvelope<never>;
        throw new Error(parsed.error || `Request failed with status ${response.status}.`);
      }

      throw new Error((await response.text()) || `Request failed with status ${response.status}.`);
    }

    return response.blob();
  }

  async bootstrap(idToken: string): Promise<AppSession> {
    const session = await this.post<AppSession>('bootstrap', idToken);
    return {
      ...session,
      config: normalizeBotConfig(session.config),
    };
  }

  async getRows(idToken: string): Promise<SheetRow[]> {
    return this.post<SheetRow[]>('getRows', idToken);
  }

  async generateQuickChange(idToken: string, request: GenerationRequest): Promise<QuickChangePreviewResult> {
    return this.post<QuickChangePreviewResult>('generateQuickChange', idToken, { ...request });
  }

  async generateVariantsPreview(idToken: string, request: GenerationRequest): Promise<VariantsPreviewResponse> {
    return this.post<VariantsPreviewResponse>('generateVariantsPreview', idToken, { ...request });
  }

  async runContentReview(idToken: string, body: RunContentReviewRequest): Promise<ContentReviewReport> {
    return this.post<ContentReviewReport>('runContentReview', idToken, {
      row: body.row,
      editorText: body.editorText,
      selectedImageUrls: body.selectedImageUrls,
      deliveryChannel: body.deliveryChannel,
    });
  }

  async searchNewsResearch(idToken: string, payload: NewsResearchSearchPayload): Promise<NewsResearchSearchResult> {
    return this.post<NewsResearchSearchResult>('searchNewsResearch', idToken, { ...payload });
  }

  async listNewsResearchHistory(idToken: string, topicId: string, limit = 20): Promise<NewsResearchHistoryItem[]> {
    return this.post<NewsResearchHistoryItem[]>('listNewsResearchHistory', idToken, { topicId, limit });
  }

  async getNewsResearchSnapshot(idToken: string, id: string): Promise<NewsResearchSnapshotDetail> {
    return this.post<NewsResearchSnapshotDetail>('getNewsResearchSnapshot', idToken, { id });
  }

  async saveDraftVariants(
    idToken: string,
    row: SheetRow,
    variants: string[],
    previewSelection?: DraftPreviewSelection,
  ): Promise<SheetRow> {
    return this.post<SheetRow>('saveDraftVariants', idToken, {
      row,
      variants,
      ...(previewSelection ? { previewSelection } : {}),
    });
  }

  async saveTopicGenerationRules(idToken: string, row: SheetRow, topicRules: string): Promise<SheetRow> {
    return this.post<SheetRow>('saveTopicGenerationRules', idToken, {
      row,
      topicRules,
    });
  }

  async listPostTemplates(idToken: string): Promise<PostTemplate[]> {
    return this.post<PostTemplate[]>('listPostTemplates', idToken);
  }

  async createPostTemplate(idToken: string, name: string, rules: string): Promise<PostTemplate> {
    return this.post<PostTemplate>('createPostTemplate', idToken, { name, rules });
  }

  async updatePostTemplate(idToken: string, templateId: string, name: string, rules: string): Promise<PostTemplate> {
    return this.post<PostTemplate>('updatePostTemplate', idToken, { templateId, name, rules });
  }

  async deletePostTemplate(idToken: string, templateId: string): Promise<void> {
    await this.post<{ success: true }>('deletePostTemplate', idToken, { templateId });
  }

  async saveGenerationTemplateId(idToken: string, row: SheetRow, generationTemplateId: string): Promise<SheetRow> {
    return this.post<SheetRow>('saveGenerationTemplateId', idToken, {
      row,
      generationTemplateId,
    });
  }

  /** List content patterns (enriched PostTemplates with channel/tag/whenToUse metadata). */
  async listPatterns(idToken: string): Promise<ContentPattern[]> {
    return this.post<ContentPattern[]>('listPatterns', idToken);
  }

  /**
   * Assign a pattern to a row (persists generationTemplateId).
   * Falls back to saveGenerationTemplateId action when listPatterns is not yet wired on the worker.
   */
  async assignPattern(idToken: string, row: SheetRow, patternId: string): Promise<SheetRow> {
    return this.post<SheetRow>('assignPattern', idToken, { row, patternId });
  }

  async saveTopicDeliveryPreferences(
    idToken: string,
    row: SheetRow,
    prefs: { topicDeliveryChannel?: string; topicGenerationModel?: string },
  ): Promise<SheetRow> {
    return this.post<SheetRow>('saveTopicDeliveryPreferences', idToken, {
      row,
      ...prefs,
    });
  }

  async getGenerationRulesHistory(idToken: string): Promise<GenerationRulesHistoryResult> {
    return this.post<GenerationRulesHistoryResult>('getGenerationRulesHistory', idToken);
  }

  async getGoogleModels(idToken: string): Promise<GoogleModelOption[]> {
    return this.post<GoogleModelOption[]>('getGoogleModels', idToken);
  }

  async listLlmModels(idToken: string, provider: LlmProviderId): Promise<GoogleModelOption[]> {
    return this.post<GoogleModelOption[]>('listLlmModels', idToken, { provider });
  }

  /**
   * Fetches the full LLM provider catalog from the worker, including available providers,
   * their models, and static fallbacks. Throws on RPC failure; callers should handle with
   * try/catch and fall back to static defaults if needed.
   */
  async getLlmProviderCatalog(idToken: string): Promise<{
    providers: Array<{ id: LlmProviderId; name: string; models: GoogleModelOption[] }>;
    staticFallbacks: Record<LlmProviderId, GoogleModelOption[]>;
  }> {
    return this.post<{
      providers: Array<{ id: LlmProviderId; name: string; models: GoogleModelOption[] }>;
      staticFallbacks: Record<LlmProviderId, GoogleModelOption[]>;
    }>('getLlmProviderCatalog', idToken);
  }

  async addTopic(idToken: string, topic: string): Promise<void> {
    await this.post<{ success: true }>('addTopic', idToken, { topic });
  }

  /** One field per post; optional fields omitted when empty. Sent to `bulkImportCampaign`. */
  async bulkImportCampaign(
    idToken: string,
    posts: BulkImportCampaignPostPayload[],
  ): Promise<BulkImportCampaignResult> {
    return this.post<BulkImportCampaignResult>('bulkImportCampaign', idToken, { posts });
  }

  async updateRowStatus(
    idToken: string,
    row: SheetRow,
    status: string,
    selectedText = '',
    selectedImageId = '',
    postTime = '',
    emailTo = '',
    emailCc = '',
    emailBcc = '',
    emailSubject = '',
    selectedImageUrlsJson = '',
  ): Promise<void> {
    await this.post<{ success: true }>('updateRowStatus', idToken, {
      row,
      status,
      selectedText,
      selectedImageId,
      postTime,
      emailTo,
      emailCc,
      emailBcc,
      emailSubject,
      selectedImageUrlsJson,
    });
  }

  async saveEmailFields(
    idToken: string,
    row: SheetRow,
    emailTo: string,
    emailCc: string,
    emailBcc: string,
    emailSubject: string,
  ): Promise<void> {
    await this.post<{ success: true }>('saveEmailFields', idToken, {
      row,
      emailTo,
      emailCc,
      emailBcc,
      emailSubject,
    });
  }

  async createDraftFromPublished(
    idToken: string,
    row: SheetRow,
    selectedText: string,
    selectedImageId: string,
    postTime: string,
    emailTo: string,
    emailCc: string,
    emailBcc: string,
    emailSubject: string,
    selectedImageUrlsJson = '',
  ): Promise<{ success: true; topicId: string }> {
    return this.post<{ success: true; topicId: string }>('createDraftFromPublished', idToken, {
      row,
      selectedText,
      selectedImageId,
      postTime,
      emailTo,
      emailCc,
      emailBcc,
      emailSubject,
      selectedImageUrlsJson,
    });
  }

  async updatePostSchedule(
    idToken: string,
    row: SheetRow,
    postTime: string,
  ): Promise<void> {
    await this.post<{ success: true }>('updatePostSchedule', idToken, {
      row,
      postTime,
    });
  }

  async deleteRow(idToken: string, row: SheetRow): Promise<void> {
    await this.post<{ success: true }>('deleteRow', idToken, { row });
  }

  async saveConfig(idToken: string, config: BotConfigUpdate): Promise<BotConfig> {
    const saved = await this.post<BotConfig>('saveConfig', idToken, { ...config });
    return normalizeBotConfig(saved);
  }

  async startInstagramAuth(idToken: string): Promise<OAuthStartResult> {
    return this.post<OAuthStartResult>('startInstagramAuth', idToken);
  }

  async startLinkedInAuth(idToken: string): Promise<OAuthStartResult> {
    return this.post<OAuthStartResult>('startLinkedInAuth', idToken);
  }

  async startWhatsAppAuth(idToken: string): Promise<OAuthStartResult> {
    return this.post<OAuthStartResult>('startWhatsAppAuth', idToken);
  }

  async startGmailAuth(idToken: string): Promise<OAuthStartResult> {
    return this.post<OAuthStartResult>('startGmailAuth', idToken);
  }

  async disconnectChannelAuth(idToken: string, provider: OAuthProvider): Promise<BotConfig> {
    const saved = await this.post<BotConfig>('disconnectChannelAuth', idToken, { provider });
    return normalizeBotConfig(saved);
  }

  async completeWhatsAppConnection(idToken: string, connectionId: string, phoneNumberId: string): Promise<BotConfig> {
    const saved = await this.post<BotConfig>('completeWhatsAppConnection', idToken, {
      connectionId,
      phoneNumberId,
    });
    return normalizeBotConfig(saved);
  }

  async verifyTelegramChat(idToken: string, chatId: string, botToken?: string): Promise<TelegramChatVerificationResult> {
    return this.post<TelegramChatVerificationResult>('verifyTelegramChat', idToken, {
      chatId,
      botToken,
    });
  }

  async fetchDraftImages(
    idToken: string,
    topic: string,
    count = 8,
    searchQuery?: string,
  ): Promise<DraftImageListResult> {
    return this.post<DraftImageListResult>('fetchDraftImages', idToken, {
      topic,
      count,
      ...(searchQuery?.trim() ? { searchQuery: searchQuery.trim() } : {}),
    });
  }

  async promoteDraftImageUrl(idToken: string, sourceUrl: string, topicId: string): Promise<DraftImagePromoteResult> {
    return this.post<DraftImagePromoteResult>('promoteDraftImageUrl', idToken, {
      sourceUrl: sourceUrl.trim(),
      topicId,
    });
  }

  async uploadDraftImage(idToken: string, file: File, topicId: string): Promise<DraftImageUploadResult> {
    const dataUrl = await readFileAsDataUrl(file);
    return this.post<DraftImageUploadResult>('uploadDraftImage', idToken, {
      fileName: file.name,
      contentType: file.type,
      dataUrl,
      topicId,
    });
  }

  async downloadDraftImage(idToken: string, imageUrl: string, fileName: string): Promise<Blob> {
    return this.postForBlob('downloadDraftImage', idToken, {
      url: imageUrl,
      fileName,
    });
  }

  async triggerGithubAction(
    idToken: string,
    action: 'draft' | 'publish' | 'refine',
    eventType: 'trigger-draft' | 'trigger-publish',
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.post<{ success: true }>('triggerGithubAction', idToken, {
      action,
      eventType,
      payload,
    });
  }

  async publishContent(idToken: string, request: PublishContentRequest): Promise<PublishContentResult> {
    return this.post<PublishContentResult>('publishContent', idToken, { ...request });
  }

  async cancelScheduledPublish(
    idToken: string,
    request: CancelScheduledPublishRequest,
  ): Promise<CancelScheduledPublishResult> {
    return this.post<CancelScheduledPublishResult>('cancelScheduledPublish', idToken, { ...request });
  }

  async callGenerationWorker(
    idToken: string,
    spreadsheetId: string,
    request: GenWorkerGenerateRequest,
  ): Promise<GenWorkerGenerateResponse> {
    return this.post<GenWorkerGenerateResponse>('callGenerationWorker', idToken, {
      spreadsheetId,
      ...request,
    });
  }

  async getLlmSettings(idToken: string): Promise<Record<string, { provider: string; model: string }>> {
    return this.post<Record<string, { provider: string; model: string }>>('getLlmSettings', idToken);
  }

  async saveLlmSetting(idToken: string, key: LlmSettingKey, ref: { provider: string; model: string }): Promise<void> {
    await this.post<{ ok: boolean }>('saveLlmSetting', idToken, { key, ref });
  }

  async getIntegrations(idToken: string): Promise<SocialIntegration[]> {
    const data = await this.post<SocialIntegration[]>('getIntegrations', idToken, {});
    return data ?? [];
  }

  async deleteIntegration(idToken: string, provider: string): Promise<void> {
    await this.post<{ ok: true }>('deleteIntegration', idToken, { provider });
  }

  async completeOnboarding(idToken: string, spreadsheetId?: string): Promise<void> {
    await this.post<{ ok: true }>('completeOnboarding', idToken, { spreadsheetId: spreadsheetId ?? '' });
  }

  async getUsageSummary(idToken: string, days = 30): Promise<UsageSummaryRow[]> {
    return this.post<UsageSummaryRow[]>('getUsageSummaryByRange', idToken, { days });
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Failed to read ${file.name || 'the selected file'}.`));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error(`Failed to read ${file.name || 'the selected file'}.`));
        return;
      }

      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}