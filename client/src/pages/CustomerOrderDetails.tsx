import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { ApiError } from '../services/api'
import { getBankDetails, type BankDetails } from '../services/paymentService'
import { getCustomerOrder, type CreatedOrder } from '../services/orderService'

const formatPrice = (price: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(price))

const paymentStatusCopy: Record<CreatedOrder['paymentStatus'], { label: string; description: string }> = {
  PENDING: { label: 'PENDING', description: 'Awaiting payment verification' },
  PAID: { label: 'PAID', description: 'Payment confirmed' },
  REJECTED: { label: 'REJECTED', description: 'Payment proof was rejected' },
}

const trackerSteps = [
  { key: 'placed', label: 'Order Placed' },
  { key: 'paid', label: 'Payment Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
] as const

function OrderTracker({ order }: { order: CreatedOrder }) {
  if (order.orderStatus === 'CANCELLED') {
    return (
      <div className="rounded-2xl border border-orange/25 bg-orange/5 p-5">
        <p className="text-sm font-bold text-orange">Order Cancelled</p>
        <p className="mt-1 text-sm text-muted">This order will not move through the remaining fulfilment stages.</p>
      </div>
    )
  }

  const completedSteps = new Set<string>(['placed'])
  if (order.paymentStatus === 'PAID') completedSteps.add('paid')
  if (order.orderStatus === 'PROCESSING' || order.orderStatus === 'COMPLETED') completedSteps.add('processing')
  if (order.orderStatus === 'COMPLETED') completedSteps.add('completed')

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        {trackerSteps.map((step, index) => (
          <div className="flex flex-1 items-start gap-3 sm:block sm:text-center" key={step.key}>
            <div className="flex items-center sm:block">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${completedSteps.has(step.key) ? 'bg-green text-cream' : 'border border-line bg-cream text-muted'}`}>
                {completedSteps.has(step.key) ? '✓' : index + 1}
              </span>
              {index < trackerSteps.length - 1 && (
                <span className={`ml-3 hidden h-0.5 w-full sm:inline-block ${completedSteps.has(trackerSteps[index + 1].key) ? 'bg-green' : 'bg-line'}`} />
              )}
            </div>
            <p className={`pt-1 text-sm font-bold ${completedSteps.has(step.key) ? 'text-green-dark' : 'text-muted'}`}>{step.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-5 text-muted">Payment verification and fulfilment progress are tracked separately.</p>
    </div>
  )
}

export function CustomerOrderDetails() {
  const { orderNumber } = useParams()
  const { user, isLoading: isAuthLoading, openAuth } = useCustomerAuth()
  const [order, setOrder] = useState<CreatedOrder | null>(null)
  const [bank, setBank] = useState<BankDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthLoading || !user || !orderNumber) return
    getCustomerOrder(orderNumber)
      .then(setOrder)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Order could not be loaded.'))
    getBankDetails()
      .then(setBank)
      .catch(() => {
        // Bank settings may be temporarily unavailable; the order remains viewable.
      })
  }, [isAuthLoading, orderNumber, user])

  return (
    <>
      <Navbar />
      <main className="container py-12 sm:py-16 lg:py-24">
        {!isAuthLoading && !user ? (
          <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
            <h1 className="text-3xl font-bold text-green-dark">Sign in to view this order</h1>
            <button className="mt-6 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={() => openAuth()}>
              Sign in or create an account
            </button>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">{error}</div>
        ) : !order ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Loading order…</p>
        ) : (
          <div className="mx-auto max-w-3xl">
            <Link className="text-sm font-bold text-green hover:text-orange" to="/orders">← Back to orders</Link>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Order details</p>
                <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark">{order.orderNumber}</h1>
                <p className="mt-2 text-sm text-muted">
                  Placed {new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(new Date(order.createdAt))}
                </p>
              </div>
              <div className="text-left text-sm sm:text-right">
                <p className="text-muted">Payment status</p>
                <strong className="text-green-dark">{paymentStatusCopy[order.paymentStatus].label}</strong>
                <p className="mt-1 text-xs text-muted">{paymentStatusCopy[order.paymentStatus].description}</p>
                <p className="mt-3 text-muted">Order status</p>
                <strong className="text-green-dark">{order.orderStatus}</strong>
              </div>
            </div>
            <div className="mt-8">
              <OrderTracker order={order} />
            </div>
            <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-green-dark">Items</h2>
              <div className="mt-5 divide-y divide-line">
                {order.orderItems.map((item) => (
                  <div className="flex items-center justify-between gap-4 py-4" key={item.id}>
                    <div>
                      <p className="font-bold text-green-dark">{item.productName}</p>
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
            {order.paymentStatus !== 'PAID' && (
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
                    {bank && <Link className="mt-5 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to={`/orders/${order.orderNumber}/payment-proof`}>
                      Submit Payment Proof <ArrowRight size={16} />
                    </Link>}
                  </>
                )}
              </div>
            )}
            {order.paymentSubmissions.length > 0 && (
              <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-bold text-green-dark">Payment submissions</h2>
                <div className="mt-4 divide-y divide-line">
                  {order.paymentSubmissions.map((submission) => (
                    <div className="flex flex-wrap justify-between gap-3 py-4 text-sm" key={submission.id}>
                      <div>
                        <p className="font-bold text-green-dark">{submission.transactionReference}</p>
                        <p className="mt-1 text-xs text-muted">Submitted {new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(new Date(submission.createdAt))}</p>
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
    </>
  )
}