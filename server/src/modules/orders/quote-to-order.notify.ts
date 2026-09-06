import { notifyOrderCreated } from './order.email.js'
import type { OrderWithItems } from './order.mapper.js'

export async function sendQuoteConversionConfirmation(order: OrderWithItems): Promise<void> {
  await notifyOrderCreated({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.email,
    phone: order.phone,
    fulfillmentMethod: order.fulfillmentMethod,
    deliveryAddress: order.deliveryAddress,
    city: order.city,
    note: order.note,
    subtotal: order.subtotal.toString(),
    deliveryFee: order.deliveryFee.toString(),
    total: order.total.toString(),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt.toISOString(),
    items: order.orderItems.map((item) => ({
      name: item.productName,
      optionLabel: item.productOptionLabel,
      unitPrice: item.unitPrice.toString(),
      quantity: item.quantity,
      subtotal: item.subtotal.toString(),
    })),
  })
}