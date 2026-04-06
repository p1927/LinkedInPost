import { cn } from '@/lib/cn'
import type { SocialIntegration } from '@/services/backendApi'

interface Platform {
  id: 'linkedin' | 'instagram' | 'gmail'
  label: string
  /** CSS background value — supports gradients for Instagram. */
  background: string
  /** When true, the icon circle uses a white background with a colored icon instead of a colored bg with white icon. */
  lightBg?: boolean
  icon: React.ReactNode
}

const PLATFORMS: Platform[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    background: '#0A66C2',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="white">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    background: 'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
  {
    id: 'gmail',
    label: 'Gmail',
    background: '#ffffff',
    lightBg: true,
    icon: (
      <svg viewBox="0 0 24 18" className="h-6 w-5" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 2.4C0 1.074 1.074 0 2.4 0h19.2C22.926 0 24 1.074 24 2.4v13.2C24 16.926 22.926 18 21.6 18H2.4C1.074 18 0 16.926 0 15.6V2.4z" fill="#f2f2f2"/>
        <path d="M0 2.4L12 11.4 24 2.4" fill="none" stroke="#EA4335" strokeWidth="1.5"/>
        <path d="M0 2.4v13.2h4.8V7.2L12 12l7.2-4.8v8.4H24V2.4L12 11.4z" fill="#4285F4"/>
        <path d="M0 2.4v13.2h4.8V7.2L12 12V0L0 2.4z" fill="#34A853"/>
        <path d="M24 2.4v13.2h-4.8V7.2L12 12V0L24 2.4z" fill="#FBBC05"/>
        <path d="M0 2.4L12 0l12 2.4L12 11.4z" fill="#EA4335"/>
      </svg>
    ),
  },
]

interface ConnectAccountsGridProps {
  integrations: SocialIntegration[]
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail') => void
  onDisconnect: (provider: string) => void
  connecting: string | null
}

export function ConnectAccountsGrid({
  integrations,
  onConnect,
  onDisconnect,
  connecting,
}: ConnectAccountsGridProps) {
  const connectedMap = new Map(integrations.map((i) => [i.provider, i]))

  return (
    <div className="grid grid-cols-3 gap-3">
      {PLATFORMS.map((platform) => {
        const connected = connectedMap.get(platform.id)
        const isConnecting = connecting === platform.id

        return (
          <div
            key={platform.id}
            className={cn(
              'glass-inset flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all',
              connected
                ? 'border-success-border bg-success-surface'
                : 'border-violet-200/45 hover:bg-white/45',
            )}
          >
            {/* Avatar or platform icon */}
            <div className="relative">
              {connected?.profilePicture ? (
                <img
                  src={connected.profilePicture}
                  alt={connected.displayName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    platform.lightBg ? 'border border-gray-200 shadow-sm' : '',
                  )}
                  style={{ background: platform.background }}
                >
                  {platform.icon}
                </div>
              )}
              {connected && !connected.needsReauth && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-success-ink text-white">
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                </span>
              )}
              {connected?.needsReauth && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                  !
                </span>
              )}
            </div>

            <span className="text-xs font-medium text-ink">
              {connected ? connected.displayName || platform.label : platform.label}
            </span>

            {connected ? (
              <button
                type="button"
                onClick={() => connected.needsReauth ? onConnect(platform.id) : onDisconnect(platform.id)}
                className={cn(
                  'rounded-lg border px-2 py-0.5 text-[10px] transition-colors',
                  connected.needsReauth
                    ? 'border-red-300 text-red-600 hover:bg-red-50 font-medium'
                    : 'border-border text-muted hover:border-red-300 hover:text-red-600',
                )}
              >
                {connected.needsReauth ? 'Reconnect' : 'Disconnect'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onConnect(platform.id)}
                disabled={isConnecting}
                className={cn(
                  'rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-colors',
                  isConnecting
                    ? 'border-border text-muted cursor-not-allowed'
                    : 'border-primary/40 text-primary hover:bg-primary/10',
                )}
              >
                {isConnecting ? 'Connecting…' : 'Connect'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
