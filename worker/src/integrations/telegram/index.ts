import { normalizeDeliveryImageUrl } from '../media';

export interface TelegramSendRequest {
  botToken: string;
  chatId: string;
  text: string;
  imageUrl?: string;
}

interface TelegramApiResponse {
  ok?: boolean;
  description?: string;
  result?: {
    message_id?: number;
  };
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
    throw new Error(payload?.description || `Telegram delivery failed with status ${response.status}.`);
  }

  return {
    messageId: payload.result?.message_id ? String(payload.result.message_id) : null,
  };
}