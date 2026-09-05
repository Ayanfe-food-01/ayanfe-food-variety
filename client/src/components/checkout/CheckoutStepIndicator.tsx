import type { CheckoutStep } from './types'
import { CHECKOUT_STEPS, STEP_ORDER } from './checkoutSteps'

interface CheckoutStepIndicatorProps {
  currentStep: CheckoutStep
}

export function CheckoutStepIndicator({ currentStep }: CheckoutStepIndicatorProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep)

  return (
    <ol className="flex items-stretch gap-1.5 sm:gap-2" aria-label="Checkout progress">
      {CHECKOUT_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        return (
          <li className="flex flex-1 items-center gap-1.5 sm:gap-2" key={step.key}>
            <span
              className={`hidden h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold sm:grid ${
                isCompleted
                  ? 'border-green bg-green text-cream'
                  : isCurrent
                    ? 'border-green bg-sage text-green-dark'
                    : 'border-line bg-white text-muted'
              }`}
              aria-hidden="true"
            >
              {isCompleted ? '✓' : index + 1}
            </span>
            <span
              className={`text-[11px] font-bold uppercase tracking-[0.1em] ${
                isCurrent ? 'text-green-dark' : isCompleted ? 'text-green' : 'text-muted'
              }`}
            >
              {isCompleted && <span className="mr-1 sm:hidden">✓</span>}
              {step.label}
            </span>
            {index < CHECKOUT_STEPS.length - 1 && (
              <span
                className={`mx-1 h-px flex-1 ${index < currentIndex ? 'bg-green' : 'bg-line'}`}
                aria-hidden="true"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}