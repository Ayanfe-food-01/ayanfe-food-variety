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
  return (
    <div className="min-w-0 overflow-hidden">
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