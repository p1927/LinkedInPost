/**
 * VariantSlotSavePanel — persistence module for per-slot variant saving.
 *
 * Owns: save action, retry behavior, error display for one variant slot.
 * Should not own: generation state, preview rendering, approval logic.
 *
 * Phase 2 of editor-generation-workflow plan: extract persistence from
 * GenerationPanel into a dedicated feature module.
 */

import { CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type VariantSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface VariantSlotSavePanelProps {
  /** 0-based index for display (shows as Preview N+1). */
  index: number;
  status: VariantSaveStatus;
  errorMessage?: string;
  disabled?: boolean;
  onSave: () => void;
}

export function saveStatusLabel(status: VariantSaveStatus): string {
  switch (status) {
    case 'saving': return 'Saving…';
    case 'saved':  return 'Saved';
    case 'error':  return 'Retry save';
    default:       return 'Save';
  }
}

export function VariantSlotSavePanel({
  index,
  status,
  errorMessage,
  disabled = false,
  onSave,
}: VariantSlotSavePanelProps) {
  const label = saveStatusLabel(status);

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
        <CheckCircle className="h-3.5 w-3.5" />
        <span>Saved</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={disabled}
          className="px-2.5 py-1.5 text-xs font-bold border-red-300 text-red-700 hover:bg-red-50"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          {label}
        </Button>
        {errorMessage && (
          <div className="flex items-start gap-1 text-red-700 text-xs">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onSave}
      disabled={disabled || status === 'saving'}
      className="px-2.5 py-1.5 text-xs font-bold"
    >
      {label}
    </Button>
  );
}