import type { QuoteRequestStatus } from '../../services/quoteService'

interface QuoteActionPanelProps {
  status: QuoteRequestStatus
  isConverted: boolean
  onAccept: () => void
  onDecline: () => void
  onPlaceOrder: () => void
}

export function QuoteActionPanel({ status, isConverted, onAccept, onDecline, onPlaceOrder }: QuoteActionPanelProps) {
  const showActions = (status === 'QUOTED' || status === 'ACCEPTED') && !isConverted
  if (!showActions) return null

  return (
    <div className="mt-6">
      {status === 'QUOTED' && (
        <p className="rounded-xl border border-green/20 bg-sage/30 px-4 py-3 text-xs font-semibold leading-5 text-green-dark">
          Accept the quoted price to confirm it. You'll then place your order and choose how to pay.
        </p>
      )}
      {status === 'ACCEPTED' && (
        <p className="rounded-xl border border-green/20 bg-sage/30 px-4 py-3 text-xs font-semibold leading-5 text-green-dark">
          Place your order to choose a payment method and pay securely.
        </p>
      )}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {status === 'QUOTED' && (
          <button
            className="rounded-full bg-green px-6 py-3 text-sm font-bold text-cream hover:bg-green-dark"
            type="button"
            onClick={onAccept}
          >
            Accept quotation
          </button>
        )}
        {status === 'ACCEPTED' && (
          <button
            className="rounded-full bg-green px-6 py-3 text-sm font-bold text-cream hover:bg-green-dark"
            type="button"
            onClick={onPlaceOrder}
          >
            Place my order
          </button>
        )}
        <button
          className="rounded-full border border-orange/40 px-6 py-3 text-sm font-bold text-orange transition-colors hover:bg-orange/10"
          type="button"
          onClick={onDecline}
        >
          Decline quotation
        </button>
      </div>
    </div>
  )
}