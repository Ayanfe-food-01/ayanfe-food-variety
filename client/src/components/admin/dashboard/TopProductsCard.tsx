import { Link } from 'react-router-dom'
import { ArrowUpRight } from '../../../assets/icons'
import type { DashboardTopProduct } from '../../../services/adminService'

interface TopProductsCardProps {
  products: DashboardTopProduct[]
  isLoading?: boolean
}

export function TopProductsCard({ products, isLoading = false }: TopProductsCardProps) {
  return (
    <section className="h-full rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Performance</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Top products this week</h2>
        </div>
        <Link className="flex items-center gap-1 text-sm font-bold text-green hover:text-orange" to="/admin/products">
          View all products <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="mt-5 border-t border-line">
        {isLoading ? (
          <div className="space-y-3 pt-4" aria-label="Loading top products">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="animate-pulse rounded-xl bg-sage/45 p-4" key={index} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="pt-6 text-sm text-muted">No sales this week yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {products.map((product, index) => (
              <li key={`${product.productName}-${index}`}>
                <Link className="group flex items-center justify-between gap-4 py-3 transition-colors hover:bg-sage/20" to="/admin/products">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sage/45 text-xs font-bold text-green-dark">{index + 1}</span>
                    <p className="truncate font-semibold text-green-dark group-hover:text-orange">{product.productName}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-green-dark">
                    {product.unitsSold} <span className="font-semibold text-muted">units sold</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}