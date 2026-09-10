import type { MovementType } from '@prisma/client'
import type { Prisma } from '@prisma/client'

export type InventoryTransaction = Prisma.TransactionClient

export interface StockAdjustmentInput {
  productId: string
  productOptionId?: string | null
  orderId?: string
  quantityDelta: number
  previousQuantity: number
  newQuantity: number
  movementType: MovementType
  reason: string
  performedBy?: string
  notes?: string
}

export interface StockDeductInput {
  productId: string
  productOptionId?: string | null
  quantity: number
  orderId: string
  orderNumber: string
}

export interface StockRestoreInput {
  productId: string
  productOptionId?: string | null
  quantity: number
  orderId: string
  orderNumber: string
}

export interface LowStockNotificationInput {
  productId: string
  productName: string
  previousQuantity: number
  newQuantity: number
  stockAdjustmentId: string
  notifyFromZero?: boolean
  threshold?: number
}

export interface StockAdjustmentQuery {
  productId?: string
  productOptionId?: string
  orderId?: string
  movementType?: MovementType
  from?: Date
  to?: Date
  page: number
  pageSize: number
}

export interface StockAdjustmentRecord {
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
  createdAt: Date
}

export interface InventoryAdjustInput {
  productId: string
  productOptionId?: string | null
  quantity: number
  movementType: MovementType
  reason: string
  performedBy?: string
  notes?: string
}

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
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
}
