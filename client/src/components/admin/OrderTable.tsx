import type { AdminOrderListItem } from '../../services/orderService'
import { OrderDesktopTable } from './OrderDesktopTable'
import { OrderMobileCard } from './OrderMobileCard'

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
          <OrderMobileCard
            key={order.orderNumber}
            order={order}
            archiveView={archiveView}
            isBusy={busyOrderNumber === order.orderNumber}
            onArchive={onArchive}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ))}
      </div>
      <div className="hidden lg:block">
        <OrderDesktopTable
          orders={orders}
          archiveView={archiveView}
          busyOrderNumber={busyOrderNumber}
          onArchive={onArchive}
          onRestore={onRestore}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}