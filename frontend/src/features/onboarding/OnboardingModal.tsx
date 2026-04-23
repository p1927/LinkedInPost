import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { ConnectAccountsGrid } from './ConnectAccountsGrid';
import type { SocialIntegration } from '@/services/backendApi';

interface OnboardingModalProps {
  integrations: SocialIntegration[];
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail') => void;
  onDisconnect: (provider: string) => void;
  onComplete: (spreadsheetId?: string, driveAccessToken?: string) => void;
  connecting: string | null;
}

export function OnboardingModal({
  integrations,
  onConnect,
  onDisconnect,
  onComplete,
  connecting,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);

  const hasAnyConnected = integrations.length > 0;

  function extractSpreadsheetId(url: string): string {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match?.[1] ?? url.trim();
  }

  const triggerDriveConsent = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive',
    flow: 'implicit',
    onSuccess: (tokenResponse) => {
      const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
      onComplete(spreadsheetId, tokenResponse.access_token);
    },
    onError: () => {
      setShareError(
        'Drive access was denied. You can connect your sheet later from the Connections page.',
      );
      onComplete(undefined, undefined);
    },
    onNonOAuthError: () => {
      setShareError('Popup was blocked. Please allow popups and try again, or skip this step.');
    },
  });

  function handleFinish() {
    if (!spreadsheetUrl.trim()) {
      onComplete(undefined, undefined);
      return;
    }
    setShareError(null);
    triggerDriveConsent();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="glass-panel-strong w-full max-w-md rounded-3xl p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  step === s
                    ? 'bg-primary text-primary-fg'
                    : step > s
                    ? 'bg-success-ink text-white'
                    : 'bg-border text-muted'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 2 && <div className="h-px w-8 bg-border" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 className="mb-1 font-heading text-xl font-semibold text-ink">
              Connect your accounts
            </h2>
            <p className="mb-6 text-sm text-muted">
              Connect LinkedIn, Instagram, or Gmail so posts are published from your accounts.
            </p>
            <ConnectAccountsGrid
              integrations={integrations}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              connecting={connecting}
            />
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-fg hover:bg-primary/90 transition-colors"
              >
                {hasAnyConnected ? 'Continue →' : 'Skip for now →'}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="mb-1 font-heading text-xl font-semibold text-ink">
              Content source
            </h2>
            <p className="mb-6 text-sm text-muted">
              Optionally paste a Google Spreadsheet URL. We'll request Drive access to share it with our service account automatically.
            </p>
            <input
              type="url"
              value={spreadsheetUrl}
              onChange={(e) => { setSpreadsheetUrl(e.target.value); setShareError(null); }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="glass-inset w-full rounded-xl border border-violet-200/45 bg-white/50 px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {shareError ? (
              <p className="mt-2 text-xs text-amber-600">{shareError}</p>
            ) : null}
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:bg-white/45 transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-fg hover:bg-primary/90 transition-colors"
              >
                {spreadsheetUrl.trim() ? 'Connect & start →' : "Skip, I'll add later →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
