// frontend/src/features/onboarding/ConnectAccountsGrid.tsx
import { cn } from '@/lib/cn'
import type { SocialIntegration } from '@/services/backendApi'

interface Platform {
  id: 'linkedin' | 'instagram' | 'gmail'
  label: string
  color: string
  icon: React.ReactNode
}

const PLATFORMS: Platform[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
  {
    id: 'gmail',
    label: 'Gmail',
    color: '#EA4335',
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
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
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: platform.color }}
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
