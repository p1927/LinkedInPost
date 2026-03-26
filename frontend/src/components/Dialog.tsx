import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function Dialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Keep editing',
  onConfirm,
  onCancel,
  children,
}: DialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-deep-purple/35 px-4 backdrop-blur-md">
      <div
        aria-modal="true"
        role="dialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        className="glass-panel-strong w-full max-w-md rounded-2xl p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="font-heading text-lg font-semibold text-ink">
              {title}
            </h2>
            <p id="dialog-description" className="mt-2 text-sm leading-6 text-muted">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="glass-inset inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-white/80 hover:text-ink"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children ? <div className="mt-4">{children}</div> : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="glass-inset inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white/80"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
