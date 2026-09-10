import { MovementType } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { normalizeSearchQuery } from '../../utils/search.js'
import type { InventoryAdjustInput, StockAdjustmentQuery } from './inventory.types.js'

const VALID_MOVEMENT_TYPES = new Set(Object.values(MovementType))

export function validateInventoryAdjustInput(
  body: Record<string, unknown>,
  adminId: string,
): InventoryAdjustInput & { performedBy: string } {
  if (typeof body.productId !== 'string' || body.productId.trim() === '') {
    throw new HttpError(400, 'Product ID is required.')
  }
  const quantity = Number(body.quantity)
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new HttpError(400, 'Quantity must be a non-zero integer.')
  }
  if (quantity < -10000 || quantity > 10000) {
    throw new HttpError(400, 'Quantity must be between -10000 and 10000.')
  }
  if (typeof body.movementType !== 'string' || !VALID_MOVEMENT_TYPES.has(body.movementType as MovementType)) {
    throw new HttpError(400, 'Movement type is invalid.')
  }
  if (typeof body.reason !== 'string' || body.reason.trim().length < 2 || body.reason.length > 255) {
    throw new HttpError(400, 'Reason must be between 2 and 255 characters.')
  }

  return {
    productId: body.productId as string,
    productOptionId: (typeof body.productOptionId === 'string' && body.productOptionId) ? body.productOptionId : null,
    quantity,
    movementType: body.movementType as MovementType,
    reason: body.reason as string,
    performedBy: adminId,
    notes: typeof body.notes === 'string' && body.notes ? body.notes.slice(0, 500) : undefined,
  }
}

export function validateStockAdjustmentQuery(
  query: Record<string, unknown>,
): StockAdjustmentQuery {
  const page = Math.max(1, Number(query.page ?? 1))
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize ?? 20)))

  const movementType = typeof query.movementType === 'string'
    && VALID_MOVEMENT_TYPES.has(query.movementType as MovementType)
    ? (query.movementType as MovementType)
    : undefined

  const parseDate = (value: unknown): Date | undefined => {
    if (typeof value !== 'string' || value === '') return undefined
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
  }

  return {
    productId: typeof query.productId === 'string' ? query.productId : undefined,
    productOptionId: typeof query.productOptionId === 'string' ? query.productOptionId : undefined,
    orderId: typeof query.orderId === 'string' ? query.orderId : undefined,
    movementType,
    from: parseDate(query.from),
    to: parseDate(query.to),
    page,
    pageSize,
  }
}

export function validateInventoryQuery(
  query: Record<string, unknown>,
): {
  search?: string
  categoryId?: string
  stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock'
  page: number
  pageSize: number
} {
  const page = Math.max(1, Number(query.page ?? 1))
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize ?? 20)))
  const search = normalizeSearchQuery(query.search, 120)

  const validStatuses = ['in-stock', 'low-stock', 'out-of-stock'] as const
  const stockStatus = typeof query.stockStatus === 'string'
    && validStatuses.includes(query.stockStatus as typeof validStatuses[number])
    ? (query.stockStatus as 'in-stock' | 'low-stock' | 'out-of-stock')
    : undefined

  return {
    search: search || undefined,
    categoryId: typeof query.categoryId === 'string' ? query.categoryId : undefined,
    stockStatus,
    page,
    pageSize,
  }
}
