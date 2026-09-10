import { Prisma } from '@prisma/client'
import type { InventoryTransaction } from './inventory.types.js'

export const LOW_STOCK_THRESHOLD_DEFAULT = 5

export function resolveLowStockThreshold(
  productThreshold: number,
  optionThreshold: number | null | undefined,
): number {
  if (optionThreshold != null && optionThreshold >= 0) return optionThreshold
  return productThreshold
}

export function computeStockStatus(
  stockQuantity: number,
  threshold: number,
): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  if (stockQuantity === 0) return 'OUT_OF_STOCK'
  if (stockQuantity <= threshold) return 'LOW_STOCK'
  return 'IN_STOCK'
}

export async function getProductThreshold(
  transaction: InventoryTransaction,
  productId: string,
): Promise<number> {
  const rows = await transaction.$queryRaw<Array<{ low_stock_threshold: number }>>(
    Prisma.sql`SELECT low_stock_threshold FROM products WHERE id = ${productId}::uuid`,
  )
  return rows[0]?.low_stock_threshold ?? LOW_STOCK_THRESHOLD_DEFAULT
}

export async function getOptionThreshold(
  transaction: InventoryTransaction,
  productOptionId: string,
): Promise<number | null> {
  const rows = await transaction.$queryRaw<Array<{ low_stock_threshold: number | null }>>(
    Prisma.sql`SELECT low_stock_threshold FROM product_options WHERE id = ${productOptionId}::uuid`,
  )
  return rows[0]?.low_stock_threshold ?? null
}