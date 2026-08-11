import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { CartItemInput, CustomerCartItemResponse } from './cart.types.js'

const cartInclude = {
  items: {
    include: {
      product: {
        select: { id: true, name: true, unit: true, price: true, image: true, isActive: true, stockQuantity: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.CustomerCartInclude

function toCartItems(cart: Prisma.CustomerCartGetPayload<{ include: typeof cartInclude }>): CustomerCartItemResponse[] {
  return cart.items
    .filter((item) => item.product.isActive)
    .map((item) => ({
      id: item.id,
      productId: item.product.id,
      name: item.product.name,
      unit: item.product.unit,
      price: item.product.price.toString(),
      image: item.product.image,
      quantity: item.quantity,
    }))
}

const assertProductCanFulfill = (
  product: { id: string; isActive: boolean; stockQuantity: number } | null | undefined,
  quantity: number,
) => {
  if (!product) throw new HttpError(404, 'Product no longer exists or is unavailable.')
  if (!product.isActive || product.stockQuantity === 0) {
    throw new HttpError(409, 'Product is unavailable.')
  }
  if (quantity > product.stockQuantity) {
    throw new HttpError(409, `Insufficient stock. Only ${product.stockQuantity} unit(s) are currently available.`)
  }
}

async function getCartForUser(userId: string) {
  return getOrCreateCart(userId)
}

async function getOrCreateCart(userId: string) {
  return prisma.customerCart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: cartInclude,
  })
}

export async function getCustomerCart(userId: string): Promise<CustomerCartItemResponse[]> {
  return toCartItems(await getCartForUser(userId))
}

export async function addCustomerCartItem(
  userId: string,
  item: CartItemInput,
): Promise<CustomerCartItemResponse[]> {
  return prisma.$transaction(async (transaction) => {
    const product = await transaction.product.findUnique({
      where: { id: item.productId },
      select: { id: true, isActive: true, stockQuantity: true },
    })
    assertProductCanFulfill(product, item.quantity)

    const cart = await transaction.customerCart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })
    const existing = await transaction.customerCartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
    })

    if (existing) {
      const nextQuantity = existing.quantity + item.quantity
      if (nextQuantity > 1000) throw new HttpError(400, 'Cart quantity cannot exceed 1000.')
      assertProductCanFulfill(product, nextQuantity)
      await transaction.customerCartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQuantity },
      })
    } else {
      await transaction.customerCartItem.create({
        data: { cartId: cart.id, productId: item.productId, quantity: item.quantity },
      })
    }

    return transaction.customerCart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude })
  }).then(toCartItems)
}

export async function updateCustomerCartItem(
  userId: string,
  cartItemId: string,
  quantity: number,
): Promise<CustomerCartItemResponse[]> {
  return prisma.$transaction(async (transaction) => {
    const item = await transaction.customerCartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
      include: { product: { select: { isActive: true, stockQuantity: true } } },
    })
    if (!item) throw new HttpError(404, 'Cart item not found.')
    assertProductCanFulfill({ id: item.productId, ...item.product }, quantity)

    await transaction.customerCartItem.update({
      where: { id: item.id },
      data: { quantity },
    })
    return transaction.customerCart.findUniqueOrThrow({
      where: { id: item.cartId },
      include: cartInclude,
    })
  }).then(toCartItems)
}

export async function removeCustomerCartItem(userId: string, cartItemId: string): Promise<void> {
  const result = await prisma.customerCartItem.deleteMany({
    where: { id: cartItemId, cart: { userId } },
  })
  if (result.count !== 1) throw new HttpError(404, 'Cart item not found.')
}

export async function clearCustomerCart(userId: string): Promise<void> {
  const cart = await prisma.customerCart.findUnique({ where: { userId }, select: { id: true } })
  if (!cart) return
  await prisma.customerCartItem.deleteMany({ where: { cartId: cart.id } })
}

export async function mergeCustomerCart(userId: string, items: CartItemInput[]): Promise<CustomerCartItemResponse[]> {
  return prisma.$transaction(async (transaction) => {
    const cart = await transaction.customerCart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })
    for (const item of items) {
      const product = await transaction.product.findUnique({
        where: { id: item.productId },
        select: { id: true, isActive: true, stockQuantity: true },
      })
      const existing = await transaction.customerCartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
      })
      const nextQuantity = (existing?.quantity ?? 0) + item.quantity
      assertProductCanFulfill(product, nextQuantity)
      if (nextQuantity > 1000) throw new HttpError(400, 'Cart quantity cannot exceed 1000.')
      if (existing) {
        await transaction.customerCartItem.update({
          where: { id: existing.id },
          data: { quantity: nextQuantity },
        })
      } else {
        await transaction.customerCartItem.create({
          data: { cartId: cart.id, productId: item.productId, quantity: item.quantity },
        })
      }
    }
    return transaction.customerCart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude })
  }).then(toCartItems)
}

export async function replaceCustomerCart(userId: string, items: CartItemInput[]): Promise<CustomerCartItemResponse[]> {
  return prisma.$transaction(async (transaction) => {
    const cart = await transaction.customerCart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })
    for (const item of items) {
      const product = await transaction.product.findUnique({
        where: { id: item.productId },
        select: { id: true, isActive: true, stockQuantity: true },
      })
      assertProductCanFulfill(product, item.quantity)
    }
    await transaction.customerCartItem.deleteMany({ where: { cartId: cart.id } })
    if (items.length > 0) {
      await transaction.customerCartItem.createMany({
        data: items.map((item) => ({ cartId: cart.id, productId: item.productId, quantity: item.quantity })),
      })
    }
    return transaction.customerCart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude })
  }).then(toCartItems)
}