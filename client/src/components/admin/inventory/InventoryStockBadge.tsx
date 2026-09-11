import type { StockStatus } from '../../../types/inventory'

interface InventoryStockBadgeProps {
  status: StockStatus
}

const statusConfig: Record<StockStatus, { label: string; className: string }> = {
  IN_STOCK: { label: 'In stock', className: 'bg-sage text-green' },
  LOW_STOCK: { label: 'Low stock', className: 'bg-orange/10 text-orange' },
  OUT_OF_STOCK: { label: 'Out of stock', className: 'bg-line text-muted' },
}

export function InventoryStockBadge({ status }: InventoryStockBadgeProps) {
  const config = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold leading-none ${config.className}`}>
      {config.label}
    </span>
  )
}