import type { ChannelId } from '../integrations/channels';
import { FEATURE_CONTENT_REVIEW, FEATURE_MULTI_PROVIDER_LLM, FEATURE_NEWS_RESEARCH } from '../generated/features';
import { normalizeTelegramRecipients, type TelegramRecipient } from '../integrations/telegram';
import { normalizeWhatsAppRecipients, type WhatsAppRecipient } from '../integrations/whatsapp';
import { STATIC_MODELS_BY_PROVIDER } from '@repo/llm-core';
export type { LlmProviderId, LlmRef, LlmModelOption as GoogleModelOption } from '@repo/llm-core';
import type { LlmModelOption, LlmRef } from '@repo/llm-core';

export const DEFAULT_GOOGLE_MODEL = 'gemini-2.5-flash';

export type ImageGenProvider = 'pixazo' | 'gemini' | 'seedance';

export const IMAGE_GEN_PROVIDERS: Array<{ value: ImageGenProvider; label: string }> = [
  { value: 'pixazo', label: 'Pixazo SDXL' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'seedance', label: 'Seedance (ByteDance)' },
];

export const IMAGE_GEN_MODELS: Record<ImageGenProvider, Array<{ value: string; label: string }>> = {
  pixazo: [],  // Pixazo has no model selection
  gemini: [
    { value: 'gemini-2.0-flash-preview-image-generation', label: 'Gemini 2.0 Flash (Image)' },
    { value: 'imagen-3.0-generate-001', label: 'Imagen 3' },
  ],
  seedance: [
    { value: 'seedance-1-lite', label: 'Seedance 1 Lite' },
    { value: 'seedance-1', label: 'Seedance 1' },
  ],
};

export type LlmSettingKey =
  | 'review_generation'
  | 'generation_worker'
  | 'content_review_text'
  | 'content_review_vision'
  | 'github_automation'
  | 'enrichment_persona'
  | 'enrichment_emotion'
  | 'enrichment_psychology'
  | 'enrichment_persuasion'
  | 'enrichment_copywriting'
  | 'enrichment_storytelling'
  | 'enrichment_image_strategy'
  | 'enrichment_vocabulary'
  | 'enrichment_trending';

export const LLM_SETTING_KEY_LABELS: Record<LlmSettingKey, string> = {
  review_generation: 'Review Generation',
  generation_worker: 'Generation Worker',
  content_review_text: 'Content Review (Text)',
  content_review_vision: 'Content Review (Vision)',
  github_automation: 'GitHub Automation',
  enrichment_persona: 'Enrichment: Persona',
  enrichment_emotion: 'Enrichment: Emotion',
  enrichment_psychology: 'Enrichment: Psychology',
  enrichment_persuasion: 'Enrichment: Persuasion',
  enrichment_copywriting: 'Enrichment: Copywriting',
  enrichment_storytelling: 'Enrichment: Storytelling',
  enrichment_image_strategy: 'Enrichment: Image Strategy',
  enrichment_vocabulary: 'Enrichment: Vocabulary',
  enrichment_trending: 'Enrichment: Trending',
};

export const AVAILABLE_GOOGLE_MODELS: LlmModelOption[] = STATIC_MODELS_BY_PROVIDER.gemini ?? [];

export function formatGoogleModelLabel(modelName: string): string {
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

function isGoogleModelOption(model: unknown): model is LlmModelOption {
  return Boolean(
    model
      && typeof model === 'object'
      && typeof (model as LlmModelOption).value === 'string'
      && typeof (model as LlmModelOption).label === 'string'
      && (model as LlmModelOption).value.trim()
      && (model as LlmModelOption).label.trim()
  );
}

export function normalizeGoogleModelOptions(models: LlmModelOption[], selectedModel?: string): LlmModelOption[] {
  const normalized = models
    .filter(isGoogleModelOption)
    .map((model) => ({
      value: model.value.trim(),
      label: model.label.trim(),
      provider: 'gemini' as const,
    }));

  const merged = normalized.length > 0 ? normalized : AVAILABLE_GOOGLE_MODELS;
  const deduped = Array.from(new Map(merged.map((model) => [model.value, model])).values());

  if (selectedModel && !deduped.some((model) => model.value === selectedModel)) {
    deduped.unshift({
      value: selectedModel,
      label: formatGoogleModelLabel(selectedModel),
      provider: 'gemini' as const,
    });
  }

  return deduped;
}

export async function loadAvailableGoogleModels(selectedModel?: string): Promise<LlmModelOption[]> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}google-models.json`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch model manifest: ${response.status}`);
    }

    const payload = await response.json() as { models?: LlmModelOption[] };
    return normalizeGoogleModelOptions(payload.models ?? [], selectedModel);
  } catch {
    return normalizeGoogleModelOptions([], selectedModel);
  }
}



