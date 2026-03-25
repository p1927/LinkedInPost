import { normalizeDeliveryImageUrl } from '../media';

export interface TelegramSendRequest {
  botToken: string;
  chatId: string;
  text: string;
  imageUrl?: string;
}

export interface TelegramChatVerificationRequest {
  botToken: string;
  chatId: string;
}

export interface TelegramChatVerificationResult {
  chatId: string;
  title: string;
  username: string;
  type: string;
}

interface TelegramApiResponse {
  ok?: boolean;
  description?: string;
  result?: {
    message_id?: number;
  };
}

interface TelegramGetChatResult {
  id?: number | string;
  title?: string;
  username?: string;
  type?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramGetChatResponse {
  ok?: boolean;
  description?: string;
  result?: TelegramGetChatResult;
}

function formatTelegramApiError(description: string | undefined, chatId: string, fallbackStatus: number, action: string): string {
  const message = String(description || '').trim();
  if (/chat not found/i.test(message)) {
    if (chatId.startsWith('@')) {
      return 'Telegram could not find that chat. Use @channelusername only for public channels or supergroups. Personal usernames and bot usernames are not valid delivery targets. For a person or private chat, start the bot first and use the numeric chat ID.';
    }

    return 'Telegram could not find that chat. Make sure the bot has been started by the user or added to the target group/channel, then use that numeric chat ID.';
  }

  return message || `Telegram ${action} failed with status ${fallbackStatus}.`;
}

export async function sendTelegramMessage(request: TelegramSendRequest): Promise<{ messageId: string | null }> {
  const normalizedImageUrl = request.imageUrl ? normalizeDeliveryImageUrl(request.imageUrl) : undefined;
  const endpoint = normalizedImageUrl ? 'sendPhoto' : 'sendMessage';

  const response = await fetch(`https://api.telegram.org/bot${request.botToken}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      normalizedImageUrl
        ? {
            chat_id: request.chatId,
            photo: normalizedImageUrl,
            caption: request.text,
          }
        : {
            chat_id: request.chatId,
            text: request.text,
            disable_web_page_preview: false,
          },
    ),
  });

  const payload = (await response.json().catch(() => null)) as TelegramApiResponse | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(formatTelegramApiError(payload?.description, request.chatId, response.status, 'delivery'));
  }

  return {
    messageId: payload.result?.message_id ? String(payload.result.message_id) : null,
  };
}

export async function verifyTelegramChat(request: TelegramChatVerificationRequest): Promise<TelegramChatVerificationResult> {
  const params = new URLSearchParams({ chat_id: request.chatId });
  const response = await fetch(`https://api.telegram.org/bot${request.botToken}/getChat?${params.toString()}`);

  const payload = (await response.json().catch(() => null)) as TelegramGetChatResponse | null;
  if (!response.ok || !payload?.ok || !payload.result) {
    throw new Error(formatTelegramApiError(payload?.description, request.chatId, response.status, 'chat verification'));
  }

  const chat = payload.result;
  const title = String(chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`.trim() || '').trim();
  const username = String(chat.username || '').trim();
  const chatId = String(chat.id ?? request.chatId).trim() || request.chatId;

  return {
    chatId,
    title,
    username,
    type: String(chat.type || '').trim(),
  };
}