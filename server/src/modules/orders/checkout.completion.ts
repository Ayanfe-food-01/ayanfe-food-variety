import { AdminNotificationType, PaymentMethod, Prisma } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { deductStock, resolveDeductUnits } from '../inventory/inventory.service.js'
import { createAdminNotification } from '../notifications/notification.service.js'
import type { OrderWithItems } from './order.mapper.js'
import type { CheckoutCartItem, CheckoutProduct } from './checkout.cart.js'

export interface CompleteCheckoutOrderContext {
  order: OrderWithItems
  cartId: string | null
  cartItems: CheckoutCartItem[]
  productsById: Map<string, CheckoutProduct>
  paymentMethod: PaymentMethod
}

/**
 * Finalizes an order inside its creation transaction: deducts stock for every
 * line item, records the deduction time, removes the source cart rows (unless
 * a gateway order is still awaiting payment) and notifies the admin.
 */
export async function completeCheckoutOrder(
  transaction: Prisma.TransactionClient,
  context: CompleteCheckoutOrderContext,
): Promise<void> {
  const { order, cartId, cartItems, productsById, paymentMethod } = context

  for (const orderLine of [...order.orderItems].sort((left, right) => left.productId.localeCompare(right.productId))) {
    const product = productsById.get(orderLine.productId)
    try {
      await deductStock(transaction, {
        productId: orderLine.productId,
        productOptionId: orderLine.productOptionId ?? null,
        quantity: resolveDeductUnits(orderLine.quantity, orderLine.wholesaleUnitsPerPackage),
        orderId: order.id,
        orderNumber: order.orderNumber,
      })
    } catch (error: unknown) {
      if (error instanceof HttpError && (error.statusCode === 404 || error.statusCode === 409)) {
        throw new HttpError(error.statusCode, product ? `${product.name}: ${error.message}` : error.message)
      }
      throw error
    }
  }
  await transaction.order.update({
    where: { id: order.id },
    data: { stockDeductedAt: new Date() },
  })

  if (cartId && paymentMethod !== PaymentMethod.PAYSTACK) {
    await transaction.customerCartItem.deleteMany({
      where: {
        id: { in: cartItems.flatMap((item) => item.id ? [item.id] : []) },
        cartId,
      },
    })
  }
  await createAdminNotification(transaction, {
    type: AdminNotificationType.NEW_ORDER,
    eventKey: `new-order:${order.id}`,
    title: 'New order placed',
    message: `${order.customerName} placed order ${order.orderNumber}.`,
    href: `/admin/orders/${order.orderNumber}`,
  })
}