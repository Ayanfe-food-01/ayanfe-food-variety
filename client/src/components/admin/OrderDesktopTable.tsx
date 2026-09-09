import type { AdminOrderListItem } from '../../services/orderService'
import { formatOrderStatus } from '../../utils/orderStatus'
import { OrderActionsMenu } from './OrderActionsMenu'
import { ResponsiveDataTable } from '../ui/ResponsiveDataTable'
import { formatDate } from '../../utils/dateFormat'
import { formatPrice, fulfillmentClass, shoppingModeClass, statusClass } from './orderPresentation'

interface OrderDesktopTableProps {
  orders: AdminOrderListItem[]
  archiveView: 'active' | 'archived'
  busyOrderNumber?: string | null
  onArchive: (orderNumber: string) => void
  onRestore: (orderNumber: string) => void
  onDelete: (order: AdminOrderListItem) => void
}

const columns = ['Order number', 'Customer', 'Phone', 'Date', 'Total', 'Fulfillment', 'Type', 'Payment', 'Order status', 'Actions'] as const

function StatusBadge({ status, className }: { status: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>{status}</span>
}

export function OrderDesktopTable({ orders, archiveView, busyOrderNumber, onArchive, onRestore, onDelete }: OrderDesktopTableProps) {
  return (
    <ResponsiveDataTable label="Orders table horizontal scroll">
      <table className="w-full min-w-[1480px] whitespace-nowrap text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-4 font-bold" key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((order) => (
            <tr className="group hover:bg-cream/60" key={order.orderNumber}>
              <td className="px-4 py-4 font-semibold text-green-dark"><span className="block min-w-0 truncate max-w-[190px]">{order.orderNumber}</span></td>
              <td className="px-4 py-4">
                <p className="block min-w-0 truncate max-w-[270px] font-semibold text-green-dark">{order.customerName}</p>
                <p className="block min-w-0 truncate mt-1 max-w-[270px] text-xs text-muted">{order.email ?? 'No email provided'}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-muted">{order.phone}</td>
              <td className="whitespace-nowrap px-4 py-4 text-muted">{formatDate(order.createdAt, true)}</td>
              <td className="whitespace-nowrap px-4 py-4 font-semibold text-green-dark">{formatPrice(order.total)}</td>
              <td className="px-4 py-4"><StatusBadge status={order.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'} className={fulfillmentClass(order.fulfillmentMethod)} /></td>
              <td className="px-4 py-4"><StatusBadge status={order.shoppingMode === 'WHOLESALE' ? 'Wholesale' : 'Retail'} className={shoppingModeClass(order.shoppingMode)} /></td>
              <td className="px-4 py-4"><StatusBadge status={order.paymentStatus} className={statusClass(order.paymentStatus)} /></td>
              <td className="px-4 py-4"><StatusBadge status={formatOrderStatus(order.orderStatus)} className={statusClass(order.orderStatus)} /></td>
              <td className="px-4 py-4 text-center">
                <div className="flex justify-center">
                  <OrderActionsMenu
                    order={order}
                    archiveView={archiveView}
                    isBusy={busyOrderNumber === order.orderNumber}
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
  )
}