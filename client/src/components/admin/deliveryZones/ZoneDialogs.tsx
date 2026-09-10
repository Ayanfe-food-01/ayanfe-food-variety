import { ConfirmDialog } from '../../ui/ConfirmDialog'
import type { AdminDeliveryZone } from '../../../services/adminService'

interface ZoneDialogsProps {
  zoneToStatus: AdminDeliveryZone | null
  isStatusBusy: boolean
  onCancelStatus: () => void
  onConfirmStatus: () => void
  zoneToDelete: AdminDeliveryZone | null
  deleteError: string | null
  isDeleteBusy: boolean
  onCancelDelete: () => void
  onConfirmDelete: () => void
}

export function ZoneDialogs({
  zoneToStatus,
  isStatusBusy,
  onCancelStatus,
  onConfirmStatus,
  zoneToDelete,
  deleteError,
  isDeleteBusy,
  onCancelDelete,
  onConfirmDelete,
}: ZoneDialogsProps) {
  return (
    <>
      {zoneToStatus && (
        <ConfirmDialog
          eyebrow="Change delivery zone status"
          title={`${zoneToStatus.isActive ? 'Deactivate' : 'Activate'} “${zoneToStatus.label}”?`}
          description={zoneToStatus.isActive
            ? 'Inactive zones are hidden from customers during checkout but existing orders keep their historical fee.'
            : 'Active zones are automatically assigned to customers whose city falls within the zone.'}
          isBusy={isStatusBusy}
          confirmLabel={zoneToStatus.isActive ? 'Deactivate zone' : 'Activate zone'}
          busyLabel="Updating…"
          onCancel={onCancelStatus}
          onConfirm={onConfirmStatus}
        />
      )}
      {zoneToDelete && (
        <ConfirmDialog
          eyebrow="Delete delivery zone"
          title={`Delete “${zoneToDelete.label}”?`}
          description="This is only allowed when no orders reference this zone. Zones in use should be deactivated instead."
          error={deleteError}
          isBusy={isDeleteBusy}
          confirmLabel="Delete zone"
          busyLabel="Deleting…"
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
        />
      )}
    </>
  )
}