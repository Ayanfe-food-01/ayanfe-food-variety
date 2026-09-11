import { formatNumber } from './analyticsFormat'
import type { AdminAnalytics } from '../../../services/adminService'

interface CustomerInsightsCardProps {
  analytics: AdminAnalytics | null
  isLoading: boolean
}

const barWidth = (part: number, total: number): number => (total > 0 ? Math.round((part / total) * 100) : 0)

export function CustomerInsightsCard({ analytics, isLoading }: CustomerInsightsCardProps) {
  const customers = analytics?.customers
  const newWidth = barWidth(customers?.newCustomers ?? 0, customers?.totalCustomers ?? 0)
  const returningWidth = barWidth(customers?.returningCustomers ?? 0, customers?.totalCustomers ?? 0)

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-labelledby="customer-insights-heading">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Customers</p>
      <h2 id="customer-insights-heading" className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Customer insights</h2>
      <p className="mt-1 text-sm text-muted">New vs returning customers in the selected period.</p>

      <div className="mt-5 border-t border-line pt-4">
        {isLoading ? (
          <div className="space-y-3" aria-label="Loading customer insights">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="animate-pulse rounded-lg bg-sage/45 p-3" key={index} />
            ))}
          </div>
        ) : customers && customers.totalCustomers > 0 ? (
          <>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-muted">New customers</dt>
                <dd className="mt-1 text-[clamp(1.25rem,1.1rem+1.1vw,1.875rem)] font-bold tracking-[-0.04em] text-green-dark">
                  {formatNumber(customers.newCustomers)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-muted">Returning</dt>
                <dd className="mt-1 text-[clamp(1.25rem,1.1rem+1.1vw,1.875rem)] font-bold tracking-[-0.04em] text-green-dark">
                  {formatNumber(customers.returningCustomers)}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-sage/40" role="img" aria-label="New versus returning customers">
              <div className="bg-green" style={{ width: `${returningWidth}%` }} />
              <div className="bg-orange" style={{ width: `${newWidth}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">
              <span className="font-bold text-orange">New</span> · <span className="font-bold text-green-dark">Returning</span>
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5">
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-muted">Avg orders / customer</dt>
                <dd className="mt-1 text-xl font-bold tracking-[-0.03em] text-green-dark">{customers.averageOrdersPerCustomer}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-muted">Total customers</dt>
                <dd className="mt-1 text-xl font-bold tracking-[-0.03em] text-green-dark">{formatNumber(customers.totalCustomers)}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="text-sm text-muted">No confirmed customers in this period.</p>
        )}
      </div>
    </section>
  )
}