import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { AdminProductsPage } from '../../services/adminService'

interface ProductsDialogsProps {
  productToStatus: AdminProductsPage['products'][number] | null
  updatingId: string | null
  onStatusChange: () => void
  onCancelStatus: () => void
  productToDelete: AdminProductsPage['products'][number] | null
  deletingId: string | null
  deleteError: string | null
  onDelete: () => void
  onCancelDelete: () => void
  isBulkDeleteOpen: boolean
  selectedCount: number
  bulkPending: boolean
  bulkDeleteError: string | null
  onBulkDelete: () => void
  onCancelBulkDelete: () => void
}

export function ProductsDialogs({
  productToStatus,
  updatingId,
  onStatusChange,
  onCancelStatus,
  productToDelete,
  deletingId,
  deleteError,
  onDelete,
  onCancelDelete,
  isBulkDeleteOpen,
  selectedCount,
  bulkPending,
  bulkDeleteError,
  onBulkDelete,
  onCancelBulkDelete,
}: ProductsDialogsProps) {
  return (
    <>
      {productToStatus && (
        <ConfirmDialog
          eyebrow="Change product availability"
          title={`${productToStatus.isActive ? 'Deactivate' : 'Activate'} "${productToStatus.name}"?`}
          description={productToStatus.isActive ? 'This hides the product from customer shopping and prevents it from being selected for new orders.' : 'This makes the product available for customer shopping again when it has stock.'}
          isBusy={updatingId === productToStatus.id}
          confirmLabel={productToStatus.isActive ? 'Deactivate product' : 'Activate product'}
          busyLabel="Updating…"
          onCancel={onCancelStatus}
          onConfirm={() => void onStatusChange()}
        />
      )}
      {productToDelete && (
        <ConfirmDialog
          eyebrow="Permanent deletion"
          title={`Delete "${productToDelete.name}"?`}
          description="This permanently removes the product from the catalog. This action cannot be undone. Products with order or inventory history must be deactivated instead."
          error={deleteError}
          isBusy={deletingId === productToDelete.id}
          confirmLabel="Delete permanently"
          busyLabel="Deleting…"
          onCancel={onCancelDelete}
          onConfirm={() => void onDelete()}
        />
      )}
      {isBulkDeleteOpen && selectedCount > 0 && (
        <ConfirmDialog
          eyebrow="Permanent deletion"
          title={`Delete ${selectedCount} selected product${selectedCount === 1 ? '' : 's'}?`}
          description="This permanently removes the selected products from the catalog. This action cannot be undone. Products with order or inventory history will be skipped and must be deactivated instead."
          error={bulkDeleteError}
          isBusy={bulkPending}
          confirmLabel="Delete permanently"
          busyLabel="Deleting…"
          onCancel={onCancelBulkDelete}
          onConfirm={() => void onBulkDelete()}
        />
      )}
    </>
  )
}
