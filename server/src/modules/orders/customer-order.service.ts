import { AdminNotificationType, OrderStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { hashGuestOrderAccessToken } from '../../utils/guestOrderAccess.js'
import type { GuestOrderResponse, OrderResponse } from './order.types.js'
import { notifyOrderStatusChanged } from './order.email.js'
import { restoreStock } from '../inventory/inventory.service.js'
import { createAdminNotification } from '../notifications/notification.service.js'
import {
  normalizeGuestContact,
  normalizeGuestPhone,
  orderInclude,
  toGuestOrderResponse,
  toOrderResponse,
} from './order.mapper.js'

export async function listCustomerOrders(userId: string): Promise<OrderResponse[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: orderInclude,
  })
  return orders.map(toOrderResponse)
}

export async function getCustomerOrder(userId: string, id: string): Promise<OrderResponse | null> {
  const order = await prisma.order.findFirst({
    where: { id, userId },
    include: orderInclude,
  })
  return order ? toOrderResponse(order) : null
}

export async function getCustomerOrderByNumber(userId: string, orderNumber: string): Promise<OrderResponse | null> {
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: orderInclude,
  })
  return order ? toOrderResponse(order) : null
}

export async function getGuestOrderByNumber(orderNumber: string, accessToken: string): Promise<OrderResponse | null> {
  const order = await prisma.order.findFirst({
    where: {
      orderNumber,
      guestAccessTokenHash: hashGuestOrderAccessToken(accessToken),
      userId: null,
    },
    include: orderInclude,
  })
  return order ? toOrderResponse(order) : null
}

export async function getGuestOrderForTracking(orderNumber: string, contact: string): Promise<GuestOrderResponse | null> {
  const order = await prisma.order.findFirst({
    where: {
      orderNumber,
      userId: null,
    },
    include: orderInclude,
  })

  if (!order) return null

  const normalizedContact = normalizeGuestContact(contact)
  const emailMatches = Boolean(order.email && order.email.trim().toLowerCase() === normalizedContact.email)
  const phoneMatches = normalizeGuestPhone(order.phone) === normalizedContact.phone

  return emailMatches || phoneMatches ? toGuestOrderResponse(order) : null
}

const customerCancellableStatuses = new Set<OrderStatus>([
  OrderStatus.ORDER_PLACED,
  OrderStatus.PROCESSING,
])

export async function cancelCustomerOrder(
  userId: string,
  orderNumber: string,
  reason?: string,
): Promise<OrderResponse> {
  const result = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.order.findFirst({
      where: { orderNumber, userId },
      include: {
        orderItems: { select: { productId: true, productOptionId: true, quantity: true } },
      },
    })

    if (!existing) throw new HttpError(404, 'Order not found.')
    if (!customerCancellableStatuses.has(existing.orderStatus)) {
      throw new HttpError(409, 'This order can no longer be cancelled.')
    }

    const cancelledAt = new Date()
    const updated = await transaction.order.updateMany({
      where: {
        id: existing.id,
        userId,
        orderStatus: { in: [...customerCancellableStatuses] },
      },
      data: {
        orderStatus: OrderStatus.CANCELLED,
        cancellationReason: reason ?? null,
        cancelledAt,
        ...(existing.stockDeductedAt && !existing.stockRestoredAt
          ? { stockRestoredAt: cancelledAt }
          : {}),
      },
    })

    if (updated.count !== 1) {
      throw new HttpError(409, 'The order changed while it was being cancelled. Please try again.')
    }

    const order = await transaction.order.findUniqueOrThrow({
      where: { id: existing.id },
      include: orderInclude,
    })

    await transaction.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: existing.orderStatus,
        newStatus: OrderStatus.CANCELLED,
        changedBy: userId,
        note: reason ?? 'Cancelled by customer.',
      },
    })

    if (existing.stockDeductedAt && !existing.stockRestoredAt) {
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

    await createAdminNotification(transaction, {
      type: AdminNotificationType.CUSTOMER_ORDER_CANCELLED,
      eventKey: `customer-order-cancelled:${order.id}`,
      title: 'Customer cancelled an order',
      message: `${order.customerName} cancelled order ${order.orderNumber}.`,
      href: `/admin/orders/${order.orderNumber}`,
    })

    return order
  }, { timeout: 30000 })

  void notifyOrderStatusChanged({
    orderNumber: result.orderNumber,
    customerName: result.customerName,
    customerEmail: result.email,
    orderStatus: result.orderStatus,
  }).catch((error: unknown) => console.error('Order cancellation email failed', error))

  return toOrderResponse(result)
}

export async function getOrderById(id: string): Promise<OrderResponse | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  })

  return order ? toOrderResponse(order) : null
}
