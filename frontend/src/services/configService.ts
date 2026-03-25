import axios from 'axios';

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

export interface BotConfig {
  spreadsheetId: string;
  githubRepo: string;
  githubToken: string;
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

  // Only return config if all three are provided
  if (spreadsheetId && githubRepo && githubToken) {
    return { spreadsheetId, githubRepo, githubToken };
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
    const form = new FormData();
    form.append(
      'metadata',
      new Blob(
        [JSON.stringify({ name: CONFIG_FILENAME, parents: ['appDataFolder'] })],
        { type: 'application/json' }
      )
    );
    form.append('file', new Blob([content], { type: 'application/json' }));

    await axios.post(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      form,
      { headers: this.headers }
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
    return response.data as BotConfig;
  }

  async saveConfig(config: BotConfig): Promise<void> {
    await this.assertAppDataScope();

    const content = JSON.stringify(config);
    await this.createConfigFile(content);
  }
}
