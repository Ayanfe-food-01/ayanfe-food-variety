import { Fragment } from 'react'
import { CheckIcon } from '../../../../assets/icons'
import { FORM_STEPS } from '../constants'

interface MobileProgressProps {
  step: number
  onSelect: (index: number) => void
}

export function MobileProgress({ step, onSelect }: MobileProgressProps) {
  return (
    <ol className="flex items-center gap-2 md:hidden sm:gap-3" aria-label="Product form steps">
      {FORM_STEPS.map((stepConfig, index) => {
        const isCurrent = index === step
        const isDone = index < step
        const isReached = index <= step
        return (
          <Fragment key={stepConfig.label}>
            <li className="flex min-w-0 flex-1 items-center justify-center">
              <button
                className={`flex min-w-0 max-w-full items-center gap-2 rounded-full p-1.5 transition-colors sm:py-1.5 sm:pl-1.5 sm:pr-3 ${isCurrent ? 'bg-sage/40' : isReached ? 'hover:bg-sage/25' : 'cursor-not-allowed opacity-50'}`}
                type="button"
                disabled={!isReached}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onSelect(index)}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${isDone || isCurrent ? 'bg-green text-cream' : 'border-2 border-line bg-white text-muted'}`}
                  aria-hidden
                >
                  {isDone ? <CheckIcon size={14} /> : index + 1}
                </span>
                <span className={`hidden min-w-0 truncate text-xs font-bold sm:inline ${isCurrent || isDone ? 'text-green-dark' : 'text-muted'}`}>
                  {stepConfig.label}
                </span>
              </button>
            </li>
            {index < FORM_STEPS.length - 1 && <span className="h-px w-3 shrink-0 bg-line sm:w-4" aria-hidden />}
          </Fragment>
        )
      })}
    </ol>
  )
}