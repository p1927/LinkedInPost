import { useEffect, useState } from 'react';
import type { BackendApi, SocialIntegration, SpreadsheetStatus, TelegramChatVerificationResult } from '@/services/backendApi';
import { SheetConnectionCard } from './SheetConnectionCard';
import { SocialAccountCard } from './SocialAccountCard';

interface ConnectionsPageProps {
  idToken: string;
  api: BackendApi;
  integrations: SocialIntegration[];
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail' | 'whatsapp' | 'youtube') => void;
  onDisconnect: (provider: string) => void;
  connecting: string | null;
}

type Tab = 'social' | 'sources' | 'messaging';

const SOCIAL_PROVIDERS: Array<{
  key: 'linkedin' | 'instagram' | 'youtube';
  label: string;
}> = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
];

const MESSAGING_PROVIDERS: Array<{
  key: 'gmail' | 'whatsapp';
  label: string;
}> = [
  { key: 'gmail', label: 'Gmail' },
  { key: 'whatsapp', label: 'WhatsApp' },
];

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'social', label: 'Social Channels' },
  { key: 'messaging', label: 'Messaging' },
  { key: 'sources', label: 'Data Sources' },
];

export function ConnectionsPage({
  idToken,
  api,
  integrations,
  onConnect,
  onDisconnect,
  connecting,
}: ConnectionsPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('social');
  const [sheetStatus, setSheetStatus] = useState<SpreadsheetStatus>({ accessible: false, title: '' });
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramVerifying, setTelegramVerifying] = useState(false);
  const [telegramResult, setTelegramResult] = useState<TelegramChatVerificationResult | null>(null);
  const [telegramError, setTelegramError] = useState('');
  const [localIntegrations, setLocalIntegrations] = useState<SocialIntegration[]>(integrations);

  useEffect(() => {
    setLocalIntegrations(integrations);
  }, [integrations]);

  useEffect(() => {
    api.getSpreadsheetStatus(idToken).then(setSheetStatus).catch(() => {});
  }, [idToken, api]);

  function getIntegration(provider: string): SocialIntegration | undefined {
    return localIntegrations.find((i) => i.provider === provider);
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

  const telegramIntegration = getIntegration('telegram');

  // Count connected integrations per tab for badge display
  const socialConnected = SOCIAL_PROVIDERS.filter(p => !!getIntegration(p.key)).length;
  const messagingConnected = [
    ...MESSAGING_PROVIDERS.filter(p => !!getIntegration(p.key)),
    ...(telegramIntegration ? [telegramIntegration] : []),
  ].length;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="shrink-0 px-6 py-5 border-b border-border/50 bg-canvas">
        <h1 className="text-lg font-semibold text-ink">Connections</h1>
        <p className="mt-0.5 text-sm text-muted">Manage your integrations and publishing channels</p>
      </div>

      {/* ── Tab navigation ──────────────────────────────────────── */}
      <div className="shrink-0 flex items-end gap-0 px-6 border-b border-border/50 bg-canvas">
        {TABS.map(tab => {
          const badge = tab.key === 'social' ? socialConnected : tab.key === 'messaging' ? messagingConnected : null;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                'relative flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'text-primary border-primary'
                  : 'text-muted border-transparent hover:text-ink hover:border-border',
              ].join(' ')}
            >
              {tab.label}
              {badge !== null && badge > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* Social Channels */}
        {activeTab === 'social' && (
          <div className="max-w-2xl">
            <p className="text-xs text-muted mb-5 leading-relaxed">
              Connect your social media accounts to publish content directly. Each connected platform appears as a channel option when scheduling posts.
            </p>
            <div className="flex flex-col gap-3">
              {SOCIAL_PROVIDERS.map(({ key, label }) => (
                <SocialAccountCard
                  key={key}
                  provider={key}
                  label={label}
                  integration={getIntegration(key)}
                  onConnect={() => onConnect(key)}
                  onDisconnect={() => onDisconnect(key)}
                  connecting={connecting === key}
                />
              ))}
            </div>
          </div>
        )}

        {/* Messaging */}
        {activeTab === 'messaging' && (
          <div className="max-w-2xl">
            <p className="text-xs text-muted mb-5 leading-relaxed">
              Connect messaging platforms to distribute content directly to your audience via inbox channels.
            </p>
            <div className="flex flex-col gap-3">
              {MESSAGING_PROVIDERS.map(({ key, label }) => (
                <SocialAccountCard
                  key={key}
                  provider={key}
                  label={label}
                  integration={getIntegration(key)}
                  onConnect={() => onConnect(key)}
                  onDisconnect={() => onDisconnect(key)}
                  connecting={connecting === key}
                />
              ))}

              {/* Telegram — manual verification flow */}
              {telegramIntegration ? (
                <SocialAccountCard
                  provider="telegram"
                  label="Telegram"
                  integration={telegramIntegration}
                  onConnect={() => {}}
                  onDisconnect={() => onDisconnect('telegram')}
                  connecting={false}
                  configuredLabel={telegramIntegration.displayName}
                />
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500 text-xs font-bold">
                      TG
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900">Telegram</p>
                      <p className="text-xs text-slate-500">Connect via Chat ID verification</p>
                    </div>
                    <span className="ml-auto rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium text-slate-500">
                      Not connected
                    </span>
                  </div>
                  <p className="mb-3 text-xs text-slate-500 leading-relaxed">
                    Enter your Telegram Chat ID to verify and connect your chat or channel.
                  </p>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="Chat ID (required)"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
                    />
                    <input
                      type="text"
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      placeholder="Bot token override (optional)"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyTelegram}
                      disabled={telegramVerifying || !telegramChatId.trim()}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    >
                      {telegramVerifying ? 'Verifying…' : 'Verify & Connect'}
                    </button>
                  </div>
                  {telegramError && (
                    <p className="mt-2 text-sm text-red-600">{telegramError}</p>
                  )}
                  {telegramResult && (
                    <p className="mt-2 text-sm text-emerald-600 font-medium">
                      Connected: {telegramResult.title || telegramResult.chatId} ({telegramResult.type})
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Sources */}
        {activeTab === 'sources' && (
          <div className="max-w-2xl">
            <p className="text-xs text-muted mb-5 leading-relaxed">
              Connect data sources to import topics, content ideas, and scheduling information into Channel Bot.
            </p>
            <SheetConnectionCard
              idToken={idToken}
              api={api}
              status={sheetStatus}
              onConnected={(title) =>
                setSheetStatus(title ? { accessible: true, title } : { accessible: false, title: '' })
              }
            />
          </div>
        )}

      </div>
    </div>
  );
}
