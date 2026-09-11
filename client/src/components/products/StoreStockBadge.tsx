import type { Product } from '../../types/product'

interface StoreStockBadgeProps {
  product: Product
  stockQuantity?: number
  className?: string
}

export function StoreStockBadge({ product, stockQuantity, className = '' }: StoreStockBadgeProps) {
  const status = product.availabilityStatus ?? (stockQuantity !== undefined && stockQuantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK')
  if (status === 'IN_STOCK') return null

  const isOutOfStock = status === 'OUT_OF_STOCK'
  return (
    <span
      className={`store-stock-badge ${isOutOfStock ? 'store-stock-badge-out' : 'store-stock-badge-low'} ${className}`.trim()}
      role="status"
    >
      {isOutOfStock ? 'Out of stock' : 'Low stock'}
    </span>
  )
}