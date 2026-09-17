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
  const variantClasses = isOutOfStock
    ? 'bg-black/55 text-white'
    : 'bg-orange/12 text-orange'

  return (
    <span
      className={`inline-flex items-center rounded-full px-[9px] py-[5px] text-[11px] font-extrabold leading-none tracking-[0.02em] ${variantClasses} ${className}`.trim()}
      role="status"
    >
      {isOutOfStock ? 'Out of stock' : 'Low stock'}
    </span>
  )
}