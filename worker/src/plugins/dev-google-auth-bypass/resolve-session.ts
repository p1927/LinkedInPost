import type { DevGoogleAuthBypassEnv } from './env';
import { timingSafeEqualString } from './timing-safe-equal';

const DEFAULT_BYPASS_EMAIL = 'dev-bypass@local.invalid';

export interface DevGoogleAuthBypassSession {
  email: string;
  isAdmin: boolean;
}

/**
 * When `DEV_GOOGLE_AUTH_BYPASS_SECRET` is set in `.dev.vars`, a client may send that exact
 * string as `idToken` and receive a synthetic admin session without calling Google.
 * Do not set these variables in production Worker secrets.
 */
export function tryResolveDevGoogleAuthBypassSession(
  idToken: string | undefined,
  env: DevGoogleAuthBypassEnv,
): DevGoogleAuthBypassSession | null {
  const secret = String(env.DEV_GOOGLE_AUTH_BYPASS_SECRET || '').trim();
  if (!secret || idToken === undefined) {
    return null;
  }

  const token = String(idToken).trim();
  if (!timingSafeEqualString(token, secret)) {
    return null;
  }

  const rawEmail = String(env.DEV_GOOGLE_AUTH_BYPASS_EMAIL || DEFAULT_BYPASS_EMAIL).trim().toLowerCase();
  const email = rawEmail || DEFAULT_BYPASS_EMAIL;

  return {
    email,
    isAdmin: true,
  };
}
