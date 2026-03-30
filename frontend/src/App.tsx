import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { BrowserRouter, useLocation, Routes, Route, Navigate } from 'react-router-dom'
import { LogOut, Share2, Sparkles, TableProperties } from 'lucide-react'
import { googleLogout } from '@react-oauth/google'
import { GoogleLoginButton } from './components/GoogleLoginButton'
import { Button } from '@/components/ui/button'
import { Dashboard } from './components/dashboard'
import { AlertProvider } from './components/AlertProvider'
import { WorkspaceShell } from './components/workspace/WorkspaceShell'
import { type WorkspaceNavPage } from './components/workspace/AppSidebar'
import { BackendApi, isAuthErrorMessage, type AppSession } from './services/backendApi'
import { workspaceRouterBasename, WORKSPACE_PATHS } from './features/topic-navigation/utils/workspaceRoutes'

function isWorkspaceTopicReviewPath(pathname: string): boolean {
  return pathname.includes(`${WORKSPACE_PATHS.topics}/`) && pathname !== WORKSPACE_PATHS.topics
}
import { parseGoogleIdTokenProfile, type GoogleIdTokenProfile } from './utils/googleIdTokenProfile'
import {
  getDevGoogleAuthBypassProfile,
  getDevGoogleAuthBypassToken,
  isActiveDevGoogleAuthBypassToken,
  isDevGoogleAuthBypassEnabled,
} from './plugins/dev-google-auth-bypass'
import { PrivacyPolicy } from './components/PrivacyPolicy'
import { LegalFooterLinks } from './components/LegalFooterLinks'
import { TermsOfServicePage } from './pages/TermsOfServicePage'

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

function WorkspaceSession({
  idToken,
  session,
  googleProfile,
  api,
  setSession,
  setIdToken,
  setErrorMessage,
  onAuthExpired,
}: {
  idToken: string
  session: AppSession
  googleProfile: GoogleIdTokenProfile | null
  api: BackendApi
  setSession: Dispatch<SetStateAction<AppSession | null>>
  setIdToken: Dispatch<SetStateAction<string | null>>
  setErrorMessage: Dispatch<SetStateAction<string>>
  onAuthExpired: () => void
}) {
  const location = useLocation()
  const workspacePage: WorkspaceNavPage = location.pathname.startsWith(WORKSPACE_PATHS.settings)
    ? 'settings'
    : location.pathname.startsWith(WORKSPACE_PATHS.rules)
      ? 'rules'
      : location.pathname.startsWith(WORKSPACE_PATHS.campaign)
        ? 'campaign'
        : 'topics'
  const lockMainScroll = isWorkspaceTopicReviewPath(location.pathname)

  return (
    <WorkspaceShell
      session={session}
      googleProfile={googleProfile}
      workspacePage={workspacePage}
      lockMainScroll={lockMainScroll}
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
    return <Navigate to="/" replace />
  }
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
  useEffect(() => {
    if (!idToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')

    api
      .bootstrap(idToken)
      .then((nextSession) => {
        setSession(nextSession)
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

  const showMarketingHeader = !idToken || !session
  const routerBasename = workspaceRouterBasename()

  return (
    <AlertProvider>
      <BrowserRouter {...(routerBasename ? { basename: routerBasename } : {})}>
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
                  <WorkspaceSession
                    idToken={idToken}
                    session={session}
                    googleProfile={googleProfile}
                    api={api}
                    setSession={setSession}
                    setIdToken={setIdToken}
                    setErrorMessage={setErrorMessage}
                    onAuthExpired={handleAuthExpired}
                  />
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
                          <div className="flex justify-center pt-2">
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
  )
}

export default App
