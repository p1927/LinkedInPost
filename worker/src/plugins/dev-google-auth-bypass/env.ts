/** Subset of Worker `Env` used by the dev Google auth bypass plugin. */
export interface DevGoogleAuthBypassEnv {
  DEV_GOOGLE_AUTH_BYPASS_SECRET?: string;
  /** Display / audit identity when bypass is used; defaults to dev-bypass@local.invalid */
  DEV_GOOGLE_AUTH_BYPASS_EMAIL?: string;
}
