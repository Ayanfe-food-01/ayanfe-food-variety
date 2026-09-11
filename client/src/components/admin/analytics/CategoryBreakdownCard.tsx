import { formatNumber, formatPrice } from './analyticsFormat'
import type { AdminAnalytics } from '../../../services/adminService'

interface CategoryBreakdownCardProps {
  analytics: AdminAnalytics | null
  isLoading: boolean
}

export function CategoryBreakdownCard({ analytics, isLoading }: CategoryBreakdownCardProps) {
  const categories = analytics?.categories ?? []

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-labelledby="category-breakdown-heading">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Breakdown</p>
      <h2 id="category-breakdown-heading" className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Category revenue</h2>
      <p className="mt-1 text-sm text-muted">Revenue share by category.</p>

      <div className="mt-5 border-t border-line pt-4">
        {isLoading ? (
          <div className="space-y-3" aria-label="Loading category breakdown">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="animate-pulse rounded-lg bg-sage/45 p-3" key={index} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted">No category sales in this period.</p>
        ) : (
          <ul className="space-y-4">
            {categories.map((category) => (
              <li key={category.categoryId ?? 'uncategorized'}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-green-dark">{category.categoryName}</p>
                  <p className="shrink-0 text-xs font-bold text-muted">
                    {formatPrice(category.revenue)} · {formatNumber(category.unitsSold)} units
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-sage/40" role="presentation">
                    <div className="h-full rounded-full bg-green" style={{ width: `${category.share}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-bold text-muted">{category.share}%</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}