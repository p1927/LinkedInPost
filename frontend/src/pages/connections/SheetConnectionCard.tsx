import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import clsx from 'clsx';
import { CheckCircle2, Copy, ExternalLink, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

function GoogleSheetsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zm-3.41 1.046h3.41V15.5H7.908v-1.91zm5.319-1.046h3.433v-1.909h-3.433v1.91zm0 2.955h3.433V13.59h-3.433V15.5zm4.977 4.977H5.796V3.523h7.728L18.5 8.429l-.005 12.048H17.6zM13.5 3.5v5H18.5L13.5 3.5zm-9.704-.977v18.954h18.408V8.3L14.5 2H3.796z" />
    </svg>
  );
}

export function SheetConnectionCard({ idToken, api, status, onConnected }: SheetConnectionCardProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSwitchForm, setShowSwitchForm] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);

  const isConnected = status.accessible;

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
      setShowSwitchForm(false);
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
        setShowSwitchForm(false);
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
      setShowSwitchForm(false);
    } catch {
      setError('Failed to disconnect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSwitchClick() {
    setShowSwitchForm(true);
    setError(null);
    setServiceAccountEmail(null);
    setUrl('');
  }

  function handleCancelSwitch() {
    setShowSwitchForm(false);
    setShowConnectForm(false);
    setError(null);
    setServiceAccountEmail(null);
    setUrl('');
  }

  function handleConnectClick() {
    setShowConnectForm(true);
    setError(null);
    setServiceAccountEmail(null);
    setUrl('');
  }

  const shouldShowForm = (showConnectForm && !isConnected) || showSwitchForm;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0F9D58] text-white"
          aria-hidden
        >
          <GoogleSheetsLogo className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Google Sheets</p>
          {isConnected && status.title && !showSwitchForm ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">{status.title}</p>
          ) : null}
        </div>

        <span
          className={clsx(
            'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
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

      {/* Connected state: sheet name + actions (no form) */}
      {isConnected && !showSwitchForm && (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSwitchClick}
            disabled={loading}
            className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Switch sheet
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { void handleDisconnect(); }}
            disabled={loading}
            className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Disconnect
          </Button>
        </div>
      )}

      {/* Not connected — show connect button */}
      {!isConnected && !shouldShowForm && (
        <Button
          variant="primary"
          size="sm"
          onClick={handleConnectClick}
          className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
        >
          Connect sheet
        </Button>
      )}

      {/* Connect / Switch form */}
      {shouldShowForm && (
        <div className="flex flex-col gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); setServiceAccountEmail(null); }}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0"
          />

          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : null}

          {/* Service account fallback box */}
          {serviceAccountEmail ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="mb-2 text-xs text-amber-800">
                Share your spreadsheet with this email, then click Verify access.
              </p>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-mono text-xs text-amber-900">{serviceAccountEmail}</p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 cursor-pointer rounded-lg p-1.5 text-amber-700 transition-colors duration-200 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  aria-label="Copy service account email"
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a
                  href="https://docs.google.com/spreadsheets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 cursor-pointer rounded-lg p-1.5 text-amber-700 transition-colors duration-200 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  aria-label="Open Google Sheets"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setLoading(true); triggerDriveConsent(); }}
              disabled={loading || !url.trim()}
              className="flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Connecting…' : 'Connect sheet'}
            </Button>

            {serviceAccountEmail ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { void handleVerifyOnly(); }}
                disabled={loading}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Verify access
              </Button>
            ) : null}

            {(showSwitchForm || showConnectForm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelSwitch}
                disabled={loading}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
