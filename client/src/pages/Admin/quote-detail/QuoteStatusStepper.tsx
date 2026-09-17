import { CheckIcon } from '../../../assets/icons'
import type { QuoteRequestStatus } from '../../../services/quoteService'
import { QUOTE_FLOW_STEPS, QUOTE_STATUS_GUIDE, quoteStatusStepIndex } from './statusGuide'

interface QuoteStatusStepperProps {
  status: QuoteRequestStatus
}

export function QuoteStatusStepper({ status }: QuoteStatusStepperProps) {
  const currentIndex = quoteStatusStepIndex(status)
  const isCancelled = status === 'CANCELLED'

  return (
    <div className="mt-6 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
      <div className="overflow-x-auto pb-1">
        <ol className="flex min-w-max items-center gap-1 sm:gap-2" aria-label="Quote request progress">
          {QUOTE_FLOW_STEPS.map((step, index) => {
            const isCurrent = index === currentIndex && !isCancelled
            const isDone = index < currentIndex && !isCancelled
            return (
              <li className="flex items-center gap-1 sm:gap-2" key={step}>
                {index > 0 && (
                  <span aria-hidden="true" className={`h-px w-6 sm:w-10 ${isDone ? 'bg-green' : 'bg-line'}`} />
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${
                    isCancelled
                      ? 'bg-line text-muted'
                      : isCurrent
                        ? 'bg-green text-cream'
                        : isDone
                          ? 'bg-sage/40 text-green-dark'
                          : 'bg-cream text-muted'
                  }`}
                >
                  {isDone && <CheckIcon className="size-3" aria-hidden="true" />}
                  {QUOTE_STATUS_GUIDE[step].stepLabel}
                </span>
              </li>
            )
          })}
          {isCancelled && (
            <li className="flex items-center gap-1 sm:gap-2">
              <span className="h-px w-6 bg-orange sm:w-10" aria-hidden="true" />
              <span className="inline-flex items-center rounded-full bg-orange/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-orange">
                Cancelled
              </span>
            </li>
          )}
        </ol>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{QUOTE_STATUS_GUIDE[status].adminNextStep}</p>
    </div>
  )
}