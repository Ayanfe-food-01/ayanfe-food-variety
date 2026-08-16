import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowRight } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { ApiError } from '../services/api'
import { getCustomerOrder, getGuestOrder, type CreatedOrder } from '../services/orderService'
import { formatOrderStatus } from '../utils/orderStatus'
import { getGuestOrderAccessToken, saveGuestOrderAccessToken } from '../utils/guestOrderAccess'

const formatPrice = (price: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(price))

export function OrderConfirmation() {
  const { orderNumber } = useParams()
  const location = useLocation()
  const { user, isLoading: isAuthLoading, openAuth } = useCustomerAuth()
  const [order, setOrder] = useState<CreatedOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const accessFromUrl = new URLSearchParams(location.search).get('access')
  const guestAccessToken = orderNumber
    ? accessFromUrl || getGuestOrderAccessToken(orderNumber)
    : null
  const guestOrderSuffix = !user && guestAccessToken
    ? `?access=${encodeURIComponent(guestAccessToken)}`
    : ''

  useEffect(() => {
    if (isAuthLoading || !orderNumber) return
    if (!user && !guestAccessToken) return
    if (!user && guestAccessToken) {
      saveGuestOrderAccessToken(orderNumber, guestAccessToken)
    }
    const loadOrder = user
      ? getCustomerOrder(orderNumber)
      : getGuestOrder(orderNumber, guestAccessToken!)
    loadOrder
      .then(setOrder)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Your order confirmation could not be loaded.'))
  }, [guestAccessToken, isAuthLoading, orderNumber, user])

  return (
    <>
      <Navbar />
      <main className="container py-12 sm:py-16 lg:py-24">
        {!isAuthLoading && !user && !guestAccessToken ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
            <h1 className="text-3xl font-bold text-green-dark">Choose how to continue</h1>
            <p className="mt-3 text-sm leading-6 text-muted">Sign in to view account orders, or use the guest order link from your checkout.</p>
            <button className="mt-6 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={() => openAuth()}>
              Continue to sign in
            </button>
          </div>
        ) : error ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">
            {error}
          </div>
        ) : !order ? (
          <div className="mx-auto max-w-xl animate-pulse rounded-3xl border border-line bg-white p-10 text-center text-sm text-muted">Loading your confirmation…</div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-green/20 bg-sage/30 px-6 py-10 text-center sm:px-10">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-green text-2xl font-bold text-cream" aria-hidden="true">✓</div>
              <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Order received</p>
              <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Thank you for your order</h1>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted">
                Your order has been created successfully. Payment is still pending and will be handled separately.
              </p>
              <div className="mt-7 inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm">
                <span className="text-muted">Order number</span>
                <strong className="text-green-dark">{order.orderNumber}</strong>
              </div>
              {!user && (
                <p className="mx-auto mt-4 max-w-lg text-xs leading-5 text-muted">
                  Keep this number and use the Track order page with the email address or phone number you used at checkout.
                </p>
              )}
            </div>

             <div className="mt-6 rounded-2xl border border-green/25 bg-sage/30 p-6 shadow-sm sm:p-8">
               <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange">Next step</p>
               <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Send your payment proof</h2>
               <p className="mt-2 text-sm leading-6 text-muted">
                 After completing the transfer using the details shown during checkout, send your receipt so we can verify your payment.
               </p>
                <Link className="mt-5 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to={`/orders/${order.orderNumber}/payment-proof${guestOrderSuffix}`}>
                 Submit payment proof <ArrowRight size={16} />
               </Link>
             </div>

            <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-green-dark">Order summary</h2>
                <span className="rounded-full bg-sage px-3 py-1 text-xs font-bold text-green-dark">Payment pending</span>
              </div>
              <div className="mt-5 divide-y divide-line">
                {order.orderItems.map((item) => (
                  <div className="flex items-center gap-3 py-4" key={item.id}>
                    {item.product.image ? (
                      <img className="size-14 rounded-xl object-cover" src={item.product.image} alt={item.productName} />
                    ) : (
                      <div className="grid size-14 place-items-center rounded-xl bg-sage text-center text-[10px] text-muted">No image</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-green-dark">{item.productName}</p>
                        <p className="mt-1 text-xs text-muted">{item.quantity} × {formatPrice(item.unitPrice)} · {order.fulfillmentMethod === 'PICKUP' ? 'Pickup fee' : 'Delivery'} {formatPrice(item.deliveryFee)}</p>
                    </div>
                    <strong className="text-sm text-green-dark">{formatPrice(item.subtotal)}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
                <div className="flex justify-between text-muted"><span>Subtotal</span><strong className="text-green-dark">{formatPrice(order.subtotal)}</strong></div>
                <div className="flex justify-between text-muted"><span>Delivery fee</span><strong className="text-green-dark">{formatPrice(order.deliveryFee)}</strong></div>
                <div className="flex justify-between pt-2 text-base font-bold text-green-dark"><span>Total</span><span>{formatPrice(order.total)}</span></div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
               <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                 <h2 className="text-xl font-bold text-green-dark">{order.fulfillmentMethod === 'PICKUP' ? 'Pickup information' : 'Delivery information'}</h2>
                 <dl className="mt-4 space-y-3 text-sm">
                   <div><dt className="text-muted">Name</dt><dd className="mt-1 font-bold text-green-dark">{order.customerName}</dd></div>
                   <div><dt className="text-muted">Phone</dt><dd className="mt-1 font-bold text-green-dark">{order.phone}</dd></div>
                   {order.fulfillmentMethod === 'DELIVERY' ? (
                     <>
                       <div><dt className="text-muted">Address</dt><dd className="mt-1 leading-6 text-green-dark">{order.deliveryAddress}, {order.city}</dd></div>
                       {order.note && <div><dt className="text-muted">Instructions</dt><dd className="mt-1 leading-6 text-green-dark">{order.note}</dd></div>}
                     </>
                   ) : (
                     <div><dt className="text-muted">Collection</dt><dd className="mt-1 leading-6 text-green-dark">Collect from the store when notified.</dd></div>
                   )}
                 </dl>
               </div>
              <div className="rounded-2xl border border-line bg-cream/60 p-6">
                <h2 className="text-xl font-bold text-green-dark">What happens next?</h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Payment remains pending until it is handled separately. Keep your order number for future reference.
                </p>
                 <p className="mt-4 text-sm font-bold text-green-dark">Order status: {formatOrderStatus(order.orderStatus)}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link className="inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to={`/orders/${order.orderNumber}${guestOrderSuffix}`}>
                View order <ArrowRight size={16} />
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-sage" to="/shop">
                Continue shopping
              </Link>
              {!user && (
                <Link className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-sage" to="/track-order">
                  Track order
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
