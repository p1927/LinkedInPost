import { useEffect, useRef, useState } from "react"
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
  const totalSteps = steps.length

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Progress label — mobile: "Step 1/2", desktop: step name */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted sm:hidden">
          Step {currentStep + 1}/{totalSteps}
        </span>
        <span className="hidden text-xs font-medium text-muted sm:block">
          {steps[currentStep]?.name} — Step {currentStep + 1} of {totalSteps}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300 ease-in-out"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
        />
      </div>

      {/* Step indicators */}
      <div
        role="tablist"
        aria-label="Steps"
        className="flex flex-row flex-wrap gap-2 sm:gap-3"
      >
        {steps.map((step, index) => {
          const isActive = index === currentStep
          const isCompleted = index < currentStep
          const isDisabled = disabledSteps.includes(index)

          return (
            <button
              key={step.id}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "step" : undefined}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              onClick={() => !isDisabled && onStepChange(index)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                "transition-colors duration-200 outline-none",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500",
                isDisabled
                  ? "cursor-not-allowed opacity-50 bg-white/40 border-white/50 text-gray-400"
                  : "cursor-pointer",
                !isDisabled && isActive
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                  : !isDisabled && isCompleted
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  : !isDisabled
                  ? "bg-white/40 border-white/50 text-gray-600 hover:bg-white/60 hover:border-gray-300"
                  : ""
              )}
            >
              {/* Step number circle */}
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isActive
                    ? "bg-white/20 text-white"
                    : isCompleted
                    ? "bg-indigo-200 text-indigo-700"
                    : "bg-gray-200 text-gray-600"
                )}
              >
                {isCompleted ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="size-3"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>

              {/* Step name — hidden on mobile */}
              <span className="hidden sm:inline">{step.name}</span>
            </button>
          )
        })}
      </div>
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
    setFading(true)
    const timer = setTimeout(() => {
      setVisibleStep(currentStep)
      prevStep.current = currentStep
      setFading(false)
    }, 150) // fade-out half; fade-in completes via CSS
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
