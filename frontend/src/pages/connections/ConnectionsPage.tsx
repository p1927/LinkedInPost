import { useEffect, useState } from 'react';
import type { BackendApi, SocialIntegration, SpreadsheetStatus } from '@/services/backendApi';
import { SheetConnectionCard } from './SheetConnectionCard';
import { SocialAccountCard } from './SocialAccountCard';

interface ConnectionsPageProps {
  idToken: string;
  api: BackendApi;
  integrations: SocialIntegration[];
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail') => void;
  onDisconnect: (provider: string) => void;
  connecting: string | null;
}

const SOCIAL_PROVIDERS: Array<{
  key: 'linkedin' | 'instagram' | 'gmail';
  label: string;
}> = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'gmail', label: 'Gmail' },
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

  useEffect(() => {
    api.getSpreadsheetStatus(idToken).then(setSheetStatus).catch(() => {});
  }, [idToken, api]);

  function getIntegration(provider: string): SocialIntegration | undefined {
    return integrations.find((i) => i.provider === provider);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Connections</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your integrations and publishing channels</p>
      </div>

      <hr className="mb-8 border-slate-200" />

      {/* Section: Content Source */}
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

      {/* Section: Publishing Channels */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Publishing Channels
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
