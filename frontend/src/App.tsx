import { useState, useEffect } from 'react'
import { GoogleLoginButton } from './components/GoogleLoginButton'
import { Dashboard } from './components/Dashboard'
import { ConfigService, type BotConfig, loadConfigFromEnv } from './services/configService'

const EMPTY_CONFIG: BotConfig = { spreadsheetId: '', githubRepo: '', githubToken: '' }

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('google_access_token'))
  const [config, setConfig] = useState<BotConfig>(() => loadConfigFromEnv() || EMPTY_CONFIG)
  const [configLoading, setConfigLoading] = useState(false)
  const [configSource, setConfigSource] = useState<'env' | 'drive' | 'none'>(loadConfigFromEnv() ? 'env' : 'none')

  // Load config from Drive whenever the user logs in (unless already loaded from env)
  useEffect(() => {
    if (!token) {
      const envConfig = loadConfigFromEnv()
      setConfig(envConfig || EMPTY_CONFIG)
      setConfigSource(envConfig ? 'env' : 'none')
      return
    }

    // If config is already from environment variables, don't override it from Drive
    if (configSource === 'env') {
      setConfigLoading(false)
      return
    }

    setConfigLoading(true)
    const service = new ConfigService(token)
    service
      .loadConfig()
      .then(loaded => {
        if (loaded) {
          setConfig(loaded)
          setConfigSource('drive')
        } else {
          // One-time migration: pre-fill spreadsheetId from old localStorage key
          const legacyId = localStorage.getItem('spreadsheet_id') || ''
          if (legacyId) setConfig(c => ({ ...c, spreadsheetId: legacyId }))
        }
      })
      .catch(err => {
        // Expired token — force re-login
        if (err?.response?.status === 401) {
          localStorage.removeItem('google_access_token')
          setToken(null)
        }
        console.error('Failed to load config from Drive:', err)
      })
      .finally(() => {
        setConfigLoading(false)
        // Remove any legacy sensitive keys that may have been stored previously
        localStorage.removeItem('github_token')
        localStorage.removeItem('github_repo')
      })
  }, [token])

  const handleLogin = (newToken: string) => {
    setToken(newToken || null)
  }

  const handleSaveConfig = async (newConfig: BotConfig) => {
    if (!token) return
    const service = new ConfigService(token)
    try {
      await service.saveConfig(newConfig)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message)
      }
      throw error
    }
    setConfig(newConfig)
    // Clean up any legacy localStorage key after first Drive save
    localStorage.removeItem('spreadsheet_id')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full text-gray-900">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 m-0">LinkedIn Bot</h1>
          </div>
          <GoogleLoginButton onLogin={handleLogin} />
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col pt-8">
        {!token ? (
          <div className="flex flex-col items-center justify-center flex-1 max-w-md mx-auto text-center px-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Welcome to your LinkedIn Bot</h2>
            <p className="text-gray-600 mb-8">
              Sign in with your Google account to access your content calendar,
              generate AI posts, and manage your publishing queue.
            </p>
          </div>
        ) : configLoading ? (
          <div className="flex justify-center items-center flex-1">
            <p className="text-gray-500">Loading configuration...</p>
          </div>
        ) : (
          <Dashboard
            token={token}
            config={config}
            onSaveConfig={handleSaveConfig}
            configSource={configSource}
          />
        )}
      </main>
    </div>
  )
}

export default App