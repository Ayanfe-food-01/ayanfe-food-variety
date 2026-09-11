import { MovementType, Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { recordStockAdjustment, createLowStockNotificationIfNeeded } from './inventory.service.js'
import { resolveLowStockThreshold } from './inventory.threshold.js'
import type { InventoryAdjustInput, InventoryItem } from './inventory.types.js'

const INVENTORY_SELECT = {
  id: true,
  label: true,
  stockQuantity: true,
  lowStockThreshold: true,
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
} as const

type InventoryRow = {
  id: string
  label: string
  stockQuantity: number
  lowStockThreshold: number | null
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
}

function toInventoryItem(row: InventoryRow): InventoryItem {
  const stockQuantity = row.stockQuantity
  const threshold = resolveLowStockThreshold(
    row.product.lowStockThreshold,
    row.lowStockThreshold,
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
    productOptionId: row.id,
    optionLabel: row.label,
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

const SIMPLE_INVENTORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  image: true,
  stockQuantity: true,
  lowStockThreshold: true,
  category: { select: { id: true, name: true, isActive: true } },
} as const

type SimpleInventoryRow = {
  id: string
  name: string
  slug: string
  image: string
  stockQuantity: number
  lowStockThreshold: number
  category: { id: string; name: string; isActive: boolean }
}

function toSimpleInventoryItem(row: SimpleInventoryRow): InventoryItem {
  const status = row.stockQuantity === 0
    ? 'OUT_OF_STOCK'
    : row.stockQuantity <= row.lowStockThreshold
      ? 'LOW_STOCK'
      : 'IN_STOCK'

  return {
    productId: row.id,
    productName: row.name,
    productSlug: row.slug,
    productImage: row.image,
    categoryId: row.category.id,
    categoryName: row.category.name,
    productOptionId: null,
    optionLabel: null,
    stockQuantity: row.stockQuantity,
    lowStockThreshold: row.lowStockThreshold,
    status,
  }
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
  if (options.search) {
    productWhere.OR = [{ name: { contains: options.search, mode: 'insensitive' } }]
  }

  const optionWhere: Prisma.ProductOptionWhereInput = { product: productWhere }
  if (options.search) {
    optionWhere.OR = [
      { label: { contains: options.search, mode: 'insensitive' } },
      { product: { name: { contains: options.search, mode: 'insensitive' } } },
    ]
  }

  const simpleProductWhere: Prisma.ProductWhereInput = { ...productWhere, options: { none: {} } }

  const [optionRows, simpleRows] = await Promise.all([
    prisma.productOption.findMany({
      where: optionWhere,
      select: INVENTORY_SELECT,
      orderBy: { product: { name: 'asc' } },
    }),
    prisma.product.findMany({
      where: simpleProductWhere,
      select: SIMPLE_INVENTORY_SELECT,
      orderBy: { name: 'asc' },
    }),
  ])

  let items = [
    ...optionRows.map(toInventoryItem),
    ...simpleRows.map(toSimpleInventoryItem),
  ]

  if (options.stockStatus) {
    const status = options.stockStatus.toUpperCase().replace('-', '_')
    items = items.filter((item) => item.status === status)
  }

  items.sort((a, b) => a.productName.localeCompare(b.productName))

  const total = items.length
  const start = (Math.max(options.page, 1) - 1) * options.pageSize
  const pagedItems = items.slice(start, start + options.pageSize)

  return {
    items: pagedItems,
    pagination: {
      page: options.page,
      pageSize: options.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / options.pageSize)),
    },
  }
}

export async function getInventorySummary() {
  const [optionRows, simpleProductRows, recentMovements] = await Promise.all([
    prisma.productOption.findMany({
      where: { product: { isActive: true } },
      select: {
        stockQuantity: true,
        lowStockThreshold: true,
        product: { select: { lowStockThreshold: true } },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true, options: { none: {} } },
      select: { stockQuantity: true, lowStockThreshold: true },
    }),
    prisma.productStockAdjustment.findMany({
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
    }),
  ])

  let lowStockCount = 0
  let outOfStockCount = 0

  for (const option of optionRows) {
    const threshold = resolveLowStockThreshold(option.product.lowStockThreshold, option.lowStockThreshold)
    if (option.stockQuantity === 0) outOfStockCount += 1
    else if (option.stockQuantity <= threshold) lowStockCount += 1
  }
  for (const product of simpleProductRows) {
    if (product.stockQuantity === 0) outOfStockCount += 1
    else if (product.stockQuantity <= product.lowStockThreshold) lowStockCount += 1
  }

  return {
    totalTrackedSkus: optionRows.length + simpleProductRows.length,
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
