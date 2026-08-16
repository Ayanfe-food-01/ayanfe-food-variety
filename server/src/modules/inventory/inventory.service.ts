import { AdminNotificationType, Prisma } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { createAdminNotification } from '../notifications/notification.service.js'

type InventoryTransaction = Prisma.TransactionClient

interface StockAdjustmentInput {
  productId: string
  orderId?: string
  quantityDelta: number
  previousQuantity: number
  newQuantity: number
  reason: string
}

export const LOW_STOCK_THRESHOLD = 5

export async function recordStockAdjustment(
  transaction: InventoryTransaction,
  input: StockAdjustmentInput,
): Promise<{ id: string } | null> {
  if (input.quantityDelta === 0) return null
  return transaction.productStockAdjustment.create({
    data: input,
    select: { id: true },
  })
}

export async function createLowStockNotificationIfNeeded(
  transaction: InventoryTransaction,
  input: {
    productId: string
    productName: string
    previousQuantity: number
    newQuantity: number
    stockAdjustmentId: string
    notifyFromZero?: boolean
  },
): Promise<void> {
  const enteredLowStock =
    input.newQuantity > 0
    && input.newQuantity <= LOW_STOCK_THRESHOLD
    && (input.previousQuantity > LOW_STOCK_THRESHOLD
      || (input.notifyFromZero && input.previousQuantity === 0))

  if (!enteredLowStock) return

  await createAdminNotification(transaction, {
    type: AdminNotificationType.LOW_STOCK,
    eventKey: `low-stock:${input.productId}:${input.stockAdjustmentId}`,
    title: 'Low-stock product',
    message: `${input.productName} has ${input.newQuantity} unit${input.newQuantity === 1 ? '' : 's'} left.`,
    href: `/admin/products/${input.productId}`,
  })
}

export async function deductStock(
  transaction: InventoryTransaction,
  input: { productId: string; quantity: number; orderId: string; orderNumber: string },
): Promise<void> {
  const products = await transaction.$queryRaw<Array<{ stock_quantity: number; is_active: boolean; name: string }>>(
    Prisma.sql`SELECT stock_quantity, is_active, name
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

  const adjustment = await recordStockAdjustment(transaction, {
    productId: input.productId,
    orderId: input.orderId,
    quantityDelta: -input.quantity,
    previousQuantity: product.stock_quantity,
    newQuantity: product.stock_quantity - input.quantity,
    reason: `Order ${input.orderNumber}`,
  })
  if (adjustment) {
    await createLowStockNotificationIfNeeded(transaction, {
      productId: input.productId,
      productName: product.name,
      previousQuantity: product.stock_quantity,
      newQuantity: product.stock_quantity - input.quantity,
      stockAdjustmentId: adjustment.id,
    })
  }
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