import {
  FulfillmentMethod,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  QuoteRequestStatus,
} from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { ConvertQuoteToOrderInput, OrderResponse } from './order.types.js'
import { orderInclude, toOrderResponse } from './order.mapper.js'
import type { OrderWithItems } from './order.mapper.js'
import { assertItemsAvailable } from './quote-to-order.availability.js'
import { sendQuoteConversionConfirmation } from './quote-to-order.notify.js'
import { deriveOrderFinances } from './quote-to-order.pricing.js'
import type { QuoteSnapshot } from './quote-to-order.pricing.js'
import { createConvertedOrder } from './quote-to-order.create.js'

const QUOTE_CONVERTIBLE_STATUSES: QuoteRequestStatus[] = [QuoteRequestStatus.ACCEPTED, QuoteRequestStatus.QUOTED]

// The quotation snapshot is the single source of truth: order content, unit
// prices, subtotal and delivery fee all come from the stored quotation, never
// from the request body or today's catalog prices. The quote row is locked for
// the duration so racing submissions serialize; a repeated or concurrent
// conversion simply returns the already-created order. Nothing is produced
// unless the whole transaction succeeds: an unavailable or out-of-stock item
// aborts the conversion and leaves the quotation unchanged.
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

      const fulfillmentMethod = current.fulfillmentMethod ?? FulfillmentMethod.PICKUP
      if (fulfillmentMethod === FulfillmentMethod.DELIVERY && (!input.deliveryAddress || !input.city)) {
        throw new HttpError(400, 'A delivery address and city are required for delivery orders.')
      }

      const finances = deriveOrderFinances(current as QuoteSnapshot, fulfillmentMethod)

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

      const order = await createConvertedOrder(transaction, {
        userId,
        user: { email: user.email },
        current: current as QuoteSnapshot,
        input,
        fulfillmentMethod,
        finances,
        paymentSettings,
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
    void sendQuoteConversionConfirmation(result.order).catch(
      (error: unknown) => console.error('Order confirmation email failed', error),
    )
  }

  return { order: toOrderResponse(result.order), created: result.created }
}