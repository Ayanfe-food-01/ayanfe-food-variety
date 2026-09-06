import { Prisma, ShoppingMode } from '@prisma/client'
import type { CustomerCartResponse } from './cart.types.js'
import { calculateDiscountedPrice } from '../products/product.pricing.js'
import { wholesaleUnitPriceFromOption } from '../products/wholesale.pricing.js'

export const cartInclude = {
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
          wholesaleMoq: true,
          wholesalePriceTiers: { orderBy: { minQuantity: 'asc' as const } },
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.CustomerCartInclude

export type CartPayload = Prisma.CustomerCartGetPayload<{ include: typeof cartInclude }>

export type CartLinePayload = CartPayload['items'][number]

const retailLineUnitPrice = (item: CartLinePayload): Prisma.Decimal => {
  if (!item.productOption) {
    return calculateDiscountedPrice(
      item.product.price,
      item.product.discountType,
      item.product.discountValue,
    )
  }
  return item.productOption.price
}

export const lineUnitPrice = (item: CartLinePayload, mode: ShoppingMode): Prisma.Decimal => {
  if (mode === ShoppingMode.WHOLESALE && item.productOption) {
    const wholesalePrice = wholesaleUnitPriceFromOption(item.productOption, item.quantity)
    if (wholesalePrice !== null) return wholesalePrice
  }
  return retailLineUnitPrice(item)
}

export const lineStockQuantity = (item: CartLinePayload): number =>
  item.productOption ? item.productOption.stockQuantity : item.product.stockQuantity

export const lineMinQuantity = (item: CartLinePayload, mode: ShoppingMode): number => {
  if (mode === ShoppingMode.WHOLESALE && item.productOption) {
    const { wholesaleMoq } = item.productOption
    if (wholesaleMoq !== null && wholesaleMoq > 1) return wholesaleMoq
  }
  return 1
}

export function toCartResponse(cart: CartPayload): CustomerCartResponse {
  let subtotal = new Prisma.Decimal(0)
  let totalQuantity = 0
  const deliveryFee = 0

  const items = cart.items.map((item) => {
    const option = item.productOption
    const unitPrice = lineUnitPrice(item, cart.mode)
    const stockQuantity = lineStockQuantity(item)
    const minQuantity = lineMinQuantity(item, cart.mode)
    const itemSubtotal = unitPrice.mul(item.quantity)
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
      deliveryFee: '0',
      image: item.product.image,
      quantity: item.quantity,
      minQuantity,
      itemSubtotal: itemSubtotal.toString(),
      isAvailable,
      availableQuantity: stockQuantity,
      canUpdateQuantity,
      availabilityMessage,
    }
  })

  return {
    mode: cart.mode,
    items,
    subtotal: subtotal.toString(),
    deliveryFee: '0',
    totalQuantity,
    canCheckout: items.length > 0 && items.every((item) =>
      item.isAvailable
      && Number.isInteger(item.quantity)
      && item.quantity >= item.minQuantity
      && item.quantity <= 1000,
    ),
  }
}