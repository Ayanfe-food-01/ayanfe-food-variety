import { Prisma, ShoppingMode } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { cartInclude, type CartPayload } from './cart.serializer.js'
import { assertProductCanFulfill, assertWholesaleFulfillment, findFulfillmentContext } from './cart.fulfillment.js'

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
) => transaction.customerCartItem.findFirst({
  where: { cartId, productId, productOptionId: productOptionId ?? null },
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

export const assertFulfillment = (product: Awaited<ReturnType<typeof findFulfillmentContext>>, mode: ShoppingMode, quantity: number) => {
  assertProductCanFulfill(product, quantity)
  assertWholesaleFulfillment(product, mode, quantity)
}