export interface NewsResearchFeedEntry {
  id: string;
  url: string;
  label?: string;
  enabled: boolean;
}

export interface NewsResearchApis {
  newsapi: boolean;
  gnews: boolean;
  newsdata: boolean;
  serpapiNews: boolean;
}

export interface NewsResearchStored {
  enabled: boolean;
  apis: NewsResearchApis;
  rssFeeds: NewsResearchFeedEntry[];
}

export interface NewsProviderKeys {
  newsapi: boolean;
  gnews: boolean;
  newsdata: boolean;
  serpapi: boolean;
}

export const DEFAULT_NEWS_RESEARCH_CONFIG: NewsResearchStored = {
  enabled: false,
  apis: {
    newsapi: false,
    gnews: false,
    newsdata: false,
    serpapiNews: false,
  },
  rssFeeds: [],
};

export type ContentReviewNewsMode = 'existing' | 'fresh';

export interface ContentReviewStored {
  textRef: LlmRef;
  visionRef: LlmRef;
  newsMode: ContentReviewNewsMode;
}

export const DEFAULT_CONTENT_REVIEW_STORED: ContentReviewStored = {
  textRef: { provider: 'gemini', model: DEFAULT_GOOGLE_MODEL },
  visionRef: { provider: 'gemini', model: DEFAULT_GOOGLE_MODEL },
  newsMode: 'existing',
};

function normalizeLlmRef(raw: unknown, fallbackModel: string): LlmRef {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    const provider = (r.provider === 'gemini' || r.provider === 'grok') ? r.provider : 'gemini';
    const model = String(r.model ?? '').trim() || fallbackModel;
    return { provider, model };
  }
  return { provider: 'gemini', model: fallbackModel };
}

export function normalizeContentReviewStored(raw: unknown): ContentReviewStored {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CONTENT_REVIEW_STORED };
  }
  const o = raw as Record<string, unknown>;
  // Handle reads of both new format (textRef/visionRef) and legacy format (textModelId/visionModelId)
  const text = String(o.textModelId ?? '').trim() || DEFAULT_GOOGLE_MODEL;
  const vision = String(o.visionModelId ?? '').trim() || DEFAULT_GOOGLE_MODEL;
  const textRef = normalizeLlmRef(o.textRef, text);
  const visionRef = normalizeLlmRef(o.visionRef, vision);
  return {
    textRef,
    visionRef,
    newsMode: o.newsMode === 'fresh' ? 'fresh' : 'existing',
  };
}

