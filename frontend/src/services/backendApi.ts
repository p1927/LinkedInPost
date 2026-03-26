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

export type OAuthProvider = 'instagram' | 'linkedin' | 'whatsapp';

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

export type GenerationScope = 'selection' | 'whole-post';

export interface TextSelectionRange {
  start: number;
  end: number;
  text: string;
}

export interface GenerationRequest {
  row: SheetRow;
  editorText: string;
  scope: GenerationScope;
  selection: TextSelectionRange | null;
  instruction?: string;
  googleModel?: string;
}

export interface QuickChangePreviewResult {
  scope: GenerationScope;
  model: string;
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
  selection: TextSelectionRange | null;
  variants: VariantPreviewResult[];
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

/** API is always POST JSON at the worker origin; strip accidental paths (e.g. `/topics`) from env. */
export function normalizeWorkerApiUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
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
    } catch {
      throw new Error(formatBackendConnectionError(this.endpointUrl));
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

  async saveDraftVariants(idToken: string, row: SheetRow, variants: string[]): Promise<SheetRow> {
    return this.post<SheetRow>('saveDraftVariants', idToken, {
      row,
      variants,
    });
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

  async fetchDraftImages(idToken: string, topic: string, count = 4): Promise<DraftImageListResult> {
    return this.post<DraftImageListResult>('fetchDraftImages', idToken, {
      topic,
      count,
    });
  }

  async uploadDraftImage(idToken: string, topic: string, file: File): Promise<DraftImageUploadResult> {
    const dataUrl = await readFileAsDataUrl(file);
    return this.post<DraftImageUploadResult>('uploadDraftImage', idToken, {
      topic,
      fileName: file.name,
      contentType: file.type,
      dataUrl,
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