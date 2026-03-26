import { useEffect, useMemo, useState } from 'react'
import { GoogleLoginButton } from './components/GoogleLoginButton'
import { Dashboard } from './components/dashboard'
import { AlertProvider } from './components/AlertProvider'
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
    <AlertProvider>
      <div className="min-h-screen flex w-full flex-col bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 inset-x-0 w-full bg-white border-b border-slate-200 z-50 px-4 sm:px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex w-full items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white text-[11px] font-bold tracking-tight">CB</span>
            </div>
            <h1 className="text-sm font-semibold text-slate-800 tracking-tight">Channel Bot</h1>
          </div>
          {idToken && <GoogleLoginButton onLogin={handleLogin} />}
        </div>
      </header>

      <main className="flex flex-1 flex-col pt-5 pb-10 w-full max-w-[1600px] mx-auto">
        {!api.isConfigured() ? (
          <div className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-4 text-center">
            <h2 className="mb-4 text-2xl font-bold text-deep-indigo font-heading">Backend URL required</h2>
            <p className="text-slate-600">
              Set <code>VITE_WORKER_URL</code> to the deployed Cloudflare Worker URL, then rebuild the frontend.
            </p>
          </div>
        ) : !idToken ? (
          <div className="flex flex-1 flex-col lg:flex-row items-center justify-center px-6 lg:px-12 gap-12 lg:gap-24 min-h-[calc(100vh-140px)]">
            <div className="flex-1 max-w-2xl text-left space-y-8">
              <h2 className="text-4xl lg:text-5xl font-extrabold text-slate-900 font-heading tracking-tight leading-tight">
                Automate your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">omnichannel</span> content pipeline.
              </h2>
              <ul className="space-y-6 text-lg text-slate-600">
                <li className="flex items-start gap-4">
                  <div className="bg-emerald-100 p-2.5 rounded-xl shrink-0 mt-0.5">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <strong className="block text-slate-900 font-semibold mb-1">Source from Google Sheets</strong>
                    Manage your content calendar entirely from a shared spreadsheet.
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-indigo-100 p-2.5 rounded-xl shrink-0 mt-0.5">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div>
                    <strong className="block text-slate-900 font-semibold mb-1">AI-Powered Generation</strong>
                    Automatically draft, refine, and select variants using integrated models.
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-sky-100 p-2.5 rounded-xl shrink-0 mt-0.5">
                    <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </div>
                  <div>
                    <strong className="block text-slate-900 font-semibold mb-1">Omnichannel Delivery</strong>
                    Publish directly to LinkedIn, Instagram, Telegram, and WhatsApp.
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="w-full max-w-md lg:w-[40%] bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 p-8 sm:p-10">
              <div className="text-center space-y-6">
                <div className="bg-primary/5 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 font-heading">Welcome Back</h3>
                  <p className="text-slate-500 mt-2">Sign in to access your workspace.</p>
                </div>
                
                <div className="pt-4 pb-2 flex justify-center">
                  <div className="scale-110">
                    <GoogleLoginButton onLogin={handleLogin} />
                  </div>
                </div>
                
                {errorMessage ? (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                    {errorMessage}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
              <p className="text-slate-500">Loading shared workspace...</p>
            </div>
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
            <h2 className="mb-4 text-2xl font-bold text-deep-indigo font-heading">Unable to start the session</h2>
            <p className="text-slate-600">{errorMessage || 'Verify the Cloudflare Worker deployment and try again.'}</p>
            <p className="mt-3 text-sm text-slate-500">
              Current backend: {getBackendHostLabel(import.meta.env.VITE_WORKER_URL || '')}
            </p>
          </div>
        )}
      </main>
    </div>
    </AlertProvider>
  )
}

export default App