import type { AdminOrderListItem } from '../../services/orderService'

const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

const statusClass = (status: string) => {
  if (status === 'PAID' || status === 'COMPLETED') return 'bg-green/10 text-green'
  if (status === 'CANCELLED' || status === 'FAILED') return 'bg-orange/10 text-orange'
  return 'bg-sage text-green-dark'
}

interface OrderTableProps {
  orders: AdminOrderListItem[]
  onSelect: (order: AdminOrderListItem) => void
}

export function OrderTable({ orders, onSelect }: OrderTableProps) {
  if (orders.length === 0) {
    return <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-14 text-center text-sm text-muted">No orders found.</div>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-5 py-4 font-bold">Order</th>
              <th className="px-5 py-4 font-bold">Customer</th>
              <th className="px-5 py-4 font-bold">Date</th>
              <th className="px-5 py-4 font-bold">Total</th>
              <th className="px-5 py-4 font-bold">Payment</th>
              <th className="px-5 py-4 font-bold">Order status</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((order) => (
              <tr className="hover:bg-cream/60" key={order.id}>
                <td className="px-5 py-4 font-semibold text-green-dark">#{order.id.slice(0, 8)}</td>
                <td className="px-5 py-4">
                  <p className="m-0 font-semibold text-green-dark">{order.customerName}</p>
                  <p className="mt-1 text-xs text-muted">{order.email ?? order.phone}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-muted">{formatDate(order.createdAt)}</td>
                <td className="whitespace-nowrap px-5 py-4 font-semibold text-green-dark">{formatPrice(order.total)}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(order.paymentStatus)}`}>{order.paymentStatus}</span></td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(order.orderStatus)}`}>{order.orderStatus}</span></td>
                <td className="px-5 py-4 text-right">
                  <button className="font-bold text-green hover:text-orange" type="button" onClick={() => onSelect(order)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
