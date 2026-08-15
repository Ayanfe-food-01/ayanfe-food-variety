import { ActionMenu, ActionMenuButton } from './ActionMenu'

interface OrderDetailActionsMenuProps {
  orderNumber: string
  isArchived: boolean
  isBusy?: boolean
  onToggleArchive: () => void
  onDelete: () => void
}

export function OrderDetailActionsMenu({
  orderNumber,
  isArchived,
  isBusy = false,
  onToggleArchive,
  onDelete,
}: OrderDetailActionsMenuProps) {
  return (
    <ActionMenu
      ariaLabel={`Actions for order ${orderNumber}`}
      fixedPosition
      isBusy={isBusy}
      triggerVariant="plain"
      triggerOrientation="vertical"
    >
      {(close) => (
        <>
          <ActionMenuButton onClick={() => { close(); onToggleArchive() }}>
            {isArchived ? 'Restore order' : 'Archive order'}
          </ActionMenuButton>
          {isArchived && (
            <ActionMenuButton tone="danger" onClick={() => { close(); onDelete() }}>
              Delete permanently
            </ActionMenuButton>
          )}
        </>
      )}
    </ActionMenu>
  )
}