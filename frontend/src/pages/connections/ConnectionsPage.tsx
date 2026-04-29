import { useEffect, useState } from 'react';
import clsx from 'clsx';
import type {
  BackendApi,
  SocialIntegration,
  SpreadsheetStatus,
  TelegramChatVerificationResult,
} from '@/services/backendApi';
import { SheetConnectionCard } from './SheetConnectionCard';
import { Button } from '@/components/ui/button';
import {
  LinkedInLogo,
  InstagramLogo,
  GmailLogo,
  TelegramLogo,
  WhatsAppLogo,
  YouTubeLogo,
} from './providerLogos';

// ── Types ─────────────────────────────────────────────────────────────────────

type OAuthProvider = 'linkedin' | 'instagram' | 'youtube' | 'gmail' | 'whatsapp';
type AnyProvider = OAuthProvider | 'telegram' | 'google-sheets';

interface ProviderConfig {
  key: AnyProvider;
  label: string;
  description: string;
  group: 'Social Channels' | 'Messaging' | 'Data Sources';
}

// ── Provider metadata ─────────────────────────────────────────────────────────

const PROVIDERS: ProviderConfig[] = [
  {
    key: 'linkedin',
    label: 'LinkedIn',
    description: 'Publish posts directly to your LinkedIn profile or company page. Each connected account appears as a publishing channel when scheduling content.',
    group: 'Social Channels',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    description: 'Schedule and publish content to your Instagram business account. Requires a business or creator account linked to a Facebook Page.',
    group: 'Social Channels',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    description: 'Upload and manage video content on your YouTube channel. Supports automatic publishing of video posts and Shorts.',
    group: 'Social Channels',
  },
  {
    key: 'gmail',
    label: 'Gmail',
    description: 'Distribute content to your subscribers directly via email. Connect your Gmail account to send newsletter-style posts.',
    group: 'Messaging',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    description: 'Send content to WhatsApp contacts, groups, and broadcast lists. Use the WhatsApp Business API to reach your audience.',
    group: 'Messaging',
  },
  {
    key: 'telegram',
    label: 'Telegram',
    description: 'Publish content to a Telegram channel or group. Connect via Chat ID verification — no OAuth required.',
    group: 'Messaging',
  },
  {
    key: 'google-sheets',
    label: 'Google Sheets',
    description: 'Import topics, content ideas, and scheduling data directly from a spreadsheet. Link any Google Sheet to use as a content source.',
    group: 'Data Sources',
  },
];

const GROUPS: Array<{ label: string; keys: AnyProvider[] }> = [
  { label: 'Social', keys: ['linkedin', 'instagram', 'youtube'] },
  { label: 'Messaging', keys: ['gmail', 'whatsapp', 'telegram'] },
  { label: 'Sources', keys: ['google-sheets'] },
];

const LOGO_COMPONENT: Record<string, React.ComponentType<{ className?: string }>> = {
  linkedin: LinkedInLogo,
  instagram: InstagramLogo,
  gmail: GmailLogo,
  telegram: TelegramLogo,
  whatsapp: WhatsAppLogo,
  youtube: YouTubeLogo,
};

const ICON_BG: Record<string, string> = {
  linkedin: 'bg-[#0A66C2]',
  instagram: 'bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]',
  gmail: 'bg-white border border-border',
  telegram: 'bg-[#26A5E4]',
  whatsapp: 'bg-[#25D366]',
  youtube: 'bg-[#FF0000]',
  'google-sheets': 'bg-[#0F9D58]',
};

const ICON_TEXT: Record<string, string> = {
  linkedin: 'text-white',
  instagram: 'text-white',
  gmail: 'text-[#EA4335]',
  telegram: 'text-white',
  whatsapp: 'text-white',
  youtube: 'text-white',
  'google-sheets': 'text-white',
};

// ── Inline Google Sheets SVG ──────────────────────────────────────────────────

function GoogleSheetsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zm-3.41 1.046h3.41V15.5H7.908v-1.91zm5.319-1.046h3.433v-1.909h-3.433v1.91zm0 2.955h3.433V13.59h-3.433V15.5zm4.977 4.977H5.796V3.523h7.728L18.5 8.429l-.005 12.048H17.6zM13.5 3.5v5H18.5L13.5 3.5zm-9.704-.977v18.954h18.408V8.3L14.5 2H3.796z" />
    </svg>
  );
}

// ── Page props ────────────────────────────────────────────────────────────────

interface ConnectionsPageProps {
  idToken: string;
  api: BackendApi;
  integrations: SocialIntegration[];
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail' | 'whatsapp' | 'youtube') => void;
  onDisconnect: (provider: string) => void;
  connecting: string | null;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ConnectionsPage({
  idToken,
  api,
  integrations,
  onConnect,
  onDisconnect,
  connecting,
}: ConnectionsPageProps) {
  const [selected, setSelected] = useState<AnyProvider>('linkedin');
  const [sheetStatus, setSheetStatus] = useState<SpreadsheetStatus>({ accessible: false, title: '' });
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramVerifying, setTelegramVerifying] = useState(false);
  const [telegramResult, setTelegramResult] = useState<TelegramChatVerificationResult | null>(null);
  const [telegramError, setTelegramError] = useState('');
  const [localIntegrations, setLocalIntegrations] = useState<SocialIntegration[]>(integrations);

