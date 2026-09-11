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
  const paystackShare = totalCount === 0 ? 0 : Math.round((paystack.count / totalCount) * 100)

  const rows = [
    { label: 'Paystack', to: '/admin/payments', stat: paystack },
    { label: 'Bank transfer', to: '/admin/payments', stat: bankTransfer },
  ]

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Payments</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">This week by method</h2>
        </div>
        <Link className="flex items-center gap-1 text-sm font-bold text-green hover:text-orange" to="/admin/payments">
          View payments <ArrowUpRight size={16} />
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-3 pt-5" aria-label="Loading payment methods">
          {Array.from({ length: 2 }).map((_, index) => (
            <div className="animate-pulse rounded-xl bg-sage/45 p-4" key={index} />
          ))}
        </div>
      ) : (
        <div className="mt-5 border-t border-line">
          {totalCount === 0 ? (
            <p className="pt-6 text-sm text-muted">No paid orders this week.</p>
          ) : (
            <>
              <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-sage/45">
                <div className="h-full bg-green" style={{ width: `${paystackShare}%` }} />
                <div className="h-full bg-orange/60" style={{ width: `${100 - paystackShare}%` }} />
              </div>
              <ul className="mt-4 divide-y divide-line">
                {rows.map((row) => (
                  <li key={row.label}>
                    <Link className="group flex items-center justify-between gap-4 py-3 transition-colors hover:bg-sage/20" to={row.to}>
                      <div className="flex items-center gap-2.5">
                        <span className={`size-2.5 rounded-full ${row.label === 'Paystack' ? 'bg-green' : 'bg-orange/60'}`} />
                        <p className="font-semibold text-green-dark group-hover:text-orange">{row.label}</p>
                        <p className="text-xs text-muted">{row.stat.count} {row.stat.count === 1 ? 'order' : 'orders'}</p>
                      </div>
                      <p className="shrink-0 font-bold text-green-dark">{formatPrice(row.stat.revenue)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  )
}