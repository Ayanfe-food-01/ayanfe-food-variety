import { Prisma, ShoppingMode } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { cartInclude, type CartPayload } from './cart.serializer.js'
import { assertProductCanFulfill, assertWholesaleFulfillment } from './cart.fulfillment.js'
import type { FulfillmentContext } from './cart.fulfillment.js'

export const upsertCustomerCart = async (
  transaction: Prisma.TransactionClient,
  userId: string,
  mode: ShoppingMode,
) =>
  transaction.customerCart.upsert({
    where: { userId_mode: { userId, mode } },
    create: { userId, mode },
    update: {},
  })

export const findCartLine = (
  transaction: Prisma.TransactionClient,
  cartId: string,
  productId: string,
  productOptionId: string | null,
  wholesalePackageId: string | null,
) => transaction.customerCartItem.findFirst({
  where: { cartId, productId, productOptionId: productOptionId ?? null, wholesalePackageId: wholesalePackageId ?? null },
})

export const findCartWithItems = (transaction: Prisma.TransactionClient, cartId: string) =>
  transaction.customerCart.findUniqueOrThrow({
    where: { id: cartId },
    include: cartInclude,
  })

export const getOrCreateCart = async (userId: string, mode: ShoppingMode): Promise<CartPayload> =>
  prisma.customerCart.upsert({
    where: { userId_mode: { userId, mode } },
    create: { userId, mode },
    update: {},
    include: cartInclude,
  })

export const assertFulfillment = (product: FulfillmentContext | null | undefined, mode: ShoppingMode, quantity: number) => {
  if (mode === ShoppingMode.WHOLESALE) {
    assertWholesaleFulfillment(product, mode, quantity)
    return
  }
  assertProductCanFulfill(product, quantity)
}