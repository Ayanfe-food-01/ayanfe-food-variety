import { MovementType, Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { recordStockAdjustment, createLowStockNotificationIfNeeded } from './inventory.service.js'
import { resolveLowStockThreshold } from './inventory.threshold.js'
import type { InventoryAdjustInput, InventoryItem } from './inventory.types.js'

const INVENTORY_SELECT = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      stockQuantity: true,
      lowStockThreshold: true,
      isActive: true,
      category: { select: { id: true, name: true, isActive: true } },
    },
  },
  productOption: {
    select: {
      id: true,
      label: true,
      stockQuantity: true,
      lowStockThreshold: true,
    },
  },
} as const

type InventoryRow = {
  product: {
    id: string
    name: string
    slug: string
    image: string
    stockQuantity: number
    lowStockThreshold: number
    isActive: boolean
    category: { id: string; name: string; isActive: boolean }
  }
  productOption: {
    id: string
    label: string
    stockQuantity: number
    lowStockThreshold: number | null
  } | null
}

function toInventoryItem(row: InventoryRow): InventoryItem {
  const stockQuantity = row.productOption
    ? row.productOption.stockQuantity
    : row.product.stockQuantity
  const threshold = resolveLowStockThreshold(
    row.product.lowStockThreshold,
    row.productOption?.lowStockThreshold,
  )
  const status = stockQuantity === 0
    ? 'OUT_OF_STOCK'
    : stockQuantity <= threshold
      ? 'LOW_STOCK'
      : 'IN_STOCK'

  return {
    productId: row.product.id,
    productName: row.product.name,
    productSlug: row.product.slug,
    productImage: row.product.image,
    categoryId: row.product.category.id,
    categoryName: row.product.category.name,
    productOptionId: row.productOption?.id ?? null,
    optionLabel: row.productOption?.label ?? null,
    stockQuantity,
    lowStockThreshold: threshold,
    status,
  }
}

export async function adjustStock(input: InventoryAdjustInput, adminId: string) {
  if (!Number.isInteger(input.quantity) || input.quantity === 0) {
    throw new HttpError(400, 'Adjustment quantity must be a non-zero integer.')
  }

  return prisma.$transaction(async (transaction) => {
    if (input.productOptionId) {
      const rows = await transaction.$queryRaw<Array<{
        id: string
        product_id: string
        stock_quantity: number
        is_active: boolean
        label: string
        low_stock_threshold: number | null
        product_low_stock_threshold: number
        product_name: string
      }>>(
        Prisma.sql`SELECT po.id, po.product_id, po.stock_quantity, po.is_active, po.label,
          po.low_stock_threshold, p.low_stock_threshold AS product_low_stock_threshold, p.name AS product_name
          FROM product_options po
          JOIN products p ON p.id = po.product_id
          WHERE po.id = ${input.productOptionId}::uuid
          FOR UPDATE`,
      )
      const option = rows[0]
      if (!option) throw new HttpError(404, 'Product option not found.')
      if (option.product_id !== input.productId) {
        throw new HttpError(400, 'Product option does not belong to this product.')
      }

      const newQuantity = option.stock_quantity + input.quantity
      if (newQuantity < 0) {
        throw new HttpError(400, `Insufficient stock. Current: ${option.stock_quantity}, requested change: ${input.quantity}.`)
      }

      await transaction.productOption.update({
        where: { id: option.id },
        data: { stockQuantity: newQuantity },
      })

      const adjustment = await recordStockAdjustment(transaction, {
        productId: input.productId,
        productOptionId: option.id,
        quantityDelta: input.quantity,
        previousQuantity: option.stock_quantity,
        newQuantity,
        movementType: input.movementType,
        reason: input.reason,
        performedBy: adminId,
        notes: input.notes,
      })

      const threshold = resolveLowStockThreshold(
        option.product_low_stock_threshold,
        option.low_stock_threshold,
      )
      if (adjustment) {
        await createLowStockNotificationIfNeeded(transaction, {
          productId: input.productId,
          productName: `${option.product_name} (${option.label})`,
          previousQuantity: option.stock_quantity,
          newQuantity,
          stockAdjustmentId: adjustment.id,
          notifyFromZero: true,
          threshold,
        })
      }

      return { previousQuantity: option.stock_quantity, newQuantity }
    }

    const rows = await transaction.$queryRaw<Array<{
      id: string
      stock_quantity: number
      is_active: boolean
      name: string
      low_stock_threshold: number
    }>>(
      Prisma.sql`SELECT id, stock_quantity, is_active, name, low_stock_threshold
        FROM products
        WHERE id = ${input.productId}::uuid
        FOR UPDATE`,
    )
    const product = rows[0]
    if (!product) throw new HttpError(404, 'Product not found.')

    const newQuantity = product.stock_quantity + input.quantity
    if (newQuantity < 0) {
      throw new HttpError(400, `Insufficient stock. Current: ${product.stock_quantity}, requested change: ${input.quantity}.`)
    }

    await transaction.product.update({
      where: { id: input.productId },
      data: { stockQuantity: newQuantity },
    })

    const adjustment = await recordStockAdjustment(transaction, {
      productId: input.productId,
      quantityDelta: input.quantity,
      previousQuantity: product.stock_quantity,
      newQuantity,
      movementType: input.movementType,
      reason: input.reason,
      performedBy: adminId,
      notes: input.notes,
    })
    if (adjustment) {
      await createLowStockNotificationIfNeeded(transaction, {
        productId: input.productId,
        productName: product.name,
        previousQuantity: product.stock_quantity,
        newQuantity,
        stockAdjustmentId: adjustment.id,
        notifyFromZero: true,
        threshold: product.low_stock_threshold,
      })
    }

    return { previousQuantity: product.stock_quantity, newQuantity }
  }, { timeout: 15000 })
}

