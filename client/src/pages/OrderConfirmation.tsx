import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowRight } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { useCart } from '../hooks/useCart'
import { useInitialRouteLoad } from '../hooks/useInitialRouteLoad'
import { ApiError } from '../services/api'
import { getCustomerOrder, getGuestOrder, type CreatedOrder } from '../services/orderService'
import {
  initializeGuestPaystackPayment,
  initializePaystackPayment,
  verifyGuestPaystackPayment,
  verifyPaystackPayment,
  type PaystackPaymentVerification,
} from '../services/paymentService'
import { formatOrderStatus } from '../utils/orderStatus'
import { getGuestOrderAccessToken, saveGuestOrderAccessToken } from '../utils/guestOrderAccess'

const formatPrice = (price: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(price))

type GatewayStatus =
  | { kind: 'checking' }
  | { kind: 'success'; verification: PaystackPaymentVerification }
  | { kind: 'unconfirmed'; message: string }
  | { kind: 'error'; message: string }

const gatewayCopy: Record<GatewayStatus['kind'], { title: string; body: string }> = {
  checking: {
    title: 'Confirming your payment',
    body: 'We are checking the payment status with your provider. This only takes a moment.',
  },
  success: {
    title: 'Payment confirmed',
    body: 'Thank you! Your payment has been confirmed and your order is now being prepared.',
  },
  unconfirmed: {
    title: 'Payment not completed',
    body: 'Your payment did not go through, or the order has not been paid yet. You can try paying again.',
  },
  error: {
    title: 'Payment status could not be checked',
    body: 'We could not confirm your payment right now. You can try again, or start the payment over.',
  },
}

// The payment provider can take a few seconds after redirect to finalize a
// transaction (and the webhook backstop lands in the same window). So a single
// failed-to-confirm reading is never treated as final: keep asking the
// server-confirmed verify endpoint a few times before declaring the payment
// unconfirmed.
const VERIFY_ATTEMPTS = 4
const VERIFY_RETRY_DELAY_MS = 2500

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

