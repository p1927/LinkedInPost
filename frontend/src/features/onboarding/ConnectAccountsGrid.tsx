import { cn } from '@/lib/cn'
import { LinkedInLogo, InstagramLogo, GmailLogo, YouTubeLogo } from '@/pages/connections/providerLogos'
import type { SocialIntegration } from '@/services/backendApi'

interface Platform {
  id: 'linkedin' | 'instagram' | 'gmail' | 'youtube'
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
    icon: <LinkedInLogo className="h-6 w-6" />,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    background: 'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)',
    icon: <InstagramLogo className="h-6 w-6" />,
  },
  {
    id: 'gmail',
    label: 'Gmail',
    background: '#ffffff',
    lightBg: true,
    icon: <GmailLogo className="h-6 w-5" />,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    background: '#FF0000',
    icon: <YouTubeLogo className="h-6 w-6" />,
  },
]

interface ConnectAccountsGridProps {
  integrations: SocialIntegration[]
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail' | 'youtube') => void
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
