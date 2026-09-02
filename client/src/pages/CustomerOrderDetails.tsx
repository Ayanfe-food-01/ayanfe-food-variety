import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowRight } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { useCart } from '../hooks/useCart'
import { useInitialRouteLoad } from '../hooks/useInitialRouteLoad'
import { ApiError } from '../services/api'
import {
  getBankDetails,
  initializeGuestPaystackPayment,
  initializePaystackPayment,
  verifyGuestPaystackPayment,
  verifyPaystackPayment,
  type BankDetails,
} from '../services/paymentService'
import { cancelCustomerOrder, getCustomerOrder, getGuestOrder, type CreatedOrder } from '../services/orderService'
import { canCustomerCancelOrder, customerCancellationReasons, formatOrderStatus } from '../utils/orderStatus'
import { ImagePreview } from '../components/ui/ImagePreview'
import { SelectField } from '../components/ui/SelectField'
import { formatDate } from '../utils/dateFormat'
import { lockBodyScroll } from '../utils/browserCompatibility'
import { getGuestOrderAccessToken, saveGuestOrderAccessToken } from '../utils/guestOrderAccess'
import { OrderTracker } from '../components/orders/OrderTracker'
import { getOrderReviewEligibility, type ReviewEligibility } from '../services/reviewService'

const formatPrice = (price: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(price))

const paymentStatusCopy: Record<CreatedOrder['paymentStatus'], { label: string; description: string }> = {
  PENDING: { label: 'PENDING', description: 'Awaiting payment verification' },
  PAID: { label: 'PAID', description: 'Payment confirmed' },
  REJECTED: { label: 'REJECTED', description: 'Payment proof was rejected' },
}

