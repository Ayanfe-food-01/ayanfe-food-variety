export type MovementType =
  | 'STOCK_RECEIVED'
  | 'ORDER_DEDUCTION'
  | 'CANCELLATION_RESTORATION'
  | 'RETURN'
  | 'DAMAGED'
  | 'EXPIRED'
  | 'MANUAL_ADJUSTMENT'
  | 'OTHER'

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export interface InventoryItem {
  productId: string
  productName: string
  productSlug: string
  productImage: string
  categoryId: string
  categoryName: string
  productOptionId: string | null
  optionLabel: string | null
  stockQuantity: number
  lowStockThreshold: number
  status: StockStatus
}

export interface InventoryPage {
  items: InventoryItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface InventoryStockMovement {
  id: string
  productId: string
  productName: string
  productOptionId: string | null
  productOptionLabel: string | null
  orderId: string | null
  orderNumber: string | null
  quantityDelta: number
  previousQuantity: number
  newQuantity: number
  movementType: MovementType
  reason: string
  performedBy: string | null
  notes: string | null
  createdAt: string
}

export interface StockMovementsPage {
  movements: InventoryStockMovement[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface InventorySummary {
  totalProductsWithOptions: number
  lowStockCount: number
  outOfStockCount: number
  recentMovements: Array<{
    id: string
    productName: string
    optionLabel: string | null
    quantityDelta: number
    movementType: MovementType
    reason: string
    createdAt: string
  }>
}

export interface InventoryAdjustInput {
  productId: string
  productOptionId?: string | null
  quantity: number
  movementType: MovementType
  reason: string
  notes?: string
}

export interface InventoryAdjustResult {
  previousQuantity: number
  newQuantity: number
}

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  STOCK_RECEIVED: 'Stock received',
  ORDER_DEDUCTION: 'Order deduction',
  CANCELLATION_RESTORATION: 'Cancellation restoration',
  RETURN: 'Returned stock',
  DAMAGED: 'Damaged goods',
  EXPIRED: 'Expired goods',
  MANUAL_ADJUSTMENT: 'Manual adjustment',
  OTHER: 'Other',
}

export const ADJUSTMENT_MOVEMENT_TYPES: MovementType[] = [
  'STOCK_RECEIVED',
  'DAMAGED',
  'EXPIRED',
  'RETURN',
  'MANUAL_ADJUSTMENT',
  'OTHER',
]