export interface BotConfig {
  spreadsheetId: string;
  githubRepo: string;
  googleModel: string;
  /** Gemini model IDs non-admins may use; admins edit this in Settings. */
  allowedGoogleModels: string[];
  generationRules: string;
  /** Optional brand / positioning context for generation worker composable assets. */
  brandContext: string;
  /** Workspace author context for LLM; always included when non-empty. */
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
  hasTelegramBotToken: boolean;
  telegramRecipients: TelegramRecipient[];
  whatsappAuthAvailable: boolean;
  whatsappPhoneNumberId: string;
  hasWhatsAppAccessToken: boolean;
  whatsappRecipients: WhatsAppRecipient[];
  gmailAuthAvailable: boolean;
  gmailEmailAddress: string;
  hasGmailAccessToken: boolean;
  gmailDefaultTo: string;
  gmailDefaultCc: string;
  gmailDefaultBcc: string;
  gmailDefaultSubject: string;
  /** Omitted when news research is disabled in features.yaml. */
  newsResearch?: NewsResearchStored;
  newsProviderKeys?: NewsProviderKeys;
  /** Omitted when multiProviderLlm is false in features.yaml. */
  llm?: {
    primary: LlmRef;
    fallback?: LlmRef;
    allowedGrokModels: string[];
    allowedOpenrouterModels: string[];
  };
  llmProviderKeys?: {
    gemini: boolean;
    grok: boolean;
    openrouter: boolean;
  };
  /** Per-feature chosen LlmRef, loaded from D1 on bootstrap. */
  llmSettings?: Record<LlmSettingKey, LlmRef>;
  /** Omitted when content review is disabled in features.yaml. */
  contentReview?: ContentReviewStored;
  imageGen?: {
    provider: ImageGenProvider;
    model?: string;
  };
}

function normalizeNewsResearchConfig(raw: unknown): NewsResearchStored {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_NEWS_RESEARCH_CONFIG, rssFeeds: [] };
  }
  const o = raw as Record<string, unknown>;
  const apisRaw = o.apis as Record<string, unknown> | undefined;
  const apis = {
    newsapi: Boolean(apisRaw?.newsapi),
    gnews: Boolean(apisRaw?.gnews),
    newsdata: Boolean(apisRaw?.newsdata),
    serpapiNews: Boolean(apisRaw?.serpapiNews),
  };
  const feedsIn = Array.isArray(o.rssFeeds) ? o.rssFeeds : [];
  const rssFeeds: NewsResearchFeedEntry[] = [];
  for (const entry of feedsIn) {
    if (rssFeeds.length >= 40) break;
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const id = String(e.id || '').trim();
    const url = String(e.url || '').trim();
    if (!id || !url) continue;
    rssFeeds.push({
      id,
      url,
      label: String(e.label || '').trim() || undefined,
      enabled: e.enabled !== false,
    });
  }
  return {
    enabled: o.enabled === true,
    apis,
    rssFeeds,
  };
}

