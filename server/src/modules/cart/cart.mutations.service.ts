import { ShoppingMode } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { CartItemInput, CustomerCartResponse } from './cart.types.js'
import { toCartResponse } from './cart.serializer.js'
import { cartInclude } from './cart.serializer.js'
import {
  assertFulfillment,
  findCartLine,
  findCartWithItems,
  getOrCreateCart,
  upsertCustomerCart,
} from './cart.primitives.js'
import { findFulfillmentContext } from './cart.fulfillment.js'

export async function addCustomerCartItem(
  userId: string,
  mode: ShoppingMode,
  item: CartItemInput,
): Promise<CustomerCartResponse> {
  return prisma.$transaction(async (transaction) => {
    const product = await findFulfillmentContext(transaction, {
      productId: item.productId,
      productOptionId: item.productOptionId,
      wholesalePackageId: item.wholesalePackageId,
    })
    if (!product) throw new HttpError(404, 'Product no longer exists or is unavailable.')
    if (item.productOptionId && !product.option) {
      throw new HttpError(404, 'Product option no longer exists or is unavailable.')
    }
    assertFulfillment(product, mode, item.quantity)

    const cart = await upsertCustomerCart(transaction, userId, mode)
    const existing = await findCartLine(transaction, cart.id, item.productId, item.productOptionId, item.wholesalePackageId)

    if (existing) {
      const nextQuantity = existing.quantity + item.quantity
      if (nextQuantity > 1000) throw new HttpError(400, 'Cart quantity cannot exceed 1000.')
      assertFulfillment(product, mode, nextQuantity)
      await transaction.customerCartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQuantity },
      })
    } else {
      await transaction.customerCartItem.create({
        data: {
          cartId: cart.id,
          productId: item.productId,
          productOptionId: item.productOptionId,
          wholesalePackageId: item.wholesalePackageId,
          quantity: item.quantity,
        },
      })
    }

    return findCartWithItems(transaction, cart.id)
  }, { timeout: 15000 }).then(toCartResponse)
}

export async function updateCustomerCartItem(
  userId: string,
  mode: ShoppingMode,
  cartItemId: string,
  quantity: number,
): Promise<CustomerCartResponse> {
  return prisma.$transaction(async (transaction) => {
    const item = await transaction.customerCartItem.findFirst({
      where: { id: cartItemId, cart: { userId, mode } },
      select: { id: true, cartId: true, productId: true, productOptionId: true, wholesalePackageId: true },
    })
    if (!item) throw new HttpError(404, 'Cart item not found.')
    const product = await findFulfillmentContext(transaction, {
      productId: item.productId,
      productOptionId: item.productOptionId,
      wholesalePackageId: item.wholesalePackageId,
    })
    assertFulfillment(product, mode, quantity)

    await transaction.customerCartItem.update({
      where: { id: item.id },
      data: { quantity },
    })
    return findCartWithItems(transaction, item.cartId)
  }, { timeout: 15000 }).then(toCartResponse)
}

export async function removeCustomerCartItem(
  userId: string,
  mode: ShoppingMode,
  cartItemId: string,
): Promise<CustomerCartResponse> {
  return prisma.$transaction(async (transaction) => {
    const result = await transaction.customerCartItem.deleteMany({
      where: { id: cartItemId, cart: { userId, mode } },
    })
    if (result.count !== 1) throw new HttpError(404, 'Cart item not found.')
    return transaction.customerCart.findUniqueOrThrow({
      where: { userId_mode: { userId, mode } },
      include: cartInclude,
    })
  }, { timeout: 15000 }).then(toCartResponse)
}

export async function clearCustomerCart(userId: string, mode: ShoppingMode): Promise<CustomerCartResponse> {
  const cart = await prisma.customerCart.upsert({
    where: { userId_mode: { userId, mode } },
    create: { userId, mode },
    update: {},
    include: cartInclude,
  })
  if (cart.items.length === 0) return toCartResponse(cart)

  await prisma.customerCartItem.deleteMany({ where: { cartId: cart.id } })
  return toCartResponse(await getOrCreateCart(userId, mode))
}
