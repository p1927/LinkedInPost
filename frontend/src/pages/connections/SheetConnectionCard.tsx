import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import clsx from 'clsx';
import { CheckCircle2, Copy, ExternalLink, XCircle } from 'lucide-react';
import type { BackendApi, SpreadsheetStatus } from '@/services/backendApi';

interface SheetConnectionCardProps {
  idToken: string;
  api: BackendApi;
  status: SpreadsheetStatus;
  onConnected: (title: string) => void;
}

function extractSpreadsheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? url.trim();
}

export function SheetConnectionCard({ idToken, api, status, onConnected }: SheetConnectionCardProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleShare(driveAccessToken: string) {
    const spreadsheetId = extractSpreadsheetId(url);
    if (!spreadsheetId) {
      setError('Please enter a valid Google Sheets URL.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.connectSpreadsheet(idToken, spreadsheetId, driveAccessToken);
      onConnected(result.title);
      setUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect sheet. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConsentDenied() {
    setLoading(false);
    const email = await api.getServiceAccountEmail(idToken).catch(() => '');
    setServiceAccountEmail(email);
    setError(
      'Drive access was denied. Share your spreadsheet manually with the service account below, then use "Verify access".',
    );
  }

  const triggerDriveConsent = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive',
    flow: 'implicit',
    onSuccess: (tokenResponse) => { void handleShare(tokenResponse.access_token); },
    onError: () => { void handleConsentDenied(); },
    onNonOAuthError: () => { void handleConsentDenied(); },
  });

  async function handleVerifyOnly() {
    setLoading(true);
    setError(null);
    try {
      const freshStatus = await api.getSpreadsheetStatus(idToken);
      if (freshStatus.accessible) {
        onConnected(freshStatus.title);
        setUrl('');
      } else {
        setError('The service account still cannot access your sheet. Make sure you shared it with the email above.');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!serviceAccountEmail) return;
    navigator.clipboard.writeText(serviceAccountEmail).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      await api.disconnectSpreadsheet(idToken);
      onConnected('');
    } catch {
      setError('Failed to disconnect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const isConnected = status.accessible;

  return (
    <div className="glass-panel rounded-2xl border border-white/40 bg-white/60 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white text-sm font-bold">
          S
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Google Sheets</p>
          {isConnected && status.title ? (
            <p className="truncate text-xs text-muted">{status.title}</p>
          ) : null}
        </div>
        <span
          className={clsx(
            'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
          )}
        >
          {isConnected ? (
            <><CheckCircle2 className="h-3 w-3" aria-hidden /> Connected</>
          ) : (
            <><XCircle className="h-3 w-3" aria-hidden /> Not connected</>
          )}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); setServiceAccountEmail(null); }}
          placeholder={isConnected ? 'Paste new spreadsheet URL to switch…' : 'https://docs.google.com/spreadsheets/d/…'}
          className="glass-inset w-full rounded-xl border border-violet-200/45 bg-white/50 px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
        />

        {error ? <p className="text-xs text-red-600">{error}</p> : null}

        {serviceAccountEmail ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-amber-900">{serviceAccountEmail}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-lg p-1 text-amber-700 hover:bg-amber-100"
              aria-label="Copy service account email"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href="https://docs.google.com/spreadsheets"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg p-1 text-amber-700 hover:bg-amber-100"
              aria-label="Open Google Sheets"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setLoading(true); triggerDriveConsent(); }}
            disabled={loading || !url.trim()}
            className="flex-1 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Connecting…' : isConnected ? 'Switch sheet' : 'Connect sheet'}
          </button>
          {serviceAccountEmail ? (
            <button
              type="button"
              onClick={() => { void handleVerifyOnly(); }}
              disabled={loading}
              className="rounded-xl border border-border bg-white/50 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-white/80 disabled:opacity-50"
            >
              Verify access
            </button>
          ) : null}
          {isConnected ? (
            <button
              type="button"
              onClick={() => { void handleDisconnect(); }}
              disabled={loading}
              className="rounded-xl border border-border bg-white/50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Disconnect
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
