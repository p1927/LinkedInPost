// Timing-safe HMAC verification using crypto.subtle.verify (native constant-time).
async function hmacVerify(secret: string, body: string, providedHex: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  // Decode hex string to bytes; malformed hex returns false without throwing.
  const hexPairs = providedHex.match(/.{2}/g);
  if (!hexPairs || hexPairs.length !== 32) return false;
  const sigBytes = new Uint8Array(hexPairs.map((h) => parseInt(h, 16)));
  return crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(body));
}

export async function verifyInstagramSignature(
  body: string,
  signature: string,
  appSecret: string,
): Promise<boolean> {
  const hex = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  return hmacVerify(appSecret, body, hex);
}

export async function verifyLinkedInSignature(
  body: string,
  signature: string,
  clientSecret: string,
): Promise<boolean> {
  return hmacVerify(clientSecret, body, signature);
}

export function verifyTelegramSecretToken(header: string, expectedToken: string): boolean {
  if (header.length !== expectedToken.length) return false;
  let diff = 0;
  for (let i = 0; i < header.length; i++) {
    diff |= header.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  return diff === 0;
}