export function OrderConfirmation() {
  const { orderNumber } = useParams()
  const location = useLocation()
  const { user, isLoading: isAuthLoading, openAuth } = useCustomerAuth()
  const { refreshCart } = useCart()
  const [order, setOrder] = useState<CreatedOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>({ kind: 'checking' })
  const [isPayingAgain, setIsPayingAgain] = useState(false)
  const accessFromUrl = new URLSearchParams(location.search).get('access')
  const guestAccessToken = orderNumber
    ? accessFromUrl || getGuestOrderAccessToken(orderNumber)
    : null
  const guestOrderSuffix = !user && guestAccessToken
    ? `?access=${encodeURIComponent(guestAccessToken)}`
    : ''

  useInitialRouteLoad(!isAuthLoading && ((!user && !guestAccessToken) || !!order || !!error))

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

  // Fetch the server-confirmed verification verdict. The gateway return URL alone
  // is never treated as proof of payment.
  const fetchVerification = useCallback(async (): Promise<PaystackPaymentVerification | null> => {
    if (!orderNumber || !order) return null
    return user
      ? await verifyPaystackPayment({ orderId: order.id })
      : guestAccessToken
        ? await verifyGuestPaystackPayment({ orderId: order.id, guestAccessToken })
        : null
  }, [guestAccessToken, order, orderNumber, user])

  const applyVerification = useCallback((verification: PaystackPaymentVerification | null) => {
    if (!verification) return
    if (verification.status === 'SUCCESSFUL') {
      setGatewayStatus({ kind: 'success', verification })
      refreshCart()
    } else {
      setGatewayStatus({ kind: 'unconfirmed', message: gatewayCopy.unconfirmed.body })
    }
  }, [refreshCart])

  const verificationFailed = useCallback((reason: unknown) => {
    setGatewayStatus({
      kind: 'error',
      message: reason instanceof ApiError ? reason.message : 'Your payment status could not be checked right now.',
    })
  }, [])

  // Verify with the server endpoint, retrying with a short backoff only while
  // the payment is not confirmed yet. A SUCCESSFUL reading ends immediately;
  // anything else (still pending, or the webhook backstop settling a moment
  // later) is re-checked so the page converges on the authoritative result.
  const runVerification = useCallback(async (): Promise<PaystackPaymentVerification | null> => {
    let lastVerification: PaystackPaymentVerification | null = null
    let lastError: unknown = null
    for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt += 1) {
      if (attempt > 0) await delay(VERIFY_RETRY_DELAY_MS)
      try {
        const verification = await fetchVerification()
        if (verification?.status === 'SUCCESSFUL') return verification
        lastVerification = verification
        lastError = null
      } catch (reason) {
        lastError = reason
      }
    }
    if (lastError !== null && lastVerification === null) throw lastError
    return lastVerification
  }, [fetchVerification])

  const retryCheck = () => {
    setGatewayStatus({ kind: 'checking' })
    void runVerification().then(applyVerification).catch(verificationFailed)
  }

  // Once the order is loaded, confirm an unfinished Paystack payment with the
  // provider. This runs on return from the provider (or an idempotent re-check
  // of a previous attempt) and keeps re-checking briefly so a payment that is a
  // moment away from finalizing — or picked up by the webhook backstop — is
  // still confirmed here rather than shown as uncompleted.
  useEffect(() => {
    if (!order) return
    if (order.paymentMethod !== 'PAYSTACK') return
    let cancelled = false
    void runVerification()
      .then((verification) => {
        if (cancelled) return
        applyVerification(verification)
      })
      .catch((reason) => {
        if (cancelled) return
        verificationFailed(reason)
      })
    return () => {
      cancelled = true
    }
  }, [applyVerification, order, runVerification, verificationFailed])

  const payAgain = async () => {
    if (!orderNumber || !order || isPayingAgain) return
    setIsPayingAgain(true)
    try {
      const init = user
        ? await initializePaystackPayment({ orderId: order.id, callbackUrl: window.location.href })
        : await initializeGuestPaystackPayment({
            orderId: order.id,
            guestAccessToken: guestAccessToken!,
            callbackUrl: window.location.href,
          })
      window.location.assign(init.authorizationUrl)
    } catch (reason: unknown) {
      setIsPayingAgain(false)
      setGatewayStatus({
        kind: 'error',
        message: reason instanceof ApiError ? reason.message : 'The payment could not be started right now.',
      })
    }
  }

  const paystackBanner = (() => {
    if (!order || order.paymentMethod !== 'PAYSTACK') return null
    const copy = gatewayCopy[gatewayStatus.kind]
    return (
      <div className={`mt-6 rounded-2xl border p-6 shadow-sm sm:p-8 ${
        gatewayStatus.kind === 'success'
          ? 'border-green/25 bg-sage/30'
          : gatewayStatus.kind === 'unconfirmed'
            ? 'border-orange/25 bg-orange/5'
            : 'border-line bg-white'
      }`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange">Next step</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{copy.body}</p>
        {gatewayStatus.kind === 'checking' && (
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-orange">Checking…</p>
        )}
        {gatewayStatus.kind !== 'success' && gatewayStatus.kind !== 'checking' && (
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:opacity-60"
              type="button"
              onClick={() => void payAgain()}
              disabled={isPayingAgain}
            >
              {isPayingAgain ? 'Starting payment…' : 'Pay now'} <ArrowRight size={16} />
            </button>
            {gatewayStatus.kind === 'error' && (
              <button
                className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-sage"
                type="button"
                onClick={retryCheck}
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    )
  })()

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
          <div className="mx-auto max-w-3xl animate-pulse" role="status" aria-label="Loading your order confirmation">
            <div className="rounded-3xl border border-line bg-white px-6 py-10 text-center sm:px-10">
              <div className="mx-auto size-16 rounded-full bg-sage" />
              <div className="mx-auto mt-6 h-3 w-28 rounded bg-sage" />
              <div className="mx-auto mt-3 h-9 w-72 max-w-full rounded bg-sage" />
              <div className="mx-auto mt-4 h-3 w-80 max-w-full rounded bg-sage" />
              <div className="mx-auto mt-2 h-3 w-64 max-w-full rounded bg-sage" />
              <div className="mx-auto mt-7 h-9 w-44 rounded-full bg-sage" />
            </div>
            <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
              <div className="h-7 w-40 rounded bg-sage" />
              <div className="mt-5 space-y-5">
                {[0, 1, 2].map((row) => (
                  <div className="flex items-center gap-3" key={row}>
                    <div className="size-14 shrink-0 rounded-xl bg-sage" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3 w-48 max-w-full rounded bg-sage" />
                      <div className="h-3 w-28 rounded bg-sage/70" />
                    </div>
                    <div className="h-4 w-16 rounded bg-sage" />
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3 border-t border-line pt-5">
                <div className="h-4 w-32 rounded bg-sage/70" />
                <div className="h-4 w-40 rounded bg-sage/70" />
                <div className="h-4 w-24 rounded bg-sage/70" />
                <div className="h-5 w-28 rounded bg-sage" />
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-green/20 bg-sage/30 px-6 py-10 text-center sm:px-10">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-green text-2xl font-bold text-cream" aria-hidden="true">✓</div>
              <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Order received</p>
              <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Thank you for your order</h1>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted">
                {order.paymentMethod === 'PAYSTACK' && gatewayStatus?.kind === 'success'
                  ? 'Your order has been created successfully and your payment has been confirmed.'
                  : order.paymentMethod === 'PAYSTACK' && gatewayStatus?.kind === 'checking'
                    ? 'Your order has been created successfully. We are confirming your payment, this only takes a moment.'
                    : order.paymentMethod === 'PAYSTACK'
                      ? 'Your order has been created successfully. Payment is still pending and will be confirmed once complete.'
                      : 'Your order has been created successfully. Payment is still pending and will be handled separately.'}
              </p>
              <div className="mt-7 inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm">
                <span className="text-muted">Order number</span>
                <strong className="text-green-dark">{order.orderNumber}</strong>
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
                <span className={order.orderType === 'WHOLESALE' ? 'inline-block size-2 rounded-full bg-orange' : 'inline-block size-2 rounded-full bg-green'} />
                <span className={order.orderType === 'WHOLESALE' ? 'text-orange' : 'text-green-dark'}>
                  {order.orderType === 'WHOLESALE' ? 'Wholesale Order' : 'Retail Order'}
                </span>
              </div>
              {!user && (
                <p className="mx-auto mt-4 max-w-lg text-xs leading-5 text-muted">
                  Keep this number and use the Track order page with the email address or phone number you used at checkout.
                </p>
              )}
            </div>

             {order.paymentMethod === 'PAYSTACK' ? (
               paystackBanner
             ) : (
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
             )}

            <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-green-dark">Order summary</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sage px-3 py-1 text-xs font-bold text-green-dark">{order.orderType === 'WHOLESALE' ? 'Wholesale' : 'Retail'}</span>
                  <span className="rounded-full bg-sage px-3 py-1 text-xs font-bold text-green-dark">{order.paymentMethod === 'PAYSTACK' ? (gatewayStatus?.kind === 'success' ? 'Payment confirmed' : gatewayStatus?.kind === 'checking' ? 'Confirming payment' : 'Payment pending') : 'Payment pending'}</span>
                </div>
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
                        {item.productOptionLabel && <p className="mt-0.5 text-xs font-semibold text-orange">{item.productOptionLabel}</p>}
                        {item.wholesalePackageName && (
                          <p className="mt-0.5 text-xs font-semibold text-orange">
                            {item.wholesalePackageName}
                            {item.wholesaleUnitsPerPackage ? ` · ${item.wholesaleUnitsPerPackage} ${item.wholesaleUnitsPerPackage === 1 ? 'unit' : 'units'} per package` : ''}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted">{item.quantity} × {formatPrice(item.unitPrice)}</p>
                    </div>
                    <strong className="text-sm text-green-dark">{formatPrice(item.subtotal)}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
                <div className="flex justify-between text-muted"><span>Subtotal</span><strong className="text-green-dark">{formatPrice(order.subtotal)}</strong></div>
                {order.fulfillmentMethod === 'DELIVERY' && order.deliveryZoneName && (
                  <div className="flex justify-between text-muted"><span>Delivery zone</span><strong className="text-green-dark">{order.deliveryZoneName}</strong></div>
                )}
                {order.fulfillmentMethod === 'DELIVERY' && order.deliveryAreaName && (
                  <div className="flex justify-between text-muted"><span>Delivery area</span><strong className="text-green-dark">{order.deliveryAreaName}</strong></div>
                )}
                {order.fulfillmentMethod === 'DELIVERY' && order.deliveryMinDays && order.deliveryMaxDays && (
                  <div className="flex justify-between text-muted"><span>Estimated delivery</span><strong className="text-green-dark">{order.deliveryMinDays === order.deliveryMaxDays ? `${order.deliveryMinDays} business day${order.deliveryMinDays === 1 ? '' : 's'}` : `${order.deliveryMinDays}–${order.deliveryMaxDays} business days`}</strong></div>
                )}
                <div className="flex justify-between text-muted"><span>Delivery fee</span><strong className="text-green-dark">{order.deliveryFee === '0' || Number(order.deliveryFee) === 0 ? 'FREE' : formatPrice(order.deliveryFee)}</strong></div>
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
                       <div><dt className="text-muted">Address</dt><dd className="mt-1 leading-6 text-green-dark">{order.deliveryAddress}, {order.deliveryAreaName ? `${order.deliveryAreaName}, ` : ''}{order.city}{order.state ? `, ${order.state}` : ''}</dd></div>
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
                  {order.paymentMethod === 'PAYSTACK' && gatewayStatus?.kind === 'success'
                    ? 'Your payment has been confirmed. Your order will be prepared and you will be notified when it is ready.'
                    : order.paymentMethod === 'PAYSTACK' && gatewayStatus?.kind === 'checking'
                      ? 'We are confirming your payment with the provider. This only takes a moment.'
                      : 'Payment remains pending until it is confirmed. Keep your order number for future reference.'}
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
