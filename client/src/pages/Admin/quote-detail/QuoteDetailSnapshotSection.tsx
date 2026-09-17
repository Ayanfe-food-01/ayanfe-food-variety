import { Link } from 'react-router-dom'
import type { AdminQuoteRequestDetail } from '../../../services/quoteService'
import { formatDate } from '../../../utils/dateFormat'
import { formatPrice } from '../../../utils/formatPrice'
import { formatQuoteDeliveryFee } from '../../../utils/quoteDelivery'

interface QuoteDetailSnapshotSectionProps {
  quote: AdminQuoteRequestDetail
  isRevising: boolean
  onRevise: () => void
}

export function QuoteDetailSnapshotSection({ quote, isRevising, onRevise }: QuoteDetailSnapshotSectionProps) {
  const canRevise = quote.status === 'QUOTED' && !quote.convertedOrderNumber
  return (
    <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Quotation">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-green-dark">Quotation</h2>
          <p className="mt-1 text-sm text-muted">Saved on {quote.quotedAt ? formatDate(quote.quotedAt, true) : '—'}. These prices are a snapshot from the catalog at the time of quoting.</p>
        </div>
        {canRevise && (
          <button
            className="rounded-xl border border-green/25 px-5 py-2.5 text-sm font-bold text-green disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green hover:text-cream"
            type="button"
            disabled={isRevising}
            onClick={onRevise}
          >
            {isRevising ? 'Revising…' : 'Revise quotation'}
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-2 rounded-full bg-sage/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-green-dark">
          <span className={`inline-block size-2 rounded-full ${quote.fulfillmentMethod === 'DELIVERY' ? 'bg-orange' : 'bg-green'}`} />
          {quote.fulfillmentMethod === 'DELIVERY' ? 'Delivery' : 'Pickup'}
        </span>
        {quote.convertedOrderNumber && (
          <Link className="font-bold text-green hover:text-orange" to={`/admin/orders/${quote.convertedOrderNumber}`}>
            Converted into order {quote.convertedOrderNumber} →
          </Link>
        )}
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3 font-bold">Product</th>
              <th className="px-4 py-3 font-bold text-right">Quantity</th>
              <th className="px-4 py-3 font-bold text-right">Unit price</th>
              <th className="px-4 py-3 font-bold text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {quote.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <Link className="break-words font-semibold text-green-dark hover:text-orange" to={`/admin/products/${item.productId}`}>{item.productName}</Link>
                  <span className="block text-xs text-muted">{item.productOptionLabel ?? 'Standard option'}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-green-dark">{item.quantity}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-muted">{item.quotedUnitPrice === null ? '—' : formatPrice(Number(item.quotedUnitPrice))}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-green-dark">{item.quotedUnitPrice === null ? '—' : formatPrice(Number(item.quotedUnitPrice) * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="mt-4 ml-auto w-full max-w-xs space-y-2 rounded-xl border border-line bg-sage/25 p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Items subtotal</dt>
          <dd className="font-bold text-green-dark">{quote.quotedSubtotal === null ? '—' : formatPrice(Number(quote.quotedSubtotal))}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Delivery fee</dt>
          <dd className="font-bold text-green-dark">{formatQuoteDeliveryFee(quote.fulfillmentMethod, quote.deliveryFee)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
          <dt className="font-semibold text-green-dark">Quoted total</dt>
          <dd className="text-lg font-bold text-green">{quote.quotedTotal === null ? '—' : formatPrice(Number(quote.quotedTotal))}</dd>
        </div>
      </dl>
    </section>
  )
}