import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import type { SocialIntegration } from '@/services/backendApi';

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

function LinkedInLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function GmailLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  );
}

function TelegramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
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
