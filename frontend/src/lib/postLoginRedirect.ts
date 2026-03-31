/** sessionStorage key — deep link to restore after Google sign-in (GitHub Pages client routes). */
export const POST_LOGIN_REDIRECT_KEY = 'channelbot_post_login_path'

/** Workspace routes worth restoring when an unauthenticated user is sent to the home sign-in screen. */
export function shouldCapturePathForPostLogin(pathname: string): boolean {
  if (pathname === '/' || pathname === '/terms' || pathname === '/privacy-policy') {
    return false
  }
  return (
    pathname.startsWith('/topics')
    || pathname.startsWith('/settings')
    || pathname.startsWith('/rules')
    || pathname.startsWith('/campaign')
  )
}
