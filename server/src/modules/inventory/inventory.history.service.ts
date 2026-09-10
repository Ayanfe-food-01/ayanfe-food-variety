import { MovementType, Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import type { StockAdjustmentQuery, StockAdjustmentRecord } from './inventory.types.js'

function buildHistoryWhere(query: StockAdjustmentQuery): Prisma.ProductStockAdjustmentWhereInput {
  const where: Prisma.ProductStockAdjustmentWhereInput = {}
  if (query.productId) where.productId = query.productId
  if (query.productOptionId) where.productOptionId = query.productOptionId
  if (query.orderId) where.orderId = query.orderId
  if (query.movementType) where.movementType = query.movementType
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    }
  }
  return where
}

function toRecord(row: {
  id: string
  productId: string
  productOptionId: string | null
  orderId: string | null
  quantityDelta: number
  previousQuantity: number
  newQuantity: number
  movementType: MovementType
  reason: string
  performedBy: string | null
  notes: string | null
  createdAt: Date
  product: { name: string }
  productOption: { label: string } | null
  order: { orderNumber: string } | null
}): StockAdjustmentRecord {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.product.name,
    productOptionId: row.productOptionId,
    productOptionLabel: row.productOption?.label ?? null,
    orderId: row.orderId,
    orderNumber: row.order?.orderNumber ?? null,
    quantityDelta: row.quantityDelta,
    previousQuantity: row.previousQuantity,
    newQuantity: row.newQuantity,
    movementType: row.movementType,
    reason: row.reason,
    performedBy: row.performedBy,
    notes: row.notes,
    createdAt: row.createdAt,
  }
}

export async function listStockMovements(query: StockAdjustmentQuery) {
  const where = buildHistoryWhere(query)
  const [total, rows] = await prisma.$transaction([
    prisma.productStockAdjustment.count({ where }),
    prisma.productStockAdjustment.findMany({
      where,
      include: {
        product: { select: { name: true } },
        productOption: { select: { label: true } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    movements: rows.map(toRecord),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  }
}

export async function getProductMovementHistory(
  productId: string,
  productOptionId: string | null,
  page: number,
  pageSize: number,
) {
  const where: Prisma.ProductStockAdjustmentWhereInput = { productId }
  if (productOptionId) where.productOptionId = productOptionId

  const [total, rows] = await prisma.$transaction([
    prisma.productStockAdjustment.count({ where }),
    prisma.productStockAdjustment.findMany({
      where,
      include: {
        product: { select: { name: true } },
        productOption: { select: { label: true } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    movements: rows.map(toRecord),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}
