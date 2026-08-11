import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { getAdminOrder, getAdminOrders, updateAdminOrderStatus, type AdminOrder, type AdminOrderListItem, type OrderStatus } from '../../services/orderService'
import { OrderTable } from '../../components/admin/OrderTable'
import { orderStatuses } from '../../components/admin/orderStatuses'

const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

function OrderDetail({ order, onClose, onUpdated }: { order: AdminOrder; onClose: () => void; onUpdated: (order: AdminOrder) => void }) {
  const [status, setStatus] = useState<OrderStatus>(order.orderStatus)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveStatus = async () => {
    setIsSaving(true)
    setError(null)
    try {
      onUpdated(await updateAdminOrderStatus(order.id, status))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Order status could not be updated.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-green-dark/35 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-cream p-6 sm:rounded-3xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Order detail</p><h2 className="mt-2 text-2xl font-bold text-green-dark">#{order.id.slice(0, 8)}</h2></div>
          <button className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-muted" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Customer</p><p className="mt-1 font-bold text-green-dark">{order.customerName}</p><p className="mt-1 text-xs text-muted">{order.phone} · {order.email ?? 'No email'}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Delivery</p><p className="mt-1 font-bold text-green-dark">{order.city}</p><p className="mt-1 text-xs text-muted">{order.deliveryAddress}</p></div>
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-white p-5">
          <h3 className="font-bold text-green-dark">Items</h3>
          <div className="mt-4 divide-y divide-line">
            {order.orderItems.map((item) => <div className="flex items-center justify-between gap-4 py-3 text-sm" key={item.id}><span><strong className="text-green-dark">{item.productName}</strong><span className="ml-2 text-muted">× {item.quantity}</span></span><span className="font-bold text-green-dark">{formatPrice(item.subtotal)}</span></div>)}
          </div>
          <div className="mt-3 flex justify-between border-t border-line pt-4 font-bold text-green-dark"><span>Total</span><span>{formatPrice(order.total)}</span></div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-sm font-bold text-green-dark">Order status<select className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-green sm:w-64" value={status} onChange={(event) => setStatus(event.target.value as OrderStatus)}>{orderStatuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream disabled:opacity-50" type="button" disabled={isSaving || status === order.orderStatus} onClick={() => void saveStatus()}>{isSaving ? 'Saving…' : 'Save status'}</button>
        </div>
        {error && <p className="mt-3 text-sm text-orange" role="alert">{error}</p>}
        <div className="mt-6 rounded-2xl bg-sage/35 p-5"><h3 className="font-bold text-green-dark">Payment history</h3>{order.paymentSubmissions.length ? <div className="mt-3 space-y-3">{order.paymentSubmissions.map((payment) => <div className="flex flex-wrap justify-between gap-2 text-sm" key={payment.id}><span className="text-muted">{payment.transactionReference} · {payment.senderName}</span><strong className="text-green-dark">{payment.status}</strong></div>)}</div> : <p className="mt-2 text-sm text-muted">No payment submissions yet.</p>}</div>
      </div>
    </div>
  )
}

export function Orders() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([])
  const [selected, setSelected] = useState<AdminOrder | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { getAdminOrders().then(setOrders).catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Orders could not be loaded.')) }, [])

  const openOrder = async (item: AdminOrderListItem) => {
    try { setSelected(await getAdminOrder(item.id)) } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Order details could not be loaded.') }
  }

  return <div><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Operations</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Orders</h1><p className="mt-3 text-sm text-muted">Track customer orders and fulfillment status.</p></div><p className="text-sm font-semibold text-muted">{orders.length} orders</p></div>{error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}<div className="mt-8"><OrderTable orders={orders} onSelect={(item) => void openOrder(item)} /></div>{selected && <OrderDetail order={selected} onClose={() => setSelected(null)} onUpdated={(updated) => { setSelected(updated); setOrders((current) => current.map((item) => item.id === updated.id ? { ...item, orderStatus: updated.orderStatus } : item)) }} />}</div>
}