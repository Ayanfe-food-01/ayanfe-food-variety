import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { CartItemInput, CustomerCartResponse } from './cart.types.js'
import { calculateDiscountedPrice } from '../products/product.pricing.js'

const cartInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          unit: true,
          price: true,
          discountType: true,
          discountValue: true,
          deliveryFee: true,
          image: true,
          isActive: true,
          stockQuantity: true,
          category: { select: { isActive: true } },
        },
      },
      productOption: {
        select: {
          id: true,
          label: true,
          price: true,
          stockQuantity: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.CustomerCartInclude

type CartPayload = Prisma.CustomerCartGetPayload<{ include: typeof cartInclude }>

type CartLinePayload = CartPayload['items'][number]

const lineUnitPrice = (item: CartLinePayload): Prisma.Decimal => {
  if (!item.productOption) {
    return calculateDiscountedPrice(
      item.product.price,
      item.product.discountType,
      item.product.discountValue,
    )
  }
  return item.productOption.price
}

const lineStockQuantity = (item: CartLinePayload): number =>
  item.productOption ? item.productOption.stockQuantity : item.product.stockQuantity

function toCartResponse(cart: CartPayload): CustomerCartResponse {
  let subtotal = new Prisma.Decimal(0)
  let deliveryFee = new Prisma.Decimal(0)
  let totalQuantity = 0

  const items = cart.items.map((item) => {
    const option = item.productOption
    const unitPrice = lineUnitPrice(item)
    const stockQuantity = lineStockQuantity(item)
    const itemSubtotal = unitPrice.mul(item.quantity)
    const itemDeliveryFee = item.product.deliveryFee.mul(item.quantity)
    const isProductActive = item.product.isActive && item.product.category.isActive
    const isOptionActive = option ? option.isActive : true
    const isActive = isProductActive && isOptionActive
    const canUpdateQuantity = isActive && stockQuantity > 0
    const isAvailable = isActive && stockQuantity >= item.quantity && stockQuantity > 0
    const availabilityMessage = !isActive
      ? option
        ? `The ${option.label} option is no longer available.`
        : 'This product is no longer available.'
      : stockQuantity === 0
        ? option
          ? `The ${option.label} option is out of stock.`
          : 'This product is out of stock.'
        : stockQuantity < item.quantity
          ? option
            ? `Only ${stockQuantity} unit(s) of the ${option.label} option are currently available.`
            : `Only ${stockQuantity} unit(s) are currently available.`
          : null

    subtotal = subtotal.add(itemSubtotal)
    deliveryFee = deliveryFee.add(itemDeliveryFee)
    totalQuantity += item.quantity

    return {
      id: item.id,
      productId: item.product.id,
      productOptionId: option?.id ?? null,
      productOptionLabel: option?.label ?? null,
      name: item.product.name,
      unit: item.product.unit,
      price: unitPrice.toString(),
      originalPrice: unitPrice.toString(),
      discountType: option ? null : item.product.discountType,
      discountValue: option ? null : (item.product.discountValue?.toString() ?? null),
      deliveryFee: itemDeliveryFee.toString(),
      image: item.product.image,
      quantity: item.quantity,
      itemSubtotal: itemSubtotal.toString(),
      isAvailable,
      availableQuantity: stockQuantity,
      canUpdateQuantity,
      availabilityMessage,
    }
  })

  return {
    items,
    subtotal: subtotal.toString(),
    deliveryFee: deliveryFee.toString(),
    totalQuantity,
    canCheckout: items.length > 0 && items.every((item) =>
      item.isAvailable
      && Number.isInteger(item.quantity)
      && item.quantity >= 1
      && item.quantity <= 1000,
    ),
  }
}

interface FulfillmentOption {
  id: string
  label: string
  stockQuantity: number
  isActive: boolean
}

interface FulfillmentContext {
  id: string
  isActive: boolean
  stockQuantity: number
  category?: { isActive: boolean }
  option?: FulfillmentOption | null
}

const findFulfillmentContext = async (
  transaction: Prisma.TransactionClient,
  productId: string,
  productOptionId: string | null,
): Promise<FulfillmentContext | null> => {
  const baseSelect = {
    id: true,
    isActive: true,
    stockQuantity: true,
    category: { select: { isActive: true } },
  } as const

  if (!productOptionId) {
    return transaction.product.findUnique({
      where: { id: productId },
      select: baseSelect,
    })
  }

  const product = await transaction.product.findUnique({
    where: { id: productId },
    select: {
      ...baseSelect,
      options: {
        where: { id: productOptionId },
        select: { id: true, label: true, stockQuantity: true, isActive: true },
      },
    },
  })
  if (!product) return null

  const { options, ...context } = product
  return { ...context, option: options[0] ?? null }
}

const assertProductCanFulfill = (product: FulfillmentContext | null | undefined, quantity: number) => {
  if (!product) throw new HttpError(404, 'Product no longer exists or is unavailable.')
  if (product.option) {
    if (!product.option.isActive) {
      throw new HttpError(409, `The ${product.option.label} option is no longer available.`)
    }
    if (product.option.stockQuantity === 0) {
      throw new HttpError(409, `The ${product.option.label} option is out of stock.`)
    }
    if (quantity > product.option.stockQuantity) {
      throw new HttpError(
        409,
        `Insufficient stock. Only ${product.option.stockQuantity} unit(s) of the ${product.option.label} option are currently available.`,
      )
    }
    return
  }
  if (product.option === null) {
    throw new HttpError(404, 'Product option no longer exists or is unavailable.')
  }
  if (!product.isActive || product.category?.isActive === false || product.stockQuantity === 0) {
    throw new HttpError(409, 'Product is unavailable.')
  }
  if (quantity > product.stockQuantity) {
    throw new HttpError(409, `Insufficient stock. Only ${product.stockQuantity} unit(s) are currently available.`)
  }
}

const upsertCustomerCart = async (transaction: Prisma.TransactionClient, userId: string) =>
  transaction.customerCart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })

