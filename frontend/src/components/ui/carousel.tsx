import { Fragment, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface CarouselStep {
  id: string
  label: string
  name: string
}

interface CarouselProps {
  steps: Array<CarouselStep>
  currentStep: number
  onStepChange: (step: number) => void
  /** Indices of steps that are disabled (cannot be navigated to) */
  disabledSteps?: number[]
  className?: string
}

function Carousel({ steps, currentStep, onStepChange, disabledSteps = [], className }: CarouselProps) {
  return (
    <div className={cn("flex items-center", className)} role="list" aria-label="Progress">
      {steps.map((step, index) => {
        const isActive = index === currentStep
        const isCompleted = index < currentStep
        const isDisabled = disabledSteps.includes(index)
        const canGoBack = isCompleted && !isDisabled
        const isLast = index === steps.length - 1

        return (
          <Fragment key={step.id}>
            {/* Step pill */}
            <button
              role="listitem"
              aria-current={isActive ? "step" : undefined}
              aria-label={`Step ${index + 1}: ${step.name}${isCompleted ? " (completed)" : isActive ? " (current)" : ""}`}
              disabled={!canGoBack && !isActive}
              onClick={() => canGoBack && onStepChange(index)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-200 outline-none",
                "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                isActive && "bg-indigo-600 shadow-sm",
                isCompleted && !isDisabled && "cursor-pointer hover:bg-indigo-50",
                !isActive && "cursor-default",
              )}
            >
              {/* Circle */}
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200",
                  isActive ? "bg-white/20 text-white" :
                  isCompleted ? "bg-indigo-100 text-indigo-600" :
                  "bg-slate-200 text-slate-400",
                )}
              >
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>

              {/* Label — always visible on active, hidden on mobile for others */}
              <span
                className={cn(
                  "text-xs font-semibold leading-none transition-colors duration-200",
                  isActive ? "text-white" :
                  isCompleted ? "hidden sm:block text-indigo-600" :
                  "hidden sm:block text-slate-400",
                )}
              >
                {step.name}
              </span>
            </button>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "flex-1 h-px mx-1 transition-colors duration-300",
                  isCompleted ? "bg-indigo-200" : "bg-slate-200",
                )}
              />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CarouselContent: animated step panel container
// ---------------------------------------------------------------------------

interface CarouselContentProps {
  currentStep: number
  children: React.ReactNode
  className?: string
}

function CarouselContent({ currentStep, children, className }: CarouselContentProps) {
  const childArray = Array.isArray(children) ? children : [children]
  const [visibleStep, setVisibleStep] = useState(currentStep)
  const [fading, setFading] = useState(false)
  const prevStep = useRef(currentStep)

  useEffect(() => {
    if (currentStep === prevStep.current) return
    setFading(true) // eslint-disable-line react-hooks/set-state-in-effect
    const timer = setTimeout(() => {
      setVisibleStep(currentStep)
      prevStep.current = currentStep
      setFading(false)
    }, 150)
    return () => clearTimeout(timer)
  }, [currentStep])

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "transition-opacity duration-150 ease-in-out",
          fading ? "opacity-0" : "opacity-100"
        )}
      >
        {childArray[visibleStep]}
      </div>
    </div>
  )
}

export { Carousel, CarouselContent, type CarouselProps, type CarouselStep }
