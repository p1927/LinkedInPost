import { normalizeDeliveryImageUrl } from '../media';

export interface WhatsAppSendRequest {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  text: string;
  imageUrl?: string;
}

interface WhatsAppGraphResponse {
  error?: {
    message?: string;
  };
  messages?: Array<{
    id?: string;
  }>;
}

export async function sendWhatsAppMessage(request: WhatsAppSendRequest): Promise<{ messageId: string | null }> {
  const normalizedImageUrl = request.imageUrl ? normalizeDeliveryImageUrl(request.imageUrl) : undefined;

  const response = await fetch(`https://graph.facebook.com/v22.0/${encodeURIComponent(request.phoneNumberId)}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${request.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      normalizedImageUrl
        ? {
            messaging_product: 'whatsapp',
            to: request.to,
            type: 'image',
            image: {
              link: normalizedImageUrl,
              caption: request.text,
            },
          }
        : {
            messaging_product: 'whatsapp',
            to: request.to,
            type: 'text',
            text: {
              body: request.text,
              preview_url: true,
            },
          },
    ),
  });

  const payload = (await response.json().catch(() => null)) as WhatsAppGraphResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || `WhatsApp delivery failed with status ${response.status}.`);
  }

  return {
    messageId: payload?.messages?.[0]?.id || null,
  };
}