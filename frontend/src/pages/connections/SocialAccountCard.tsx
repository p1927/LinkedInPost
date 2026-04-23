import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import type { SocialIntegration } from '@/services/backendApi';
import { LinkedInLogo, InstagramLogo, GmailLogo, TelegramLogo, WhatsAppLogo } from './providerLogos';

interface SocialAccountCardProps {
  provider: 'linkedin' | 'instagram' | 'gmail' | 'telegram' | 'whatsapp';
  label: string;
  integration: SocialIntegration | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
  /** Optional — shown for Telegram/WhatsApp instead of OAuth name */
  configuredLabel?: string;
}

const PROVIDER_LOGO: Record<string, React.ComponentType<{ className?: string }>> = {
  linkedin: LinkedInLogo,
  instagram: InstagramLogo,
  gmail: GmailLogo,
  telegram: TelegramLogo,
  whatsapp: WhatsAppLogo,
};

const PROVIDER_ICON_CLASS: Record<string, string> = {
  linkedin: 'bg-[#0A66C2] text-white',
  instagram: 'bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white',
  gmail: 'bg-[#EA4335] text-white',
  telegram: 'bg-[#2AABEE] text-white',
  whatsapp: 'bg-[#25D366] text-white',
};

export function SocialAccountCard({
  provider,
  label,
  integration,
  onConnect,
  onDisconnect,
  connecting,
  configuredLabel,
}: SocialAccountCardProps) {
  const isConnected = Boolean(integration);
  const needsReauth = integration?.needsReauth ?? false;
  const displayName = integration?.displayName || configuredLabel || '';

  let statusLabel = 'Not connected';
  let statusClass = 'bg-slate-100 text-slate-500';
  if (isConnected && needsReauth) {
    statusLabel = 'Needs reauth';
    statusClass = 'bg-amber-100 text-amber-700';
  } else if (isConnected) {
    statusLabel = 'Connected';
    statusClass = 'bg-emerald-100 text-emerald-700';
  }

  const Logo = PROVIDER_LOGO[provider];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Brand logo container */}
        <div
          className={clsx(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            integration?.profilePicture ? '' : PROVIDER_ICON_CLASS[provider],
          )}
          aria-hidden
        >
          {integration?.profilePicture ? (
            <img
              src={integration.profilePicture}
              alt={displayName}
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <Logo className="h-6 w-6" />
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
          {displayName ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">{displayName}</p>
          ) : null}
        </div>

        {/* Status badge */}
        <span
          className={clsx(
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
            statusClass,
          )}
        >
          {statusLabel}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!isConnected ? (
          <Button
            variant="primary"
            size="sm"
            onClick={onConnect}
            disabled={connecting}
            className="flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {connecting ? 'Connecting…' : 'Connect'}
          </Button>
        ) : (
          <>
            {needsReauth && (
              <Button
                variant="primary"
                size="sm"
                onClick={onConnect}
                disabled={connecting}
                className="flex-1 cursor-pointer bg-amber-500 hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Re-authorize
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onConnect}
              disabled={connecting}
              className="flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Switch account
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              Disconnect
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
