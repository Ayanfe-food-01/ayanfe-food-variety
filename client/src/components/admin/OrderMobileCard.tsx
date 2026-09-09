import type { AdminOrderListItem } from '../../services/orderService'
import { formatOrderStatus } from '../../utils/orderStatus'
import { OrderActionsMenu } from './OrderActionsMenu'
import { formatDate } from '../../utils/dateFormat'
import { formatPrice, fulfillmentClass, shoppingModeClass, statusClass } from './orderPresentation'

interface OrderMobileCardProps {
  order: AdminOrderListItem
  archiveView: 'active' | 'archived'
  isBusy?: boolean
  onArchive: (orderNumber: string) => void
  onRestore: (orderNumber: string) => void
  onDelete: (order: AdminOrderListItem) => void
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 text-muted">{value}</dd>
    </div>
  )
}

function BadgeValue({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div>
      <dt className="uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${className}`}>{value}</span></dd>
    </div>
  )
}

export function OrderMobileCard({ order, archiveView, isBusy = false, onArchive, onRestore, onDelete }: OrderMobileCardProps) {
  return (
    <article className="rounded-2xl border border-line bg-cream/45 p-4" key={order.orderNumber}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Order number</p>
          <p className="mt-1 break-words font-bold text-green-dark">{order.orderNumber}</p>
        </div>
        <OrderActionsMenu
          order={order}
          archiveView={archiveView}
          isBusy={isBusy}
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
        <DetailRow label="Phone" value={order.phone} />
        <DetailRow label="Date" value={formatDate(order.createdAt, true)} />
        <div>
          <dt className="uppercase tracking-[0.12em] text-muted">Total</dt>
          <dd className="mt-1 font-bold text-green-dark">{formatPrice(order.total)}</dd>
        </div>
        <BadgeValue label="Fulfillment" value={order.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'} className={fulfillmentClass(order.fulfillmentMethod)} />
        <BadgeValue label="Type" value={order.shoppingMode === 'WHOLESALE' ? 'Wholesale' : 'Retail'} className={shoppingModeClass(order.shoppingMode)} />
        <BadgeValue label="Payment" value={order.paymentStatus} className={statusClass(order.paymentStatus)} />
        <div className="col-span-2">
          <dt className="uppercase tracking-[0.12em] text-muted">Order status</dt>
          <dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${statusClass(order.orderStatus)}`}>{formatOrderStatus(order.orderStatus)}</span></dd>
        </div>
      </dl>
    </article>
  )
}