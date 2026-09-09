import { Prisma, ShoppingMode } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { wholesaleAvailableCartons } from '../products/wholesale.package.js'

export interface FulfillmentOption {
  id: string
  label: string
  stockQuantity: number
  isActive: boolean
}

// A wholesale package (carton/case) selected for a wholesale cart line. A
// package belongs to a specific unit/size (productOptionId when it is a size
// variant; null means the product's single unit).
export interface FulfillmentPackage {
  id: string
  productOptionId: string | null
  unitsPerPackage: number
  isActive: boolean
}

export interface FulfillmentContext {
  id: string
  isActive: boolean
  stockQuantity: number
  category?: { isActive: boolean }
  option?: FulfillmentOption | null
  wholesalePackage?: FulfillmentPackage | null
}

export interface FulfillmentLookup {
  productId: string
  productOptionId: string | null
  wholesalePackageId: string | null
}

const FULFILLMENT_OPTION_SELECT = {
  id: true,
  label: true,
  stockQuantity: true,
  isActive: true,
} as const

const FULFILLMENT_PACKAGE_SELECT = {
  id: true,
  productOptionId: true,
  unitsPerPackage: true,
  isActive: true,
} as const

export const findFulfillmentContext = async (
  transaction: Prisma.TransactionClient,
  lookup: FulfillmentLookup,
): Promise<FulfillmentContext | null> => {
  const baseSelect = {
    id: true,
    isActive: true,
    stockQuantity: true,
    category: { select: { isActive: true } },
  } as const

  if (!lookup.productOptionId && !lookup.wholesalePackageId) {
    return transaction.product.findUnique({ where: { id: lookup.productId }, select: baseSelect })
  }

  const product = await transaction.product.findUnique({
    where: { id: lookup.productId },
    select: {
      ...baseSelect,
      ...(lookup.productOptionId
        ? { options: { where: { id: lookup.productOptionId }, select: FULFILLMENT_OPTION_SELECT } }
        : {}),
      ...(lookup.wholesalePackageId
        ? { wholesalePackages: { where: { id: lookup.wholesalePackageId }, select: FULFILLMENT_PACKAGE_SELECT } }
        : {}),
    },
  })
  if (!product) return null

  const { options, wholesalePackages, ...context } = product as FulfillmentContext & {
    options?: FulfillmentOption[]
    wholesalePackages?: FulfillmentPackage[]
  }
  return {
    ...context,
    option: lookup.productOptionId ? options?.[0] ?? null : undefined,
    wholesalePackage: lookup.wholesalePackageId ? wholesalePackages?.[0] ?? null : undefined,
  }
}

export const assertProductCanFulfill = (product: FulfillmentContext | null | undefined, quantity: number) => {
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

export const assertWholesaleFulfillment = (product: FulfillmentContext | null | undefined, mode: ShoppingMode, quantity: number) => {
  if (mode !== ShoppingMode.WHOLESALE) return
  if (!product) throw new HttpError(404, 'Product no longer exists or is unavailable.')
  if (!product.isActive || product.category?.isActive === false) throw new HttpError(409, 'Product is unavailable.')

  const pkg = product.wholesalePackage
  if (!pkg) throw new HttpError(400, 'Select a wholesale package (e.g. a carton) for this product.')
  if (!pkg.isActive) throw new HttpError(409, 'The selected wholesale package is no longer available.')
  if (!Number.isInteger(pkg.unitsPerPackage) || pkg.unitsPerPackage < 1) {
    throw new HttpError(409, 'The selected wholesale package is not valid.')
  }

  // The selected package must belong to the selected unit/size. When the
  // package is option-linked the wholesale line must carry that same option;
  // when it is product-level the line must not carry an option.
  if (pkg.productOptionId) {
    const option = product.option
    if (!option || option.id !== pkg.productOptionId) {
      throw new HttpError(409, 'The selected wholesale package does not match the selected unit/size.')
    }
    if (!option.isActive) {
      throw new HttpError(409, `The ${option.label} unit/size is no longer available.`)
    }
  } else if (product.option) {
    throw new HttpError(409, 'The selected wholesale package does not match the selected unit/size.')
  }

  // Availability is expressed in whole packages: floor(unitsOnHand / units per
  // package). For a size-linked package this uses that size's stock; otherwise
  // it uses the product's own stock.
  const unitsOnHand = pkg.productOptionId ? (product.option?.stockQuantity ?? 0) : product.stockQuantity
  const availableCartons = wholesaleAvailableCartons(unitsOnHand, pkg.unitsPerPackage)
  if (availableCartons <= 0) {
    throw new HttpError(409, 'There is not enough stock to fulfill this wholesale package.')
  }
  if (quantity > availableCartons) {
    throw new HttpError(
      409,
      `Insufficient stock. Only ${availableCartons} package(s) of this product are currently available.`,
    )
  }
}
