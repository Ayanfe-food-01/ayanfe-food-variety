import { Link } from 'react-router-dom'
import { ArrowUpRight } from '../../../assets/icons'
import { formatOrderStatus } from '../../../utils/orderStatus'
import type { DashboardRecentOrder } from '../../../services/adminService'
import { formatPrice, statusClass } from '../orderPresentation'
import { formatRelativeTime } from './dashboardFormat'

interface RecentOrdersCardProps {
  orders: DashboardRecentOrder[]
  isLoading?: boolean
}

export function RecentOrdersCard({ orders, isLoading = false }: RecentOrdersCardProps) {
  return (
    <section className="h-full min-w-0 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Latest activity</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Recent orders</h2>
        </div>
        <Link className="flex items-center gap-1 text-sm font-bold text-green hover:text-orange" to="/admin/orders">
          View all orders <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="mt-5 border-t border-line">
        {isLoading ? (
          <div className="space-y-3 pt-4" aria-label="Loading recent orders">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="animate-pulse rounded-xl bg-sage/45 p-4" key={index} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="pt-6 text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((order) => (
              <li key={order.orderNumber}>
                <Link className="group flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-sage/20" to={`/admin/orders/${order.orderNumber}`}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-green-dark group-hover:text-orange">{order.customerName}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {order.orderNumber} · {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} · {formatRelativeTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="font-bold text-green-dark">{formatPrice(order.total)}</p>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(order.orderStatus)}`}>
                      {formatOrderStatus(order.orderStatus)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}