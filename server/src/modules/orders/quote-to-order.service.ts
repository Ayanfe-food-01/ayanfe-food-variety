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
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { ConvertQuoteToOrderInput, OrderResponse } from './order.types.js'
import { notifyOrderCreated } from './order.email.js'
import { deductStock } from '../inventory/inventory.service.js'
import { createAdminNotification } from '../notifications/notification.service.js'
import { nextOrderNumber, orderInclude, toOrderResponse } from './order.mapper.js'
import type { OrderWithItems } from './order.mapper.js'
import { assertItemsAvailable } from './quote-to-order.availability.js'

const QUOTE_CONVERTIBLE_STATUSES: QuoteRequestStatus[] = [QuoteRequestStatus.ACCEPTED, QuoteRequestStatus.QUOTED]

/**
 * Converts an accepted (or standing) quotation into a normal customer order,
 * atomically and idempotently.
 *
 * The quotation snapshot is the single source of truth: order content, unit
 * prices, subtotal and delivery fee all come from the stored quotation, never
 * from the request body or today's catalog prices. The quote row is locked for
 * the duration so racing submissions serialize; a repeated or concurrent
 * conversion simply returns the already-created order. Once converted the
 * quotation is marked COMPLETED and linked to the order in both directions,
 * and stock is deducted through the same inventory path used by checkout.
 *
 * Nothing is produced unless the whole transaction succeeds: an unavailable or
 * out-of-stock item aborts the conversion and leaves the quotation unchanged.
 */
