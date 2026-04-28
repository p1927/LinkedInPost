import { useEffect, useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface TourStep {
  title: string;
  body: string;
  /** Optional corner hint arrow direction */
  arrow?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

interface TourProps {
  tourKey: string;
  steps: TourStep[];
  /** Called when tour is dismissed (skip or finish) */
  onDone?: () => void;
}

function readDone(key: string): boolean {
  try {
    return localStorage.getItem(`tour_done_${key}`) === '1';
  } catch {
    return false;
  }
}

function writeDone(key: string) {
  try {
    localStorage.setItem(`tour_done_${key}`, '1');
  } catch {/* */}
}

export function Tour({ tourKey, steps, onDone }: TourProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!readDone(tourKey)) {
      setVisible(true);
      setStep(0);
    }
  }, [tourKey]);

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  function dismiss() {
    writeDone(tourKey);
    setVisible(false);
    onDone?.();
  }

  function next() {
    if (isLast) {
      dismiss();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[200]"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Subtle darkening scrim */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Floating card — anchored bottom-center */}
      <div
        className={cn(
          'pointer-events-auto absolute bottom-8 left-1/2 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2',
          'rounded-2xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-md',
          'flex flex-col gap-3 p-5',
        )}
        role="dialog"
        aria-label={`Tour: ${current.title}`}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-ink leading-snug">{current.title}</p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Skip tour"
            className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <p className="text-sm text-muted leading-relaxed">{current.body}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  i === step ? 'w-4 bg-primary' : 'w-1.5 bg-slate-200',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {isLast ? 'Got it' : 'Next'}
            {!isLast && <ArrowRight className="h-3 w-3" aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  );
}
