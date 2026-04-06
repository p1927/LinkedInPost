import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { BrowserRouter, useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom'
import { LogOut, Share2, Sparkles, TableProperties } from 'lucide-react'
import { googleLogout } from '@react-oauth/google'
import { GoogleLoginButton } from './components/GoogleLoginButton'
import { Button } from '@/components/ui/button'
import { Dashboard } from './components/dashboard'
import { AlertProvider } from './components/AlertProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { WorkspaceShell } from './components/workspace/WorkspaceShell'
import { type WorkspaceNavPage } from './components/workspace/AppSidebar'
import { BackendApi, isAuthErrorMessage, type AppSession, type SocialIntegration } from './services/backendApi'
import type { LlmProviderId } from '@repo/llm-core'
import {
  workspaceRouterBasename,
  WORKSPACE_PATHS,
  isTopicEditorWorkspacePath,
  normalizeWorkspacePathname,
} from './features/topic-navigation/utils/workspaceRoutes'
import { getWorkspaceDocumentTitle } from './lib/workspaceDocumentTitle'

function isWorkspaceTopicReviewPath(pathname: string): boolean {
  const p = normalizeWorkspacePathname(pathname)
  return p.startsWith(`${WORKSPACE_PATHS.topics}/`) && p !== WORKSPACE_PATHS.topics
}
import { parseGoogleIdTokenProfile, type GoogleIdTokenProfile } from './utils/googleIdTokenProfile'
import {
  getDevGoogleAuthBypassProfile,
  getDevGoogleAuthBypassToken,
  isActiveDevGoogleAuthBypassToken,
  isDevGoogleAuthBypassEnabled,
} from './plugins/dev-google-auth-bypass'
import { OnboardingModal } from './features/onboarding/OnboardingModal'
import { PrivacyPolicy } from './components/PrivacyPolicy'
import { LegalFooterLinks } from './components/LegalFooterLinks'
import { TermsOfServicePage } from './pages/TermsOfServicePage'
import {
  POST_LOGIN_REDIRECT_KEY,
  shouldCapturePathForPostLogin,
} from './lib/postLoginRedirect'

const STORED_ID_TOKEN_KEY = 'google_id_token'

function readInitialIdToken(): string | null {
  const bypass = getDevGoogleAuthBypassToken()
  if (bypass) {
    return bypass
  }
  try {
    return localStorage.getItem(STORED_ID_TOKEN_KEY)
  } catch {
    return null
  }
}

type LlmProviderCatalog = Array<{ id: LlmProviderId; name: string; models: any[] }>;

function WorkspaceSession({
  idToken,
  session,
  googleProfile,
  api,
  setSession,
  setIdToken,
  setErrorMessage,
  onAuthExpired,
  llmCatalog,
  integrations,
  onConnect,
  onDisconnect,
  connecting,
}: {
  idToken: string
  session: AppSession
  googleProfile: GoogleIdTokenProfile | null
  api: BackendApi
  setSession: Dispatch<SetStateAction<AppSession | null>>
  setIdToken: Dispatch<SetStateAction<string | null>>
  setErrorMessage: Dispatch<SetStateAction<string>>
  onAuthExpired: () => void
  llmCatalog: LlmProviderCatalog | null
  integrations: SocialIntegration[]
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail') => void
  onDisconnect: (provider: string) => void
  connecting: string | null
}) {
  const location = useLocation()
  const path = normalizeWorkspacePathname(location.pathname)
  const workspacePage: WorkspaceNavPage = path.startsWith(WORKSPACE_PATHS.settings)
    ? 'settings'
    : path.startsWith(WORKSPACE_PATHS.rules)
      ? 'rules'
      : path.startsWith(WORKSPACE_PATHS.campaign)
        ? 'campaign'
        : path.startsWith(WORKSPACE_PATHS.usage)
          ? 'usage'
          : 'topics'
  const lockMainScroll = isWorkspaceTopicReviewPath(location.pathname)
  const autoCollapseMainSidebar = isTopicEditorWorkspacePath(location.pathname)

  useEffect(() => {
    document.title = getWorkspaceDocumentTitle(location.pathname)
  }, [location.pathname])

  return (
    <WorkspaceShell
      session={session}
      googleProfile={googleProfile}
      workspacePage={workspacePage}
      lockMainScroll={lockMainScroll}
      autoCollapseMainSidebar={autoCollapseMainSidebar}
      onLogoutComplete={() => {
        setIdToken(null)
        setSession(null)
        setErrorMessage('')
      }}
    >
      <Dashboard
        idToken={idToken}
        session={session}
        api={api}
        llmCatalog={llmCatalog}
        integrations={integrations}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        connecting={connecting}
        onSaveConfig={async (config) => {
          const updatedConfig = await api.saveConfig(idToken, config)
          setSession((current) => (current ? { ...current, config: updatedConfig } : current))
          return updatedConfig
        }}
        onAuthExpired={onAuthExpired}
      />
    </WorkspaceShell>
  )
}

function getBackendHostLabel(endpointUrl: string): string {
  try {
    return new URL(endpointUrl).host
  } catch {
    return endpointUrl || 'the configured backend URL'
  }
}

function LoginRedirect() {
  const location = useLocation()
  if (location.pathname !== '/' && location.pathname !== '/terms' && location.pathname !== '/privacy-policy') {
    if (shouldCapturePathForPostLogin(location.pathname)) {
      try {
        sessionStorage.setItem(
          POST_LOGIN_REDIRECT_KEY,
          `${location.pathname}${location.search}`,
        )
      } catch {
        /* private mode / quota */
      }
    }
    return <Navigate to="/" replace />
  }
  return null
}

/** Split stored path like `/topics?x=1` for stable comparison with {@link normalizeWorkspacePathname}. */
function splitStoredPath(pathWithSearch: string): { path: string; search: string } {
  const q = pathWithSearch.indexOf('?')
  if (q === -1) {
    return { path: pathWithSearch, search: '' }
  }
  return { path: pathWithSearch.slice(0, q), search: pathWithSearch.slice(q) }
}

/** After bootstrap, send users back to e.g. `/topics` they opened while logged out (GitHub Pages deep links). */
function PostLoginDeepLinkRestore({
  idToken,
  session,
}: {
  idToken: string | null
  session: AppSession | null
}) {
  const navigate = useNavigate()
  const location = useLocation()
  /** One restore attempt per authenticated session; avoids re-running on every route change (React #185). */
  const restoreAttemptedRef = useRef(false)

  useEffect(() => {
    if (!idToken || !session) {
      restoreAttemptedRef.current = false
      return
    }
    if (restoreAttemptedRef.current) {
      return
    }
    restoreAttemptedRef.current = true

    let target: string | null = null
    try {
      target = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY)
      if (target) {
        sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY)
      }
    } catch {
      return
    }
    if (!target) {
      return
    }
    const { path: tPath, search: tSearch } = splitStoredPath(target.trim())
    const normalizedTarget = normalizeWorkspacePathname(tPath) + tSearch
    const current = normalizeWorkspacePathname(location.pathname) + location.search
    if (normalizedTarget === current) {
      return
    }
    navigate(target.trim().startsWith('/') ? target.trim() : `/${target.trim()}`, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when auth becomes ready; location is snapshot for comparison at that render only
  }, [idToken, session, navigate])

  return null
}

