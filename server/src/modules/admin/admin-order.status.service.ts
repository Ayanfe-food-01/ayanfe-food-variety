import { OrderStatus, PaymentStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { UpdateOrderStatusInput } from './admin.types.js'
import { notifyOrderStatusChanged } from '../orders/order.email.js'
import { restoreStock } from '../inventory/inventory.service.js'
import { getAdminOrder } from './admin-order.detail.service.js'

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.ORDER_PLACED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
}

const fulfillmentStatusesRequiringPayment = new Set<OrderStatus>([
  OrderStatus.PROCESSING,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
])

export async function updateAdminOrderStatus(orderNumber: string, input: UpdateOrderStatusInput, adminId: string) {
  const updated = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.order.findUnique({
      where: { orderNumber },
      include: {
        orderItems: { select: { productId: true, productOptionId: true, quantity: true } },
      },
    })
    if (!existing) throw new HttpError(404, 'Order not found.')
    if (existing.orderStatus === input.orderStatus) {
      if (
        input.orderStatus === OrderStatus.CANCELLED &&
        existing.stockDeductedAt &&
        !existing.stockRestoredAt
      ) {
        const restoreClaim = await transaction.order.updateMany({
          where: { id: existing.id, orderStatus: OrderStatus.CANCELLED, stockRestoredAt: null },
          data: { stockRestoredAt: new Date() },
        })
        if (restoreClaim.count !== 1) return existing
        for (const item of existing.orderItems) {
          await restoreStock(transaction, {
            productId: item.productId,
            productOptionId: item.productOptionId ?? null,
            quantity: item.quantity,
            orderId: existing.id,
            orderNumber: existing.orderNumber,
          })
        }
        return transaction.order.findUniqueOrThrow({ where: { id: existing.id } })
      }
      return existing
    }
    if (!allowedTransitions[existing.orderStatus].includes(input.orderStatus)) {
      throw new HttpError(409, `Order status cannot change from ${existing.orderStatus} to ${input.orderStatus}.`)
    }
    if (fulfillmentStatusesRequiringPayment.has(input.orderStatus) && existing.paymentStatus !== PaymentStatus.PAID) {
      throw new HttpError(409, 'Payment must be confirmed before the order can move through fulfilment.')
    }

    const orderUpdate = await transaction.order.updateMany({
      where: { id: existing.id, orderStatus: existing.orderStatus },
      data: {
        orderStatus: input.orderStatus,
        ...(input.orderStatus === OrderStatus.CANCELLED
          ? {
              cancellationReason: input.note ?? existing.cancellationReason,
              cancelledAt: existing.cancelledAt ?? new Date(),
            }
          : {}),
        ...(input.orderStatus === OrderStatus.CANCELLED && existing.stockDeductedAt && !existing.stockRestoredAt
          ? { stockRestoredAt: new Date() }
          : {}),
      },
    })
    if (orderUpdate.count !== 1) {
      throw new HttpError(409, 'The order changed while it was being updated. Please try again.')
    }

    const order = await transaction.order.findUniqueOrThrow({ where: { id: existing.id } })
    await transaction.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: existing.orderStatus,
        newStatus: input.orderStatus,
        changedBy: adminId,
        note: input.note ?? null,
      },
    })

    if (input.orderStatus === OrderStatus.CANCELLED && existing.stockDeductedAt && !existing.stockRestoredAt) {
      for (const item of existing.orderItems) {
        await restoreStock(transaction, {
          productId: item.productId,
          productOptionId: item.productOptionId ?? null,
          quantity: item.quantity,
          orderId: order.id,
          orderNumber: order.orderNumber,
        })
      }
    }

    return {
      ...order,
      customerName: existing.customerName,
      email: existing.email,
    }
  }, { timeout: 30000 })

  void notifyOrderStatusChanged({
    orderNumber: updated.orderNumber,
    customerName: updated.customerName,
    customerEmail: updated.email,
    orderStatus: updated.orderStatus,
  }).catch((error: unknown) => console.error('Order status email failed', error))

  return getAdminOrder(orderNumber)
}