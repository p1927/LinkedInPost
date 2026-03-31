import { type ReactNode } from 'react';
import {
  Dialog as ShadcnDialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from '@/components/ui/button';

interface DialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** When omitted, only the confirm action is shown (typical alert). */
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
  cancelLabel,
  onConfirm,
  onCancel,
  children,
}: DialogProps) {
  return (
    <ShadcnDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent showCloseButton={true} className="glass-panel-strong sm:max-w-md bg-white/90 border-white/60 p-6 shadow-lift backdrop-blur-2xl">
        <DialogHeader className="gap-0 text-left">
          <DialogTitle className="font-heading text-lg font-semibold text-ink">{title}</DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-muted">
            {description}
          </DialogDescription>
        </DialogHeader>

        {children ? <div className="mt-4">{children}</div> : null}

        <DialogFooter
          className={
            cancelLabel
              ? 'mx-0 mb-0 mt-6 flex flex-col-reverse gap-3 rounded-xl border border-slate-200/80 bg-slate-50/95 p-4 shadow-inner sm:flex-row sm:justify-end'
              : 'mx-0 mb-0 mt-6 flex flex-row justify-end rounded-xl border border-slate-200/80 bg-slate-50/95 p-4 shadow-inner'
          }
        >
          {cancelLabel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-auto rounded-xl border-slate-200 bg-white px-4 py-3 font-semibold text-ink shadow-sm transition-colors hover:bg-slate-50"
            >
              {cancelLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            className="h-auto rounded-xl px-4 py-3 font-semibold shadow-sm"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </ShadcnDialog>
  );
}
