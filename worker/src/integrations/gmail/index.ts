export class GmailAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GmailAuthError';
  }
}

/** Binary size above this uses `Content-Disposition: attachment` instead of inline CID. */
export const INLINE_IMAGE_MAX_BYTES = 1024 * 1024;

export interface GmailSendRequest {
  accessToken: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body: string;
  /**
   * When set, images up to {@link INLINE_IMAGE_MAX_BYTES} bytes use CID inline in HTML;
   * larger files are sent as a regular attachment.
   */
  inlineImage?: {
    contentType: string;
    bytes: ArrayBuffer;
  };
  /** Multiple images (preferred when more than one). Each is inlined if small enough, else attached. */
  inlineImages?: Array<{
    contentType: string;
    bytes: ArrayBuffer;
  }>;
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
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function mimeBoundary(prefix: string): string {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}`;
  return `----=_${prefix}_${id}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, i + CHUNK);
    parts.push(String.fromCharCode.apply(null, sub as unknown as number[]));
  }
  return btoa(parts.join(''));
}

function wrapBase64(b64: string): string {
  return b64.replace(/.{1,76}/g, '$&\r\n').replace(/\r\n$/, '');
}

function inlineFilenameForContentType(contentType: string): string {
  const lower = contentType.toLowerCase().split(';')[0]?.trim() || 'image/jpeg';
  if (lower.includes('png')) return 'image.png';
  if (lower.includes('gif')) return 'image.gif';
  if (lower.includes('webp')) return 'image.webp';
  return 'image.jpg';
}

function buildHtmlBodyWithInline(plainBody: string, contentId: string): string {
  const escaped = escapeHtml(plainBody).replace(/\r\n|\n|\r/g, '<br/>');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;line-height:1.5;color:#222;"><p><img src="cid:${contentId}" alt="" style="max-width:100%;height:auto;display:block;" /></p><div>${escaped}</div></body></html>`;
}

function buildHtmlBodyMultiInline(plainBody: string, contentIds: string[]): string {
  const escaped = escapeHtml(plainBody).replace(/\r\n|\n|\r/g, '<br/>');
  const imgs = contentIds
    .map(
      (id) =>
        `<p><img src="cid:${id.replace(/"/g, '')}" alt="" style="max-width:100%;height:auto;display:block;margin:0 0 0.75em 0;" /></p>`,
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;line-height:1.5;color:#222;">${imgs}<div>${escaped}</div></body></html>`;
}

function buildHtmlBodyMultiAttachmentNote(plainBody: string, filenames: string[]): string {
  const escaped = escapeHtml(plainBody).replace(/\r\n|\n|\r/g, '<br/>');
  const list = filenames.map((f) => escapeHtml(f)).join(', ');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;line-height:1.5;color:#222;"><div>${escaped}</div><p style="color:#666;font-size:0.9em;">Images attached: ${list}</p></body></html>`;
}

function buildHtmlBodyWithAttachmentNote(plainBody: string, filename: string): string {
  const escaped = escapeHtml(plainBody).replace(/\r\n|\n|\r/g, '<br/>');
  const fn = escapeHtml(filename);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;line-height:1.5;color:#222;"><div>${escaped}</div><p style="color:#666;font-size:0.9em;">Image attached: ${fn}</p></body></html>`;
}

function collectGmailImageParts(request: GmailSendRequest): Array<{ contentType: string; bytes: ArrayBuffer }> {
  const fromMany = (request.inlineImages || []).filter((i) => i.bytes.byteLength > 0);
  if (fromMany.length > 0) {
    return fromMany;
  }
  if (request.inlineImage && request.inlineImage.bytes.byteLength > 0) {
    return [request.inlineImage];
  }
  return [];
}

/**
 * Constructs a raw MIME message (RFC 822). Small images: multipart/related + CID inline.
 * Large images: multipart/mixed (text + attachment) so clients do not embed huge blobs in HTML.
 */
function constructMimeMessage(request: GmailSendRequest): string {
  const images = collectGmailImageParts(request);

  const headersBase = [`To: ${request.to}`];
  if (request.cc) headersBase.push(`Cc: ${request.cc}`);
  if (request.bcc) headersBase.push(`Bcc: ${request.bcc}`);
  headersBase.push(`Subject: ${request.subject || 'New Message'}`);
  headersBase.push('MIME-Version: 1.0');

  if (images.length === 0) {
    const boundary = mimeBoundary('Alt');
    headersBase.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const rawMessage = [
      ...headersBase,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      request.body,
      `--${boundary}--`,
    ].join('\r\n');
    return base64UrlEncode(rawMessage);
  }

  const allSmall = images.every((img) => img.bytes.byteLength <= INLINE_IMAGE_MAX_BYTES);

  if (allSmall) {
    const relatedBoundary = mimeBoundary('Related');
    const altBoundary = mimeBoundary('Alt');
    headersBase.push(
      `Content-Type: multipart/related; boundary="${relatedBoundary}"; type="multipart/alternative"`,
    );

    const contentIds = images.map((_, i) => `draft-inline-img-${i}`);
    const htmlBody = buildHtmlBodyMultiInline(request.body, contentIds);

    const parts: string[] = [
      ...headersBase,
      '',
      `--${relatedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      '',
      `--${altBoundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      request.body,
      `--${altBoundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      htmlBody,
      `--${altBoundary}--`,
    ];

    for (let i = 0; i < images.length; i += 1) {
      const img = images[i]!;
      const imageB64 = wrapBase64(uint8ArrayToBase64(new Uint8Array(img.bytes)));
      const filename = inlineFilenameForContentType(img.contentType);
      const contentId = contentIds[i]!;
      parts.push(
        '',
        `--${relatedBoundary}`,
        `Content-Type: ${img.contentType}`,
        'Content-Transfer-Encoding: base64',
        `Content-ID: <${contentId}>`,
        `Content-Disposition: inline; filename="${filename}"`,
        '',
        imageB64,
      );
    }

    parts.push('', `--${relatedBoundary}--`);
    return base64UrlEncode(parts.join('\r\n'));
  }

  const mixedBoundary = mimeBoundary('Mixed');
  const altBoundary = mimeBoundary('Alt');
  headersBase.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);

  const filenames = images.map((img, i) => {
    const base = inlineFilenameForContentType(img.contentType);
    const dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : '';
    return `${stem}-${i + 1}${ext}`;
  });
  const plainNote = `${request.body}\r\n\r\n[Images attached: ${filenames.join(', ')}]`;
  const htmlBody = buildHtmlBodyMultiAttachmentNote(request.body, filenames);

  const parts: string[] = [
    ...headersBase,
    '',
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    plainNote,
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    htmlBody,
    `--${altBoundary}--`,
  ];

  for (let i = 0; i < images.length; i += 1) {
    const img = images[i]!;
    const imageB64 = wrapBase64(uint8ArrayToBase64(new Uint8Array(img.bytes)));
    const filename = filenames[i]!;
    parts.push(
      '',
      `--${mixedBoundary}`,
      `Content-Type: ${img.contentType}`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${filename}"`,
      '',
      imageB64,
    );
  }

  parts.push('', `--${mixedBoundary}--`);
  return base64UrlEncode(parts.join('\r\n'));
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
