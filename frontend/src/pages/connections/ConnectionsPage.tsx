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
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          Google Workspace
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

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          Social Publishing
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
