/** Short git SHA and optional CI run number, injected at build time (see vite.config). */
export function getAppBuildLabel(): string {
  return __APP_BUILD_LABEL__
}
