export interface GoogleModelOption {
  value: string;
  label: string;
}

export const DEFAULT_GOOGLE_MODEL = 'gemini-1.5-flash';

export const AVAILABLE_GOOGLE_MODELS: GoogleModelOption[] = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

export async function loadAvailableGoogleModels(): Promise<GoogleModelOption[]> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}google-models.json`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch model manifest: ${response.status}`);
    }

    const payload = await response.json() as { models?: GoogleModelOption[] };
    const models = payload.models?.filter(model => model?.value && model?.label) ?? [];
    return models.length > 0 ? models : AVAILABLE_GOOGLE_MODELS;
  } catch {
    return AVAILABLE_GOOGLE_MODELS;
  }
}

export interface BotConfig {
  spreadsheetId: string;
  githubRepo: string;
  googleModel: string;
  hasGitHubToken: boolean;
}

export function normalizeBotConfig(config: Partial<BotConfig> | null | undefined): BotConfig {
  return {
    spreadsheetId: config?.spreadsheetId || '',
    githubRepo: config?.githubRepo || '',
    googleModel: config?.googleModel || DEFAULT_GOOGLE_MODEL,
    hasGitHubToken: Boolean(config?.hasGitHubToken),
  };
}

export interface BotConfigUpdate {
  spreadsheetId: string;
  githubRepo: string;
  googleModel: string;
  githubToken?: string;
}
