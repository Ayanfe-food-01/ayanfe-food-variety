import { Link } from 'react-router-dom'
import type { AdminQuoteRequestDetail } from '../../../services/quoteService'

interface QuoteDetailItemsTableProps {
  items: AdminQuoteRequestDetail['items']
}

export function QuoteDetailItemsTable({ items }: QuoteDetailItemsTableProps) {
  return (
    <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Requested items">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-green-dark">Requested items</h2>
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3 font-bold">Product</th>
              <th className="px-4 py-3 font-bold">Option / size</th>
              <th className="px-4 py-3 font-bold text-right">Quantity</th>
              <th className="px-4 py-3 font-bold">Item note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <Link className="break-words font-semibold text-green-dark hover:text-orange" to={`/admin/products/${item.productId}`}>{item.productName}</Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{item.productOptionLabel ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-green-dark">{item.quantity}</td>
                <td className="max-w-[260px] break-words px-4 py-3 text-muted">{item.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}