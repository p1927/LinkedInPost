import type { BotConfig, BotConfigUpdate, GoogleModelOption } from './configService';
import { normalizeBotConfig } from './configService';
import type { ChannelId } from '../integrations/channels';
import type { SheetRow } from './sheets';

export interface AppSession {
  email: string;
  isAdmin: boolean;
  config: BotConfig;
}

export interface PublishContentRequest {
  row: SheetRow;
  channel: ChannelId;
  recipientId?: string;
  message: string;
  imageUrl?: string;
}

export interface PublishContentResult {
  success: true;
  channel: ChannelId;
  recipientId: string | null;
  messageId: string | null;
  deliveryMode: 'queued' | 'sent';
  mediaMode: 'image' | 'text';
}

export interface OAuthStartResult {
  authorizationUrl: string;
  callbackOrigin: string;
}

export interface WhatsAppPhoneOption {
  businessAccountId: string;
  businessAccountName: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string;
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

export function isAuthErrorMessage(message: string): boolean {
  return AUTH_ERROR_PATTERN.test(message);
}

export class BackendApi {
  private endpointUrl: string;

  constructor(endpointUrl: string = import.meta.env.VITE_WORKER_URL || '') {
    this.endpointUrl = endpointUrl.trim().replace(/\/$/, '');
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
    } catch {
      throw new Error(formatBackendConnectionError(this.endpointUrl));
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

  async getGoogleModels(idToken: string): Promise<GoogleModelOption[]> {
    return this.post<GoogleModelOption[]>('getGoogleModels', idToken);
  }

  async addTopic(idToken: string, topic: string): Promise<void> {
    await this.post<{ success: true }>('addTopic', idToken, { topic });
  }

  async updateRowStatus(
    idToken: string,
    row: SheetRow,
    status: string,
    selectedText = '',
    selectedImageId = '',
    postTime = '',
  ): Promise<void> {
    await this.post<{ success: true }>('updateRowStatus', idToken, {
      row,
      status,
      selectedText,
      selectedImageId,
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

  async completeWhatsAppConnection(idToken: string, connectionId: string, phoneNumberId: string): Promise<BotConfig> {
    const saved = await this.post<BotConfig>('completeWhatsAppConnection', idToken, {
      connectionId,
      phoneNumberId,
    });
    return normalizeBotConfig(saved);
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
}