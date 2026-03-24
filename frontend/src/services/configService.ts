import axios from 'axios';

export interface BotConfig {
  spreadsheetId: string;
  githubRepo: string;
  githubToken: string;
}

const CONFIG_FILENAME = 'linkedin-bot-config.json';

export class ConfigService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  private async findConfigFileId(): Promise<string | null> {
    const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
      params: {
        q: `name='${CONFIG_FILENAME}'`,
        spaces: 'appDataFolder',
        fields: 'files(id)',
      },
      headers: this.headers,
    });
    const files = response.data.files as Array<{ id: string }>;
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
    const content = JSON.stringify(config);
    const fileId = await this.findConfigFileId();

    const form = new FormData();
    form.append('file', new Blob([content], { type: 'application/json' }));

    if (fileId) {
      // Update existing file (no parent needed for update)
      form.append(
        'metadata',
        new Blob([JSON.stringify({ name: CONFIG_FILENAME })], { type: 'application/json' })
      );
      await axios.patch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
        form,
        { headers: this.headers }
      );
    } else {
      // Create new file in the hidden appDataFolder (only this app + your account can access it)
      form.append(
        'metadata',
        new Blob(
          [JSON.stringify({ name: CONFIG_FILENAME })],
          { type: 'application/json' }
        )
      );
      await axios.post(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&spaces=appDataFolder',
        form,
        { headers: this.headers }
      );
    }
  }
}
