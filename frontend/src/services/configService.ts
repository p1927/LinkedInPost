import type { ChannelId } from '../integrations/channels';
import { normalizeTelegramRecipients, type TelegramRecipient } from '../integrations/telegram';
import { normalizeWhatsAppRecipients, type WhatsAppRecipient } from '../integrations/whatsapp';

export interface GoogleModelOption {
  value: string;
  label: string;
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

export interface BotConfig {
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

export function normalizeBotConfig(config: Partial<BotConfig> | null | undefined): BotConfig {
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
    googleModel: config?.googleModel || DEFAULT_GOOGLE_MODEL,
    hasGitHubToken: Boolean(config?.hasGitHubToken),
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
  };
}

export interface BotConfigUpdate {
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
