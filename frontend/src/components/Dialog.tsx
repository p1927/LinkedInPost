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

        <DialogFooter className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end bg-transparent border-none p-0 m-0">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="glass-inset px-4 py-3 h-auto rounded-xl font-semibold text-ink transition-colors hover:bg-white/80"
          >
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className="px-4 py-3 h-auto rounded-xl font-semibold transition-colors"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </ShadcnDialog>
  );
}
