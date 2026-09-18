import type { AdminQuoteRequestDetail } from '../../../../services/quoteService'
import { formatPrice } from '../../../../utils/formatPrice'
import { MAX_UNIT_PRICE } from './constants'

interface QuoteDetailPricingTableProps {
  items: AdminQuoteRequestDetail['items']
  unitPrices: Record<string, string>
  onPriceChange: (itemId: string, value: string) => void
  shoppingMode: AdminQuoteRequestDetail['shoppingMode']
}

export function QuoteDetailPricingTable({ items, unitPrices, onPriceChange, shoppingMode }: QuoteDetailPricingTableProps) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
          <tr>
            <th className="px-4 py-3 font-bold">Product</th>
            <th className="px-4 py-3 font-bold text-right">Quantity</th>
            <th className="px-4 py-3 font-bold">Agreed unit price</th>
            <th className="px-4 py-3 font-bold text-right">Line subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => {
            const unitPrice = Number(unitPrices[item.id] ?? '')
            const lineSubtotal = Number.isFinite(unitPrice) && unitPrice > 0 ? Math.round(unitPrice * item.quantity * 100) / 100 : 0
            const hint = item.priceHint
            const hintLabel = shoppingMode === 'WHOLESALE'
              ? (hint.wholesale !== null ? `Wholesale from ${formatPrice(Number(hint.wholesale))}` : 'No wholesale package pricing set')
              : (hint.retail !== null ? `Current retail ${formatPrice(Number(hint.retail))}` : 'No current price set')
            return (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <span className="break-words font-semibold text-green-dark">{item.productName}</span>
                  <span className="block text-xs text-muted">{item.productOptionLabel ?? 'Standard option'}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-green-dark">{item.quantity}</td>
                <td className="px-4 py-3">
                  <label className="sr-only" htmlFor={`quote-unit-price-${item.id}`}>Quoted unit price for {item.productName}</label>
                  <div className="flex max-w-44 items-center rounded-xl border border-line bg-cream focus-within:border-green focus-within:ring-2 focus-within:ring-green/10">
                    <span className="pl-3 text-sm font-bold text-muted">₦</span>
                    <input
                      className="w-full bg-transparent px-3 py-2 text-right text-sm font-bold text-green-dark outline-none"
                      id={`quote-unit-price-${item.id}`}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={unitPrices[item.id] ?? ''}
                      onChange={(event) => onPriceChange(item.id, event.target.value)}
                    />
                  </div>
                  <p className="mt-1 text-[10px] leading-4 text-muted">{hintLabel} · Max {formatPrice(MAX_UNIT_PRICE)}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-green-dark">{formatPrice(lineSubtotal)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}