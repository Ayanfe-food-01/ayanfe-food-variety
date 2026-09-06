import {
  AdminNotificationType,
  FulfillmentMethod,
  Prisma,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShoppingMode,
} from '@prisma/client'
import { prisma, isTransientDatabaseError } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { hashGuestOrderAccessToken } from '../../utils/guestOrderAccess.js'
import type { CheckoutInput, OrderResponse } from './order.types.js'
import { notifyOrderCreated } from './order.email.js'
import { deductStock } from '../inventory/inventory.service.js'
import { calculateDiscountedPrice } from '../products/product.pricing.js'
import { assertWholesaleOrderable, wholesaleUnitPriceFromOption } from '../products/wholesale.pricing.js'
import { createAdminNotification } from '../notifications/notification.service.js'
import { isOnlinePaymentEnabled } from '../payments/payment.provider.js'
import { zoneCoverageLabel } from '../delivery-zones/delivery-zone-label.js'
import { resolveCheckoutDelivery } from './checkout.delivery.js'
import { nextOrderNumber, orderInclude, toOrderResponse } from './order.mapper.js'
import type { OrderWithItems } from './order.mapper.js'

export async function checkoutCustomerCart(userId: string | null, input: CheckoutInput): Promise<OrderResponse> {
  if (!userId && !input.guestAccessToken) {
    throw new HttpError(401, 'Guest checkout access is required.')
  }

  let result: { order: OrderWithItems; created: boolean } | null = null
  // Checkout is the one write path that may safely retry a transient database
  // error: the checkout key is unique and checked at the start of the
  // transaction. If a previous attempt committed, the retry simply returns
  // that existing order instead of creating a duplicate; if it rolled back,
  // the retry runs cleanly. Only connection/load codes that vanish on a fresh
  // attempt are retried, and only once.
  const MAX_CHECKOUT_ATTEMPTS = 2
  try {
    for (let attempt = 1; attempt <= MAX_CHECKOUT_ATTEMPTS; attempt += 1) {
      try {
        result = await prisma.$transaction(async (transaction) => {
    const existingOrder = await transaction.order.findUnique({
      where: { checkoutKey: input.checkoutKey },
      include: orderInclude,
    })
    if (existingOrder) {
      const ownsExistingOrder = userId
        ? existingOrder.userId === userId
        : Boolean(input.guestAccessToken && existingOrder.guestAccessTokenHash === hashGuestOrderAccessToken(input.guestAccessToken))
      if (!ownsExistingOrder) {
        throw new HttpError(409, 'This checkout request cannot be reused.')
      }
      if (existingOrder.fulfillmentMethod !== input.fulfillmentMethod) {
        throw new HttpError(409, 'This checkout request was already completed with a different fulfillment method.')
      }
      return { order: existingOrder, created: false }
    }

    const user = userId
      ? await transaction.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, role: true, emailVerified: true, shoppingMode: true },
        })
      : null
    if (userId && (!user || user.role !== 'CUSTOMER' || !user.emailVerified)) {
      throw new HttpError(403, 'A verified customer account is required.')
    }

    let cartId: string | null = null
    let cartItems: Array<{ id?: string; productId: string; productOptionId?: string | null; quantity: number; createdAt: Date }>
    if (user) {
      const cartReference = await transaction.customerCart.findUnique({
        where: { userId_mode: { userId: user.id, mode: user.shoppingMode } },
        select: { id: true },
      })
      if (!cartReference) throw new HttpError(400, 'Your cart is empty.')

      // Serialize checkout against cart changes and then read the cart again.
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM customer_carts WHERE id = ${cartReference.id}::uuid FOR UPDATE`,
      )
      const cart = await transaction.customerCart.findUnique({
        where: { id: cartReference.id },
        include: {
          items: {
            select: { id: true, productId: true, productOptionId: true, quantity: true, createdAt: true },
            orderBy: { createdAt: 'asc' as const },
          },
        },
      })
      if (!cart || cart.items.length === 0) throw new HttpError(400, 'Your cart is empty.')
      cartId = cart.id
      cartItems = cart.items
    } else {
      cartItems = (input.cartItems ?? []).map((item, index) => ({
        productId: item.productId,
        productOptionId: item.productOptionId ?? null,
        quantity: item.quantity,
        createdAt: new Date(index),
      }))
      if (cartItems.length === 0) throw new HttpError(400, 'Your cart is empty.')
    }

    // For bank transfer the stored payment settings are the availability and
    // belongs-in-snapshot source. For gateway (Paystack) orders there is no
    // bank row to snapshot; availability is the provider configuration.
    const paymentSettings = input.paymentMethod === PaymentMethod.PAYSTACK
      ? null
      : await transaction.paymentSettings.findUnique({
          where: {
            singletonKey_paymentMethod: {
              singletonKey: 'default',
              paymentMethod: input.paymentMethod,
            },
          },
        })
    if (input.paymentMethod === PaymentMethod.PAYSTACK) {
      if (!isOnlinePaymentEnabled()) {
        throw new HttpError(400, 'Online payment is not available for this store.')
      }
    } else if (!paymentSettings || !paymentSettings.isActive) {
      throw new HttpError(400, 'The selected payment method is unavailable.')
    }

    const invalidQuantity = cartItems.find((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000)
    if (invalidQuantity) throw new HttpError(400, 'One or more cart quantities are invalid.')

    // Cart prices and product metadata are never used as order authorities.
    const products = await transaction.product.findMany({
      where: { id: { in: cartItems.map((item) => item.productId) } },
      select: {
        id: true,
        name: true,
        price: true,
         discountType: true,
         discountValue: true,
        isActive: true,
        stockQuantity: true,
        category: { select: { isActive: true } },
      },
    })
    const productsById = new Map(products.map((product) => [product.id, product]))

    // The selected product option is resolved from the database at checkout so
    // its price and stock are never taken from the browser or the cart.
    const productOptionIds = cartItems.flatMap((item) => (item.productOptionId ? [item.productOptionId] : []))
    const productOptions = productOptionIds.length > 0
      ? await transaction.productOption.findMany({
          where: { id: { in: productOptionIds } },
          select: {
            id: true,
            productId: true,
            label: true,
            price: true,
            stockQuantity: true,
            isActive: true,
            wholesaleMoq: true,
            wholesalePriceTiers: { orderBy: { minQuantity: 'asc' as const } },
          },
        })
      : []
    const productOptionsById = new Map(productOptions.map((option) => [option.id, option]))

    const unavailableMessages = cartItems.flatMap((item) => {
      const product = productsById.get(item.productId)
      if (!product) return [`Product ${item.productId} no longer exists.`]
      if (!product.isActive || !product.category.isActive) return [`${product.name} is no longer available.`]
      if (item.productOptionId) {
        const option = productOptionsById.get(item.productOptionId)
        if (!option) return [`${product.name}: the selected option no longer exists.`]
        if (option.productId !== product.id) return [`${product.name}: the selected option is invalid.`]
        if (!option.isActive) return [`${product.name} (${option.label}) is no longer available.`]
        if (option.stockQuantity < item.quantity) {
          return [`${product.name} (${option.label}): only ${option.stockQuantity} unit(s) currently available.`]
        }
      } else if (product.stockQuantity < item.quantity) {
        return [`${product.name}: only ${product.stockQuantity} unit(s) currently available.`]
      }
      return []
    })
    if (unavailableMessages.length > 0) {
      throw new HttpError(409, unavailableMessages.join(' '))
    }

    // An order's shopping mode is decided by the signed-in customer's mode and
    // is never taken from the browser. Wholesale prices and minimums are
    // re-validated against the database at order time.
    const isWholesale = user?.shoppingMode === ShoppingMode.WHOLESALE
    if (isWholesale) {
      for (const item of cartItems) {
        if (!item.productOptionId) continue
        const option = productOptionsById.get(item.productOptionId)
        if (option) assertWholesaleOrderable(option, item.quantity)
      }
    }

    const orderItems = cartItems.map((item) => {
      const product = productsById.get(item.productId)
      if (!product) throw new HttpError(409, 'One or more products are no longer available.')
      const option = item.productOptionId ? productOptionsById.get(item.productOptionId) : null
      if (option && option.productId !== product.id) {
        throw new HttpError(409, 'One or more selected options are invalid.')
      }
       const unitPrice = option
         ? (isWholesale
             ? (wholesaleUnitPriceFromOption(option, item.quantity) ?? option.price)
             : option.price)
         : calculateDiscountedPrice(
           product.price,
           product.discountType,
           product.discountValue,
         )
       const subtotal = unitPrice.mul(item.quantity)
      return {
        productId: product.id,
        productName: product.name,
        productOptionId: option?.id ?? null,
        productOptionLabel: option?.label ?? null,
         unitPrice,
        quantity: item.quantity,
        subtotal,
        deliveryFee: new Prisma.Decimal(0),
      }
    })
    const subtotal = orderItems.reduce(
      (total, item) => total.add(item.subtotal),
      new Prisma.Decimal(0),
    )

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

    for (const item of [...cartItems].sort((left, right) => left.productId.localeCompare(right.productId))) {
      const product = productsById.get(item.productId)
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
          throw new HttpError(error.statusCode, product ? `${product.name}: ${error.message}` : error.message)
        }
        throw error
      }
    }
    await transaction.order.update({
      where: { id: order.id },
      data: { stockDeductedAt: new Date() },
    })

    if (cartId && input.paymentMethod !== PaymentMethod.PAYSTACK) {
      await transaction.customerCartItem.deleteMany({
        where: {
          id: { in: cartItems.flatMap((item) => item.id ? [item.id] : []) },
          cartId,
        },
      })
    }
    await createAdminNotification(transaction, {
      type: AdminNotificationType.NEW_ORDER,
      eventKey: `new-order:${order.id}`,
      title: 'New order placed',
      message: `${order.customerName} placed order ${order.orderNumber}.`,
      href: `/admin/orders/${order.orderNumber}`,
    })
      return { order, created: true }
    }, { timeout: 60000 })
      break
    } catch (retryError: unknown) {
      if (attempt >= MAX_CHECKOUT_ATTEMPTS || !isTransientDatabaseError(retryError)) {
        throw retryError
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
    }
  }
  } catch (error: unknown) {
    const isCheckoutKeyConflict =
      error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2002'
      && String(error.meta?.target ?? '').includes('checkout_key')
    if (!isCheckoutKeyConflict) throw error

    const existingOrder = await prisma.order.findUnique({
      where: { checkoutKey: input.checkoutKey },
      include: orderInclude,
    })
    const ownsExistingOrder = userId
      ? existingOrder?.userId === userId
      : Boolean(existingOrder && input.guestAccessToken && existingOrder.guestAccessTokenHash === hashGuestOrderAccessToken(input.guestAccessToken))
    if (!existingOrder || !ownsExistingOrder) {
      throw new HttpError(409, 'This checkout request cannot be reused.')
    }
    return toOrderResponse(existingOrder)
  }

  if (!result) {
    throw new Error('Checkout did not produce an order.')
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

  return toOrderResponse(result.order)
}
