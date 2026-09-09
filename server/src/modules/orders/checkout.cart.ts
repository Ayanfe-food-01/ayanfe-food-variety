import { HttpError } from '../../utils/http.js'
import { PaymentMethod, Prisma, ShoppingMode, type ProductDiscountType } from '@prisma/client'
import { calculateDiscountedPrice } from '../products/product.pricing.js'
import { assertWholesalePackageActive, wholesaleAvailableCartons } from '../products/wholesale.package.js'
import { isOnlinePaymentEnabled } from '../payments/payment.provider.js'
import type { CheckoutInput } from './order.types.js'
import type { WholesalePackageShape } from '../products/wholesale.package.js'

export interface CheckoutCartItem {
  id?: string
  productId: string
  productOptionId?: string | null
  wholesalePackageId?: string | null
  quantity: number
  createdAt: Date
}

export interface CheckoutProduct {
  id: string
  name: string
  price: Prisma.Decimal
  discountType: ProductDiscountType | null
  discountValue: Prisma.Decimal | null
  isActive: boolean
  stockQuantity: number
  category: { isActive: boolean }
}

export interface CheckoutProductOption {
  id: string
  productId: string
  label: string
  price: Prisma.Decimal
  stockQuantity: number
  isActive: boolean
}

export interface CheckoutOrderItem {
  productId: string
  productName: string
  productOptionId: string | null
  productOptionLabel: string | null
  wholesalePackageId: string | null
  wholesalePackageName: string | null
  wholesaleUnitsPerPackage: number | null
  unitPrice: Prisma.Decimal
  quantity: number
  subtotal: Prisma.Decimal
  deliveryFee: Prisma.Decimal
}

export interface CheckoutPaymentSettings {
  paymentMethod: PaymentMethod
  bankName: string
  accountName: string
  accountNumber: string
  instructions: string
  isActive: boolean
}

export interface ResolvedCheckoutCart {
  cartId: string | null
  cartItems: CheckoutCartItem[]
  productsById: Map<string, CheckoutProduct>
  orderItems: CheckoutOrderItem[]
  subtotal: Prisma.Decimal
  isWholesale: boolean
  paymentSettings: CheckoutPaymentSettings | null
}

/**
 * Resolves the cart-facing facts a checkout needs before an order can be
 * created: the source cart rows (database cart or guest line items), the
 * payment method availability snapshot, and the server-authoritative product,
 * option and wholesale package prices/stock. Cart prices are never used as
 * order authorities; everything money-related is re-derived from the database
 * here. A wholesale line must carry a selected package and its price is always
 * the package's price (cost of one complete carton/case) taken from the DB.
 */
