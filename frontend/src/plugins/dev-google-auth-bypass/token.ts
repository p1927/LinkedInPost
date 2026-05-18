import { isDevGoogleAuthBypassEnabled, isE2ECloudBypassEnabled } from './config';

export function getDevGoogleAuthBypassToken(): string | null {
  // Allow E2E tests to disable the dev bypass via sessionStorage flag
  // (set via page.addInitScript before navigation)
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('e2e_disable_dev_bypass') === 'true') {
      return null;
    }
  } catch { /* private mode */ }

  // E2E cloud bypass: VITE_E2E_BYPASS_SECRET set in CI builds
  if (isE2ECloudBypassEnabled()) {
    return String(import.meta.env.VITE_E2E_BYPASS_SECRET || '').trim() || null;
  }
  if (isDevGoogleAuthBypassEnabled()) {
    return String(import.meta.env.VITE_DEV_GOOGLE_AUTH_BYPASS_SECRET || '').trim() || null;
  }
  return null;
}

export function isActiveDevGoogleAuthBypassToken(idToken: string | null | undefined): boolean {
  const expected = getDevGoogleAuthBypassToken();
  if (!expected || idToken === null || idToken === undefined) {
    return false;
  }
  return idToken === expected;
}
