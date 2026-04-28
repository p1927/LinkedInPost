// frontend/src/components/dashboard/components/SettingsConnectionsCard.tsx
import { cn } from '../../../lib/cn'
import { ConnectAccountsGrid } from '../../../features/onboarding/ConnectAccountsGrid'
import type { SocialIntegration } from '../../../services/backendApi'

interface SettingsConnectionsCardProps {
  integrations: SocialIntegration[]
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail' | 'youtube') => void
  onDisconnect: (provider: string) => void
  connecting: string | null
  className?: string
}

export function SettingsConnectionsCard({
  integrations,
  onConnect,
  onDisconnect,
  connecting,
  className,
}: SettingsConnectionsCardProps) {
  return (
    <section
      className={cn('glass-panel rounded-2xl shadow-card border border-border/60', className)}
      aria-labelledby="settings-connections-heading"
    >
      <h2
        id="settings-connections-heading"
        className="border-b border-violet-200/60 px-4 py-3 font-heading text-base font-semibold text-ink"
      >
        Connected Accounts
      </h2>
      <p className="border-b border-violet-200/40 px-4 py-2.5 text-xs leading-relaxed text-muted">
        Connect your social accounts to post on your behalf.
      </p>
      <div className="p-4">
        <ConnectAccountsGrid
          integrations={integrations}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          connecting={connecting}
        />
      </div>
    </section>
  )
}