const findCartLine = (
  transaction: Prisma.TransactionClient,
  cartId: string,
  productId: string,
  productOptionId: string | null,
) => transaction.customerCartItem.findFirst({
  where: { cartId, productId, productOptionId: productOptionId ?? null },
})

const findCartWithItems = (transaction: Prisma.TransactionClient, cartId: string) =>
  transaction.customerCart.findUniqueOrThrow({
    where: { id: cartId },
    include: cartInclude,
  })

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

export async function getCustomerCart(userId: string): Promise<CustomerCartResponse> {
  return toCartResponse(await getCartForUser(userId))
}

export async function addCustomerCartItem(
  userId: string,
  item: CartItemInput,
): Promise<CustomerCartResponse> {
  return prisma.$transaction(async (transaction) => {
    const product = await findFulfillmentContext(transaction, item.productId, item.productOptionId)
    if (!product) throw new HttpError(404, 'Product no longer exists or is unavailable.')
    if (item.productOptionId && !product.option) {
      throw new HttpError(404, 'Product option no longer exists or is unavailable.')
    }
    assertProductCanFulfill(product, item.quantity)

    const cart = await upsertCustomerCart(transaction, userId)
    const existing = await findCartLine(transaction, cart.id, item.productId, item.productOptionId)

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
        data: {
          cartId: cart.id,
          productId: item.productId,
          productOptionId: item.productOptionId,
          quantity: item.quantity,
        },
      })
    }

    return findCartWithItems(transaction, cart.id)
  }, { timeout: 15000 }).then(toCartResponse)
}

export async function updateCustomerCartItem(
  userId: string,
  cartItemId: string,
  quantity: number,
): Promise<CustomerCartResponse> {
  return prisma.$transaction(async (transaction) => {
    const item = await transaction.customerCartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
      include: {
        product: { select: { isActive: true, stockQuantity: true, category: { select: { isActive: true } } } },
        productOption: { select: { id: true, label: true, stockQuantity: true, isActive: true } },
      },
    })
    if (!item) throw new HttpError(404, 'Cart item not found.')
    assertProductCanFulfill(
      {
        id: item.productId,
        isActive: item.product.isActive,
        stockQuantity: item.product.stockQuantity,
        category: item.product.category,
        option: item.productOption ?? null,
      },
      quantity,
    )

    await transaction.customerCartItem.update({
      where: { id: item.id },
      data: { quantity },
    })
    return findCartWithItems(transaction, item.cartId)
  }, { timeout: 15000 }).then(toCartResponse)
}

export async function removeCustomerCartItem(userId: string, cartItemId: string): Promise<CustomerCartResponse> {
  return prisma.$transaction(async (transaction) => {
    const result = await transaction.customerCartItem.deleteMany({
      where: { id: cartItemId, cart: { userId } },
    })
    if (result.count !== 1) throw new HttpError(404, 'Cart item not found.')
    return transaction.customerCart.findUniqueOrThrow({
      where: { userId },
      include: cartInclude,
    })
  }, { timeout: 15000 }).then(toCartResponse)
}

export async function clearCustomerCart(userId: string): Promise<CustomerCartResponse> {
  const cart = await prisma.customerCart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: cartInclude,
  })
  if (cart.items.length === 0) return toCartResponse(cart)

  await prisma.customerCartItem.deleteMany({ where: { cartId: cart.id } })
  return toCartResponse(await getCartForUser(userId))
}

export async function mergeCustomerCart(userId: string, items: CartItemInput[]): Promise<CustomerCartResponse> {
  return prisma.$transaction(async (transaction) => {
    const cart = await upsertCustomerCart(transaction, userId)
    for (const item of items) {
      const product = await findFulfillmentContext(transaction, item.productId, item.productOptionId)
      if (!product) throw new HttpError(404, 'Product no longer exists or is unavailable.')
      if (item.productOptionId && !product.option) {
        throw new HttpError(404, 'Product option no longer exists or is unavailable.')
      }
      const existing = await findCartLine(transaction, cart.id, item.productId, item.productOptionId)
      const nextQuantity = (existing?.quantity ?? 0) + item.quantity
      if (nextQuantity > 1000) throw new HttpError(400, 'Cart quantity cannot exceed 1000.')
      assertProductCanFulfill(product, nextQuantity)
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
            quantity: item.quantity,
          },
        })
      }
    }
    return findCartWithItems(transaction, cart.id)
  }, { timeout: 15000 }).then(toCartResponse)
}

export async function replaceCustomerCart(userId: string, items: CartItemInput[]): Promise<CustomerCartResponse> {
  return prisma.$transaction(async (transaction) => {
    const cart = await upsertCustomerCart(transaction, userId)
    for (const item of items) {
      const product = await findFulfillmentContext(transaction, item.productId, item.productOptionId)
      if (!product) throw new HttpError(404, 'Product no longer exists or is unavailable.')
      if (item.productOptionId && !product.option) {
        throw new HttpError(404, 'Product option no longer exists or is unavailable.')
      }
      assertProductCanFulfill(product, item.quantity)
    }
    await transaction.customerCartItem.deleteMany({ where: { cartId: cart.id } })
    if (items.length > 0) {
      await transaction.customerCartItem.createMany({
        data: items.map((item) => ({
          cartId: cart.id,
          productId: item.productId,
          productOptionId: item.productOptionId,
          quantity: item.quantity,
        })),
      })
    }
    return findCartWithItems(transaction, cart.id)
  }, { timeout: 15000 }).then(toCartResponse)
}