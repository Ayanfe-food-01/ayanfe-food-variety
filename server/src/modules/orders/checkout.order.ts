import { FulfillmentMethod, OrderStatus, PaymentMethod, PaymentStatus, Prisma, ShoppingMode } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { hashGuestOrderAccessToken } from '../../utils/guestOrderAccess.js'
import { resolveCheckoutDelivery } from './checkout.delivery.js'
import { nextOrderNumber, orderInclude } from './order.mapper.js'
import type { OrderWithItems } from './order.mapper.js'
import type { CheckoutInput } from './order.types.js'
import { zoneCoverageLabel } from '../delivery-zones/delivery-zone-label.js'
import type { CheckoutCartItem, CheckoutOrderItem, CheckoutPaymentSettings } from './checkout.cart.js'

export interface CreateCheckoutOrderContext {
  input: CheckoutInput
  user: { id: string; email: string } | null
  isWholesale: boolean
  cartId: string | null
  cartItems: CheckoutCartItem[]
  orderItems: CheckoutOrderItem[]
  subtotal: Prisma.Decimal
  paymentSettings: CheckoutPaymentSettings | null
}

/**
 * Resolves the delivery option (when the order is a delivery) and creates the
 * Order row atomically with its line items, status history and payment
 * snapshot. Shopping context, prices and the delivery fee are all
 * server-authoritative at this point.
 */
export async function createCheckoutOrder(
  transaction: Prisma.TransactionClient,
  context: CreateCheckoutOrderContext,
): Promise<OrderWithItems> {
  const { input, user, isWholesale, cartId, cartItems, orderItems, subtotal, paymentSettings } = context

  // Delivery is zone-based and never per-product. The delivery fee is
  // authoritative: the server resolves the active DeliveryZone that serves the
  // selected city (via the City -> DeliveryZoneCity mapping) and applies the
  // server-computed subtotal against the zone's free-delivery threshold. The
  // fee, name and threshold are never taken from the client. A previously
  // selected deliveryZoneId is honoured only as a fallback when the city is not
  // (yet) mapped, keeping older clients working.
  let deliveryZoneId: string | null = null
  let deliveryZoneName: string | null = null
  let deliveryMinDays: number | null = null
  let deliveryMaxDays: number | null = null
  let deliveryFee = new Prisma.Decimal(0)
  let deliveryCityName = input.city?.trim() ?? ''
  let deliveryStateName: string | null = null
  let deliveryAreaId: string | null = null
  let deliveryAreaName: string | null = null
  if (input.fulfillmentMethod === FulfillmentMethod.DELIVERY) {
    const resolved = await resolveCheckoutDelivery(transaction, {
      areaId: input.areaId,
      cityId: input.cityId,
      cityName: input.city?.trim(),
      stateId: input.stateId,
    })
    let zone = resolved.zone

    // The deliveryZoneId fallback is honoured only for legacy clients that do
    // not send an areaId/cityId yet. New-style requests must resolve through
    // the server-authoritative mapping so a client cannot pick an arbitrary
    // cheaper zone by replaying a stored zone id.
    if (!zone && !input.areaId && !input.cityId && input.deliveryZoneId) {
      const fallback = await transaction.deliveryZone.findUnique({
        where: { id: input.deliveryZoneId },
        select: {
          id: true,
          fee: true,
          freeDeliveryThreshold: true,
          minDeliveryDays: true,
          maxDeliveryDays: true,
          isActive: true,
          deliveryZoneCities: { select: { city: { select: { name: true } } } },
          deliveryZoneAreas: { select: { area: { select: { name: true, city: { select: { name: true } } } } } },
        },
      })
      zone = fallback
        ? {
          ...fallback,
          label: zoneCoverageLabel(fallback),
        }
        : null
    }

    if (!zone) {
      throw new HttpError(
        400,
        'We could not find a delivery option for this location. Please choose another city or select pickup.',
      )
    }
    if (!zone.isActive) {
      throw new HttpError(409, 'Delivery is not currently available for this location. Please choose another location.')
    }
    deliveryZoneId = zone.id
    deliveryZoneName = zone.label
    deliveryMinDays = zone.minDeliveryDays ?? null
    deliveryMaxDays = zone.maxDeliveryDays ?? null
    if (zone.freeDeliveryThreshold !== null && subtotal.gte(zone.freeDeliveryThreshold)) {
      deliveryFee = new Prisma.Decimal(0)
    } else {
      deliveryFee = zone.fee
    }
    deliveryCityName = resolved.cityName ?? deliveryCityName
    deliveryStateName = resolved.stateName ?? deliveryStateName
    deliveryAreaId = resolved.area?.id ?? null
    deliveryAreaName = resolved.area?.name ?? null
  }

  const order = await transaction.order.create({
    data: {
      checkoutKey: input.checkoutKey,
      orderNumber: await nextOrderNumber(transaction),
      guestAccessTokenHash: user ? null : hashGuestOrderAccessToken(input.guestAccessToken!),
      userId: user?.id ?? null,
      customerName: input.customerName,
      phone: input.phone,
      email: user?.email ?? input.email,
      fulfillmentMethod: input.fulfillmentMethod,
      shoppingMode: isWholesale ? ShoppingMode.WHOLESALE : ShoppingMode.RETAIL,
      deliveryAddress: input.deliveryAddress ?? '',
      city: deliveryCityName,
      state: deliveryStateName,
      deliveryAreaId,
      deliveryAreaName,
      note: input.deliveryInstructions ?? null,
      subtotal,
      deliveryZoneId,
      deliveryZoneName,
      deliveryMinDays,
      deliveryMaxDays,
      deliveryFee,
      total: subtotal.add(deliveryFee),
      paymentMethod: input.paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      orderStatus: OrderStatus.ORDER_PLACED,
      orderItems: { create: orderItems },
      statusHistory: {
        create: {
          previousStatus: null,
          newStatus: OrderStatus.ORDER_PLACED,
          changedBy: user?.id ?? null,
        },
      },
      ...(paymentSettings && input.paymentMethod === PaymentMethod.BANK_TRANSFER
        ? {
          paymentSnapshot: {
            create: {
              paymentMethod: paymentSettings.paymentMethod,
              bankName: paymentSettings.bankName,
              accountName: paymentSettings.accountName,
              accountNumber: paymentSettings.accountNumber,
              instructions: paymentSettings.instructions,
            },
          },
        }
        : {}),
      // Gateway orders keep their source cart rows until the payment is
      // confirmed, so an abandoned/failed checkout never silently empties the
      // cart. The rows are removed atomically on successful verification.
      ...(input.paymentMethod === PaymentMethod.PAYSTACK && cartId
        ? {
          paymentCartItemIds: cartItems.flatMap((item) => item.id ? [item.id] : []),
        }
        : {}),
    },
    include: orderInclude,
  })

  return order
}