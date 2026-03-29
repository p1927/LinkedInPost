import type { GoogleIdTokenProfile } from '../../utils/googleIdTokenProfile';

const DEFAULT_EMAIL = 'dev-bypass@local.invalid';

export function getDevGoogleAuthBypassProfile(): GoogleIdTokenProfile {
  const email =
    String(import.meta.env.VITE_DEV_GOOGLE_AUTH_BYPASS_EMAIL || DEFAULT_EMAIL).trim() || DEFAULT_EMAIL;
  return {
    email,
    name: 'Dev bypass',
  };
}
