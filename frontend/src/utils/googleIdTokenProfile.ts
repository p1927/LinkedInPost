/**
 * Reads non-sensitive display fields from a Google Sign-In ID token (JWT) payload.
 * The token is already stored client-side; this does not replace server verification.
 */
export type GoogleIdTokenProfile = {
  picture?: string;
  name?: string;
  email?: string;
};

export function parseGoogleIdTokenProfile(idToken: string | null | undefined): GoogleIdTokenProfile | null {
  if (!idToken || typeof idToken !== 'string') {
    return null;
  }
  const parts = idToken.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as Record<string, unknown>;
    const picture = typeof payload.picture === 'string' ? payload.picture : undefined;
    const name = typeof payload.name === 'string' ? payload.name : undefined;
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    if (!picture && !name && !email) {
      return null;
    }
    return { picture, name, email };
  } catch {
    return null;
  }
}