export function CustomerOrderDetails() {
  const { orderNumber } = useParams()
  const location = useLocation()
  const { user, isLoading: isAuthLoading, openAuth } = useCustomerAuth()
  const [order, setOrder] = useState<CreatedOrder | null>(null)
  const [bank, setBank] = useState<BankDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reviewEligibility, setReviewEligibility] = useState<ReviewEligibility | null>(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [otherCancellationReason, setOtherCancellationReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [gatewayStatus, setGatewayStatus] = useState<
    | { kind: 'checking' }
    | { kind: 'success' }
    | { kind: 'unconfirmed' }
    | { kind: 'error'; message: string }
  >({ kind: 'checking' })
  const [isPaying, setIsPaying] = useState(false)
  const { refreshCart } = useCart()
  const accessFromUrl = new URLSearchParams(location.search).get('access')
  const guestAccessToken = orderNumber
    ? accessFromUrl || getGuestOrderAccessToken(orderNumber)
    : null
  const isGuestOrder = !user && Boolean(guestAccessToken)
  const guestOrderSuffix = isGuestOrder
    ? `?access=${encodeURIComponent(guestAccessToken!)}`
    : ''

  useInitialRouteLoad(!isAuthLoading && ((!user && !guestAccessToken) || !!order || !!error))

  useEffect(() => {
    if (isAuthLoading || !orderNumber) return
    if (!user && !guestAccessToken) return
    if (!user && guestAccessToken) saveGuestOrderAccessToken(orderNumber, guestAccessToken)
    const loadOrder = user
      ? getCustomerOrder(orderNumber)
      : getGuestOrder(orderNumber, guestAccessToken!)
    loadOrder
      .then(setOrder)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Order could not be loaded.'))
    if (user && orderNumber) {
      getOrderReviewEligibility(orderNumber)
        .then(setReviewEligibility)
        .catch(() => {
          setReviewEligibility(null)
        })
    }
    getBankDetails()
      .then(setBank)
      .catch(() => {
        // Bank settings may be temporarily unavailable; the order remains viewable.
      })
  }, [guestAccessToken, isAuthLoading, orderNumber, user])

  useEffect(() => {
    if (!isCancelDialogOpen) return

    const releaseBodyScroll = lockBodyScroll()

    return () => {
      releaseBodyScroll()
    }
  }, [isCancelDialogOpen])

  const closeCancellationDialog = () => {
    setIsCancelDialogOpen(false)
    setCancellationReason('')
    setOtherCancellationReason('')
    setCancelError(null)
  }

  const confirmCancellation = async () => {
    if (!order || !orderNumber) return
    setIsCancelling(true)
    setCancelError(null)
    const reason = cancellationReason === 'Other'
      ? otherCancellationReason.trim() || undefined
      : cancellationReason || undefined

    try {
      setOrder(await cancelCustomerOrder(orderNumber, reason))
      closeCancellationDialog()
    } catch (caught: unknown) {
      setCancelError(caught instanceof ApiError ? caught.message : 'The order could not be cancelled.')
    } finally {
      setIsCancelling(false)
    }
  }

  // Confirm an unfinished Paystack payment directly with the provider once the
  // order loads, so the customer always sees the true (server-confirmed) state.
  const fetchGatewayVerification = useCallback(async () => {
    if (!order || order.paymentMethod !== 'PAYSTACK') return null
    return user
      ? await verifyPaystackPayment({ orderId: order.id })
      : guestAccessToken
        ? await verifyGuestPaystackPayment({ orderId: order.id, guestAccessToken })
        : null
  }, [guestAccessToken, order, user])

  const applyGatewayVerification = useCallback((verification: Awaited<ReturnType<typeof fetchGatewayVerification>>) => {
    if (!verification || verification.status !== 'SUCCESSFUL') {
      setGatewayStatus({ kind: 'unconfirmed' })
      return
    }
    setGatewayStatus({ kind: 'success' })
    void (user ? getCustomerOrder(order!.orderNumber) : getGuestOrder(order!.orderNumber, guestAccessToken!))
      .then(setOrder)
      .catch(() => {
        // The confirmation page will reflect the update; keep showing the order.
      })
    refreshCart()
  }, [guestAccessToken, order, refreshCart, user])

  const gatewayVerificationFailed = useCallback((reason: unknown) => {
    setGatewayStatus({
      kind: 'error',
      message: reason instanceof ApiError ? reason.message : 'Your payment status could not be checked right now.',
    })
  }, [])

  useEffect(() => {
    if (!order || order.paymentMethod !== 'PAYSTACK') return
    void fetchGatewayVerification().then(applyGatewayVerification).catch(gatewayVerificationFailed)
  }, [applyGatewayVerification, fetchGatewayVerification, gatewayVerificationFailed, order])

  const payOnline = async () => {
    if (!order || !orderNumber || isPaying) return
    setIsPaying(true)
    try {
      const init = user
        ? await initializePaystackPayment({ orderId: order.id, callbackUrl: window.location.href })
        : await initializeGuestPaystackPayment({
            orderId: order.id,
            guestAccessToken: guestAccessToken!,
            callbackUrl: window.location.href,
          })
      window.location.assign(init.authorizationUrl)
    } catch (caught: unknown) {
      setIsPaying(false)
      setGatewayStatus({
        kind: 'error',
        message: caught instanceof ApiError ? caught.message : 'The payment could not be started right now.',
      })
    }
  }

  return (
    <>
      <Navbar />
      <main className="container py-12 sm:py-16 lg:py-24">
        {!isAuthLoading && !user && !guestAccessToken ? (
          <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
            <h1 className="text-3xl font-bold text-green-dark">Choose how to continue</h1>
            <p className="mt-3 text-sm leading-6 text-muted">Sign in to view account orders, or use the secure guest order link from checkout.</p>
            <button className="mt-6 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={() => openAuth()}>
              Continue to sign in
            </button>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">{error}</div>
        ) : !order ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Loading order…</p>
        ) : (
          <div className="mx-auto max-w-3xl">
             <Link className="text-sm font-bold text-green hover:text-orange" to={isGuestOrder ? '/shop' : '/orders'}>← {isGuestOrder ? 'Continue shopping' : 'Back to orders'}</Link>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Order details</p>
                <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark">{order.orderNumber}</h1>
                <p className="mt-2 text-sm text-muted">
                   Placed {formatDate(order.createdAt)}
                </p>
                <p className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
                  <span className={order.orderType === 'WHOLESALE' ? 'inline-block size-2 rounded-full bg-orange' : 'inline-block size-2 rounded-full bg-green'} />
                  <span className={order.orderType === 'WHOLESALE' ? 'text-orange' : 'text-green-dark'}>
                    {order.orderType === 'WHOLESALE' ? 'Wholesale Order' : 'Retail Order'}
                  </span>
                </p>
              </div>
              <div className="text-left text-sm sm:text-right">
                <p className="text-muted">Payment status</p>
                <strong className="text-green-dark">{paymentStatusCopy[order.paymentStatus].label}</strong>
                <p className="mt-1 text-xs text-muted">{paymentStatusCopy[order.paymentStatus].description}</p>
                <p className="mt-3 text-muted">Order status</p>
                <strong className="block text-green-dark">{formatOrderStatus(order.orderStatus)}</strong>
                 {!isGuestOrder && canCustomerCancelOrder(order.orderStatus) && (
                  <div className="mt-4 flex justify-start sm:justify-end">
                    <button
                      className="inline-flex items-center rounded-full border border-orange/40 px-4 py-2 text-sm font-bold text-orange transition-colors hover:bg-orange/10"
                      type="button"
                      onClick={() => {
                        setCancelError(null)
                        setIsCancelDialogOpen(true)
                      }}
                    >
                      Cancel Order
                    </button>
                  </div>
                )}
              </div>
            </div>
            {order.orderStatus === 'CANCELLED' && (
              <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-5">
                <p className="font-bold text-orange">Cancelled</p>
                 {order.cancelledAt && <p className="mt-1 text-sm text-muted">Cancelled {formatDate(order.cancelledAt, true)}</p>}
                {order.cancellationReason && <p className="mt-2 text-sm text-muted"><strong className="text-green-dark">Reason:</strong> {order.cancellationReason}</p>}
                {order.paymentStatus === 'PAID' && <p className="mt-3 text-sm leading-6 text-muted">Payment status remains PAID. The store will handle any applicable refund separately.</p>}
              </div>
            )}
            <div className="mt-8">
              <OrderTracker order={order} />
            </div>
            <div className="mt-6 rounded-2xl border border-green/20 bg-sage/30 p-6 shadow-sm sm:p-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange">Fulfillment</p>
              {order.fulfillmentMethod === 'PICKUP' ? (
                <>
                  <h2 className="mt-2 text-2xl font-bold text-green-dark">Pickup</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">You will collect this order from the store. We will contact you using your phone number when it is ready.</p>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-2xl font-bold text-green-dark">Delivery</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{order.deliveryAddress}, {order.city}</p>
                </>
              )}
            </div>
            <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-green-dark">Items</h2>
              <div className="mt-5 divide-y divide-line">
                {order.orderItems.map((item) => (
                  <div className="flex items-start justify-between gap-4 py-4" key={item.id}>
                    <div>
                      <p className="font-bold text-green-dark">{item.productName}</p>
                        {item.productOptionLabel && <p className="mt-0.5 text-xs font-semibold text-orange">{item.productOptionLabel}</p>}
                        <p className="mt-1 text-xs text-muted">{item.quantity} × {formatPrice(item.unitPrice)}</p>
                        {reviewEligibility && !isGuestOrder && (() => {
                          const reviewInfo = reviewEligibility.items.find((review) => review.id === item.id)
                          if (!reviewInfo) return null
                          if (reviewInfo.canReview) {
                            return (
                              <Link
                                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-green/25 bg-sage/40 px-4 py-2 text-xs font-bold text-green-dark transition-colors hover:bg-sage"
                                to={`/orders/${order.orderNumber}/review/${item.id}`}
                              >
                                Write a review <ArrowRight size={14} />
                              </Link>
                            )
                          }
                          if (reviewInfo.reviewed) {
                            return (
                              <span className="mt-3 inline-flex items-center rounded-full bg-cream px-4 py-2 text-xs font-bold text-muted">
                                Reviewed{reviewInfo.reviewRating ? ` · ${reviewInfo.reviewRating}/5` : ''}
                              </span>
                            )
                          }
                          return null
                        })()}
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
                <div className="flex justify-between text-muted"><span>Delivery fee</span><strong className="text-green-dark">{order.deliveryFee === '0' || Number(order.deliveryFee) === 0 ? 'FREE' : formatPrice(order.deliveryFee)}</strong></div>
                <div className="flex justify-between pt-2 text-base font-bold text-green-dark"><span>Total</span><span>{formatPrice(order.total)}</span></div>
              </div>
            </div>
            {order.paymentStatus !== 'PAID' && (order.paymentMethod === 'PAYSTACK' ? (
              <div className="mt-6 rounded-2xl border border-line bg-cream/60 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-green-dark">Payment verification</h2>
                {gatewayStatus.kind === 'checking' && (
                  <p className="mt-3 text-sm leading-6 text-muted">Checking your payment status with the provider…</p>
                )}
                {gatewayStatus.kind === 'unconfirmed' && (
                  <>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      Your Paystack payment has not been completed or could not be confirmed yet. You can try paying again.
                    </p>
                    <button
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:opacity-60"
                      type="button"
                      onClick={() => void payOnline()}
                      disabled={isPaying}
                    >
                      {isPaying ? 'Starting payment…' : 'Pay now'} <ArrowRight size={16} />
                    </button>
                  </>
                )}
                {gatewayStatus.kind === 'error' && (
                  <>
                    <p className="mt-3 text-sm leading-6 text-muted">{gatewayStatus.message}</p>
                    <button
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:opacity-60"
                      type="button"
                      onClick={() => void payOnline()}
                      disabled={isPaying}
                    >
                      {isPaying ? 'Starting payment…' : 'Pay now'} <ArrowRight size={16} />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-line bg-cream/60 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-green-dark">Payment verification</h2>
                {order.paymentSubmissions[0]?.status === 'PENDING' ? (
                  <p className="mt-3 text-sm leading-6 text-muted">Payment verification pending. We will update this order after review.</p>
                ) : (
                  <>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      {order.paymentStatus === 'REJECTED'
                        ? 'Payment proof was rejected. You can submit a new proof.'
                        : 'Awaiting payment verification. Submit proof after making your bank transfer.'}
                    </p>
                    {bank ? (
                      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                        <div><dt className="text-muted">Bank name</dt><dd className="mt-1 font-bold text-green-dark">{bank.bankName}</dd></div>
                        <div><dt className="text-muted">Account name</dt><dd className="mt-1 font-bold text-green-dark">{bank.accountName}</dd></div>
                        <div><dt className="text-muted">Account number</dt><dd className="mt-1 font-bold text-green-dark">{bank.accountNumber}</dd></div>
                      </dl>
                    ) : <p className="mt-3 text-sm text-orange">Payment details are not configured yet. Please contact the store before transferring funds.</p>}
                    {bank && <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">{bank.instructions}</p>}
                    {bank && <Link className="mt-5 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to={`/orders/${order.orderNumber}/payment-proof${guestOrderSuffix}`}>
                      Submit Payment Proof <ArrowRight size={16} />
                    </Link>}
                  </>
                )}
              </div>
            ))}
            {order.paymentSubmissions.length > 0 && (
              <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-bold text-green-dark">Payment submissions</h2>
                <div className="mt-4 divide-y divide-line">
                  {order.paymentSubmissions.map((submission) => (
                    <div className="flex flex-wrap justify-between gap-3 py-4 text-sm" key={submission.id}>
                      <div>
                        <p className="font-bold text-green-dark">{submission.transactionReference || 'No transaction reference provided'}</p>
                         <p className="mt-1 text-xs text-muted">Submitted {formatDate(submission.createdAt)}</p>
                         {submission.reviewNote && (
                           <p className={`mt-3 rounded-xl px-3 py-2 text-xs leading-5 ${submission.status === 'REJECTED' ? 'bg-orange/10 text-orange' : 'bg-sage/45 text-muted'}`}>
                             <strong className={submission.status === 'REJECTED' ? 'text-orange' : 'text-green-dark'}>Review note:</strong>{' '}
                             {submission.reviewNote}
                           </p>
                         )}
                         <ImagePreview className="mt-3 inline-flex text-xs font-bold text-green hover:text-orange" src={submission.proofUrl} alt={`Payment proof for ${submission.transactionReference || 'payment submission'}`} label="View payment proof" />
                      </div>
                      <span className="rounded-full bg-sage px-3 py-1 text-xs font-bold text-green-dark">{submission.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
      {isCancelDialogOpen && order && (
        <div className="safe-modal-backdrop fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-hidden bg-green-dark/50" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) closeCancellationDialog()
        }}>
          <div className="cancel-order-dialog my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-cream p-6 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-8" role="dialog" aria-modal="true" aria-labelledby="cancel-order-title">
            <h2 id="cancel-order-title" className="text-2xl font-bold text-green-dark">Cancel this order?</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Your order information and payment history will remain saved.</p>
            <label className="mt-6 block text-sm font-bold text-green-dark">
              Reason <span className="font-normal text-muted">(optional)</span>
              <SelectField
                className="mt-2 w-full"
                options={[
                  { value: '', label: 'Select a reason' },
                  ...customerCancellationReasons.map((reason) => ({ value: reason, label: reason })),
                ]}
                onChange={setCancellationReason}
                value={cancellationReason}
              />
            </label>
            {cancellationReason === 'Other' && (
              <label className="mt-4 block text-sm font-bold text-green-dark">
                Tell us more <span className="font-normal text-muted">(optional)</span>
                <textarea
                  className="mt-2 min-h-24 w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                  value={otherCancellationReason}
                  onChange={(event) => setOtherCancellationReason(event.target.value)}
                  maxLength={500}
                  placeholder="Optional cancellation reason"
                />
              </label>
            )}
            {cancelError && <p className="mt-4 rounded-xl border border-orange/25 bg-orange/5 p-3 text-sm text-orange" role="alert">{cancelError}</p>}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="rounded-full border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-white disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={closeCancellationDialog} disabled={isCancelling}>
                Keep Order
              </button>
              <button className="rounded-full bg-orange px-5 py-3 text-sm font-bold text-white hover:bg-orange/90 disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={() => void confirmCancellation()} disabled={isCancelling}>
                {isCancelling ? 'Cancelling…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}