import { Link } from 'react-router-dom'
import { ArrowUpRight } from '../../../assets/icons'

export interface NeedsAttentionItem {
  label: string
  count: number
  to: string
}

interface NeedsAttentionCardProps {
  total: number
  items: NeedsAttentionItem[]
  isLoading?: boolean
}

export function NeedsAttentionCard({ total, items, isLoading = false }: NeedsAttentionCardProps) {
  return (
    <article className="min-w-0 flex-1 rounded-2xl border border-orange/25 bg-orange/5 p-4 shadow-sm sm:p-5">
      <div className="mb-4 size-2.5 rounded-full bg-orange sm:mb-6" />
      <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted">Needs attention</p>
      <p className="mt-2 text-xl leading-7 font-bold tracking-[-0.03em] text-green-dark sm:text-[22px]">
        {isLoading ? <span className="inline-block h-6 w-20 animate-pulse rounded-md bg-sage/70 align-middle" aria-label="Loading needs attention" /> : total}
      </p>
      <p className="mt-2 text-xs text-muted">Low stock, pending quotes, and unfulfilled orders.</p>
      <ul className="mt-4 space-y-0.5 border-t border-orange/15 pt-3">
        {items.map((item) => (
          <li key={item.label}>
            <Link className="group flex items-center justify-between gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-orange/10" to={item.to}>
              <span className="min-w-0 truncate text-sm font-semibold text-green-dark">{item.label}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-orange">
                {item.count}
                <ArrowUpRight size={15} className="opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  )
}