/// <reference types="vite/client" />
/// <reference types="temporal-polyfill/global" />

declare const __APP_BUILD_LABEL__: string

interface ImportMetaEnv {
  readonly VITE_DEV_GOOGLE_AUTH_BYPASS?: string;
  readonly VITE_DEV_GOOGLE_AUTH_BYPASS_SECRET?: string;
  /** Optional; should match Worker DEV_GOOGLE_AUTH_BYPASS_EMAIL for workspace header label */
  readonly VITE_DEV_GOOGLE_AUTH_BYPASS_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
