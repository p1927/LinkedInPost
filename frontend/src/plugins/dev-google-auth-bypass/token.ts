import { isDevGoogleAuthBypassEnabled } from './config';

export function getDevGoogleAuthBypassToken(): string | null {
  if (!isDevGoogleAuthBypassEnabled()) {
    return null;
  }
  const secret = String(import.meta.env.VITE_DEV_GOOGLE_AUTH_BYPASS_SECRET || '').trim();
  return secret || null;
}

export function isActiveDevGoogleAuthBypassToken(idToken: string | null | undefined): boolean {
  const expected = getDevGoogleAuthBypassToken();
  if (!expected || idToken === null || idToken === undefined) {
    return false;
  }
  return idToken === expected;
}
