import { useEffect, useState } from 'react';
import type { BackendApi, SocialIntegration, SpreadsheetStatus, TelegramChatVerificationResult } from '@/services/backendApi';
import { SheetConnectionCard } from './SheetConnectionCard';
import { SocialAccountCard } from './SocialAccountCard';

interface ConnectionsPageProps {
  idToken: string;
  api: BackendApi;
  integrations: SocialIntegration[];
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail' | 'whatsapp') => void;
  onDisconnect: (provider: string) => void;
  connecting: string | null;
}

const SOCIAL_PROVIDERS: Array<{
  key: 'linkedin' | 'instagram' | 'gmail' | 'whatsapp';
  label: string;
}> = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'gmail', label: 'Gmail' },
  { key: 'whatsapp', label: 'WhatsApp' },
];

export function ConnectionsPage({
  idToken,
  api,
  integrations,
  onConnect,
  onDisconnect,
  connecting,
}: ConnectionsPageProps) {
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Connections</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your integrations and publishing channels</p>
      </div>

      <hr className="mb-8 border-slate-200" />

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Content Source
        </h2>
        <SheetConnectionCard
          idToken={idToken}
          api={api}
          status={sheetStatus}
          onConnected={(title) =>
            setSheetStatus(title ? { accessible: true, title } : { accessible: false, title: '' })
          }
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Publishing Channels
        </h2>
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
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Telegram
        </h2>
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
            <p className="mb-3 text-sm text-slate-600">
              Enter a Telegram Chat ID to verify and connect your Telegram chat.
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Chat ID (required)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                placeholder="Bot token override (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleVerifyTelegram}
                disabled={telegramVerifying || !telegramChatId.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {telegramVerifying ? 'Verifying…' : 'Verify'}
              </button>
            </div>
            {telegramError && (
              <p className="mt-2 text-sm text-red-600">{telegramError}</p>
            )}
            {telegramResult && (
              <p className="mt-2 text-sm text-emerald-600">
                Connected: {telegramResult.title || telegramResult.chatId} ({telegramResult.type})
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
