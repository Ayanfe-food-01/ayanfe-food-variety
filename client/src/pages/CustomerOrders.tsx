import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { useInitialRouteLoad } from '../hooks/useInitialRouteLoad'
import { ApiError } from '../services/api'
import { getCustomerOrders, type CustomerOrderListItem } from '../services/orderService'
import { formatOrderStatus } from '../utils/orderStatus'
import { formatDate } from '../utils/dateFormat'

const formatPrice = (price: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(price))

const statusClass = (status: string) =>
  status === 'PAID' || status === 'DELIVERED'
    ? 'bg-green/10 text-green'
    : status === 'CANCELLED' || status === 'FAILED' || status === 'REJECTED'
      ? 'bg-orange/10 text-orange'
      : 'bg-sage text-green-dark'

export function CustomerOrders() {
  const { user, isLoading: isAuthLoading, openAuth, shoppingMode } = useCustomerAuth()
  const [orders, setOrders] = useState<CustomerOrderListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useInitialRouteLoad(!isAuthLoading && (!user || !isLoading))

  useEffect(() => {
    if (isAuthLoading || !user) return
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
  }, [isAuthLoading, user])

  return (
    <>
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-12 sm:py-16">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Your account</p>
            <h1 className="m-0 text-5xl font-bold tracking-[-0.05em] text-green-dark sm:text-6xl">Orders</h1>
            <p className="mt-4 text-base text-muted">View your order history and payment status.</p>
            {user && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-2 text-xs font-bold text-green-dark">
                Shopping mode:
                <span className={`rounded-full px-3 py-1 uppercase tracking-[0.08em] ${shoppingMode === 'WHOLESALE' ? 'bg-green-dark text-cream' : 'bg-sage text-green-dark'}`}>{shoppingMode}</span>
              </p>
            )}
          </div>
        </section>
        <section className="container py-12 sm:py-16 lg:py-24">
          {!isAuthLoading && !user ? (
            <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
              <h2 className="text-3xl font-bold text-green-dark">Sign in to view your orders</h2>
              <button className="mt-6 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={() => openAuth()}>
                Sign in or create an account
              </button>
            </div>
          ) : isLoading ? (
            <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Loading your orders…</p>
          ) : error ? (
            <p className="rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">{error}</p>
          ) : orders.length === 0 ? (
            <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
              <h2 className="text-3xl font-bold text-green-dark">No orders yet</h2>
               <p className="mt-3 text-sm text-muted">Your orders will appear here after checkout.</p>
              <Link className="mt-6 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to="/shop">
                Browse the shop <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              <div className="divide-y divide-line">
                {orders.map((order) => (
                  <Link className="flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:bg-sage/25 sm:p-6" to={`/orders/${order.orderNumber}`} key={order.id}>
<div>
                        <p className="text-sm font-bold text-green-dark">{order.orderNumber}</p>
                         <p className="mt-1 text-xs text-muted">{formatDate(order.createdAt)} · {order.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'} · {order.orderType === 'WHOLESALE' ? 'Wholesale' : 'Retail'}</p>
                      </div>
                    <div className="flex items-center gap-5">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(order.paymentStatus)}`}>{order.paymentStatus}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(order.orderStatus)}`}>{formatOrderStatus(order.orderStatus)}</span>
                      <strong className="text-sm text-green-dark">{formatPrice(order.total)}</strong>
                      <span className="text-muted"><ArrowRight size={16} /></span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}