import {
  AdminNotificationType,
  FulfillmentMethod,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  QuoteRequestStatus,
  ShoppingMode,
} from '@prisma/client'
import type { PaymentSettings } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { deductStock } from '../inventory/inventory.service.js'
import { createAdminNotification } from '../notifications/notification.service.js'
import { nextOrderNumber, orderInclude } from './order.mapper.js'
import type { OrderWithItems } from './order.mapper.js'
import type { ConvertQuoteToOrderInput } from './order.types.js'
import type { DerivedOrderFinances, QuoteSnapshot } from './quote-to-order.pricing.js'

export type CreateConvertedOrderParams = {
  userId: string
  user: { email: string }
  current: QuoteSnapshot
  input: ConvertQuoteToOrderInput
  fulfillmentMethod: FulfillmentMethod
  finances: DerivedOrderFinances
  paymentSettings: PaymentSettings
}

export async function createConvertedOrder(
  transaction: Prisma.TransactionClient,
  params: CreateConvertedOrderParams,
): Promise<OrderWithItems> {
  const { userId, user, current, input, fulfillmentMethod, finances, paymentSettings } = params
  const { orderItems, subtotal, deliveryFee, total } = finances

  const order = await transaction.order.create({
    data: {
      orderNumber: await nextOrderNumber(transaction),
      userId,
      quoteRequestId: current.id,
      customerName: current.customerName,
      phone: current.customerPhone,
      email: user.email,
      whatsapp: input.whatsapp ?? null,
      fulfillmentMethod,
      shoppingMode: current.shoppingMode ?? ShoppingMode.RETAIL,
      deliveryAddress: fulfillmentMethod === FulfillmentMethod.DELIVERY ? input.deliveryAddress!.trim() : '',
      city: fulfillmentMethod === FulfillmentMethod.DELIVERY ? input.city!.trim() : '',
      note: input.deliveryInstructions ?? null,
      subtotal,
      deliveryFee,
      total,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentStatus: PaymentStatus.PENDING,
      orderStatus: OrderStatus.ORDER_PLACED,
      orderItems: { create: orderItems },
      statusHistory: {
        create: {
          previousStatus: null,
          newStatus: OrderStatus.ORDER_PLACED,
          changedBy: userId,
        },
      },
      paymentSnapshot: {
        create: {
          paymentMethod: paymentSettings.paymentMethod,
          bankName: paymentSettings.bankName,
          accountName: paymentSettings.accountName,
          accountNumber: paymentSettings.accountNumber,
          instructions: paymentSettings.instructions,
        },
      },
    },
    include: orderInclude,
  })

  for (const item of [...current.items].sort((left, right) => left.productId.localeCompare(right.productId))) {
    try {
      await deductStock(transaction, {
        productId: item.productId,
        productOptionId: item.productOptionId ?? null,
        quantity: item.quantity,
        orderId: order.id,
        orderNumber: order.orderNumber,
      })
    } catch (error: unknown) {
      if (error instanceof HttpError && (error.statusCode === 404 || error.statusCode === 409)) {
        throw new HttpError(error.statusCode, `${item.productName}: ${error.message}`)
      }
      throw error
    }
  }
  await transaction.order.update({
    where: { id: order.id },
    data: { stockDeductedAt: new Date() },
  })

  // Completes the quotation and links it to the order. Converting a quote
  // that was never explicitly accepted records the acceptance implicitly.
  await transaction.quoteRequest.update({
    where: { id: current.id },
    data: {
      status: QuoteRequestStatus.COMPLETED,
      convertedOrderId: order.id,
      ...(current.status === QuoteRequestStatus.QUOTED ? { acceptedAt: new Date() } : {}),
    },
  })

  await createAdminNotification(transaction, {
    type: AdminNotificationType.NEW_ORDER,
    eventKey: `new-order:${order.id}`,
    title: 'New order placed from a quotation',
    message: `${current.customerName} converted quotation ${current.quoteNumber} into order ${order.orderNumber}.`,
    href: `/admin/orders/${order.orderNumber}`,
  })

  return order
}