import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['g', 't'], label: 'Go to Topics' },
  { keys: ['g', 'f'], label: 'Go to Feed' },
  { keys: ['g', 'n'], label: 'Go to Newsletter / Campaign' },
  { keys: ['g', 's'], label: 'Go to Settings' },
  { keys: ['?'], label: 'Show / hide this overlay' },
  { keys: ['Esc'], label: 'Cancel g+ shortcut' },
];

export function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-50 bg-black/25"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.14 }}
            className="fixed left-1/2 top-1/3 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Keyboard shortcuts</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close shortcuts overlay"
                className="rounded-lg p-1 text-muted transition-colors hover:bg-white/60 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2 p-4">
              {SHORTCUTS.map(({ keys, label }) => (
                <li key={label} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted">{label}</span>
                  <span className="flex items-center gap-1">
                    {keys.map((k, i) => (
                      <span key={k} className="flex items-center gap-1">
                        {i > 0 && <span className="text-[10px] text-muted">then</span>}
                        <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-ink shadow-sm">
                          {k}
                        </kbd>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-border px-5 py-3 text-center text-[10px] text-muted">
              Shortcuts are disabled inside text fields.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
