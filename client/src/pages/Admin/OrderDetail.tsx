import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { getAdminOrder, updateAdminOrderStatus, type AdminOrder, type OrderStatus } from '../../services/orderService'
import { formatOrderStatus, getOrderStatusOptions } from '../../utils/orderStatus'
import { useToast } from '../../components/ui/Toast'
import { ImagePreview } from '../../components/ui/ImagePreview'

const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

const formatDate = (value: string) => new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

const statusClass = (status: string) => {
  if (status === 'PAID' || status === 'DELIVERED' || status === 'VERIFIED') return 'bg-green/10 text-green'
  if (status === 'FAILED' || status === 'CANCELLED' || status === 'REJECTED') return 'bg-orange/10 text-orange'
  return 'bg-sage text-green-dark'
}

export function OrderDetail() {
  const { orderNumber } = useParams()
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [status, setStatus] = useState<OrderStatus>('ORDER_PLACED')
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    if (!orderNumber) return
    getAdminOrder(orderNumber)
      .then((loaded) => {
        setOrder(loaded)
        setStatus(loaded.orderStatus)
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Order details could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [orderNumber])

  const saveStatus = async () => {
    if (!order || !orderNumber || status === order.orderStatus) return
    if (status === 'CANCELLED' && !window.confirm(`Cancel ${order.orderNumber}? This cannot be undone.`)) return
    setIsSaving(true)
    setError(null)
    try {
      setOrder(await updateAdminOrderStatus(orderNumber, status, note))
      setNote('')
      showToast('Order status updated. The customer notification was queued when email is configured.', 'success')
    } catch (caught) {
      showToast(caught instanceof ApiError ? caught.message : 'Order status could not be updated.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading order…</div>
  if (!order) return <div><div className="rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">{error ?? 'Order not found.'}</div><Link className="mt-5 inline-block font-bold text-green" to="/admin/orders">Back to orders</Link></div>

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><Link className="text-sm font-bold text-green hover:text-orange" to="/admin/orders">← Back to orders</Link><p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-orange">Order detail</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{order.orderNumber}</h1><p className="mt-3 text-sm text-muted">Placed {formatDate(order.createdAt)}</p></div>
         <div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-2 text-xs font-bold ${statusClass(order.paymentStatus)}`}>Payment: {order.paymentStatus}</span><span className={`rounded-full px-3 py-2 text-xs font-bold ${statusClass(order.orderStatus)}`}>{formatOrderStatus(order.orderStatus)}</span></div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      <div className="mt-8 grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-green-dark">Customer information</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs text-muted">Name</p><p className="mt-1 font-bold text-green-dark">{order.customerName}</p></div>
              <div><p className="text-xs text-muted">Email</p><p className="mt-1 font-bold text-green-dark">{order.email ?? 'Not provided'}</p></div>
              <div><p className="text-xs text-muted">Phone</p><p className="mt-1 font-bold text-green-dark">{order.phone}</p></div>
              <div><p className="text-xs text-muted">Delivery address</p><p className="mt-1 font-bold text-green-dark">{order.deliveryAddress}, {order.city}</p></div>
            </div>
            {order.note && <div className="mt-5 rounded-xl bg-sage/35 p-4 text-sm text-muted"><strong className="text-green-dark">Customer note:</strong> {order.note}</div>}
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-green-dark">Order items</h2>
             <div className="mt-4 divide-y divide-line">{order.orderItems.map((item) => <div className="flex items-start justify-between gap-4 py-4 text-sm" key={item.id}><div><p className="font-bold text-green-dark">{item.productName}</p><p className="mt-1 text-muted">{item.quantity} × {formatPrice(item.unitPrice)} · Delivery {formatPrice(item.deliveryFee)}</p></div><p className="font-bold text-green-dark">{formatPrice(item.subtotal)}</p></div>)}</div>
            <div className="mt-3 space-y-2 border-t border-line pt-4 text-sm"><div className="flex justify-between text-muted"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div><div className="flex justify-between text-muted"><span>Delivery fee</span><span>{formatPrice(order.deliveryFee)}</span></div><div className="flex justify-between pt-2 text-base font-bold text-green-dark"><span>Total</span><span>{formatPrice(order.total)}</span></div></div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-green-dark">Payment history</h2>
            <p className="mt-1 text-sm text-muted">Payment status is controlled only from the Payments review area.</p>
            {order.paymentSubmissions.length === 0 ? <p className="mt-5 rounded-xl bg-sage/35 p-4 text-sm text-muted">No payment submissions yet. Payment method: Bank transfer.</p> : <div className="mt-4 space-y-4">{order.paymentSubmissions.map((payment) => <div className="rounded-xl border border-line p-4" key={payment.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-green-dark">{payment.transactionReference}</p><p className="mt-1 text-xs text-muted">Submitted {formatDate(payment.createdAt)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(payment.status)}`}>{payment.status}</span></div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-xs text-muted">Sender</p><p className="mt-1 font-semibold text-green-dark">{payment.senderName}</p></div><div><p className="text-xs text-muted">Amount</p><p className="mt-1 font-semibold text-green-dark">{formatPrice(payment.amount)}</p></div><div><p className="text-xs text-muted">Transfer date</p><p className="mt-1 font-semibold text-green-dark">{formatDate(payment.transferredAt)}</p></div></div>{payment.reviewNote && <p className="mt-4 text-sm text-muted">Review note: {payment.reviewNote}</p>}<ImagePreview className="mt-4 inline-flex font-bold text-green hover:text-orange" src={payment.proofUrl} alt={`Payment proof for ${payment.transactionReference}`} label="Open receipt / proof" /></div>)}</div>}
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-green-dark">Order status</h2>
            <p className="mt-1 text-sm text-muted">Payment status remains separate and cannot be changed here.</p>
             <label className="mt-5 block text-sm font-bold text-green-dark">Current status<select className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={status} onChange={(event) => setStatus(event.target.value as OrderStatus)}>{getOrderStatusOptions(order.orderStatus).map((option) => <option key={option} value={option}>{formatOrderStatus(option)}</option>)}</select></label>
            <label className="mt-4 block text-sm font-bold text-green-dark">Internal note <textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for the audit history" maxLength={1000} /></label>
            <button className="mt-4 w-full rounded-xl bg-green px-4 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={isSaving || status === order.orderStatus} onClick={() => void saveStatus()}>{isSaving ? 'Saving…' : 'Save order status'}</button>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-green-dark">Status history</h2>
            {order.statusHistory.length === 0 ? <p className="mt-4 text-sm text-muted">No status changes have been recorded.</p> : <div className="mt-4 space-y-4">{order.statusHistory.map((history) => <div className="border-l-2 border-sage pl-4" key={history.id}><p className="text-sm font-bold text-green-dark">{history.previousStatus ? `${formatOrderStatus(history.previousStatus)} → ` : 'Created → '}{formatOrderStatus(history.newStatus)}</p><p className="mt-1 text-xs text-muted">{formatDate(history.createdAt)} · {history.changedBy.name}</p>{history.note && <p className="mt-2 text-sm text-muted">{history.note}</p>}</div>)}</div>}
          </section>
        </div>
      </div>
    </div>
  )
}