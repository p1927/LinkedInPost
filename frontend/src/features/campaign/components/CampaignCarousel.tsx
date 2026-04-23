import { type ReactNode } from 'react';
import clsx from 'clsx';

export interface CarouselStep {
  label: string;
  description?: string;
}

interface CampaignCarouselProps {
  steps: CarouselStep[];
  currentStep: number;
  children: ReactNode[];
  onNext?: () => void;
  onPrev?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  submitting?: boolean;
  className?: string;
}

/**
 * Two-step carousel with step indicator, fade transitions, and
 * indigo/emerald design system styling.
 *
 * Accessibility:
 * - Role `tablist` / `tab` on step indicators
 * - `aria-current="step"` on the active indicator
 * - Live region announces step changes to screen readers
 * - Respects `prefers-reduced-motion` via CSS (transition-duration: 0.01ms override in index.css)
 */
export function CampaignCarousel({
  steps,
  currentStep,
  children,
  onNext,
  onPrev,
  nextDisabled = false,
  nextLabel = 'Next',
  submitting = false,
  className,
}: CampaignCarouselProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className={clsx('flex flex-col gap-6', className)}>
      {/* Step indicator */}
      <nav
        aria-label="Campaign steps"
        role="tablist"
        className="flex items-center justify-center gap-0"
      >
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          return (
            <div key={idx} className="flex items-center">
              <div
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'step' : undefined}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isCompleted
                        ? 'bg-indigo-200 text-indigo-700'
                        : 'bg-gray-200 text-gray-500',
                  )}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={clsx(
                    'hidden text-xs font-medium sm:block',
                    isActive ? 'text-indigo-600' : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={clsx(
                    'mx-3 mb-4 h-0.5 w-12 rounded-full transition-colors duration-300 sm:w-20',
                    idx < currentStep ? 'bg-indigo-400' : 'bg-gray-200',
                  )}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* Screen-reader live region for step transitions */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.label}
      </div>

      {/* Slide panel — fade animation, motion-safe */}
      <div
        className="relative overflow-hidden"
        role="region"
        aria-label={steps[currentStep]?.label}
      >
        {children.map((child, idx) => (
          <div
            key={idx}
            aria-hidden={idx !== currentStep}
            className={clsx(
              'transition-opacity duration-300 motion-reduce:transition-none',
              idx === currentStep ? 'block opacity-100' : 'hidden opacity-0',
            )}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          className={clsx(
            'rounded-xl border border-indigo-200 px-5 py-2.5 text-sm font-semibold text-indigo-600 transition-colors duration-200',
            'hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
            'disabled:pointer-events-none disabled:opacity-0',
          )}
          aria-label="Go to previous step"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled || submitting}
          className={clsx(
            'flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
            isLast
              ? 'bg-emerald-500 hover:bg-emerald-600 focus-visible:outline-emerald-500 disabled:bg-emerald-300'
              : 'bg-indigo-600 hover:bg-indigo-700 focus-visible:outline-indigo-600 disabled:bg-indigo-300',
            'disabled:cursor-not-allowed',
          )}
          aria-label={nextLabel}
        >
          {submitting ? (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : null}
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
