import { ActionMenu, ActionMenuButton } from '../ActionMenu'
import type { AdminDeliveryZone } from '../../../services/adminService'

interface ZoneActionsProps {
  zone: AdminDeliveryZone
  isBusy: boolean
  onEdit: () => void
  onToggleStatus: () => void
  onDelete: () => void
}

export function ZoneActions({ zone, isBusy, onEdit, onToggleStatus, onDelete }: ZoneActionsProps) {
  return (
    <ActionMenu ariaLabel={`Actions for ${zone.label}`} isBusy={isBusy} fixedPosition>
      {(close) => (
        <>
          <ActionMenuButton onClick={() => { close(); onEdit() }}>Edit</ActionMenuButton>
          <ActionMenuButton tone="accent" onClick={() => { close(); onToggleStatus() }}>{zone.isActive ? 'Deactivate' : 'Activate'}</ActionMenuButton>
          <ActionMenuButton tone="danger" onClick={() => { close(); onDelete() }}>Delete</ActionMenuButton>
        </>
      )}
    </ActionMenu>
  )
}