import { useState, useEffect, useCallback } from 'react';
import { Mic, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type Model = 'base.en' | 'small.en';

interface Props {
  projectDir: string;
  onComplete: (config: { enabled: boolean; model: Model; shortcut: string }) => void;
  onBack: () => void;
}

const MODEL_INFO: Record<Model, { label: string; size: string; note: string }> = {
  'base.en': { label: 'Base (recommended)', size: '~142 MB', note: 'Fast, good accuracy' },
  'small.en': { label: 'Small', size: '~466 MB', note: 'Slower, higher accuracy' },
};

type DownloadPhase = 'idle' | 'downloading' | 'done' | 'error';

export function SpeechToTextStep({ projectDir, onComplete, onBack }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [model, setModel] = useState<Model>('base.en');
  const [shortcut] = useState('Mod+Shift+M');
  const [phase, setPhase] = useState<DownloadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [alreadyCached, setAlreadyCached] = useState(false);

  // Pre-fill from existing config on mount
  useEffect(() => {
    fetch('http://localhost:3456/api/setup/stt/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.enabled) setEnabled(true);
        if (cfg.model) setModel(cfg.model as Model);
        if (cfg.enabled && cfg.model) {
          setPhase('done');
          setAlreadyCached(true);
        }
      })
      .catch(() => {});
  }, []);

  // Poll download progress
  useEffect(() => {
    if (phase !== 'downloading') return;
    const id = setInterval(async () => {
      try {
        const r = await fetch('http://localhost:3456/api/setup/stt/status');
        const s = await r.json();
        if (s.error) {
          setPhase('error');
          setErrorMsg(s.error);
          clearInterval(id);
          return;
        }
        if (s.total > 0) setProgress(Math.round((s.downloaded / s.total) * 100));
        if (s.done) {
          setPhase('done');
          clearInterval(id);
        }
      } catch {
        setPhase('error');
        setErrorMsg('Lost connection to setup server');
        clearInterval(id);
      }
    }, 500);
    return () => clearInterval(id);
  }, [phase]);

  const handleDownload = useCallback(async () => {
    setPhase('downloading');
    setProgress(0);
    setErrorMsg('');
    try {
      const r = await fetch('http://localhost:3456/api/setup/stt/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir, model, shortcut }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? 'download failed');
      if (body.cached) setPhase('done');
    } catch (err) {
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [projectDir, model, shortcut]);

  const handleSkip = useCallback(async () => {
    if (!enabled) {
      await fetch('http://localhost:3456/api/setup/stt/disable', { method: 'POST' }).catch(() => {});
    }
    onComplete({ enabled: enabled && phase === 'done', model, shortcut });
  }, [enabled, phase, model, shortcut, onComplete]);

  const handleContinue = useCallback(() => {
    onComplete({ enabled: true, model, shortcut });
  }, [model, shortcut, onComplete]);

  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">
          <Mic className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold text-ink">Voice Input</h2>
          <p className="text-sm text-muted">Speak into the scratchpad instead of typing</p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl bg-gray-50 p-4">
        <input
          id="stt-enable"
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            if (!e.target.checked) setPhase('idle');
          }}
          className="mt-0.5 h-4 w-4 accent-violet-600"
        />
        <label htmlFor="stt-enable" className="cursor-pointer">
          <span className="block font-medium text-ink">Enable voice input in scratchpad</span>
          <span className="block text-sm text-muted">
            Optional — downloads a local Whisper model. No audio sent to the cloud.
          </span>
        </label>
      </div>

      {/* Model picker */}
      {enabled && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-ink">Model</p>
          <div className="flex flex-col gap-2">
            {(Object.entries(MODEL_INFO) as [Model, (typeof MODEL_INFO)[Model]][]).map(([key, info]) => (
              <button
                key={key}
                type="button"
                onClick={() => setModel(key)}
                disabled={phase === 'downloading'}
                className={[
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                  model === key
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                <div
                  className={[
                    'h-3 w-3 rounded-full border-2',
                    model === key ? 'border-violet-500 bg-violet-500' : 'border-gray-300',
                  ].join(' ')}
                />
                <div>
                  <span className="block text-sm font-medium text-ink">{info.label}</span>
                  <span className="block text-xs text-muted">
                    {info.size} — {info.note}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Download button */}
      {enabled && phase === 'idle' && (
        <button
          type="button"
          onClick={handleDownload}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-medium text-white hover:bg-violet-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download model ({MODEL_INFO[model].size})
        </button>
      )}

      {/* Progress bar */}
      {enabled && phase === 'downloading' && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted">Downloading {MODEL_INFO[model].label}…</span>
            <span className="font-medium text-ink">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success */}
      {enabled && phase === 'done' && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {alreadyCached ? 'Model already downloaded' : 'Model downloaded successfully'}
        </div>
      )}

      {/* Error */}
      {enabled && phase === 'error' && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Download failed: {errorMsg}
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="mt-2 text-sm font-medium text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Shortcut info */}
      {enabled && phase === 'done' && (
        <div className="mb-6 rounded-xl bg-gray-50 px-4 py-3 text-sm text-muted">
          Toggle recording with{' '}
          <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs text-ink">⌘⇧M</kbd>{' '}
          (Mac) or{' '}
          <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs text-ink">
            Ctrl+Shift+M
          </kbd>{' '}
          in the scratchpad.
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {phase === 'done' ? (
          <button
            type="button"
            onClick={handleContinue}
            className="flex-1 rounded-xl bg-violet-600 px-4 py-3 font-medium text-white hover:bg-violet-700 transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSkip}
            disabled={phase === 'downloading'}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-medium text-muted hover:border-gray-300 transition-colors disabled:opacity-40"
          >
            {phase === 'downloading' ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : enabled ? (
              'Download first to continue'
            ) : (
              'Skip'
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          disabled={phase === 'downloading'}
          className="rounded-xl border border-gray-200 px-4 py-3 font-medium text-muted hover:border-gray-300 transition-colors disabled:opacity-40"
        >
          Back
        </button>
      </div>
    </div>
  );
}