export async function listInventory(options: {
  search?: string
  categoryId?: string
  stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock'
  page: number
  pageSize: number
}) {
  const productWhere: Prisma.ProductWhereInput = { isActive: true }
  if (options.categoryId) productWhere.categoryId = options.categoryId

  const where: Prisma.ProductOptionWhereInput = { product: productWhere }

  if (options.search) {
    where.OR = [
      { label: { contains: options.search, mode: 'insensitive' } },
      { product: { name: { contains: options.search, mode: 'insensitive' } } },
    ]
  }

  const [total, rows] = await prisma.$transaction([
    prisma.productOption.count({ where }),
    prisma.productOption.findMany({
      where,
      include: INVENTORY_SELECT,
      orderBy: { product: { name: 'asc' } },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
    }),
  ])

  let items = rows.map(toInventoryItem)

  if (options.stockStatus) {
    items = items.filter((item) => item.status === options.stockStatus!.toUpperCase().replace('-', '_'))
  }

  return {
    items,
    pagination: {
      page: options.page,
      pageSize: options.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / options.pageSize)),
    },
  }
}

export async function getInventorySummary() {
  const [totalProductsWithOptions, lowStockCount, outOfStockCount] = await Promise.all([
    prisma.productOption.count({ where: { product: { isActive: true } } }),
    prisma.productOption.count({
      where: {
        product: { isActive: true },
        stockQuantity: { gt: 0, lte: 5 },
      },
    }),
    prisma.productOption.count({
      where: {
        product: { isActive: true },
        stockQuantity: 0,
      },
    }),
  ])

  const recentMovements = await prisma.productStockAdjustment.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      quantityDelta: true,
      movementType: true,
      reason: true,
      createdAt: true,
      product: { select: { name: true } },
      productOption: { select: { label: true } },
    },
  })

  return {
    totalProductsWithOptions,
    lowStockCount,
    outOfStockCount,
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      productName: m.product.name,
      optionLabel: m.productOption?.label ?? null,
      quantityDelta: m.quantityDelta,
      movementType: m.movementType,
      reason: m.reason,
      createdAt: m.createdAt.toISOString(),
    })),
  }
}
