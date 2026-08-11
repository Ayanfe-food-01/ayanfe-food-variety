import { Prisma } from '@prisma/client'
import { HttpError } from '../../utils/http.js'

type InventoryTransaction = Prisma.TransactionClient

interface StockAdjustmentInput {
  productId: string
  orderId?: string
  quantityDelta: number
  previousQuantity: number
  newQuantity: number
  reason: string
}

export async function recordStockAdjustment(
  transaction: InventoryTransaction,
  input: StockAdjustmentInput,
): Promise<void> {
  if (input.quantityDelta === 0) return
  await transaction.productStockAdjustment.create({
    data: input,
  })
}

export async function deductStock(
  transaction: InventoryTransaction,
  input: { productId: string; quantity: number; orderId: string; orderNumber: string },
): Promise<void> {
  const products = await transaction.$queryRaw<Array<{ stock_quantity: number; is_active: boolean }>>(
    Prisma.sql`SELECT stock_quantity, is_active
      FROM products
      WHERE id = ${input.productId}::uuid
      FOR UPDATE`,
  )
  const product = products[0]
  if (!product) throw new HttpError(404, 'Product no longer exists.')
  if (!product.is_active || product.stock_quantity < input.quantity) {
    throw new HttpError(409, 'Product is unavailable or there is insufficient stock.')
  }

  await transaction.product.update({
    where: { id: input.productId },
    data: { stockQuantity: { decrement: input.quantity } },
  })

  await recordStockAdjustment(transaction, {
    productId: input.productId,
    orderId: input.orderId,
    quantityDelta: -input.quantity,
    previousQuantity: product.stock_quantity,
    newQuantity: product.stock_quantity - input.quantity,
    reason: `Order ${input.orderNumber}`,
  })
}

export async function restoreStock(
  transaction: InventoryTransaction,
  input: { productId: string; quantity: number; orderId: string; orderNumber: string },
): Promise<void> {
  const products = await transaction.$queryRaw<Array<{ stock_quantity: number }>>(
    Prisma.sql`SELECT stock_quantity
      FROM products
      WHERE id = ${input.productId}::uuid
      FOR UPDATE`,
  )
  const product = products[0]
  if (!product) throw new HttpError(404, 'Product no longer exists.')

  await transaction.product.update({
    where: { id: input.productId },
    data: { stockQuantity: { increment: input.quantity } },
  })

  await recordStockAdjustment(transaction, {
    productId: input.productId,
    orderId: input.orderId,
    quantityDelta: input.quantity,
    previousQuantity: product.stock_quantity,
    newQuantity: product.stock_quantity + input.quantity,
    reason: `Cancellation ${input.orderNumber}`,
  })
}