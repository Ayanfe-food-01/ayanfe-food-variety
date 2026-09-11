import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { sortedIndex } from './topProductsSort'
import { formatPrice } from './analyticsFormat'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { ResponsiveDataTable } from '../../ui/ResponsiveDataTable'
import type { AdminAnalytics } from '../../../services/adminService'

type SortKey = 'revenue' | 'units'

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'units', label: 'Units sold' },
]

interface AnalyticsTopProductsCardProps {
  analytics: AdminAnalytics | null
  isLoading: boolean
}

export function AnalyticsTopProductsCard({ analytics, isLoading }: AnalyticsTopProductsCardProps) {
  const [sortBy, setSortBy] = useState<SortKey>('revenue')
  const products = useMemo(
    () => (analytics ? sortedIndex(analytics.topProducts, sortBy) : []),
    [analytics, sortBy],
  )

  return (
    <section className="flex h-full min-w-0 flex-col rounded-2xl border border-line bg-white shadow-sm" aria-labelledby="top-products-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-5 pb-4 sm:p-6 sm:pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Performance</p>
          <h2 id="top-products-heading" className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Top products</h2>
          <p className="mt-1 text-sm text-muted">Ranked within the selected period.</p>
        </div>
        <div className="w-52 sm:w-60">
          <SegmentedControl ariaLabel="Top products sort" options={sortOptions} value={sortBy} onChange={(key) => setSortBy(key as SortKey)} className="h-9 sm:h-10" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 p-5 sm:p-6" aria-label="Loading top products">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="animate-pulse rounded-xl bg-sage/45 p-4" key={index} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="p-5 text-sm text-muted sm:p-6">No product sales in this period.</p>
      ) : (
        <>
          <div className="space-y-3 p-4 sm:p-5 lg:hidden">
            {products.map((product, index) => (
              <Link
                className="block rounded-2xl border border-line bg-cream/45 p-4 transition-colors hover:border-green/30"
                to={`/admin/products/${product.productId}`}
                key={product.productId}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sage/45 text-xs font-bold text-green-dark">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-green-dark">{product.productName}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{product.categoryName}</p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 text-xs">
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Units sold</dt>
                    <dd className="mt-1 font-bold text-green-dark">{product.unitsSold}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Revenue</dt>
                    <dd className="mt-1 font-bold text-green-dark">{formatPrice(product.revenue)}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>

          <div className="hidden lg:block">
            <ResponsiveDataTable label="Top products table horizontal scroll">
              <table className="w-full min-w-[640px] whitespace-nowrap text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="w-10 px-4 py-4 font-bold">#</th>
                    <th className="px-4 py-4 font-bold">Product</th>
                    <th className="px-4 py-4 text-right font-bold">Units sold</th>
                    <th className="px-4 py-4 text-right font-bold">Revenue</th>
                    <th className="px-4 py-4 font-bold">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {products.map((product, index) => (
                    <tr className="align-middle transition-colors hover:bg-sage/15" key={product.productId}>
                      <td className="px-4 py-4 text-xs font-bold text-muted">{index + 1}</td>
                      <td className="max-w-[260px] px-4 py-4">
                        <Link className="block truncate font-bold text-green-dark hover:text-orange" to={`/admin/products/${product.productId}`}>
                          {product.productName}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-green-dark">{product.unitsSold}</td>
                      <td className="px-4 py-4 text-right font-bold text-green-dark">{formatPrice(product.revenue)}</td>
                      <td className="max-w-[200px] px-4 py-4 text-muted">
                        <span className="block truncate">{product.categoryName}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveDataTable>
          </div>
        </>
      )}
    </section>
  )
}