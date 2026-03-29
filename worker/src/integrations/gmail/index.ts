export class GmailAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GmailAuthError';
  }
}

export interface GmailSendRequest {
  accessToken: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body: string;
}

interface GmailSendResponse {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Base64URL encodes a string or Uint8Array
 */
function base64UrlEncode(str: string): string {
  // Using TextEncoder instead of Buffer for Cloudflare Workers
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Constructs a raw MIME message
 */
function constructMimeMessage(request: GmailSendRequest): string {
  const boundary = '----=_NextPart_Gmail_API_Message';
  const headers = [
    `To: ${request.to}`,
  ];
  
  if (request.cc) headers.push(`Cc: ${request.cc}`);
  if (request.bcc) headers.push(`Bcc: ${request.bcc}`);
  
  headers.push(`Subject: ${request.subject || 'New Message'}`);
  headers.push('MIME-Version: 1.0');
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

  const rawMessage = [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    request.body,
    `--${boundary}--`
  ].join('\r\n');

  return base64UrlEncode(rawMessage);
}

/**
 * Sends an email using the Gmail REST API
 */
export async function sendGmailMessage(request: GmailSendRequest): Promise<{ messageId: string | null }> {
  const rawMessage = constructMimeMessage(request);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${request.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawMessage,
    }),
  });

  const payload = (await response.json().catch(() => null)) as GmailSendResponse | null;

  if (!response.ok) {
    const message = payload?.error?.message || `Gmail delivery failed with status ${response.status}.`;
    if (response.status === 401) {
      throw new GmailAuthError(message);
    }
    throw new Error(message);
  }

  return {
    messageId: payload?.id || null,
  };
}
