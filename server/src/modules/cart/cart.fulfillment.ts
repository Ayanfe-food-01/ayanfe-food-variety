import { Prisma, ShoppingMode } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { assertWholesaleOrderable, type WholesaleTierShape } from '../products/wholesale.pricing.js'

export interface FulfillmentOption {
  id: string
  label: string
  stockQuantity: number
  isActive: boolean
  wholesaleMoq: number | null
  wholesalePriceTiers: WholesaleTierShape[]
}

export interface FulfillmentContext {
  id: string
  isActive: boolean
  stockQuantity: number
  category?: { isActive: boolean }
  option?: FulfillmentOption | null
}

const FULFILLMENT_OPTION_SELECT = {
  id: true,
  label: true,
  stockQuantity: true,
  isActive: true,
  wholesaleMoq: true,
  wholesalePriceTiers: { orderBy: { minQuantity: 'asc' as const } },
} as const

export const findFulfillmentContext = async (
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
        select: FULFILLMENT_OPTION_SELECT,
      },
    },
  })
  if (!product) return null

  const { options, ...context } = product
  return { ...context, option: options[0] ?? null }
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
  if (mode === ShoppingMode.WHOLESALE && product?.option) {
    assertWholesaleOrderable(product.option, quantity)
  }
}