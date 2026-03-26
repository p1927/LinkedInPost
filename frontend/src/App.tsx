import { useEffect, useMemo, useState } from 'react'
import { Share2, Sparkles, TableProperties } from 'lucide-react'
import { GoogleLoginButton } from './components/GoogleLoginButton'
import { Dashboard } from './components/dashboard'
import { AlertProvider } from './components/AlertProvider'
import { WorkspaceShell } from './components/workspace/WorkspaceShell'
import { type WorkspaceNavPage } from './components/workspace/AppSidebar'
import { BackendApi, isAuthErrorMessage, type AppSession } from './services/backendApi'
import { parseGoogleIdTokenProfile } from './utils/googleIdTokenProfile'

const STORED_ID_TOKEN_KEY = 'google_id_token'

function getBackendHostLabel(endpointUrl: string): string {
  try {
    return new URL(endpointUrl).host
  } catch {
    return endpointUrl || 'the configured backend URL'
  }
}

function App() {
  const api = useMemo(() => new BackendApi(), [])
  const [idToken, setIdToken] = useState<string | null>(localStorage.getItem(STORED_ID_TOKEN_KEY))
  const googleProfile = useMemo(() => parseGoogleIdTokenProfile(idToken), [idToken])
  const [session, setSession] = useState<AppSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [workspacePage, setWorkspacePage] = useState<WorkspaceNavPage>('topics')

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
          localStorage.removeItem(STORED_ID_TOKEN_KEY)
          setIdToken(null)
          setSession(null)
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [api, idToken])

  useEffect(() => {
    if (session && !session.isAdmin && workspacePage === 'settings') {
      setWorkspacePage('topics')
    }
  }, [session, workspacePage])

  const handleLogin = (newToken: string) => {
    setErrorMessage('')
    setIdToken(newToken || null)
  }

  const handleAuthExpired = () => {
    localStorage.removeItem(STORED_ID_TOKEN_KEY)
    setIdToken(null)
    setSession(null)
    setErrorMessage('Your Google session expired. Sign in again to continue.')
  }

  const showMarketingHeader = !idToken || !session

  return (
    <AlertProvider>
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
              {idToken ? <GoogleLoginButton onLogin={handleLogin} /> : null}
            </div>
          </header>
        ) : null}

        {idToken && session ? (
          <WorkspaceShell
            session={session}
            googleProfile={googleProfile}
            workspacePage={workspacePage}
            onWorkspacePageChange={setWorkspacePage}
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
              workspacePage={workspacePage}
              onSaveConfig={async (config) => {
                const updatedConfig = await api.saveConfig(idToken, config)
                setSession((current) => (current ? { ...current, config: updatedConfig } : current))
                return updatedConfig
              }}
              onAuthExpired={handleAuthExpired}
            />
          </WorkspaceShell>
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
                    <p className="mt-2 text-sm text-muted">Use an approved Google account to open the workspace.</p>
                  </div>
                  <div className="flex justify-center pt-2">
                    <GoogleLoginButton onLogin={handleLogin} />
                  </div>
                  {errorMessage ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">
                      {errorMessage}
                    </p>
                  ) : null}
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
      </div>
    </AlertProvider>
  )
}

export default App
