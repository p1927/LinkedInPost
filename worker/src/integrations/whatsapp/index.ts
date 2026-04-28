import { normalizeDeliveryImageUrl } from '../media';
import { fetchWithRetry } from '../_shared/fetchWithRetry';

export interface WhatsAppSendRequest {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  text: string;
  imageUrl?: string;
  /** Each URL is a separate Cloud API message; caption is set only on the first image. */
  imageUrls?: string[];
}

interface WhatsAppGraphResponse {
  error?: {
    message?: string;
  };
  messages?: Array<{
    id?: string;
  }>;
}

function resolveWhatsAppImageUrls(request: WhatsAppSendRequest): string[] {
  const fromList = (request.imageUrls || [])
    .map((u) => normalizeDeliveryImageUrl(String(u || '').trim()))
    .filter((u): u is string => Boolean(u));
  if (fromList.length > 0) {
    return fromList;
  }
  const one = request.imageUrl ? normalizeDeliveryImageUrl(request.imageUrl) : undefined;
  return one ? [one] : [];
}

async function postWhatsAppMessage(
  request: WhatsAppSendRequest,
  body: Record<string, unknown>,
): Promise<string | null> {
  const response = await fetchWithRetry(`https://graph.facebook.com/v22.0/${encodeURIComponent(request.phoneNumberId)}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${request.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as WhatsAppGraphResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || `WhatsApp delivery failed with status ${response.status}.`);
  }

  return payload?.messages?.[0]?.id || null;
}

export async function sendWhatsAppMessage(request: WhatsAppSendRequest): Promise<{ messageId: string | null }> {
  const urls = resolveWhatsAppImageUrls(request);

  if (urls.length === 0) {
    const lastId = await postWhatsAppMessage(request, {
      messaging_product: 'whatsapp',
      to: request.to,
      type: 'text',
      text: {
        body: request.text,
        preview_url: true,
      },
    });
    return { messageId: lastId };
  }

  let lastId: string | null = null;
  for (let i = 0; i < urls.length; i += 1) {
    const link = urls[i]!;
    const caption = i === 0 ? request.text : '';
    lastId = await postWhatsAppMessage(request, {
      messaging_product: 'whatsapp',
      to: request.to,
      type: 'image',
      image: caption
        ? {
            link,
            caption,
          }
        : {
            link,
          },
    });
  }

  return { messageId: lastId };
}