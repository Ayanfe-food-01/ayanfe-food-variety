import { useState, type FormEvent } from 'react'
import { ArrowRight } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { OrderTracker } from '../components/orders/OrderTracker'
import { ApiError } from '../services/api'
import { trackGuestOrder, type GuestOrder } from '../services/orderService'
import { formatDate } from '../utils/dateFormat'
import { formatOrderStatus } from '../utils/orderStatus'

const formatPrice = (price: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(price))

const paymentStatusCopy: Record<GuestOrder['paymentStatus'], string> = {
  PENDING: 'Awaiting payment verification',
  PAID: 'Payment confirmed',
  REJECTED: 'Payment proof was rejected',
}

export function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('')
  const [contact, setContact] = useState('')
  const [order, setOrder] = useState<GuestOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedOrderNumber = orderNumber.trim().toUpperCase()
    const normalizedContact = contact.trim()

    if (!normalizedOrderNumber || !normalizedContact) {
      setError('Enter your order number and the email address or phone number used at checkout.')
      return
    }
    if (normalizedContact.length < 5) {
      setError('Enter a valid email address or phone number.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setOrder(null)
    try {
      setOrder(await trackGuestOrder(normalizedOrderNumber, normalizedContact))
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError && caught.status === 429
          ? caught.message
          : caught instanceof ApiError && caught.status === 400
            ? caught.message
            : 'We could not verify this order. Check the order number and the email or phone used at checkout. Guest tracking is for orders placed without signing in; if you used an account, sign in to view your order.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = () => {
    setOrder(null)
    setError(null)
    setOrderNumber('')
    setContact('')
  }

  return (
    <>
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-12 sm:py-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Order support</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Track your order</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Check the latest progress of an order placed without signing in. Use the order number and one of the contact details entered during checkout.
            </p>
          </div>
        </section>

        <section className="container py-10 sm:py-16 lg:py-20">
          {!order ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-green-dark">Find your order</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Your details are checked securely before any order information is shown.</p>
              <form className="mt-7 space-y-5" onSubmit={submit} noValidate>
                <label className="block text-sm font-bold text-green-dark">
                  Order number
                  <input
                    className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal uppercase outline-none transition-colors placeholder:normal-case placeholder:text-muted focus:border-green focus:ring-2 focus:ring-green/10"
                    value={orderNumber}
                    onChange={(event) => {
                      setOrderNumber(event.target.value.toUpperCase())
                      setError(null)
                    }}
                    placeholder="AFV-2026-000001"
                    autoComplete="off"
                    required
                  />
                </label>
                <label className="block text-sm font-bold text-green-dark">
                  Email or phone number
                  <input
                    className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none transition-colors placeholder:text-muted focus:border-green focus:ring-2 focus:ring-green/10"
                    value={contact}
                    onChange={(event) => {
                      setContact(event.target.value)
                      setError(null)
                    }}
                    placeholder="Email address or phone number"
                    autoComplete="email tel"
                    required
                  />
                </label>
                {error && <p className="rounded-xl border border-orange/25 bg-orange/5 p-3 text-sm leading-5 text-orange" role="alert">{error}</p>}
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green px-5 py-3.5 text-sm font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-wait disabled:opacity-60"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Checking…' : 'Track order'}
                  {!isSubmitting && <ArrowRight size={16} />}
                </button>
              </form>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Order found</p>
                  <h2 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark">{order.orderNumber}</h2>
                  <p className="mt-2 text-sm text-muted">Placed {formatDate(order.createdAt)}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-muted">Current status</p>
                  <p className="mt-1 font-bold text-green-dark">{formatOrderStatus(order.orderStatus)}</p>
                  <p className="mt-3 text-sm text-muted">Payment</p>
                  <p className="mt-1 font-bold text-green-dark">{paymentStatusCopy[order.paymentStatus]}</p>
                </div>
              </div>

              <div className="mt-8">
                <OrderTracker order={order} />
              </div>

              <div className="mt-6 rounded-2xl border border-green/20 bg-sage/30 p-6 shadow-sm sm:p-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange">Fulfillment</p>
                {order.fulfillmentMethod === 'PICKUP' ? (
                  <>
                    <h3 className="mt-2 text-2xl font-bold text-green-dark">Pickup</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">We will contact you when your order is ready for collection.</p>
                  </>
                ) : (
                  <>
                    <h3 className="mt-2 text-2xl font-bold text-green-dark">Delivery</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{order.deliveryAddress}, {order.city}</p>
                  </>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-2xl font-bold text-green-dark">Items</h3>
                  <span className="rounded-full bg-sage px-3 py-1 text-xs font-bold text-green-dark">
                    {paymentStatusCopy[order.paymentStatus]}
                  </span>
                </div>
                <div className="mt-5 divide-y divide-line">
                  {order.orderItems.map((item) => (
                    <div className="flex items-center gap-3 py-4" key={item.id}>
                      {item.image ? (
                        <img className="size-14 rounded-xl object-cover" src={item.image} alt={item.productName} />
                      ) : (
                        <div className="grid size-14 place-items-center rounded-xl bg-sage text-center text-[10px] text-muted">No image</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-green-dark">{item.productName}</p>
                        {item.productOptionLabel && <p className="mt-0.5 text-xs font-semibold text-orange">{item.productOptionLabel}</p>}
                        <p className="mt-1 text-xs text-muted">{item.quantity} × {formatPrice(item.unitPrice)}</p>
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

              <button className="mx-auto mt-8 flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-bold text-green-dark transition-colors hover:bg-sage" type="button" onClick={reset}>
                Track another order
              </button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}