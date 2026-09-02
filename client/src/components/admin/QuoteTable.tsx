import { Link } from 'react-router-dom'
import type { AdminQuoteRequestListItem } from '../../services/quoteService'
import { formatQuoteStatus } from '../../utils/quoteStatus'
import { formatDate } from '../../utils/dateFormat'
import { ResponsiveDataTable } from '../ui/ResponsiveDataTable'

const statusClass = (status: string) => {
  if (status === 'COMPLETED') return 'bg-green/10 text-green'
  if (status === 'CONTACTED' || status === 'QUOTED' || status === 'CANCELLED') return 'bg-orange/10 text-orange'
  return 'bg-sage text-green-dark'
}

interface QuoteTableProps {
  quoteRequests: AdminQuoteRequestListItem[]
}

export function QuoteTable({ quoteRequests }: QuoteTableProps) {
  if (quoteRequests.length === 0) {
    return <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-14 text-center text-sm text-muted">No quote requests found.</div>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="space-y-3 p-4 lg:hidden">
        {quoteRequests.map((quote) => (
          <Link className="block rounded-2xl border border-line bg-cream/45 p-4 transition-colors hover:border-green" to={`/admin/quote-requests/${quote.quoteNumber}`} key={quote.quoteNumber}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Reference</p>
                <p className="mt-1 break-words font-bold text-green-dark">{quote.quoteNumber}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(quote.status)}`}>{formatQuoteStatus(quote.status)}</span>
            </div>
            <div className="mt-4">
              <p className="font-semibold text-green-dark">{quote.customerName}</p>
              <p className="mt-1 break-words text-xs text-muted">{quote.customerEmail}</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 text-xs">
              <div>
                <dt className="uppercase tracking-[0.12em] text-muted">Phone</dt>
                <dd className="mt-1 text-muted">{quote.customerPhone}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.12em] text-muted">Date</dt>
                <dd className="mt-1 text-muted">{formatDate(quote.createdAt, true)}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.12em] text-muted">Items</dt>
                <dd className="mt-1 font-bold text-green-dark">{quote.itemCount} {quote.itemCount === 1 ? 'item' : 'items'}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.12em] text-muted">Type</dt>
                <dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${quote.shoppingMode === 'WHOLESALE' ? 'bg-orange/10 text-orange' : 'bg-sage text-green-dark'}`}>{quote.shoppingMode === 'WHOLESALE' ? 'Wholesale' : 'Retail'}</span></dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>
      <div className="hidden lg:block">
        <ResponsiveDataTable label="Quote requests table horizontal scroll">
          <table className="w-full min-w-[1260px] whitespace-nowrap text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-5 py-4 font-bold">Reference</th>
                <th className="px-5 py-4 font-bold">Customer</th>
                <th className="px-5 py-4 font-bold">Phone</th>
                <th className="px-5 py-4 font-bold">Date</th>
                <th className="px-5 py-4 font-bold">Items</th>
                <th className="px-5 py-4 font-bold">Type</th>
                <th className="px-5 py-4 font-bold">Status</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {quoteRequests.map((quote) => (
                <tr className="group hover:bg-cream/60" key={quote.quoteNumber}>
                  <td className="px-5 py-4"><span className="block min-w-0 truncate max-w-[190px] font-semibold text-green-dark">{quote.quoteNumber}</span></td>
                  <td className="px-5 py-4">
                    <p className="block min-w-0 truncate max-w-[270px] font-semibold text-green-dark">{quote.customerName}</p>
                    <p className="block min-w-0 truncate mt-1 max-w-[270px] text-xs text-muted">{quote.customerEmail}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-muted">{quote.customerPhone}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-muted">{formatDate(quote.createdAt, true)}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-green-dark">{quote.itemCount} {quote.itemCount === 1 ? 'item' : 'items'}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${quote.shoppingMode === 'WHOLESALE' ? 'bg-orange/10 text-orange' : 'bg-sage text-green-dark'}`}>{quote.shoppingMode === 'WHOLESALE' ? 'Wholesale' : 'Retail'}</span></td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(quote.status)}`}>{formatQuoteStatus(quote.status)}</span></td>
                  <td className="px-5 py-4 text-right">
                    <Link className="rounded-full border border-line px-4 py-1.5 text-xs font-bold text-green transition-colors hover:bg-green hover:text-cream" to={`/admin/quote-requests/${quote.quoteNumber}`}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>
    </div>
  )
}