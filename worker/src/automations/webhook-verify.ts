async function hmacHex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyInstagramSignature(
  body: string,
  signature: string,
  appSecret: string,
): Promise<boolean> {
  const expected = `sha256=${await hmacHex(appSecret, body)}`;
  return signature === expected;
}

export async function verifyLinkedInSignature(
  body: string,
  signature: string,
  clientSecret: string,
): Promise<boolean> {
  const expected = await hmacHex(clientSecret, body);
  return signature === expected;
}

export function verifyTelegramSecretToken(header: string, expectedToken: string): boolean {
  return header === expectedToken;
}
