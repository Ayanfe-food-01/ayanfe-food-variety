import { AdminNotificationType, FulfillmentMethod, Prisma, OrderStatus, PaymentMethod, PaymentStatus, QuoteRequestStatus, ShoppingMode } from '@prisma/client'
import { prisma, isTransientDatabaseError } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import { hashGuestOrderAccessToken } from '../../utils/guestOrderAccess.js'
import type {
  CheckoutInput,
  ConvertQuoteToOrderInput,
  GuestOrderResponse,
  OrderItemResponse,
  OrderResponse,
  CustomerPaymentSubmissionResponse,
} from './order.types.js'
import { notifyOrderCreated, notifyOrderStatusChanged } from './order.email.js'
import { deductStock, restoreStock } from '../inventory/inventory.service.js'
import { calculateDiscountedPrice } from '../products/product.pricing.js'
import { assertWholesaleOrderable, wholesaleUnitPriceFromOption } from '../products/wholesale.pricing.js'
import { createAdminNotification } from '../notifications/notification.service.js'
import { isOnlinePaymentEnabled } from '../payments/payment.provider.js'

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    orderItems: {
      include: {
        product: {
          select: {
            id: true
            slug: true
            image: true
          }
        }
      }
    }
    paymentSubmissions: {
      select: {
        id: true
        senderName: true
        transactionReference: true
        amount: true
        transferredAt: true
        proofUrl: true
        status: true
         reviewNote: true
        reviewedAt: true
        createdAt: true
      }
      orderBy: {
        createdAt: 'desc'
      }
    }
    paymentSnapshot: {
      select: {
        paymentMethod: true
        bankName: true
        accountName: true
        accountNumber: true
        instructions: true
      }
    }
    statusHistory: {
      orderBy: {
        createdAt: 'asc'
      }
      select: {
        previousStatus: true
        newStatus: true
        createdAt: true
      }
    }
    quoteRequest: {
      select: {
        quoteNumber: true
      }
    }
  }
}>

const toPaymentSubmissionResponse = (
  submission: OrderWithItems['paymentSubmissions'][number],
): CustomerPaymentSubmissionResponse => ({
  id: submission.id,
  senderName: submission.senderName,
  transactionReference: submission.transactionReference,
  amount: submission.amount.toString(),
  transferredAt: submission.transferredAt.toISOString(),
  proofUrl: submission.proofUrl,
  status: submission.status,
  reviewNote: submission.reviewNote,
  reviewedAt: submission.reviewedAt?.toISOString() ?? null,
  createdAt: submission.createdAt.toISOString(),
})

const toOrderResponse = (order: OrderWithItems): OrderResponse => {
  const latestPayment = order.paymentSubmissions[0]
  const paymentStatus = order.paymentStatus === PaymentStatus.PAID
    ? 'PAID'
    : latestPayment?.status === 'PENDING'
      ? 'PENDING'
      : order.paymentStatus === PaymentStatus.FAILED || latestPayment?.status === 'REJECTED'
        ? 'REJECTED'
        : 'PENDING'

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    quoteNumber: order.quoteRequest?.quoteNumber ?? null,
    customerName: order.customerName,
    phone: order.phone,
    whatsapp: order.whatsapp,
    fulfillmentMethod: order.fulfillmentMethod,
    email: order.email,
    deliveryAddress: order.deliveryAddress,
    city: order.city,
    note: order.note,
    orderType: order.shoppingMode,
    subtotal: order.subtotal.toString(),
    deliveryFee: order.deliveryFee.toString(),
    total: order.total.toString(),
    paymentMethod: order.paymentMethod,
    paymentStatus,
    paymentConfirmedAt: order.paymentConfirmedAt?.toISOString() ?? null,
    orderStatus: order.orderStatus,
    cancellationReason: order.cancellationReason,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    orderItems: order.orderItems.map(
      (item): OrderItemResponse => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productOptionId: item.productOptionId,
        productOptionLabel: item.productOptionLabel,
        unitPrice: item.unitPrice.toString(),
        quantity: item.quantity,
        subtotal: item.subtotal.toString(),
         deliveryFee: item.deliveryFee.toString(),
        product: item.product,
      }),
    ),
    paymentSubmissions: order.paymentSubmissions.map(toPaymentSubmissionResponse),
    payment: order.paymentSnapshot,
    statusHistory: order.statusHistory.map((history) => ({
      previousStatus: history.previousStatus,
      newStatus: history.newStatus,
      createdAt: history.createdAt.toISOString(),
    })),
  }
}