export async function convertQuoteRequestToOrder(
  userId: string,
  reference: string,
  input: ConvertQuoteToOrderInput,
): Promise<{ order: OrderResponse; created: boolean }> {
  let result: { order: OrderWithItems; created: boolean } | null = null

  try {
    result = await prisma.$transaction(async (transaction) => {
      const quote = await transaction.quoteRequest.findFirst({
        where: { quoteNumber: reference, userId },
        select: { id: true },
      })
      if (!quote) throw new HttpError(404, 'Quote request not found.')

      // Serialize concurrent conversions of the same quotation. Because the row
      // stays locked until commit, any competing conversion either commits here
      // first (and we observe its order below) or waits for this transaction.
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM quote_requests WHERE id = ${quote.id}::uuid FOR UPDATE`,
      )

      const current = await transaction.quoteRequest.findUnique({
        where: { id: quote.id },
        include: {
          items: { orderBy: { id: 'asc' as const } },
          convertedOrder: { select: { id: true } },
        },
      })
      if (!current) throw new HttpError(404, 'Quote request not found.')

      // Idempotency: an already-converted quotation resolves to its order.
      if (current.convertedOrderId) {
        const existingOrder = await transaction.order.findFirst({
          where: { id: current.convertedOrderId },
          include: orderInclude,
        })
        if (!existingOrder) throw new HttpError(409, 'The converted order could not be loaded.')
        return { order: existingOrder, created: false }
      }

      const user = userId
        ? await transaction.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true, emailVerified: true },
          })
        : null
      if (!user || user.role !== 'CUSTOMER' || !user.emailVerified) {
        throw new HttpError(403, 'A verified customer account is required.')
      }

      if (!QUOTE_CONVERTIBLE_STATUSES.includes(current.status)) {
        const message = current.status === QuoteRequestStatus.COMPLETED
          ? 'This quotation has already been completed.'
          : current.status === QuoteRequestStatus.CANCELLED
            ? 'This quotation was cancelled and cannot be converted into an order.'
            : 'This quotation must be prepared and accepted before it can be converted into an order.'
        throw new HttpError(409, message)
      }

      if (current.quotedAt === null || current.quotedSubtotal === null || current.quotedTotal === null || current.items.length === 0) {
        throw new HttpError(409, 'The quotation is not complete.')
      }
      if (current.items.some((item) => item.quotedUnitPrice === null)) {
        throw new HttpError(409, 'The quotation is missing a quoted price for one or more items.')
      }

      const fulfillmentMethod = current.fulfillmentMethod ?? FulfillmentMethod.PICKUP
      if (fulfillmentMethod === FulfillmentMethod.DELIVERY && (!input.deliveryAddress || !input.city)) {
        throw new HttpError(400, 'A delivery address and city are required for delivery orders.')
      }

      // Order finances are re-derived from the stored quotation prices only.
      const orderItems = current.items.map((item) => {
        const unitPrice = item.quotedUnitPrice!
        return {
          productId: item.productId,
          productName: item.productName,
          productOptionId: item.productOptionId,
          productOptionLabel: item.productOptionLabel,
          unitPrice,
          quantity: item.quantity,
          subtotal: unitPrice.mul(item.quantity),
          deliveryFee: new Prisma.Decimal(0),
        }
      })
      const subtotal = orderItems.reduce(
        (running, item) => running.add(item.subtotal),
        new Prisma.Decimal(0),
      )
      const deliveryFee = fulfillmentMethod === FulfillmentMethod.PICKUP
        ? new Prisma.Decimal(0)
        : (current.deliveryFee ?? new Prisma.Decimal(0))
      const total = subtotal.add(deliveryFee)

      // The stored snapshot is authoritative; any mismatch is data corruption.
      if (!subtotal.equals(current.quotedSubtotal) || !total.equals(current.quotedTotal)) {
        throw new HttpError(409, 'The quotation totals could not be verified. Please contact the store to correct this.')
      }

      // Availability mirrors the checkout validation for friendly messages;
      // deductStock below performs the authoritative, locked deduction.
      const productIds = current.items.map((item) => item.productId)
      const optionIds = current.items.flatMap((item) => (item.productOptionId ? [item.productOptionId] : []))
      const [products, productOptions] = await Promise.all([
        transaction.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            name: true,
            isActive: true,
            stockQuantity: true,
            category: { select: { isActive: true } },
          },
        }),
        optionIds.length > 0
          ? transaction.productOption.findMany({
              where: { id: { in: optionIds } },
              select: {
                id: true,
                productId: true,
                label: true,
                isActive: true,
                stockQuantity: true,
              },
            })
          : Promise.resolve([]),
      ])
      const productsById = new Map(products.map((product) => [product.id, product]))
      const productOptionsById = new Map(productOptions.map((option) => [option.id, option]))

      assertItemsAvailable(current.items, productsById, productOptionsById)

      const paymentSettings = await transaction.paymentSettings.findUnique({
        where: {
          singletonKey_paymentMethod: {
            singletonKey: 'default',
            paymentMethod: PaymentMethod.BANK_TRANSFER,
          },
        },
      })
      if (!paymentSettings || !paymentSettings.isActive) {
        throw new HttpError(400, 'The payment method is unavailable.')
      }

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
        message: `${order.customerName} converted quotation ${current.quoteNumber} into order ${order.orderNumber}.`,
        href: `/admin/orders/${order.orderNumber}`,
      })

      return { order, created: true }
    }, { timeout: 60000 })
  } catch (error: unknown) {
    // A unique quote-request reference can only mean a racing conversion won
    // the transaction; resolve to the order it created instead of failing.
    const quoteLinkConflict =
      error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2002'
      && String(error.meta?.target ?? '').includes('quote_request_id')
    if (!quoteLinkConflict) throw error

    const existingOrder = await prisma.order.findFirst({
      where: { quoteRequest: { quoteNumber: reference } },
      include: orderInclude,
    })
    if (!existingOrder) throw new HttpError(409, 'The quotation could not be converted. Please try again.')
    return { order: toOrderResponse(existingOrder), created: false }
  }

  if (!result) {
    throw new Error('Quote conversion did not produce an order.')
  }

  if (result.created) {
    void notifyOrderCreated({
      orderNumber: result.order.orderNumber,
      customerName: result.order.customerName,
      customerEmail: result.order.email,
      phone: result.order.phone,
      fulfillmentMethod: result.order.fulfillmentMethod,
      deliveryAddress: result.order.deliveryAddress,
      city: result.order.city,
      note: result.order.note,
      subtotal: result.order.subtotal.toString(),
      deliveryFee: result.order.deliveryFee.toString(),
      total: result.order.total.toString(),
      paymentMethod: result.order.paymentMethod,
      paymentStatus: result.order.paymentStatus,
      orderStatus: result.order.orderStatus,
      createdAt: result.order.createdAt.toISOString(),
      items: result.order.orderItems.map((item) => ({
        name: item.productName,
        optionLabel: item.productOptionLabel,
        unitPrice: item.unitPrice.toString(),
        quantity: item.quantity,
        subtotal: item.subtotal.toString(),
      })),
    }).catch((error: unknown) => console.error('Order confirmation email failed', error))
  }

  return { order: toOrderResponse(result.order), created: result.created }
}