  useEffect(() => setLocalIntegrations(integrations), [integrations]);

  useEffect(() => {
    api.getSpreadsheetStatus(idToken).then(setSheetStatus).catch(() => {});
  }, [idToken, api]);

  function getIntegration(provider: string): SocialIntegration | undefined {
    return localIntegrations.find((i) => i.provider === provider);
  }

  function getStatus(key: AnyProvider): 'connected' | 'needs-reauth' | 'disconnected' {
    if (key === 'google-sheets') return sheetStatus.accessible ? 'connected' : 'disconnected';
    const integration = getIntegration(key);
    if (!integration) return 'disconnected';
    if (integration.needsReauth) return 'needs-reauth';
    return 'connected';
  }

  async function handleVerifyTelegram() {
    if (!telegramChatId.trim()) return;
    setTelegramVerifying(true);
    setTelegramError('');
    setTelegramResult(null);
    try {
      const result = await api.verifyTelegramChat(
        idToken,
        telegramChatId.trim(),
        telegramBotToken.trim() || undefined,
      );
      setTelegramResult(result);
      const updated = await api.getIntegrations(idToken);
      setLocalIntegrations(updated);
    } catch (err: unknown) {
      setTelegramError((err as Error)?.message ?? 'Telegram verification failed');
    } finally {
      setTelegramVerifying(false);
    }
  }

  const connectedCount = PROVIDERS.filter((p) => getStatus(p.key) === 'connected').length;
  const selectedConfig = PROVIDERS.find((p) => p.key === selected)!;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 flex flex-col border-r border-border overflow-y-auto bg-canvas">
        {/* Sidebar header */}
        <div className="px-4 pt-6 pb-3">
          <p className="text-[11px] font-medium text-muted">
            {connectedCount} of {PROVIDERS.length} connected
          </p>
        </div>

