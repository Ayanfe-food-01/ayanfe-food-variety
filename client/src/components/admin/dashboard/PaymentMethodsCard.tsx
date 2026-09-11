import { Link } from 'react-router-dom'
import { ArrowUpRight } from '../../../assets/icons'
import { formatPrice } from '../orderPresentation'

export interface PaymentMethodStats {
  count: number
  revenue: string
}

interface PaymentMethodsCardProps {
  paystack: PaymentMethodStats
  bankTransfer: PaymentMethodStats
  isLoading?: boolean
}

export function PaymentMethodsCard({ paystack, bankTransfer, isLoading = false }: PaymentMethodsCardProps) {
  const totalCount = paystack.count + bankTransfer.count

  const rows = [
    { label: 'Paystack', to: '/admin/payments', stat: paystack },
    { label: 'Bank transfer', to: '/admin/payments', stat: bankTransfer },
  ]

  return (
    <section className="h-full min-w-0 rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-orange">Payments this week</p>
        <Link className="flex shrink-0 items-center gap-1 text-xs font-bold text-green hover:text-orange" to="/admin/payments">
          View all <ArrowUpRight size={14} />
        </Link>
      </div>
      {isLoading ? (
        <div className="mt-4 space-y-3" aria-label="Loading payment methods">
          {Array.from({ length: 2 }).map((_, index) => (
            <div className="h-10 animate-pulse rounded-lg bg-sage/45" key={index} />
          ))}
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {totalCount === 0 ? (
            <li>
              <p className="py-3 text-sm text-muted">No paid orders this week.</p>
            </li>
          ) : (
            rows.map((row) => (
              <li key={row.label}>
                <Link className="group flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-sage/20" to={row.to}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={`size-2.5 shrink-0 rounded-full ${row.label === 'Paystack' ? 'bg-green' : 'bg-orange/60'}`} />
                    <span className="truncate text-sm font-semibold text-green-dark group-hover:text-orange">{row.label}</span>
                    <span className="shrink-0 text-xs text-muted">{row.stat.count} {row.stat.count === 1 ? 'order' : 'orders'}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-green-dark">{formatPrice(row.stat.revenue)}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  )
}