import axios from 'axios';

export interface GoogleModelOption {
  value: string;
  label: string;
}

/** Returns true if the token includes the drive.appdata scope. */
export async function hasAppDataScope(token: string): Promise<boolean> {
  try {
    const res = await axios.get(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(token)}`
    );
    const scopes: string = res.data.scope ?? '';
    return scopes.includes('drive.appdata');
  } catch {
    return false;
  }
}

export async function getGrantedScopes(token: string): Promise<string[]> {
  const res = await axios.get(
    `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(token)}`
  );
  const scopes: string = res.data.scope ?? '';
  return scopes.split(/\s+/).filter(Boolean);
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
  githubToken: string;
  googleModel: string;
}

export function normalizeBotConfig(config: Partial<BotConfig> | null | undefined): BotConfig {
  return {
    spreadsheetId: config?.spreadsheetId || '',
    githubRepo: config?.githubRepo || '',
    githubToken: config?.githubToken || '',
    googleModel: config?.googleModel || DEFAULT_GOOGLE_MODEL,
  };
}

const CONFIG_FILENAME = 'linkedin-bot-config.json';

/**
 * Load config from environment variables.
 * This allows bypassing the Settings step by providing:
 * - VITE_GOOGLE_SHEET_ID
 * - VITE_GITHUB_REPO
 * - VITE_GITHUB_TOKEN
 * Useful for automated deployments or pre-configured environments.
 */
export function loadConfigFromEnv(): BotConfig | null {
  const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEET_ID || '';
  const githubRepo = import.meta.env.VITE_GITHUB_REPO || '';
  const githubToken = import.meta.env.VITE_GITHUB_TOKEN || '';
  const googleModel = import.meta.env.VITE_GOOGLE_MODEL || DEFAULT_GOOGLE_MODEL;

  // Only return config if all three are provided
  if (spreadsheetId && githubRepo && githubToken) {
    return normalizeBotConfig({ spreadsheetId, githubRepo, githubToken, googleModel });
  }

  return null;
}

export class ConfigService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  private async createConfigFile(content: string): Promise<void> {
    const createResponse = await axios.post(
      'https://www.googleapis.com/drive/v3/files',
      {
        name: CONFIG_FILENAME,
        mimeType: 'application/json',
        parents: ['appDataFolder'],
      },
      {
        params: { fields: 'id' },
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
      }
    );

    const createdFileId = createResponse.data.id as string;
    await axios.patch(
      `https://www.googleapis.com/upload/drive/v3/files/${createdFileId}?uploadType=media`,
      content,
      {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  private async assertAppDataScope(): Promise<void> {
    const scopes = await getGrantedScopes(this.token);
    if (!scopes.some(scope => scope.includes('drive.appdata'))) {
      throw new Error('Missing required Google Drive appData scope. Please sign in again and grant Drive app data access.');
    }
  }

  private async findConfigFileId(): Promise<string | null> {
    await this.assertAppDataScope();
    const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
      params: {
        q: `name='${CONFIG_FILENAME}' and 'appDataFolder' in parents and trashed=false`,
        spaces: 'appDataFolder',
        fields: 'files(id,modifiedTime)',
        orderBy: 'modifiedTime desc',
      },
      headers: this.headers,
    });
    const files = response.data.files as Array<{ id: string; modifiedTime?: string }>;
    return files.length > 0 ? files[0].id : null;
  }

  async loadConfig(): Promise<BotConfig | null> {
    const fileId = await this.findConfigFileId();
    if (!fileId) return null;

    const response = await axios.get(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: this.headers }
    );
    return normalizeBotConfig(response.data as Partial<BotConfig>);
  }

  async saveConfig(config: BotConfig): Promise<void> {
    await this.assertAppDataScope();

    const content = JSON.stringify(normalizeBotConfig(config));
    await this.createConfigFile(content);
  }
}
