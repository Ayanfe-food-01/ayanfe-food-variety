import { ArrowRight } from '../../assets/icons'

interface CheckoutNavButtonsProps {
  continueLabel?: string
  onContinue?: () => void
  onBack?: () => void
  continueDisabled?: boolean
}

export function CheckoutNavButtons({
  continueLabel,
  onContinue,
  onBack,
  continueDisabled = false,
}: CheckoutNavButtonsProps) {
  return (
    <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
      {onBack ? (
        <button
          className="rounded-xl border border-line bg-white px-6 py-4 text-sm font-bold text-muted transition-colors hover:border-green/40 hover:text-green-dark"
          type="button"
          onClick={onBack}
        >
          <span aria-hidden="true">← </span>Back
        </button>
      ) : null}
      {continueLabel ? (
        <button
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green py-4 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={onContinue}
          disabled={continueDisabled}
        >
          {continueLabel} <ArrowRight size={17} />
        </button>
      ) : null}
    </div>
  )
}