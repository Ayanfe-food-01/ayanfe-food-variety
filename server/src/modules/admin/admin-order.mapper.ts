import { FulfillmentMethod, OrderStatus, PaymentStatus, Prisma, ShoppingMode } from '@prisma/client'
import type { AdminOrderListItem } from './admin.types.js'

export const toOrderListItem = (order: {
  orderNumber: string
  customerName: string
  email: string | null
  phone: string
  fulfillmentMethod: FulfillmentMethod
  shoppingMode: ShoppingMode
  total: Prisma.Decimal
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  archivedAt: Date | null
  createdAt: Date
}): AdminOrderListItem => ({
  orderNumber: order.orderNumber,
  customerName: order.customerName,
  email: order.email,
  phone: order.phone,
  fulfillmentMethod: order.fulfillmentMethod,
  shoppingMode: order.shoppingMode,
  total: order.total.toString(),
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  archivedAt: order.archivedAt?.toISOString() ?? null,
  createdAt: order.createdAt.toISOString(),
})