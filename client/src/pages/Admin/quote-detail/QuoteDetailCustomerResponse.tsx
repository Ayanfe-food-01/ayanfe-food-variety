import type { AdminQuoteRequestDetail } from '../../../services/quoteService'
import { formatDate } from '../../../utils/dateFormat'

interface QuoteDetailCustomerResponseProps {
  quote: AdminQuoteRequestDetail
}

export function QuoteDetailCustomerResponse({ quote }: QuoteDetailCustomerResponseProps) {
  if (quote.acceptedAt === null && quote.rejectedAt === null) return null
  return (
    <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Customer response">
      <h2 className="text-lg font-bold text-green-dark">Customer response</h2>
      {quote.acceptedAt !== null ? (
        <div className="mt-4 rounded-xl border border-green/20 bg-sage/30 p-4">
          <p className="font-bold text-green">Accepted by the customer</p>
          <p className="mt-1 text-sm text-muted">Accepted {formatDate(quote.acceptedAt, true)}.</p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-orange/25 bg-orange/5 p-4">
          <p className="font-bold text-orange">Declined by the customer</p>
          <p className="mt-1 text-sm text-muted">Declined {quote.rejectedAt ? formatDate(quote.rejectedAt, true) : '—'}.</p>
          {quote.rejectionReason && (
            <p className="mt-2 text-sm leading-6 text-muted"><strong className="text-green-dark">Reported reason:</strong> {quote.rejectionReason}</p>
          )}
        </div>
      )}
    </section>
  )
}