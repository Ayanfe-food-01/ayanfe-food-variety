import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPinIcon, ArrowUpRight } from '../../assets/icons'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { StatCard } from '../../components/admin/StatCard'
import { formatPrice, statusClass } from '../../components/admin/orderPresentation'
import { formatRelativeTime } from '../../components/admin/dashboard/dashboardFormat'
import { formatDate } from '../../utils/dateFormat'
import { formatOrderStatus } from '../../utils/orderStatus'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { ApiError } from '../../services/api'
import { getAdminCustomer } from '../../services/customerService'
import type { AdminCustomerDetail } from '../../types/customer'

export function CustomerDetail() {
  const { id } = useParams<'id'>()
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useInitialRouteLoad(!isLoading)

  useEffect(() => {
    if (!id) return
    let current = true
    queueMicrotask(() => {
      if (!current) return
      setError(null)
      setIsLoading(true)
    })
    getAdminCustomer(id)
      .then((result) => {
        if (current) setCustomer(result)
      })
      .catch((caught: unknown) => {
        if (current) setError(caught instanceof ApiError ? caught.message : 'Customer details could not be loaded.')
      })
      .finally(() => {
        if (current) setIsLoading(false)
      })
    return () => {
      current = false
    }
  }, [id])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-sage/70" />
        <div className="h-12 w-64 animate-pulse rounded-md bg-sage/70" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
          <div className="h-[112px] animate-pulse rounded-2xl bg-sage/70 sm:h-[132px]" />
          <div className="h-[112px] animate-pulse rounded-2xl bg-sage/70 sm:h-[132px]" />
          <div className="h-[112px] animate-pulse rounded-2xl bg-sage/70 sm:h-[132px]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Breadcrumb className="mb-5" items={[{ label: 'Dashboard', href: '/admin' }, { label: 'Customers', href: '/admin/customers' }]} />
        <div className="rounded-2xl border border-orange/25 bg-orange/5 p-6 text-sm text-orange" role="alert">{error}</div>
      </div>
    )
  }

  if (!customer) return null

  return (
    <div>
      <Breadcrumb className="mb-5" items={[{ label: 'Dashboard', href: '/admin' }, { label: 'Customers', href: '/admin/customers' }, { label: customer.name }]} />

      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-4">
        <h1 className="text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{customer.name}</h1>
        <span className={`mb-1 inline-flex shrink-0 self-start rounded-full px-2.5 py-1 text-xs font-bold sm:mb-0 sm:self-auto ${customer.isActive ? 'bg-green/10 text-green' : 'bg-sage text-green-dark'}`}>
          {customer.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <span>{customer.email}</span>
        {customer.phone && <span>{customer.phone}</span>}
        <span>Member since {formatDate(customer.createdAt)}</span>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5" aria-label="Customer metrics">
        <StatCard
          label="Total orders"
          value={customer.totalOrders}
          detail={`${customer.totalOrders === 1 ? 'order' : 'orders'} placed`}
          accent="green"
          isLoading={false}
        />
        <StatCard
          label="Total spent"
          value={formatPrice(customer.totalSpent)}
          detail="Across all paid orders"
          accent="orange"
          isLoading={false}
        />
        <StatCard
          label="Avg order value"
          value={formatPrice(customer.averageOrderValue)}
          detail="Per paid order"
          accent="green"
          isLoading={false}
        />
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white shadow-sm" aria-label="Order history">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">History</p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Order history</h2>
          </div>
          {customer.totalOrders > 0 && (
            <Link className="flex items-center gap-1 text-sm font-bold text-green hover:text-orange" to="/admin/orders">
              View all orders <ArrowUpRight size={16} />
            </Link>
          )}
        </div>

        {customer.orders.length === 0 ? (
          <p className="px-6 py-12 text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {customer.orders.map((order) => (
              <li key={order.orderNumber}>
                <Link className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-sage/20 sm:px-6" to={`/admin/orders/${order.orderNumber}`}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-green-dark group-hover:text-orange">{order.orderNumber}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} · {formatRelativeTime(order.createdAt)}
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
      </section>

      {customer.addresses.length > 0 && (
        <section className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Saved addresses">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Delivery</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Saved addresses</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {customer.addresses.map((address) => (
              <div className="flex items-start gap-3 rounded-2xl border border-line bg-cream/45 p-4" key={`${address.deliveryAddress}|${address.city}|${address.state ?? ''}`}>
                <span className="mt-0.5 text-green" aria-hidden="true">
                  <MapPinIcon size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-green-dark">{address.deliveryAddress}</p>
                  <p className="mt-0.5 text-xs text-muted">{[address.city, address.state].filter(Boolean).join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}