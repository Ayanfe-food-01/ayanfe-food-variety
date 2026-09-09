import { ShoppingMode } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { CartItemInput, CustomerCartResponse } from './cart.types.js'
import { toCartResponse } from './cart.serializer.js'
import {
  assertFulfillment,
  findCartLine,
  findCartWithItems,
  upsertCustomerCart,
} from './cart.primitives.js'
import { findFulfillmentContext } from './cart.fulfillment.js'

export async function mergeCustomerCart(
  userId: string,
  mode: ShoppingMode,
  items: CartItemInput[],
): Promise<CustomerCartResponse> {
  return prisma.$transaction(async (transaction) => {
    const cart = await upsertCustomerCart(transaction, userId, mode)
    for (const item of items) {
      const product = await findFulfillmentContext(transaction, {
        productId: item.productId,
        productOptionId: item.productOptionId,
        wholesalePackageId: item.wholesalePackageId,
      })
      if (!product) throw new HttpError(404, 'Product no longer exists or is unavailable.')
      if (item.productOptionId && !product.option) {
        throw new HttpError(404, 'Product option no longer exists or is unavailable.')
      }
      const existing = await findCartLine(transaction, cart.id, item.productId, item.productOptionId, item.wholesalePackageId)
      const nextQuantity = (existing?.quantity ?? 0) + item.quantity
      if (nextQuantity > 1000) throw new HttpError(400, 'Cart quantity cannot exceed 1000.')
      assertFulfillment(product, mode, nextQuantity)
      if (existing) {
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
    }
    return findCartWithItems(transaction, cart.id)
  }, { timeout: 15000 }).then(toCartResponse)
}

export async function replaceCustomerCart(
  userId: string,
  mode: ShoppingMode,
  items: CartItemInput[],
): Promise<CustomerCartResponse> {
  return prisma.$transaction(async (transaction) => {
    const cart = await upsertCustomerCart(transaction, userId, mode)
    for (const item of items) {
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
    }
    await transaction.customerCartItem.deleteMany({ where: { cartId: cart.id } })
    if (items.length > 0) {
      await transaction.customerCartItem.createMany({
        data: items.map((item) => ({
          cartId: cart.id,
          productId: item.productId,
          productOptionId: item.productOptionId,
          wholesalePackageId: item.wholesalePackageId,
          quantity: item.quantity,
        })),
      })
    }
    return findCartWithItems(transaction, cart.id)
  }, { timeout: 15000 }).then(toCartResponse)
}