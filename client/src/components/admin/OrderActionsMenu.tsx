import { ActionMenu, ActionMenuButton, ActionMenuLink } from './ActionMenu'
import type { AdminOrderListItem } from '../../services/orderService'

interface OrderActionsMenuProps {
  order: AdminOrderListItem
  archiveView: 'active' | 'archived'
  isBusy?: boolean
  plainTrigger?: boolean
  verticalTrigger?: boolean
  onArchive: (orderNumber: string) => void
  onRestore: (orderNumber: string) => void
  onDelete: (order: AdminOrderListItem) => void
}

export function OrderActionsMenu({
  order,
  archiveView,
  isBusy = false,
  plainTrigger = false,
  verticalTrigger = false,
  onArchive,
  onRestore,
  onDelete,
}: OrderActionsMenuProps) {
  const orderPath = `/admin/orders/${encodeURIComponent(order.orderNumber)}`

  return (
    <ActionMenu
      ariaLabel={`Actions for order ${order.orderNumber}`}
      fixedPosition
      isBusy={isBusy}
      triggerVariant={plainTrigger ? 'plain' : 'default'}
      triggerOrientation={verticalTrigger ? 'vertical' : 'horizontal'}
    >
      {(close) => (
        <>
          <ActionMenuLink to={orderPath} onClick={close}>View</ActionMenuLink>
          {archiveView === 'active' ? (
            <ActionMenuButton onClick={() => { close(); onArchive(order.orderNumber) }}>
              Archive
            </ActionMenuButton>
          ) : (
            <>
              <ActionMenuButton onClick={() => { close(); onRestore(order.orderNumber) }}>
                Restore
              </ActionMenuButton>
              <ActionMenuButton tone="danger" onClick={() => { close(); onDelete(order) }}>
                Delete permanently
              </ActionMenuButton>
            </>
          )}
        </>
      )}
    </ActionMenu>
  )
}