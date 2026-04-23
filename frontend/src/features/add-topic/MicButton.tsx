import { Loader2, Mic, MicOff } from 'lucide-react';
import type { UnavailableReason } from './useSpeechToText';

interface Props {
  isRecording: boolean;
  isAvailable: boolean;
  unavailableReason: UnavailableReason;
  shortcut: string;
  onClick: () => void;
}

export function MicButton({ isRecording, isAvailable, unavailableReason, shortcut: _shortcut, onClick }: Props) {
  // Hidden when explicitly disabled or sidecar offline (production / no dev server)
  if (!isAvailable && (unavailableReason === 'disabled' || unavailableReason === 'sidecar_offline')) return null;

  // Show spinner while WASM model is loading into the browser worker
  if (unavailableReason === 'wasm_loading') {
    return (
      <span
        title="Loading voice model…"
        className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-muted/40"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading…
      </span>
    );
  }

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  const shortcutLabel = isMac ? '⌘⇧M' : 'Ctrl+Shift+M';
  const tooltipText = !isAvailable
    ? 'Go to Settings → Speech to Text to download the voice model'
    : isRecording
      ? `Stop recording (${shortcutLabel})`
      : `Start voice input (${shortcutLabel})`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isAvailable}
      title={tooltipText}
      aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
      className={[
        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150',
        !isAvailable
          ? 'cursor-not-allowed border-white/20 text-muted/40'
          : isRecording
            ? 'border-red-400/50 bg-red-500/15 text-red-500 shadow-sm'
            : 'border-white/40 bg-white/25 text-muted hover:border-white/60 hover:bg-white/40 hover:text-ink',
      ].join(' ')}
    >
      {isRecording ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <MicOff className="h-3 w-3" />
          Recording…
        </>
      ) : (
        <>
          <Mic className="h-3 w-3" />
          Voice
        </>
      )}
    </button>
  );
}
