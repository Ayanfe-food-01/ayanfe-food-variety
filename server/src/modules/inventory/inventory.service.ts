import { AdminNotificationType, MovementType, Prisma } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { createAdminNotification } from '../notifications/notification.service.js'
import { resolveLowStockThreshold, LOW_STOCK_THRESHOLD_DEFAULT } from './inventory.threshold.js'
import type {
  InventoryTransaction,
  StockAdjustmentInput,
  StockDeductInput,
  StockRestoreInput,
  LowStockNotificationInput,
} from './inventory.types.js'

export { LOW_STOCK_THRESHOLD_DEFAULT as LOW_STOCK_THRESHOLD } from './inventory.threshold.js'

export async function recordStockAdjustment(
  transaction: InventoryTransaction,
  input: StockAdjustmentInput,
): Promise<{ id: string } | null> {
  if (input.quantityDelta === 0) return null
  return transaction.productStockAdjustment.create({
    data: {
      productId: input.productId,
      productOptionId: input.productOptionId ?? null,
      orderId: input.orderId ?? null,
      quantityDelta: input.quantityDelta,
      previousQuantity: input.previousQuantity,
      newQuantity: input.newQuantity,
      movementType: input.movementType,
      reason: input.reason,
      performedBy: input.performedBy ?? null,
      notes: input.notes ?? null,
    },
    select: { id: true },
  })
}

export async function createLowStockNotificationIfNeeded(
  transaction: InventoryTransaction,
  input: LowStockNotificationInput,
): Promise<void> {
  const threshold = input.threshold ?? LOW_STOCK_THRESHOLD_DEFAULT
  const enteredLowStock =
    input.newQuantity > 0
    && input.newQuantity <= threshold
    && (input.previousQuantity > threshold
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

type LockedProduct = {
  stock_quantity: number
  is_active: boolean
  name: string
  low_stock_threshold: number
}

type LockedProductOption = {
  id: string
  product_id: string
  label: string
  stock_quantity: number
  is_active: boolean
  low_stock_threshold: number | null
  product_low_stock_threshold: number
}

const lockProduct = async (
  transaction: InventoryTransaction,
  productId: string,
): Promise<LockedProduct | null> => {
  const rows = await transaction.$queryRaw<Array<LockedProduct>>(
    Prisma.sql`SELECT stock_quantity, is_active, name, low_stock_threshold
      FROM products
      WHERE id = ${productId}::uuid
      FOR UPDATE`,
  )
  return rows[0] ?? null
}

const lockProductOption = async (
  transaction: InventoryTransaction,
  productOptionId: string,
): Promise<LockedProductOption | null> => {
  const rows = await transaction.$queryRaw<Array<LockedProductOption>>(
    Prisma.sql`SELECT po.id, po.product_id, po.label, po.stock_quantity, po.is_active,
      po.low_stock_threshold, p.low_stock_threshold AS product_low_stock_threshold
      FROM product_options po
      JOIN products p ON p.id = po.product_id
      WHERE po.id = ${productOptionId}::uuid
      FOR UPDATE`,
  )
  return rows[0] ?? null
}

export async function deductStock(
  transaction: InventoryTransaction,
  input: StockDeductInput,
): Promise<void> {
  const product = await lockProduct(transaction, input.productId)
  if (!product) throw new HttpError(404, 'Product no longer exists.')

  if (input.productOptionId) {
    const option = await lockProductOption(transaction, input.productOptionId)
    if (!option || option.product_id !== input.productId) {
      throw new HttpError(404, 'Product option no longer exists.')
    }
    if (!product.is_active) throw new HttpError(409, 'Product is no longer available.')
    if (!option.is_active || option.stock_quantity < input.quantity) {
      throw new HttpError(409, 'Product option is unavailable or there is insufficient stock.')
    }

    await transaction.productOption.update({
      where: { id: option.id },
      data: { stockQuantity: { decrement: input.quantity } },
    })

    const threshold = resolveLowStockThreshold(
      option.product_low_stock_threshold,
      option.low_stock_threshold,
    )

    const adjustment = await recordStockAdjustment(transaction, {
      productId: input.productId,
      productOptionId: option.id,
      orderId: input.orderId,
      quantityDelta: -input.quantity,
      previousQuantity: option.stock_quantity,
      newQuantity: option.stock_quantity - input.quantity,
      movementType: MovementType.ORDER_DEDUCTION,
      reason: `Order ${input.orderNumber}`,
    })
    if (adjustment) {
      await createLowStockNotificationIfNeeded(transaction, {
        productId: input.productId,
        productName: `${product.name} (${option.label})`,
        previousQuantity: option.stock_quantity,
        newQuantity: option.stock_quantity - input.quantity,
        stockAdjustmentId: adjustment.id,
        threshold,
      })
    }
    return
  }

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
    movementType: MovementType.ORDER_DEDUCTION,
    reason: `Order ${input.orderNumber}`,
  })
  if (adjustment) {
    await createLowStockNotificationIfNeeded(transaction, {
      productId: input.productId,
      productName: product.name,
      previousQuantity: product.stock_quantity,
      newQuantity: product.stock_quantity - input.quantity,
      stockAdjustmentId: adjustment.id,
      threshold: product.low_stock_threshold,
    })
  }
}

export async function restoreStock(
  transaction: InventoryTransaction,
  input: StockRestoreInput,
): Promise<void> {
  if (input.productOptionId) {
    const option = await lockProductOption(transaction, input.productOptionId)
    if (!option || option.product_id !== input.productId) {
      throw new HttpError(404, 'Product option no longer exists.')
    }

    await transaction.productOption.update({
      where: { id: option.id },
      data: { stockQuantity: { increment: input.quantity } },
    })

    await recordStockAdjustment(transaction, {
      productId: input.productId,
      productOptionId: option.id,
      orderId: input.orderId,
      quantityDelta: input.quantity,
      previousQuantity: option.stock_quantity,
      newQuantity: option.stock_quantity + input.quantity,
      movementType: MovementType.CANCELLATION_RESTORATION,
      reason: `Cancellation ${input.orderNumber}`,
    })
    return
  }

  const product = await lockProduct(transaction, input.productId)
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
    movementType: MovementType.CANCELLATION_RESTORATION,
    reason: `Cancellation ${input.orderNumber}`,
  })
}
