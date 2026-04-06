import clsx from 'clsx';
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

const PROVIDER_COLORS: Record<string, string> = {
  linkedin: 'bg-[#0A66C2] text-white',
  instagram: 'bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white',
  gmail: 'bg-white text-[#EA4335] border border-border',
  telegram: 'bg-[#2AABEE] text-white',
  whatsapp: 'bg-[#25D366] text-white',
};

const PROVIDER_INITIALS: Record<string, string> = {
  linkedin: 'in',
  instagram: 'ig',
  gmail: 'G',
  telegram: 'tg',
  whatsapp: 'wa',
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

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
            PROVIDER_COLORS[provider],
          )}
          aria-hidden
        >
          {integration?.profilePicture ? (
            <img
              src={integration.profilePicture}
              alt={displayName}
              className="h-10 w-10 rounded-xl object-cover"
            />
          ) : (
            PROVIDER_INITIALS[provider]
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{label}</p>
          {displayName ? (
            <p className="truncate text-xs text-muted">{displayName}</p>
          ) : null}
        </div>
        <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', statusClass)}>
          {statusLabel}
        </span>
      </div>

      <div className="flex gap-2">
        {!isConnected ? (
          <button
            type="button"
            onClick={onConnect}
            disabled={connecting}
            className="flex-1 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {connecting ? 'Connecting…' : 'Connect'}
          </button>
        ) : (
          <>
            {needsReauth && (
              <button
                type="button"
                onClick={onConnect}
                disabled={connecting}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                Re-authorize
              </button>
            )}
            <button
              type="button"
              onClick={onConnect}
              disabled={connecting}
              className="flex-1 rounded-xl border border-border bg-white/50 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-white/80 disabled:opacity-50"
            >
              Switch account
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              className="rounded-xl border border-border bg-white/50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}