export function normalizeBotConfig(config: Partial<BotConfig> | null | undefined): BotConfig {
  const defaultChannel = config?.defaultChannel === 'whatsapp'
    ? 'whatsapp'
    : config?.defaultChannel === 'telegram'
      ? 'telegram'
    : config?.defaultChannel === 'instagram'
      ? 'instagram'
    : config?.defaultChannel === 'gmail'
      ? 'gmail'
      : 'linkedin';

  const allowedGoogleModels = (() => {
    const raw = config?.allowedGoogleModels;
    if (!Array.isArray(raw) || raw.length === 0) {
      return [DEFAULT_GOOGLE_MODEL];
    }
    const ids = [...new Set(raw.map((x) => String(x || '').trim()).filter(Boolean))];
    return ids.length > 0 ? ids : [DEFAULT_GOOGLE_MODEL];
  })();

  const googleModelRaw = config?.googleModel || DEFAULT_GOOGLE_MODEL;
  const googleModel = allowedGoogleModels.includes(googleModelRaw) ? googleModelRaw : allowedGoogleModels[0] || DEFAULT_GOOGLE_MODEL;

  const base: BotConfig = {
    spreadsheetId: config?.spreadsheetId || '',
    githubRepo: config?.githubRepo || '',
    googleModel,
    allowedGoogleModels,
    generationRules: config?.generationRules || '',
    brandContext: typeof config?.brandContext === 'string' ? config.brandContext : '',
    authorProfile: config?.authorProfile || '',
    userRules: config?.userRules || '',
    userWhoAmI: config?.userWhoAmI || '',
    hasGitHubToken: Boolean(config?.hasGitHubToken),
    hasGenerationWorker: Boolean(config?.hasGenerationWorker),
    defaultChannel,
    instagramAuthAvailable: Boolean(config?.instagramAuthAvailable),
    instagramUserId: config?.instagramUserId || '',
    instagramUsername: config?.instagramUsername || '',
    hasInstagramAccessToken: Boolean(config?.hasInstagramAccessToken),
    linkedinAuthAvailable: Boolean(config?.linkedinAuthAvailable),
    linkedinPersonUrn: config?.linkedinPersonUrn || '',
    hasLinkedInAccessToken: Boolean(config?.hasLinkedInAccessToken),
    hasTelegramBotToken: Boolean(config?.hasTelegramBotToken),
    telegramRecipients: normalizeTelegramRecipients(config?.telegramRecipients),
    whatsappAuthAvailable: Boolean(config?.whatsappAuthAvailable),
    whatsappPhoneNumberId: config?.whatsappPhoneNumberId || '',
    hasWhatsAppAccessToken: Boolean(config?.hasWhatsAppAccessToken),
    whatsappRecipients: normalizeWhatsAppRecipients(config?.whatsappRecipients),
    gmailAuthAvailable: Boolean(config?.gmailAuthAvailable),
    gmailEmailAddress: config?.gmailEmailAddress || '',
    hasGmailAccessToken: Boolean(config?.hasGmailAccessToken),
    gmailDefaultTo: config?.gmailDefaultTo || '',
    gmailDefaultCc: config?.gmailDefaultCc || '',
    gmailDefaultBcc: config?.gmailDefaultBcc || '',
    gmailDefaultSubject: config?.gmailDefaultSubject || '',
  };
  let withNews = base;
  if (FEATURE_NEWS_RESEARCH) {
    withNews = {
      ...base,
      newsResearch: normalizeNewsResearchConfig(config?.newsResearch),
      newsProviderKeys: {
        newsapi: Boolean(config?.newsProviderKeys?.newsapi),
        gnews: Boolean(config?.newsProviderKeys?.gnews),
        newsdata: Boolean(config?.newsProviderKeys?.newsdata),
        serpapi: Boolean(config?.newsProviderKeys?.serpapi),
      },
    };
  }
  let withLlm = withNews;
  if (FEATURE_MULTI_PROVIDER_LLM && config?.llm) {
    withLlm = {
      ...withNews,
      llm: {
        primary: config.llm.primary,
        fallback: config.llm.fallback,
        allowedGrokModels: [...(config.llm.allowedGrokModels || [])],
        allowedOpenrouterModels: [...(config.llm.allowedOpenrouterModels || [])],
      },
      llmProviderKeys: {
        gemini: Boolean(config.llmProviderKeys?.gemini),
        grok: Boolean(config.llmProviderKeys?.grok),
      },
    };
  }
  const withLlmSettings = config?.llmSettings ? { ...withLlm, llmSettings: config.llmSettings } : withLlm;
  const withImageGen = config?.imageGen ? { ...withLlmSettings, imageGen: { provider: (config.imageGen.provider ?? 'pixazo') as ImageGenProvider, model: config.imageGen.model } } : withLlmSettings;
  if (!FEATURE_CONTENT_REVIEW) {
    return withImageGen;
  }
  return {
    ...withImageGen,
    contentReview: normalizeContentReviewStored(config?.contentReview),
  };
}

export interface BotConfigUpdate {
  spreadsheetId?: string;
  githubRepo?: string;
  googleModel?: string;
  allowedGoogleModels?: string[];
  generationRules?: string;
  brandContext?: string;
  authorProfile?: string;
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
  gmailEmailAddress?: string;
  gmailDefaultTo?: string;
  gmailDefaultCc?: string;
  gmailDefaultBcc?: string;
  gmailDefaultSubject?: string;
  gmailAccessToken?: string;
  gmailRefreshToken?: string;
  newsResearch?: NewsResearchStored;
  llm?: {
    primary?: LlmRef;
    fallback?: LlmRef | null;
    allowedGrokModels?: string[];
    allowedOpenrouterModels?: string[];
  };
  contentReview?: ContentReviewStored;
  imageGen?: {
    provider?: ImageGenProvider;
    model?: string;
  };
}
