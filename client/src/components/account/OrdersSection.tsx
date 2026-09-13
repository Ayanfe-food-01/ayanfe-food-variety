import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from '../../assets/icons'
import { ApiError } from '../../services/api'
import { getCustomerOrders, type CustomerOrderListItem } from '../../services/orderService'
import { formatOrderStatus } from '../../utils/orderStatus'
import { formatDate } from '../../utils/dateFormat'
import {
  accountCardClassName,
  accountSectionDescriptionClassName,
  accountSectionHeadingClassName,
} from './accountStyles'

const formatPrice = (price: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(price))

const statusClass = (status: string) =>
  status === 'PAID' || status === 'DELIVERED'
    ? 'bg-green/10 text-green'
    : status === 'CANCELLED' || status === 'FAILED' || status === 'REJECTED'
      ? 'bg-orange/10 text-orange'
      : 'bg-sage text-green-dark'

export function OrdersSection() {
  const [orders, setOrders] = useState<CustomerOrderListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getCustomerOrders()
      .then((result) => {
        if (active) setOrders(result)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof ApiError ? reason.message : 'Orders could not be loaded.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <section className={accountCardClassName}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={accountSectionHeadingClassName}>Orders</h2>
          <p className={accountSectionDescriptionClassName}>
            Your recent orders and their payment status.
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-5 py-2.5 text-sm font-bold text-green-dark transition-colors hover:bg-sage/40"
          to="/orders"
        >
          View all orders <ArrowRight size={15} />
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3" role="status" aria-label="Loading your orders">
          {[0, 1].map((row) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-5" key={row}>
              <div className="space-y-2">
                <div className="h-4 w-36 rounded bg-sage animate-pulse" />
                <div className="h-3 w-48 rounded bg-sage/70 animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-20 rounded-full bg-sage animate-pulse" />
                <div className="h-4 w-14 rounded bg-sage animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">
          {error}
        </p>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-cream p-8 text-center">
          <p className="font-bold text-green-dark">No orders yet.</p>
          <p className="mt-1 text-sm text-muted">Your orders will appear here after checkout.</p>
          <Link
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
            to="/shop"
          >
            Browse the shop <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.slice(0, 5).map((order) => (
            <Link
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 transition-colors hover:bg-sage/25 sm:p-5"
              to={`/orders/${order.orderNumber}`}
              key={order.id}
            >
              <div>
                <p className="text-sm font-bold text-green-dark">{order.orderNumber}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatDate(order.createdAt)} · {order.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'} · {order.orderType === 'WHOLESALE' ? 'Wholesale' : 'Retail'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(order.paymentStatus)}`}>
                  {order.paymentStatus}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(order.orderStatus)}`}>
                  {formatOrderStatus(order.orderStatus)}
                </span>
                <strong className="text-sm text-green-dark">{formatPrice(order.total)}</strong>
                <span className="text-muted"><ArrowRight size={15} /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}