/**
 * Dev-only: when enabled with a matching Worker secret, the app can skip Google Sign-In.
 * VITE_* values are embedded in the client bundle — use only for local dev against wrangler dev,
 * never for a production frontend URL talking to a real Worker.
 */
function readTruthyFlag(raw: string | undefined): boolean {
  if (!raw) {
    return false;
  }
  const value = raw.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

export function isDevGoogleAuthBypassEnabled(): boolean {
  return readTruthyFlag(import.meta.env.VITE_DEV_GOOGLE_AUTH_BYPASS);
}

/** True when VITE_E2E_BYPASS_SECRET is set — enables the bypass for E2E tests against the deployed cloud app. */
export function isE2ECloudBypassEnabled(): boolean {
  return readTruthyFlag(import.meta.env.VITE_E2E_BYPASS_SECRET);
}