export async function resolveCheckoutCart(
  transaction: Prisma.TransactionClient,
  user: { id: string; shoppingMode: ShoppingMode } | null,
  input: CheckoutInput,
): Promise<ResolvedCheckoutCart> {
  let cartId: string | null = null
  let cartItems: CheckoutCartItem[]
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
          select: {
            id: true,
            productId: true,
            productOptionId: true,
            wholesalePackageId: true,
            quantity: true,
            createdAt: true,
          },
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
      wholesalePackageId: null,
      quantity: item.quantity,
      createdAt: new Date(index),
    }))
    if (cartItems.length === 0) throw new HttpError(400, 'Your cart is empty.')
  }

  // For bank transfer the stored payment settings are the availability and
  // belongs-in-snapshot source. For gateway (Paystack) orders there is no bank
  // row to snapshot; availability is the provider configuration.
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

  const invalidQuantity = cartItems.find(
    (item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000,
  )
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
      },
    })
    : []
  const productOptionsById = new Map(productOptions.map((option) => [option.id, option]))

  // Wholesale packages are resolved server-side too. A wholesale order line's
  // price is the package price and its quantity is the number of packages.
  const wholesalePackageIds = cartItems.flatMap((item) => (item.wholesalePackageId ? [item.wholesalePackageId] : []))
  const wholesalePackages = wholesalePackageIds.length > 0
    ? await transaction.wholesalePackage.findMany({
      where: { id: { in: wholesalePackageIds } },
      select: {
        id: true,
        productId: true,
        name: true,
        unitsPerPackage: true,
        price: true,
        isActive: true,
      },
    })
    : []
  const wholesalePackagesById = new Map(wholesalePackages.map((pkg) => [pkg.id, pkg]))

  const unavailableMessages = cartItems.flatMap((item) => {
    const product = productsById.get(item.productId)
    if (!product) return [`Product ${item.productId} no longer exists.`]
    if (!product.isActive || !product.category.isActive) return [`${product.name} is no longer available.`]
    if (item.wholesalePackageId) {
      const pkg = wholesalePackagesById.get(item.wholesalePackageId)
      if (!pkg) return [`${product.name}: the selected wholesale package no longer exists.`]
      if (pkg.productId !== product.id) return [`${product.name}: the selected wholesale package is invalid.`]
      if (!pkg.isActive) return [`${product.name} (${pkg.name}): this package is no longer available.`]
      if (!Number.isInteger(pkg.unitsPerPackage) || pkg.unitsPerPackage < 1) {
        return [`${product.name} (${pkg.name}): this package is not valid.`]
      }
      const available = wholesaleAvailableCartons(product.stockQuantity, pkg.unitsPerPackage)
      if (available < item.quantity) {
        return [`${product.name} (${pkg.name}): only ${available} package(s) currently available.`]
      }
      return []
    }
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
  // is never taken from the browser. Wholesale orders must carry a valid,
  // active package on every line; prices are re-derived from the DB.
  const isWholesale = user?.shoppingMode === ShoppingMode.WHOLESALE
  if (isWholesale) {
    for (const item of cartItems) {
      if (!item.wholesalePackageId) {
        throw new HttpError(400, 'Select a wholesale package (e.g. a carton) for every wholesale item.')
      }
      const pkg = wholesalePackagesById.get(item.wholesalePackageId)
      const product = productsById.get(item.productId)
      assertWholesalePackageActive(pkg as WholesalePackageShape | undefined)
      if (pkg && product && pkg.productId !== product.id) {
        throw new HttpError(409, 'One or more selected wholesale packages are invalid.')
      }
    }
  }

  const orderItems = cartItems.map((item) => {
    const product = productsById.get(item.productId)
    if (!product) throw new HttpError(409, 'One or more products are no longer available.')
    const option = item.productOptionId ? productOptionsById.get(item.productOptionId) : null
    if (option && option.productId !== product.id) {
      throw new HttpError(409, 'One or more selected options are invalid.')
    }
    const pkg = isWholesale && item.wholesalePackageId ? wholesalePackagesById.get(item.wholesalePackageId) : null

    let unitPrice: Prisma.Decimal
    if (pkg) {
      unitPrice = pkg.price
    } else if (option) {
      unitPrice = option.price
    } else {
      unitPrice = calculateDiscountedPrice(
        product.price,
        product.discountType,
        product.discountValue,
      )
    }
    const subtotal = unitPrice.mul(item.quantity)
    return {
      productId: product.id,
      productName: product.name,
      productOptionId: option?.id ?? null,
      productOptionLabel: option?.label ?? null,
      wholesalePackageId: pkg?.id ?? null,
      wholesalePackageName: pkg?.name ?? null,
      wholesaleUnitsPerPackage: pkg?.unitsPerPackage ?? null,
      unitPrice,
      quantity: item.quantity,
      subtotal,
      deliveryFee: new Prisma.Decimal(0),
    }
  })
  const subtotal = orderItems.reduce(
    (total, item) => total.add(item.subtotal),
    new Prisma.Decimal(0),
  )

  return { cartId, cartItems, productsById, orderItems, subtotal, isWholesale, paymentSettings }
}
