import { Link } from 'react-router-dom'
import type { QuoteRequest } from '../../services/quoteService'
import { formatPrice } from '../../utils/formatPrice'

interface QuoteTotalsCardProps {
  quote: QuoteRequest
  // The delivery fee that will be charged. Null while the customer has not yet
  // selected a resolvable delivery location (and there is no admin override).
  deliveryFee: number | null
  isResolvingFee: boolean
}

export function QuoteTotalsCard({ quote, deliveryFee, isResolvingFee }: QuoteTotalsCardProps) {
  const isDelivery = quote.fulfillmentMethod === 'DELIVERY'
  const subtotal = quote.quotedSubtotal !== null ? Number(quote.quotedSubtotal) : null
  const total = subtotal !== null && (!isDelivery || deliveryFee !== null)
    ? subtotal + (isDelivery ? (deliveryFee ?? 0) : 0)
    : null

  const deliveryFeeDisplay = !isDelivery
    ? 'Free'
    : isResolvingFee
      ? 'Checking…'
      : deliveryFee === null
        ? 'Calculated at checkout'
        : deliveryFee === 0
          ? 'Free'
          : formatPrice(deliveryFee)

  return (
    <aside className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-green-dark">Your quotation</h2>
      <p className="mt-1 text-sm text-muted">Prices are locked from your accepted quotation {quote.quoteNumber}. They never change at checkout.</p>
      <ul className="mt-4 divide-y divide-line">
        {quote.items.map((item) => (
          <li className="flex items-center justify-between gap-4 py-3" key={item.id}>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-green-dark">{item.productName}</p>
              {item.productOptionLabel && <p className="mt-0.5 text-xs text-muted">{item.productOptionLabel}</p>}
              <p className="mt-0.5 text-xs text-muted">
                {item.quantity} × {item.quotedUnitPrice !== null ? formatPrice(item.quotedUnitPrice) : '—'}
              </p>
            </div>
            {item.quotedUnitPrice !== null && (
              <strong className="flex-none text-sm text-green-dark">{formatPrice((Number(item.quotedUnitPrice) * item.quantity).toFixed(2))}</strong>
            )}
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted">Subtotal</dt>
          <dd className="font-bold text-green-dark">{quote.quotedSubtotal !== null ? formatPrice(quote.quotedSubtotal) : '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted">Delivery fee</dt>
          <dd className="font-bold text-green-dark">{deliveryFeeDisplay}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-line pt-2 text-base">
          <dt className="font-bold text-green-dark">Total</dt>
          <dd className="text-lg font-bold text-green">{total !== null ? formatPrice(total) : '—'}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-5 text-muted">
        {!isDelivery
          ? 'Pickup at the store — no delivery fee applies.'
          : deliveryFee === null && !isResolvingFee
            ? 'Select your delivery location to see the delivery fee for your area.'
            : 'Delivery to your address. The delivery fee is included in the total.'}
      </p>
      <Link className="mt-4 inline-block text-xs font-bold text-green hover:text-orange" to={`/quotes/${quote.quoteNumber}`}>
        ← Back to quotation
      </Link>
    </aside>
  )
}
