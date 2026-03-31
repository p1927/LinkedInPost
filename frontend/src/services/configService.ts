import type { ChannelId } from '../integrations/channels';
import { FEATURE_CONTENT_REVIEW, FEATURE_MULTI_PROVIDER_LLM, FEATURE_NEWS_RESEARCH } from '../generated/features';
import { normalizeTelegramRecipients, type TelegramRecipient } from '../integrations/telegram';
import { normalizeWhatsAppRecipients, type WhatsAppRecipient } from '../integrations/whatsapp';

export interface GoogleModelOption {
  value: string;
  label: string;
}

export type LlmProviderId = 'gemini' | 'grok';

export interface LlmRef {
  provider: LlmProviderId;
  model: string;
}

export const DEFAULT_GOOGLE_MODEL = 'gemini-2.5-flash';

export const AVAILABLE_GOOGLE_MODELS: GoogleModelOption[] = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

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

function isGoogleModelOption(model: unknown): model is GoogleModelOption {
  return Boolean(
    model
      && typeof model === 'object'
      && typeof (model as GoogleModelOption).value === 'string'
      && typeof (model as GoogleModelOption).label === 'string'
      && (model as GoogleModelOption).value.trim()
      && (model as GoogleModelOption).label.trim()
  );
}

export function normalizeGoogleModelOptions(models: GoogleModelOption[], selectedModel?: string): GoogleModelOption[] {
  const normalized = models
    .filter(isGoogleModelOption)
    .map((model) => ({
      value: model.value.trim(),
      label: model.label.trim(),
    }));

  const merged = normalized.length > 0 ? normalized : AVAILABLE_GOOGLE_MODELS;
  const deduped = Array.from(new Map(merged.map((model) => [model.value, model])).values());

  if (selectedModel && !deduped.some((model) => model.value === selectedModel)) {
    deduped.unshift({
      value: selectedModel,
      label: formatGoogleModelLabel(selectedModel),
    });
  }

  return deduped;
}

export async function loadAvailableGoogleModels(selectedModel?: string): Promise<GoogleModelOption[]> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}google-models.json`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch model manifest: ${response.status}`);
    }

    const payload = await response.json() as { models?: GoogleModelOption[] };
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
  textModelId: string;
  visionModelId: string;
  newsMode: ContentReviewNewsMode;
}

export const DEFAULT_CONTENT_REVIEW_STORED: ContentReviewStored = {
  textModelId: DEFAULT_GOOGLE_MODEL,
  visionModelId: DEFAULT_GOOGLE_MODEL,
  newsMode: 'existing',
};

export function normalizeContentReviewStored(raw: unknown): ContentReviewStored {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CONTENT_REVIEW_STORED };
  }
  const o = raw as Record<string, unknown>;
  const text = String(o.textModelId ?? '').trim() || DEFAULT_GOOGLE_MODEL;
  const vision = String(o.visionModelId ?? '').trim() || DEFAULT_GOOGLE_MODEL;
  return {
    textModelId: text,
    visionModelId: vision,
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
  /** Workspace author context for LLM; always included when non-empty. */
  authorProfile: string;
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
  };
  llmProviderKeys?: {
    gemini: boolean;
    grok: boolean;
  };
  /** Omitted when content review is disabled in features.yaml. */
  contentReview?: ContentReviewStored;
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
    authorProfile: config?.authorProfile || '',
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
      },
      llmProviderKeys: {
        gemini: Boolean(config.llmProviderKeys?.gemini),
        grok: Boolean(config.llmProviderKeys?.grok),
      },
    };
  }
  if (!FEATURE_CONTENT_REVIEW) {
    return withLlm;
  }
  return {
    ...withLlm,
    contentReview: normalizeContentReviewStored(config?.contentReview),
  };
}

export interface BotConfigUpdate {
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
  };
  contentReview?: ContentReviewStored;
}
