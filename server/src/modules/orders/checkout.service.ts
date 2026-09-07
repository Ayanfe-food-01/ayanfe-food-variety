import { Prisma } from '@prisma/client'
import { prisma, isTransientDatabaseError } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { hashGuestOrderAccessToken } from '../../utils/guestOrderAccess.js'
import { notifyOrderCreated } from './order.email.js'
import { orderInclude, toOrderResponse } from './order.mapper.js'
import type { OrderWithItems } from './order.mapper.js'
import type { CheckoutInput, OrderResponse } from './order.types.js'
import { resolveCheckoutCart } from './checkout.cart.js'
import { createCheckoutOrder } from './checkout.order.js'
import { completeCheckoutOrder } from './checkout.completion.js'

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
              : Boolean(
                input.guestAccessToken
                && existingOrder.guestAccessTokenHash === hashGuestOrderAccessToken(input.guestAccessToken),
              )
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

          const cart = await resolveCheckoutCart(transaction, user, input)
          const order = await createCheckoutOrder(transaction, {
            input,
            user,
            isWholesale: cart.isWholesale,
            cartId: cart.cartId,
            cartItems: cart.cartItems,
            orderItems: cart.orderItems,
            subtotal: cart.subtotal,
            paymentSettings: cart.paymentSettings,
          })
          await completeCheckoutOrder(transaction, {
            order,
            cartId: cart.cartId,
            cartItems: cart.cartItems,
            productsById: cart.productsById,
            paymentMethod: input.paymentMethod,
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
      : Boolean(
        existingOrder
        && input.guestAccessToken
        && existingOrder.guestAccessTokenHash === hashGuestOrderAccessToken(input.guestAccessToken),
      )
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