const orderInclude = {
  orderItems: {
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          image: true,
        },
      },
    },
  },
  paymentSubmissions: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      senderName: true,
      transactionReference: true,
      amount: true,
      transferredAt: true,
      proofUrl: true,
      status: true,
       reviewNote: true,
      reviewedAt: true,
      createdAt: true,
    },
  },
  paymentSnapshot: {
    select: {
      paymentMethod: true,
      bankName: true,
      accountName: true,
      accountNumber: true,
      instructions: true,
    },
  },
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      previousStatus: true,
      newStatus: true,
      createdAt: true,
    },
  },
  quoteRequest: {
    select: {
      quoteNumber: true,
    },
  },
} satisfies Prisma.OrderInclude

const nextOrderNumber = async (transaction: Prisma.TransactionClient): Promise<string> => {
  const result = await transaction.$queryRaw<Array<{ nextval: bigint }>>(
    Prisma.sql`SELECT nextval('orders_order_number_seq')`,
  )
  const sequence = Number(result[0]?.nextval)
  return `AFV-${new Date().getUTCFullYear()}-${String(sequence).padStart(6, '0')}`
}

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
        deliveryFee: true,
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
       const deliveryFee = input.fulfillmentMethod === FulfillmentMethod.DELIVERY
         ? product.deliveryFee.mul(item.quantity)
         : new Prisma.Decimal(0)
      return {
        productId: product.id,
        productName: product.name,
        productOptionId: option?.id ?? null,
        productOptionLabel: option?.label ?? null,
         unitPrice,
        quantity: item.quantity,
        subtotal,
        deliveryFee,
      }
    })
    const subtotal = orderItems.reduce(
      (total, item) => total.add(item.subtotal),
      new Prisma.Decimal(0),
    )
    const totalDeliveryFee = orderItems.reduce(
      (total, item) => total.add(item.deliveryFee),
      new Prisma.Decimal(0),
    )
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
         city: input.city ?? '',
         note: input.deliveryInstructions ?? null,
        subtotal,
        deliveryFee: totalDeliveryFee,
        total: subtotal.add(totalDeliveryFee),
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

      const unavailableMessages = current.items.flatMap((item) => {
        const product = productsById.get(item.productId)
        if (!product) return [`Product ${item.productId} no longer exists.`]
        if (!product.isActive || !product.category.isActive) return [`${item.productName} is no longer available.`]
        if (item.productOptionId) {
          const option = productOptionsById.get(item.productOptionId)
          if (!option) return [`${item.productName}: the requested option no longer exists.`]
          if (option.productId !== item.productId) return [`${item.productName}: the requested option is invalid.`]
          if (!option.isActive) return [`${item.productName} (${option.label}) is no longer available.`]
          if (option.stockQuantity < item.quantity) {
            return [`${item.productName} (${option.label}): only ${option.stockQuantity} unit(s) currently available.`]
          }
        } else if (product.stockQuantity < item.quantity) {
          return [`${item.productName}: only ${product.stockQuantity} unit(s) currently available.`]
        }
        return []
      })
      if (unavailableMessages.length > 0) {
        throw new HttpError(409, unavailableMessages.join(' '))
      }

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

const normalizeGuestPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  return digits.startsWith('234') && digits.length === 13
    ? `0${digits.slice(3)}`
    : digits.startsWith('00234') && digits.length === 15
      ? `0${digits.slice(5)}`
      : digits
}

const normalizeGuestContact = (value: string): { email: string; phone: string } => {
  const trimmed = value.trim().toLowerCase()

  return { email: trimmed, phone: normalizeGuestPhone(trimmed) }
}

const toGuestOrderResponse = (order: OrderWithItems): GuestOrderResponse => {
  const fullResponse = toOrderResponse(order)
  const verifiedPayment = order.paymentSubmissions.find((submission) => submission.status === 'VERIFIED')

  return {
    orderNumber: fullResponse.orderNumber,
    fulfillmentMethod: fullResponse.fulfillmentMethod,
    orderType: fullResponse.orderType,
    deliveryAddress: fullResponse.deliveryAddress,
    city: fullResponse.city,
    subtotal: fullResponse.subtotal,
    deliveryFee: fullResponse.deliveryFee,
    total: fullResponse.total,
    paymentStatus: fullResponse.paymentStatus,
    paymentConfirmedAt: fullResponse.paymentConfirmedAt
      ?? verifiedPayment?.reviewedAt?.toISOString()
      ?? null,
    orderStatus: fullResponse.orderStatus,
    createdAt: fullResponse.createdAt,
    orderItems: fullResponse.orderItems.map((item) => ({
      id: item.id,
      productName: item.productName,
      productOptionLabel: item.productOptionLabel,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
      deliveryFee: item.deliveryFee,
      image: item.product.image,
    })),
    statusHistory: fullResponse.statusHistory,
  }
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