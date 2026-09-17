import { FulfillmentMethod, QuoteRequestStatus, Prisma } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { resolveCheckoutDelivery } from './checkout.delivery.js'
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
  acceptedAt: Date | null
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
 * The delivery facts an order created from a quotation snapshots. Without an
 * admin override the fee and zone are resolved from the customer's delivery
 * location at checkout, exactly like a normal checkout order.
 */
export type OrderDeliverySnapshot = {
  fee: Prisma.Decimal
  zoneId: string | null
  zoneName: string | null
  areaId: string | null
  areaName: string | null
  cityName: string
  stateName: string | null
  minDays: number | null
  maxDays: number | null
}

/**
 * Re-derives the order line items and subtotal exclusively from the stored
 * quotation snapshot. The quote is authoritative, so a mismatch between these
 * totals and the persisted quoted values indicates data corruption and aborts
 * the conversion. The stored total must equal subtotal plus the stored
 * delivery fee (where the fee may legitimately be null, meaning the delivery
 * fee is resolved at checkout). The order's actual delivery fee is decided
 * separately by resolveOrderDeliveryFee.
 */
export function deriveQuoteOrderItems(current: QuoteSnapshot): {
  orderItems: DerivedOrderFinances['orderItems']
  subtotal: Prisma.Decimal
} {
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
  const quotedDeliveryFee = current.deliveryFee ?? new Prisma.Decimal(0)
  const expectedTotal = subtotal.add(quotedDeliveryFee)

  if (!subtotal.equals(current.quotedSubtotal) || !expectedTotal.equals(current.quotedTotal)) {
    throw new HttpError(409, 'The quotation totals could not be verified. Please contact the store to correct this.')
  }

  return { orderItems, subtotal }
}

/**
 * Decides the delivery fee (and zone snapshot) for an order created from a
 * quotation. An admin override locks the fee in place. Without an override,
 * the fee is resolved from the customer's delivery location via the
 * authoritative State -> City -> Area -> DeliveryZone mapping, applying the
 * zone's free-delivery threshold against the quoted subtotal — the same
 * pricing a normal checkout order receives.
 */
export async function resolveOrderDeliveryFee(
  transaction: Prisma.TransactionClient,
  ctx: {
    fulfillmentMethod: FulfillmentMethod
    overrideFee: Prisma.Decimal | null
    subtotal: Prisma.Decimal
    location: { areaId?: string; cityId?: string; cityName?: string; stateId?: string }
  },
): Promise<OrderDeliverySnapshot> {
  const { fulfillmentMethod, overrideFee, subtotal, location } = ctx

  const empty = (fee: Prisma.Decimal): OrderDeliverySnapshot => ({
    fee,
    zoneId: null,
    zoneName: null,
    areaId: null,
    areaName: null,
    cityName: '',
    stateName: null,
    minDays: null,
    maxDays: null,
  })

  if (fulfillmentMethod === FulfillmentMethod.PICKUP) {
    if (overrideFee !== null && overrideFee.gt(0)) {
      throw new HttpError(400, 'A pickup quotation cannot include a delivery fee.')
    }
    return empty(new Prisma.Decimal(0))
  }

  if (overrideFee !== null) {
    return { ...empty(overrideFee), cityName: location.cityName?.trim() ?? '' }
  }

  const resolved = await resolveCheckoutDelivery(transaction, location)
  if (!resolved.zone) {
    throw new HttpError(
      400,
      'We could not find a delivery option for this location. Please choose another city or select pickup.',
    )
  }
  if (!resolved.zone.isActive) {
    throw new HttpError(409, 'Delivery is not currently available for this location. Please choose another location.')
  }

  const fee = resolved.zone.freeDeliveryThreshold !== null && subtotal.gte(resolved.zone.freeDeliveryThreshold)
    ? new Prisma.Decimal(0)
    : resolved.zone.fee

  return {
    fee,
    zoneId: resolved.zone.id,
    // The zone itself is identified by the cities/areas it covers, so the
    // snapshot stores the customer's resolved city instead, matching checkout.
    zoneName: (resolved.cityName ?? '').trim() || null,
    areaId: resolved.area?.id ?? null,
    areaName: resolved.area?.name ?? null,
    cityName: resolved.cityName ?? '',
    stateName: resolved.stateName ?? null,
    minDays: resolved.zone.minDeliveryDays ?? null,
    maxDays: resolved.zone.maxDeliveryDays ?? null,
  }
}