function App() {
  const api = useMemo(() => new BackendApi(), [])
  const [idToken, setIdToken] = useState<string | null>(() => readInitialIdToken())
  const googleProfile = useMemo((): GoogleIdTokenProfile | null => {
    if (isActiveDevGoogleAuthBypassToken(idToken)) {
      return getDevGoogleAuthBypassProfile()
    }
    return parseGoogleIdTokenProfile(idToken)
  }, [idToken])
  const [session, setSession] = useState<AppSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [llmCatalog, setLlmCatalog] = useState<LlmProviderCatalog | null>(null)
  const [integrations, setIntegrations] = useState<SocialIntegration[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  useEffect(() => {
    if (!idToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')
    setLlmCatalog(null)

    api
      .bootstrap(idToken)
      .then(async (nextSession) => {
        setSession(nextSession)
        setIntegrations(nextSession.integrations ?? [])
        setShowOnboarding(!(nextSession.onboardingCompleted ?? true))

        // Fetch LLM catalog after session is ready
        try {
          const catalogData = await api.getLlmProviderCatalog(idToken)
          setLlmCatalog(catalogData.providers)
        } catch (catalogError) {
          console.error('Failed to fetch LLM catalog:', catalogError)
          // Don't fail the entire app if catalog fetch fails - fall back to static models
          setLlmCatalog([])
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to start the session.'
        console.error('Failed to bootstrap backend session:', error)
        setErrorMessage(message)

        if (isAuthErrorMessage(message)) {
          googleLogout()
          localStorage.removeItem(STORED_ID_TOKEN_KEY)
          setIdToken(null)
          setSession(null)
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [api, idToken])

  const handleLogin = useCallback((newToken: string) => {
    setErrorMessage('')
    setIdToken(newToken || null)
  }, [])

  const handleAuthExpired = () => {
    localStorage.removeItem(STORED_ID_TOKEN_KEY)
    googleLogout()
    setIdToken(null)
    setSession(null)
    setErrorMessage('Your Google session expired. Sign in again to continue.')
  }

  const handleConnect = useCallback(async (provider: 'linkedin' | 'instagram' | 'gmail') => {
    if (!idToken) return
    setConnecting(provider)
    try {
      const actionMap = {
        linkedin: 'startLinkedInAuth',
        instagram: 'startInstagramAuth',
        gmail: 'startGmailAuth',
      } as const
      const method = actionMap[provider]
      const result = await api[method](idToken)
      const { authorizationUrl } = result

      const popup = window.open(authorizationUrl, 'oauth', 'width=500,height=700,left=200,top=100')

      await new Promise<void>((resolve, reject) => {
        const timer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(timer)
            resolve()
          }
        }, 500)

        function onMessage(event: MessageEvent) {
          if (event.data?.source !== 'channel-bot-oauth') return
          window.removeEventListener('message', onMessage)
          clearInterval(timer)
          if (event.data.ok) {
            resolve()
          } else {
            reject(new Error(event.data.error || 'Connection failed.'))
          }
        }
        window.addEventListener('message', onMessage)
      })

      const updated = await api.getIntegrations(idToken)
      setIntegrations(updated)
    } catch (err) {
      console.error('OAuth connect failed:', err)
    } finally {
      setConnecting(null)
    }
  }, [idToken, api])

  const handleDisconnect = useCallback(async (provider: string) => {
    if (!idToken) return
    try {
      await api.deleteIntegration(idToken, provider)
      setIntegrations((prev) => prev.filter((i) => i.provider !== provider))
    } catch (err) {
      console.error('Disconnect failed:', err)
    }
  }, [idToken, api])

  const handleCompleteOnboarding = useCallback(async (spreadsheetId?: string, driveAccessToken?: string) => {
    if (!idToken) return
    try {
      if (spreadsheetId && driveAccessToken) {
        await api.connectSpreadsheet(idToken, spreadsheetId, driveAccessToken)
      }
      await api.completeOnboarding(idToken, spreadsheetId && !driveAccessToken ? spreadsheetId : undefined)
      setShowOnboarding(false)
      window.location.assign(WORKSPACE_PATHS.connections)
    } catch (err) {
      console.error('Complete onboarding failed:', err)
      await api.completeOnboarding(idToken).catch(() => {})
      setShowOnboarding(false)
    }
  }, [idToken, api])

  const showMarketingHeader = !idToken || !session
  const routerBasename = workspaceRouterBasename()

  return (
    <ErrorBoundary>
    <AlertProvider>
      <BrowserRouter {...(routerBasename ? { basename: routerBasename } : {})}>
        <PostLoginDeepLinkRestore idToken={idToken} session={session} />
        <Routes>
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route
            path="*"
            element={
              <div className="flex min-h-screen w-full flex-col bg-transparent font-sans text-ink">
                {showMarketingHeader ? (
                  <header className="glass-header w-full border-b px-4 py-3.5 sm:px-6">
                    <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary font-heading text-sm font-semibold text-primary-fg">
                          CB
                        </div>
                        <h1 className="font-heading text-lg font-semibold text-ink">Channel Bot</h1>
                      </div>
                      {idToken ? (
                        isActiveDevGoogleAuthBypassToken(idToken) ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            onClick={() => {
                              setIdToken(null)
                              setSession(null)
                              setErrorMessage('')
                            }}
                            className="glass-inset gap-2 rounded-xl text-muted hover:bg-white/85 hover:text-ink"
                          >
                            <LogOut className="h-4 w-4" aria-hidden />
                            Log out
                          </Button>
                        ) : (
                          <GoogleLoginButton onLogin={handleLogin} onSignInIntent={() => setErrorMessage('')} />
                        )
                      ) : null}
                    </div>
                  </header>
                ) : null}

                {idToken && session ? (
                  <>
                  {showOnboarding && (
                    <OnboardingModal
                      integrations={integrations}
                      onConnect={handleConnect}
                      onDisconnect={handleDisconnect}
                      onComplete={handleCompleteOnboarding}
                      connecting={connecting}
                    />
                  )}
                  <WorkspaceSession
                    idToken={idToken}
                    session={session}
                    googleProfile={googleProfile}
                    api={api}
                    setSession={setSession}
                    setIdToken={setIdToken}
                    setErrorMessage={setErrorMessage}
                    onAuthExpired={handleAuthExpired}
                    llmCatalog={llmCatalog}
                    integrations={integrations}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    connecting={connecting}
                  />
                  </>
                ) : (
                  <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 pb-12 pt-6 sm:px-6">
                {!api.isConfigured() ? (
                  <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-2 text-center">
                    <h2 className="mb-3 font-heading text-2xl font-semibold text-ink">Backend URL required</h2>
                    <p className="text-muted">
                      Set <code>VITE_WORKER_URL</code> to the deployed Cloudflare Worker URL, then rebuild the frontend.
                    </p>
                  </div>
                ) : !idToken ? (
                  <div className="flex w-full flex-1 flex-col">
                    <LoginRedirect />
                    <div className="flex min-h-[calc(100vh-9rem)] flex-1 flex-col items-center justify-center gap-14 lg:flex-row lg:gap-20">
                      <div className="max-w-xl flex-1 space-y-10 text-left">
                        <h2 className="font-heading text-4xl font-semibold leading-tight tracking-tight text-ink lg:text-[2.75rem] lg:leading-[1.12]">
                          One pipeline for drafts, review, and delivery across every channel you use.
                        </h2>
                        <ul className="space-y-8 text-lg text-muted">
                          <li className="flex gap-4">
                            <span className="glass-panel mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-card">
                              <TableProperties className="h-5 w-5 text-primary" aria-hidden />
                            </span>
                            <div>
                              <strong className="mb-1 block font-semibold text-ink">Google Sheets at the center</strong>
                              Keep topics and status in a shared spreadsheet the whole team already understands.
                            </div>
                          </li>
                          <li className="flex gap-4">
                            <span className="glass-panel mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-card">
                              <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                            </span>
                            <div>
                              <strong className="mb-1 block font-semibold text-ink">Model-assisted drafting</strong>
                              Generate quick edits and variants, then compare before anything ships.
                            </div>
                          </li>
                          <li className="flex gap-4">
                            <span className="glass-panel mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-card">
                              <Share2 className="h-5 w-5 text-primary" aria-hidden />
                            </span>
                            <div>
                              <strong className="mb-1 block font-semibold text-ink">Publish where it belongs</strong>
                              Send approved posts to LinkedIn, Instagram, Telegram, and WhatsApp from one place.
                            </div>
                          </li>
                        </ul>
                      </div>

                      <div className="glass-panel-strong w-full max-w-md rounded-3xl p-8 sm:p-10">
                        <div className="space-y-6 text-center">
                          <div className="glass-inset mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
                            <TableProperties className="h-7 w-7 text-primary" aria-hidden />
                          </div>
                          <div>
                            <h3 className="font-heading text-2xl font-semibold text-ink">Sign in</h3>
                            <p className="mt-2 text-sm text-muted">
                              {isDevGoogleAuthBypassEnabled()
                                ? 'Use an approved Google account or dev bypass to open the workspace.'
                                : 'Use an approved Google account to open the workspace.'}
                            </p>
                          </div>
                          <div className="w-full pt-2">
                            <GoogleLoginButton onLogin={handleLogin} onSignInIntent={() => setErrorMessage('')} />
                          </div>
                          {isDevGoogleAuthBypassEnabled() && getDevGoogleAuthBypassToken() ? (
                            <div className="flex flex-col items-center gap-2 border-t border-border/60 pt-4">
                              <p className="text-xs text-muted">Local development</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="md"
                                className="rounded-xl"
                                onClick={() => {
                                  const token = getDevGoogleAuthBypassToken()
                                  setErrorMessage('')
                                  if (token) {
                                    setIdToken(token)
                                  }
                                }}
                              >
                                Continue with dev bypass
                              </Button>
                            </div>
                          ) : null}
                          {errorMessage ? (
                            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">
                              {errorMessage}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-border border-t-primary" />
                      <p className="text-sm text-muted">Loading shared workspace…</p>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-2 text-center">
                    <h2 className="mb-3 font-heading text-2xl font-semibold text-ink">Unable to start the session</h2>
                    <p className="text-muted">{errorMessage || 'Verify the Cloudflare Worker deployment and try again.'}</p>
                    <p className="mt-4 text-sm text-muted">
                      Current backend: {getBackendHostLabel(import.meta.env.VITE_WORKER_URL || '')}
                    </p>
                  </div>
                )}
          </main>
        )}

        {showMarketingHeader ? (
          <footer className="mt-auto w-full border-t border-border/40 py-6">
            <LegalFooterLinks />
          </footer>
        ) : null}
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AlertProvider>
    </ErrorBoundary>
  )
}

export default App
