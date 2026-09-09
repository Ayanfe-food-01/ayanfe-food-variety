import { ActionMenu, ActionMenuButton, ActionMenuLink } from './ActionMenu'
import type { AdminProductsPage } from '../../services/adminService'

interface ProductActionsProps {
  product: AdminProductsPage['products'][number]
  isBusy: boolean
  onToggleStatus: () => void
  onToggleFeatured: () => void
  onDelete: () => void
}

const getFeaturedActionLabel = (isFeatured: boolean): string =>
  isFeatured ? 'Remove from featured' : 'Mark as featured'

export function ProductActions({
  product,
  isBusy,
  onToggleStatus,
  onToggleFeatured,
  onDelete,
}: ProductActionsProps) {
  return (
    <ActionMenu ariaLabel={`Actions for ${product.name}`} isBusy={isBusy} fixedPosition>
      {(close) => (
        <>
          <ActionMenuLink to={`/admin/products/${product.id}`} onClick={close}>View</ActionMenuLink>
          <ActionMenuLink to={`/admin/products/${product.id}/edit`} onClick={close}>Edit</ActionMenuLink>
          <ActionMenuButton tone="accent" onClick={() => { close(); onToggleStatus() }}>
            {product.isActive ? 'Deactivate' : 'Activate'}
          </ActionMenuButton>
          <ActionMenuButton onClick={() => { close(); onToggleFeatured() }}>
            {getFeaturedActionLabel(product.isFeatured)}
          </ActionMenuButton>
          <ActionMenuButton tone="danger" onClick={() => { close(); onDelete() }}>Delete</ActionMenuButton>
        </>
      )}
    </ActionMenu>
  )
}