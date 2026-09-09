import { Prisma, ShoppingMode } from '@prisma/client'
import type { CustomerCartResponse } from './cart.types.js'
import { calculateDiscountedPrice } from '../products/product.pricing.js'
import { wholesaleAvailableCartons } from '../products/wholesale.package.js'

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
        },
      },
      wholesalePackage: {
        select: {
          id: true,
          productOptionId: true,
          name: true,
          unitsPerPackage: true,
          price: true,
          isActive: true,
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
  if (mode === ShoppingMode.WHOLESALE && item.wholesalePackage) {
    return item.wholesalePackage.price
  }
  return retailLineUnitPrice(item)
}

export const lineStockQuantity = (item: CartLinePayload): number =>
  item.productOption ? item.productOption.stockQuantity : item.product.stockQuantity

export const lineMinQuantity = (item: CartLinePayload, mode: ShoppingMode): number => {
  if (mode === ShoppingMode.WHOLESALE && item.wholesalePackage) return 1
  return 1
}

export function toCartResponse(cart: CartPayload): CustomerCartResponse {
  let subtotal = new Prisma.Decimal(0)
  let totalQuantity = 0
  const deliveryFee = 0

  const items = cart.items.map((item) => {
    const option = item.productOption
    const pkg = item.wholesalePackage
    const isWholesaleLine = cart.mode === ShoppingMode.WHOLESALE && pkg

    // A wholesale line is priced per complete package (cartons); the browser
    // never supplies a price. Availability is expressed in whole packages
    // floor(stockUnits / unitsPerPackage).
    const unitPrice = isWholesaleLine ? pkg.price : lineUnitPrice(item, cart.mode)
    // A size-linked package is fulfilled from that size's stock; a product-level
    // package (no unit/size) from the product's own stock.
    const wholesaleUnitsOnHand = isWholesaleLine && pkg.productOptionId
      ? (item.productOption?.stockQuantity ?? 0)
      : item.product.stockQuantity
    const stockQuantity = isWholesaleLine
      ? wholesaleAvailableCartons(wholesaleUnitsOnHand, pkg.unitsPerPackage)
      : lineStockQuantity(item)
    const minQuantity = isWholesaleLine ? 1 : lineMinQuantity(item, cart.mode)
    const itemSubtotal = unitPrice.mul(item.quantity)
    const isProductActive = item.product.isActive && item.product.category.isActive
    const isOptionActive = option ? option.isActive : true
    const isPackageActive = pkg ? pkg.isActive : true
    const isActive = isProductActive && isOptionActive && isPackageActive
    const canUpdateQuantity = isActive && stockQuantity > 0
    const isAvailable = isActive && stockQuantity >= item.quantity && stockQuantity > 0
    const availabilityMessage = !isActive
      ? option
        ? `The ${option.label} option is no longer available.`
        : pkg
          ? `The ${pkg.name} package is no longer available.`
          : 'This product is no longer available.'
      : stockQuantity === 0
        ? option
          ? `The ${option.label} option is out of stock.`
          : pkg
            ? 'This package is out of stock.'
            : 'This product is out of stock.'
        : stockQuantity < item.quantity
          ? option
            ? `Only ${stockQuantity} unit(s) of the ${option.label} option are currently available.`
            : pkg
              ? `Only ${stockQuantity} package(s) are currently available.`
              : `Only ${stockQuantity} unit(s) are currently available.`
          : null

    subtotal = subtotal.add(itemSubtotal)
    totalQuantity += item.quantity

    return {
      id: item.id,
      productId: item.product.id,
      productOptionId: option?.id ?? null,
      productOptionLabel: option?.label ?? null,
      wholesalePackageId: pkg?.id ?? null,
      wholesalePackageName: pkg?.name ?? null,
      wholesaleUnitsPerPackage: pkg?.unitsPerPackage ?? null,
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
