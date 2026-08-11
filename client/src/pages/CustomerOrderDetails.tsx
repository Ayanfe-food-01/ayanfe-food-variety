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
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Order placed successfully</p>
                <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark">{order.orderNumber}</h1>
              </div>
              <div className="text-right text-sm">
                <p className="text-muted">Payment: <strong className="text-green-dark">{order.paymentStatus}</strong></p>
                <p className="mt-1 text-muted">Order: <strong className="text-green-dark">{order.orderStatus}</strong></p>
              </div>
            </div>
            <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
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
            <div className="mt-6 rounded-2xl border border-line bg-cream/60 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-green-dark">Bank transfer instructions</h2>
              {bank ? (
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                  <div><dt className="text-muted">Bank name</dt><dd className="mt-1 font-bold text-green-dark">{bank.bankName}</dd></div>
                  <div><dt className="text-muted">Account name</dt><dd className="mt-1 font-bold text-green-dark">{bank.accountName}</dd></div>
                  <div><dt className="text-muted">Account number</dt><dd className="mt-1 font-bold text-green-dark">{bank.accountNumber}</dd></div>
                </dl>
              ) : <p className="mt-3 text-sm text-muted">Payment details are loading…</p>}
              {bank && <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">{bank.instructions}</p>}
              <p className="mt-5 text-sm text-muted">Payment remains pending until an administrator verifies your transfer.</p>
              <Link className="mt-5 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to={`/orders/${order.orderNumber}/payment-proof`}>
                Submit payment proof <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}