import type { AdminQuoteRequestDetail } from '../../../../services/quoteService'
import { formatDate } from '../../../../utils/dateFormat'
import { formatQuoteStatus } from '../../../../utils/quoteStatus'
import { Breadcrumb } from '../../../../components/ui/Breadcrumb'
import { isTerminal, statusClass } from './constants'

interface QuoteDetailHeaderProps {
  quote: AdminQuoteRequestDetail
}

export function QuoteDetailHeader({ quote }: QuoteDetailHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <Breadcrumb items={[{ label: 'Dashboard', href: '/admin' }, { label: 'Quote requests', href: '/admin/quote-requests' }, { label: quote.quoteNumber }]} />
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-orange">Quote request detail</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{quote.quoteNumber}</h1>
        <p className="mt-3 text-sm text-muted">Received {formatDate(quote.createdAt, true)}</p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
          <span className={quote.shoppingMode === 'WHOLESALE' ? 'inline-block size-2 rounded-full bg-orange' : 'inline-block size-2 rounded-full bg-green'} />
          <span className={quote.shoppingMode === 'WHOLESALE' ? 'text-orange' : 'text-green-dark'}>{quote.shoppingMode === 'WHOLESALE' ? 'Wholesale Request' : 'Retail Request'}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className={`rounded-full px-3 py-2 text-xs font-bold ${statusClass(quote.status)}`}>{formatQuoteStatus(quote.status)}</span>
        {isTerminal(quote.status) && <span className="rounded-full bg-sage px-3 py-2 text-xs font-bold text-green-dark">Closed</span>}
      </div>
    </div>
  )
}