        {/* Provider groups */}
        <nav className="flex flex-col px-2 pb-4 gap-4">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted/70">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.keys.map((key) => {
                  const status = getStatus(key);
                  const config = PROVIDERS.find((p) => p.key === key)!;
                  const Logo = LOGO_COMPONENT[key];
                  const isActive = selected === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(key)}
                      className={clsx(
                        'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 cursor-pointer',
                        isActive
                          ? 'bg-violet-50 dark:bg-violet-950/40'
                          : 'hover:bg-surface-muted',
                      )}
                    >
                      {/* Brand icon */}
                      <div
                        className={clsx(
                          'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md',
                          ICON_BG[key],
                          ICON_TEXT[key],
                        )}
                        aria-hidden
                      >
                        {key === 'google-sheets' ? (
                          <GoogleSheetsLogo className="h-3.5 w-3.5" />
                        ) : Logo ? (
                          <Logo className="h-3 w-3" />
                        ) : null}
                      </div>

                      {/* Label */}
                      <span
                        className={clsx(
                          'min-w-0 flex-1 truncate text-xs font-medium leading-none',
                          isActive ? 'text-violet-800 dark:text-violet-300' : 'text-ink',
                        )}
                      >
                        {config.label}
                      </span>

                      {/* Status dot */}
                      {status === 'connected' && (
                        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-emerald-500" aria-label="Connected" />
                      )}
                      {status === 'needs-reauth' && (
                        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-amber-500" aria-label="Needs reauthorization" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Right detail panel ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-canvas">
        <div className="max-w-md px-10 py-9">
          {selected === 'google-sheets' ? (
            <SheetDetail
              idToken={idToken}
              api={api}
              status={sheetStatus}
              onConnected={(title) =>
                setSheetStatus(title ? { accessible: true, title } : { accessible: false, title: '' })
              }
            />
          ) : selected === 'telegram' ? (
            <TelegramDetail
              integration={getIntegration('telegram')}
              chatId={telegramChatId}
              botToken={telegramBotToken}
              verifying={telegramVerifying}
              result={telegramResult}
              error={telegramError}
              onChatIdChange={setTelegramChatId}
              onBotTokenChange={setTelegramBotToken}
              onVerify={handleVerifyTelegram}
              onDisconnect={() => onDisconnect('telegram')}
            />
          ) : (
            <OAuthDetail
              provider={selected as OAuthProvider}
              config={selectedConfig}
              integration={getIntegration(selected)}
              onConnect={() => onConnect(selected as OAuthProvider)}
              onDisconnect={() => onDisconnect(selected)}
              connecting={connecting === selected}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ── Detail panel: OAuth provider ──────────────────────────────────────────────

interface OAuthDetailProps {
  provider: OAuthProvider;
  config: ProviderConfig;
  integration: SocialIntegration | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
}

function OAuthDetail({ provider, config, integration, onConnect, onDisconnect, connecting }: OAuthDetailProps) {
  const Logo = LOGO_COMPONENT[provider];
  const isConnected = Boolean(integration);
  const needsReauth = integration?.needsReauth ?? false;
  const displayName = integration?.displayName ?? '';

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className={clsx(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm',
            integration?.profilePicture ? '' : clsx(ICON_BG[provider], ICON_TEXT[provider]),
          )}
          aria-hidden
        >
          {integration?.profilePicture ? (
            <img
              src={integration.profilePicture}
              alt={displayName}
              className="h-14 w-14 rounded-2xl object-cover"
            />
          ) : Logo ? (
            <Logo className="h-7 w-7" />
          ) : null}
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-ink tracking-tight leading-none">
              {config.label}
            </h2>
            <StatusBadge status={isConnected && !needsReauth ? 'connected' : needsReauth ? 'needs-reauth' : 'disconnected'} />
          </div>
          {displayName && (
            <p className="mt-1.5 text-sm text-muted">{displayName}</p>
          )}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Description */}
      <p className="text-sm text-muted leading-relaxed">{config.description}</p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!isConnected ? (
          <Button
            variant="primary"
            size="sm"
            onClick={onConnect}
            disabled={connecting}
            className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {connecting ? 'Connecting…' : `Connect ${config.label}`}
          </Button>
        ) : (
          <>
            {needsReauth && (
              <Button
                variant="primary"
                size="sm"
                onClick={onConnect}
                disabled={connecting}
                className="cursor-pointer bg-amber-500 hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Re-authorize
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onConnect}
              disabled={connecting}
              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Switch account
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
            >
              Disconnect
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Detail panel: Telegram ────────────────────────────────────────────────────

interface TelegramDetailProps {
  integration: SocialIntegration | undefined;
  chatId: string;
  botToken: string;
  verifying: boolean;
  result: TelegramChatVerificationResult | null;
  error: string;
  onChatIdChange: (v: string) => void;
  onBotTokenChange: (v: string) => void;
  onVerify: () => void;
  onDisconnect: () => void;
}

function TelegramDetail({
  integration,
  chatId,
  botToken,
  verifying,
  result,
  error,
  onChatIdChange,
  onBotTokenChange,
  onVerify,
  onDisconnect,
}: TelegramDetailProps) {
  const isConnected = Boolean(integration);

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#26A5E4] text-white shadow-sm"
          aria-hidden
        >
          <TelegramLogo className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-ink tracking-tight leading-none">Telegram</h2>
            <StatusBadge status={isConnected ? 'connected' : 'disconnected'} />
          </div>
          {integration?.displayName && (
            <p className="mt-1.5 text-sm text-muted">{integration.displayName}</p>
          )}
        </div>
      </div>

      <div className="h-px bg-border" />

      <p className="text-sm text-muted leading-relaxed">
        Publish content to a Telegram channel or group. Connect via Chat ID verification — no OAuth required.
      </p>

      {isConnected ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDisconnect}
          className="w-fit cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
        >
          Disconnect
        </Button>
      ) : (
        <div className="flex flex-col gap-2.5">
          <input
            type="text"
            value={chatId}
            onChange={(e) => onChatIdChange(e.target.value)}
            placeholder="Chat ID (required)"
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition-colors"
          />
          <input
            type="text"
            value={botToken}
            onChange={(e) => onBotTokenChange(e.target.value)}
            placeholder="Bot token override (optional)"
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition-colors"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={onVerify}
            disabled={verifying || !chatId.trim()}
            className="mt-0.5 w-fit cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {verifying ? 'Verifying…' : 'Verify & Connect'}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && (
            <p className="text-sm text-emerald-600 font-medium">
              Connected: {result.title || result.chatId} ({result.type})
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Detail panel: Google Sheets ───────────────────────────────────────────────

interface SheetDetailProps {
  idToken: string;
  api: BackendApi;
  status: SpreadsheetStatus;
  onConnected: (title: string) => void;
}

function SheetDetail({ idToken, api, status, onConnected }: SheetDetailProps) {
  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0F9D58] text-white shadow-sm"
          aria-hidden
        >
          <GoogleSheetsLogo className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-ink tracking-tight leading-none">Google Sheets</h2>
            <StatusBadge status={status.accessible ? 'connected' : 'disconnected'} />
          </div>
          {status.accessible && status.title && (
            <p className="mt-1.5 text-sm text-muted">{status.title}</p>
          )}
        </div>
      </div>

      <div className="h-px bg-border" />

      <p className="text-sm text-muted leading-relaxed">
        Import topics, content ideas, and scheduling data directly from a spreadsheet. Link any Google Sheet to use as a content source.
      </p>

      {/* Reuse the existing sheet card but only show its action/form portion */}
      <SheetConnectionCard
        idToken={idToken}
        api={api}
        status={status}
        onConnected={onConnected}
        headless
      />
    </div>
  );
}

// ── Shared status badge ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'connected' | 'needs-reauth' | 'disconnected' }) {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Connected
      </span>
    );
  }
  if (status === 'needs-reauth') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Needs reauth
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-surface-muted border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted">
      Not connected
    </span>
  );
}
