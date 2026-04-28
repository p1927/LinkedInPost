import {
  fetchImageAsset,
  normalizeDeliveryImageUrl,
  rasterBytesQualifyForTelegramPhoto,
} from '../media';

export interface TelegramSendRequest {
  botToken: string;
  chatId: string;
  text: string;
  imageUrl?: string;
  /** 2–10 photos sent as an album via `sendMediaGroup` (caption on first only). */
  imageUrls?: string[];
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
  } | Array<{ message_id?: number }>;
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

function resolveTelegramPhotoUrls(request: TelegramSendRequest): string[] {
  const fromList = (request.imageUrls || [])
    .map((u) => normalizeDeliveryImageUrl(String(u || '').trim()))
    .filter((u): u is string => Boolean(u));
  if (fromList.length > 0) {
    return fromList.slice(0, 10);
  }
  const one = request.imageUrl ? normalizeDeliveryImageUrl(request.imageUrl) : undefined;
  return one ? [one] : [];
}

/** Telegram fetches URL-based photos from its own servers; many origins (e.g. GCS) block or fail for those requests. Upload bytes from the worker instead. */
function imageFilenameForTelegram(index: number, contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes('png')) {
    return `photo${index}.png`;
  }
  if (ct.includes('webp')) {
    return `photo${index}.webp`;
  }
  if (ct.includes('gif')) {
    return `photo${index}.gif`;
  }
  return `photo${index}.jpg`;
}

async function fetchTelegramImageParts(
  urls: string[],
): Promise<Array<{ bytes: ArrayBuffer; blob: Blob; filename: string }>> {
  const out: Array<{ bytes: ArrayBuffer; blob: Blob; filename: string }> = [];
  for (let i = 0; i < urls.length; i += 1) {
    const { bytes, contentType } = await fetchImageAsset(urls[i]!);
    const filename = imageFilenameForTelegram(i, contentType);
    out.push({ bytes, blob: new Blob([bytes], { type: contentType }), filename });
  }
  return out;
}

async function postTelegramForm(
  botToken: string,
  method: 'sendPhoto' | 'sendDocument' | 'sendMediaGroup',
  form: FormData,
  chatId: string,
): Promise<TelegramApiResponse | null> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    body: form,
  });
  const payload = (await response.json().catch(() => null)) as TelegramApiResponse | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(formatTelegramApiError(payload?.description, chatId, response.status, 'delivery'));
  }
  return payload;
}

const TELEGRAM_CAPTION_LIMIT = 1024;

async function sendTelegramTextOnly(botToken: string, chatId: string, text: string): Promise<string | null> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
  });
  const payload = (await response.json().catch(() => null)) as TelegramApiResponse | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(formatTelegramApiError(payload?.description, chatId, response.status, 'delivery'));
  }
  const r = payload.result as { message_id?: number } | undefined;
  return r?.message_id ? String(r.message_id) : null;
}

export async function sendTelegramMessage(request: TelegramSendRequest): Promise<{ messageId: string | null }> {
  const urls = resolveTelegramPhotoUrls(request);

  if (urls.length === 0) {
    const response = await fetch(`https://api.telegram.org/bot${request.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: request.chatId,
        text: request.text,
        disable_web_page_preview: false,
      }),
    });
    const payload = (await response.json().catch(() => null)) as TelegramApiResponse | null;
    if (!response.ok || !payload?.ok) {
      throw new Error(formatTelegramApiError(payload?.description, request.chatId, response.status, 'delivery'));
    }
    const r = payload.result as { message_id?: number } | undefined;
    return { messageId: r?.message_id ? String(r.message_id) : null };
  }

  const textOverCaptionLimit = request.text.length > TELEGRAM_CAPTION_LIMIT;

  if (urls.length === 1) {
    const [{ bytes, blob, filename }] = await fetchTelegramImageParts(urls);
    const asPhoto = rasterBytesQualifyForTelegramPhoto(bytes);
    const form = new FormData();
    form.append('chat_id', request.chatId);
    form.append(asPhoto ? 'photo' : 'document', blob, filename);
    if (request.text && !textOverCaptionLimit) {
      form.append('caption', request.text);
    }

    const payload = await postTelegramForm(
      request.botToken,
      asPhoto ? 'sendPhoto' : 'sendDocument',
      form,
      request.chatId,
    );
    const r = payload?.result as { message_id?: number } | undefined;
    const imageMessageId = r?.message_id ? String(r.message_id) : null;

    if (textOverCaptionLimit) {
      const textMessageId = await sendTelegramTextOnly(request.botToken, request.chatId, request.text);
      return { messageId: textMessageId ?? imageMessageId };
    }
    return { messageId: imageMessageId };
  }

  const parts = await fetchTelegramImageParts(urls);
  const allAsPhotos = parts.every((p) => rasterBytesQualifyForTelegramPhoto(p.bytes));

  if (allAsPhotos) {
    const media = parts.map((_, index) => {
      const base = { type: 'photo' as const, media: `attach://photo${index}` };
      if (index === 0 && !textOverCaptionLimit) return { ...base, caption: request.text };
      return base;
    });

    const form = new FormData();
    form.append('chat_id', request.chatId);
    form.append('media', JSON.stringify(media));
    parts.forEach((b, index) => {
      form.append(`photo${index}`, b.blob, b.filename);
    });

    const payload = await postTelegramForm(request.botToken, 'sendMediaGroup', form, request.chatId);
    const results = payload?.result;
    const firstId = Array.isArray(results) ? results[0]?.message_id : results?.message_id;
    const albumMessageId = firstId != null ? String(firstId) : null;

    if (textOverCaptionLimit) {
      const textMessageId = await sendTelegramTextOnly(request.botToken, request.chatId, request.text);
      return { messageId: textMessageId ?? albumMessageId };
    }
    return { messageId: albumMessageId };
  }

  let lastMessageId: string | null = null;
  for (let i = 0; i < parts.length; i += 1) {
    const { blob, filename } = parts[i]!;
    const form = new FormData();
    form.append('chat_id', request.chatId);
    form.append('document', blob, filename);
    if (i === 0 && request.text && !textOverCaptionLimit) {
      form.append('caption', request.text);
    }
    const payload = await postTelegramForm(request.botToken, 'sendDocument', form, request.chatId);
    const r = payload?.result as { message_id?: number } | undefined;
    if (r?.message_id != null) {
      lastMessageId = String(r.message_id);
    }
  }

  if (textOverCaptionLimit) {
    const textMessageId = await sendTelegramTextOnly(request.botToken, request.chatId, request.text);
    return { messageId: textMessageId ?? lastMessageId };
  }
  return { messageId: lastMessageId };
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