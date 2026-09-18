import type { AdminQuoteRequestDetail } from '../../../../services/quoteService'

interface QuoteDetailCustomerCardProps {
  quote: AdminQuoteRequestDetail
}

export function QuoteDetailCustomerCard({ quote }: QuoteDetailCustomerCardProps) {
  return (
    <section className="mt-8 grid gap-5 lg:grid-cols-2" aria-label="Customer and request details">
      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-green-dark">Customer</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Name</dt>
            <dd className="mt-1 font-semibold text-green-dark">{quote.customerName}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Email</dt>
            <dd className="mt-1 break-words text-muted"><a className="text-green hover:text-orange" href={`mailto:${quote.customerEmail}`}>{quote.customerEmail}</a></dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Phone</dt>
            <dd className="mt-1 break-words text-muted"><a className="text-green hover:text-orange" href={`tel:${quote.customerPhone}`}>{quote.customerPhone}</a></dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-green-dark">Request message</h2>
        {quote.message ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted">{quote.message}</p>
        ) : (
          <p className="mt-4 text-sm text-muted">No additional message was included with this request.</p>
        )}
      </div>

      {(quote.fulfillmentMethod || quote.state || quote.city || quote.deliveryAddress) && (
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-green-dark">Requested fulfillment</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Method</dt>
              <dd className="mt-1 font-semibold text-green-dark">
                {quote.fulfillmentMethod === 'DELIVERY' ? 'Delivery' : quote.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'To be confirmed'}
              </dd>
            </div>
            {quote.fulfillmentMethod === 'DELIVERY' && (quote.state || quote.city || quote.deliveryAddress) && (
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Delivery location</dt>
                <dd className="mt-1 text-muted">{[quote.state, quote.city, quote.deliveryAddress].filter(Boolean).join(', ')}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </section>
  )
}