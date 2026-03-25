import { useEffect, useMemo, useState } from 'react'
import { GoogleLoginButton } from './components/GoogleLoginButton'
import { Dashboard } from './components/Dashboard'
import { BackendApi, isAuthErrorMessage, type AppSession } from './services/backendApi'

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
  const [session, setSession] = useState<AppSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!idToken) {
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

  return (
    <div className="min-h-screen flex w-full flex-col bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <h1 className="m-0 text-xl font-bold text-gray-900">LinkedIn Bot</h1>
          </div>
          <GoogleLoginButton onLogin={handleLogin} />
        </div>
      </header>

      <main className="flex flex-1 flex-col pt-8">
        {!api.isConfigured() ? (
          <div className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-4 text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Backend URL required</h2>
            <p className="text-gray-600">
              Set <code>VITE_WORKER_URL</code> to the deployed Cloudflare Worker URL, then rebuild the frontend.
            </p>
          </div>
        ) : !idToken ? (
          <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Welcome to your LinkedIn Bot</h2>
            <p className="mb-4 text-gray-600">
              Sign in with an approved Google account to access the shared content calendar and run the bot against the owner-managed Google resources.
            </p>
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
          </div>
        ) : loading ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-gray-500">Loading shared workspace...</p>
          </div>
        ) : session ? (
          <Dashboard
            idToken={idToken}
            session={session}
            api={api}
            onSaveConfig={async (config) => {
              const updatedConfig = await api.saveConfig(idToken, config)
              setSession((current) => (current ? { ...current, config: updatedConfig } : current))
              return updatedConfig
            }}
            onAuthExpired={handleAuthExpired}
          />
        ) : (
          <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Unable to start the session</h2>
            <p className="text-gray-600">{errorMessage || 'Verify the Cloudflare Worker deployment and try again.'}</p>
            <p className="mt-3 text-sm text-gray-500">
              Current backend: {getBackendHostLabel(import.meta.env.VITE_WORKER_URL || '')}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App