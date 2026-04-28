import { cn } from '@/lib/cn'
import { LinkedInLogo, InstagramLogo, GmailLogo, YouTubeLogo } from '@/pages/connections/providerLogos'
import type { SocialIntegration } from '@/services/backendApi'

interface Platform {
  id: 'linkedin' | 'instagram' | 'gmail' | 'youtube'
  label: string
  background: string
  lightBg?: boolean
  icon: React.ReactNode
}

const PLATFORMS: Platform[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    background: '#0A66C2',
    icon: <LinkedInLogo className="h-5 w-5" />,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    background: 'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)',
    icon: <InstagramLogo className="h-5 w-5" />,
  },
  {
    id: 'gmail',
    label: 'Gmail',
    background: '#ffffff',
    lightBg: true,
    icon: <GmailLogo className="h-5 w-4" />,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    background: '#FF0000',
    icon: <YouTubeLogo className="h-5 w-5" />,
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
    <div className="flex flex-col divide-y divide-border/50">
      {PLATFORMS.map((platform) => {
        const connected = connectedMap.get(platform.id)
        const isConnecting = connecting === platform.id

        return (
          <div key={platform.id} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1">
            {/* Icon */}
            <div className="relative shrink-0">
              {connected?.profilePicture ? (
                <img
                  src={connected.profilePicture}
                  alt={connected.displayName}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    platform.lightBg ? 'border border-gray-200 shadow-sm' : 'text-white',
                  )}
                  style={{ background: platform.background }}
                >
                  {platform.icon}
                </div>
              )}
              {connected && !connected.needsReauth && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <svg viewBox="0 0 12 12" className="h-2 w-2" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                </span>
              )}
              {connected?.needsReauth && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold">
                  !
                </span>
              )}
            </div>

            {/* Name + status */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink leading-tight">
                {connected ? connected.displayName || platform.label : platform.label}
              </p>
              {connected ? (
                <p className={cn('text-[11px] leading-tight', connected.needsReauth ? 'text-red-600' : 'text-emerald-600')}>
                  {connected.needsReauth ? 'Needs reconnect' : 'Connected'}
                </p>
              ) : (
                <p className="text-[11px] leading-tight text-muted">Not connected</p>
              )}
            </div>

            {/* Action button */}
            {connected ? (
              <button
                type="button"
                onClick={() => connected.needsReauth ? onConnect(platform.id) : onDisconnect(platform.id)}
                className={cn(
                  'shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer',
                  connected.needsReauth
                    ? 'border-red-300 text-red-600 hover:bg-red-50'
                    : 'border-border text-muted hover:border-rose-300 hover:text-rose-600',
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
                  'shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  isConnecting
                    ? 'border-border text-muted cursor-not-allowed'
                    : 'border-primary/40 text-primary hover:bg-primary/10 cursor-pointer',
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
