import type { AdminOrderListItem } from '../../services/orderService'
import { formatOrderStatus } from '../../utils/orderStatus'
import { OrderActionsMenu } from './OrderActionsMenu'
import { formatDate } from '../../utils/dateFormat'
import { ResponsiveDataTable } from '../ui/ResponsiveDataTable'

const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

const statusClass = (status: string) => {
  if (status === 'PAID' || status === 'DELIVERED') return 'bg-green/10 text-green'
  if (status === 'CANCELLED' || status === 'FAILED') return 'bg-orange/10 text-orange'
  return 'bg-sage text-green-dark'
}

interface OrderTableProps {
  orders: AdminOrderListItem[]
  archiveView: 'active' | 'archived'
  busyOrderNumber?: string | null
  onArchive: (orderNumber: string) => void
  onRestore: (orderNumber: string) => void
  onDelete: (order: AdminOrderListItem) => void
}

export function OrderTable({ orders, archiveView, busyOrderNumber, onArchive, onRestore, onDelete }: OrderTableProps) {
  if (orders.length === 0) {
    return <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-14 text-center text-sm text-muted">No orders found.</div>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="space-y-3 p-4 lg:hidden">
        {orders.map((order) => (
          <article className="rounded-2xl border border-line bg-cream/45 p-4" key={order.orderNumber}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Order number</p>
                <p className="mt-1 break-words font-bold text-green-dark">{order.orderNumber}</p>
              </div>
              <OrderActionsMenu
                order={order}
                archiveView={archiveView}
                isBusy={busyOrderNumber === order.orderNumber}
                onArchive={onArchive}
                onRestore={onRestore}
                onDelete={onDelete}
              />
            </div>
            <div className="mt-4">
              <p className="font-semibold text-green-dark">{order.customerName}</p>
              <p className="mt-1 break-words text-xs text-muted">{order.email ?? 'No email provided'}</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 text-xs">
              <div>
                <dt className="uppercase tracking-[0.12em] text-muted">Phone</dt>
                <dd className="mt-1 text-muted">{order.phone}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.12em] text-muted">Date</dt>
                 <dd className="mt-1 text-muted">{formatDate(order.createdAt, true)}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.12em] text-muted">Total</dt>
                <dd className="mt-1 font-bold text-green-dark">{formatPrice(order.total)}</dd>
              </div>
               <div>
                 <dt className="uppercase tracking-[0.12em] text-muted">Fulfillment</dt>
                 <dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${order.fulfillmentMethod === 'PICKUP' ? 'bg-orange/10 text-orange' : 'bg-sage text-green-dark'}`}>{order.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'}</span></dd>
               </div>
              <div>
                <dt className="uppercase tracking-[0.12em] text-muted">Payment</dt>
                <dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${statusClass(order.paymentStatus)}`}>{order.paymentStatus}</span></dd>
              </div>
              <div className="col-span-2">
                <dt className="uppercase tracking-[0.12em] text-muted">Order status</dt>
                 <dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${statusClass(order.orderStatus)}`}>{formatOrderStatus(order.orderStatus)}</span></dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden lg:block">
        <ResponsiveDataTable label="Orders table horizontal scroll">
        <table className="w-full min-w-[1480px] whitespace-nowrap text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-5 py-4 font-bold">Order number</th>
              <th className="px-5 py-4 font-bold">Customer</th>
              <th className="px-5 py-4 font-bold">Phone</th>
              <th className="px-5 py-4 font-bold">Date</th>
              <th className="px-5 py-4 font-bold">Total</th>
               <th className="px-5 py-4 font-bold">Fulfillment</th>
              <th className="px-5 py-4 font-bold">Payment</th>
              <th className="px-5 py-4 font-bold">Order status</th>
               <th className="px-5 py-4 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((order) => (
               <tr className="group hover:bg-cream/60" key={order.orderNumber}>
                <td className="px-5 py-4 font-semibold text-green-dark"><span className="responsive-table-ellipsis max-w-[190px]">{order.orderNumber}</span></td>
                <td className="px-5 py-4">
                  <p className="responsive-table-ellipsis max-w-[270px] font-semibold text-green-dark">{order.customerName}</p>
                    <p className="responsive-table-ellipsis mt-1 max-w-[270px] text-xs text-muted">{order.email ?? 'No email provided'}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-muted">{order.phone}</td>
                 <td className="whitespace-nowrap px-5 py-4 text-muted">{formatDate(order.createdAt, true)}</td>
                <td className="whitespace-nowrap px-5 py-4 font-semibold text-green-dark">{formatPrice(order.total)}</td>
                 <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${order.fulfillmentMethod === 'PICKUP' ? 'bg-orange/10 text-orange' : 'bg-sage text-green-dark'}`}>{order.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'}</span></td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(order.paymentStatus)}`}>{order.paymentStatus}</span></td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(order.orderStatus)}`}>{formatOrderStatus(order.orderStatus)}</span></td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end">
                    <OrderActionsMenu
                      order={order}
                      archiveView={archiveView}
                      isBusy={busyOrderNumber === order.orderNumber}
                      plainTrigger
                      verticalTrigger
                      onArchive={onArchive}
                      onRestore={onRestore}
                      onDelete={onDelete}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </ResponsiveDataTable>
      </div>
    </div>
  )
}
