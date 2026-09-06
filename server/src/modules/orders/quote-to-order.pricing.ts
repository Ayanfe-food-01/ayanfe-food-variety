import { FulfillmentMethod, QuoteRequestStatus, Prisma } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import type { ShoppingMode } from '@prisma/client'

export type QuoteOrderItem = {
  productId: string
  productName: string
  productOptionId: string | null
  productOptionLabel: string | null
  quotedUnitPrice: Prisma.Decimal | null
  quantity: number
}

export type QuoteSnapshot = {
  id: string
  quoteNumber: string
  customerName: string
  customerPhone: string
  status: QuoteRequestStatus
  fulfillmentMethod: FulfillmentMethod | null
  shoppingMode: ShoppingMode | null
  deliveryFee: Prisma.Decimal | null
  quotedAt: Date | null
  quotedSubtotal: Prisma.Decimal | null
  quotedTotal: Prisma.Decimal | null
  items: QuoteOrderItem[]
}

export type DerivedOrderFinances = {
  orderItems: Array<{
    productId: string
    productName: string
    productOptionId: string | null
    productOptionLabel: string | null
    unitPrice: Prisma.Decimal
    quantity: number
    subtotal: Prisma.Decimal
    deliveryFee: Prisma.Decimal
  }>
  subtotal: Prisma.Decimal
  deliveryFee: Prisma.Decimal
  total: Prisma.Decimal
}

/**
 * Re-derives order finances exclusively from the stored quotation snapshot.
 * The quote is authoritative, so any mismatch between these totals and the
 * persisted quoted values indicates data corruption and aborts the conversion.
 */
export function deriveOrderFinances(
  current: QuoteSnapshot,
  fulfillmentMethod: FulfillmentMethod,
): DerivedOrderFinances {
  if (current.quotedAt === null || current.quotedSubtotal === null || current.quotedTotal === null || current.items.length === 0) {
    throw new HttpError(409, 'The quotation is not complete.')
  }
  if (current.items.some((item) => item.quotedUnitPrice === null)) {
    throw new HttpError(409, 'The quotation is missing a quoted price for one or more items.')
  }

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

  if (!subtotal.equals(current.quotedSubtotal) || !total.equals(current.quotedTotal)) {
    throw new HttpError(409, 'The quotation totals could not be verified. Please contact the store to correct this.')
  }

  return { orderItems, subtotal, deliveryFee, total }
}