import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import type { ProductWholesalePricing, WholesalePriceLookupInput, WholesalePriceLookupResult } from './product.types.js'
import { assertWholesaleOrderable, findWholesaleTier, wholesaleUnitPriceFromOption } from './wholesale.pricing.js'

export const isWholesaleCustomer = (user: AuthenticatedUser | null | undefined): boolean => {
  return Boolean(user && user.role === 'CUSTOMER' && user.shoppingMode === 'WHOLESALE')
}

interface WholesaleFromTier {
  minQuantity: number
  maxQuantity: number | null
  price: Prisma.Decimal
}

const wholesaleFromPrice = (moq: number | null, tiers: WholesaleFromTier[]): string | null => {
  if (tiers.length === 0) return null
  const quantity = moq ?? 1
  const applicable = findWholesaleTier(tiers, quantity) ?? tiers[0]!
  return applicable.price.toString()
}

export const getProductWholesaleFromMap = async (productIds: string[]): Promise<Map<string, string | null>> => {
  const map = new Map<string, string | null>()
  if (productIds.length === 0) return map

  const rows = await prisma.productOption.findMany({
    where: {
      productId: { in: productIds },
      isActive: true,
      wholesalePriceTiers: { some: {} },
    },
    select: {
      productId: true,
      wholesaleMoq: true,
      wholesalePriceTiers: {
        orderBy: { minQuantity: 'asc' },
        select: { minQuantity: true, maxQuantity: true, price: true },
      },
    },
  })

  for (const row of rows) {
    const candidate = wholesaleFromPrice(row.wholesaleMoq, row.wholesalePriceTiers)
    if (candidate === null) continue
    const current = map.get(row.productId)
    if (current === undefined || Number(candidate) < Number(current)) {
      map.set(row.productId, candidate)
    }
  }
  return map
}

export async function getProductWholesalePricing(productId: string): Promise<ProductWholesalePricing | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true, category: { isActive: true } },
    select: { id: true },
  })
  if (!product) return null

  const options = await prisma.productOption.findMany({
    where: { productId, isActive: true, wholesalePriceTiers: { some: {} } },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    include: { wholesalePriceTiers: { orderBy: { minQuantity: 'asc' } } },
  })

  return {
    productId,
    options: options.map((option) => ({
      optionId: option.id,
      label: option.label,
      moq: option.wholesaleMoq,
      tiers: option.wholesalePriceTiers.map((tier) => ({
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity,
        price: tier.price.toString(),
      })),
    })),
  }
}

export async function lookupWholesalePrice(input: WholesalePriceLookupInput): Promise<WholesalePriceLookupResult> {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, isActive: true, category: { isActive: true } },
    select: { id: true },
  })
  if (!product) throw new HttpError(404, 'The product was not found.')

  const option = await prisma.productOption.findFirst({
    where: { id: input.productOptionId, productId: input.productId },
  })
  if (!option || !option.isActive) throw new HttpError(404, 'The product size was not found.')

  const tiers = await prisma.wholesalePriceTier.findMany({
    where: { productId: input.productId, productOptionId: input.productOptionId },
    orderBy: { minQuantity: 'asc' },
  })
  if (tiers.length === 0) {
    throw new HttpError(409, 'Wholesale pricing is not available for this size yet.')
  }

  assertWholesaleOrderable({ wholesaleMoq: option.wholesaleMoq, wholesalePriceTiers: tiers }, input.quantity)

  const tier = findWholesaleTier(tiers, input.quantity)!
  const unitPrice = wholesaleUnitPriceFromOption(
    { wholesaleMoq: option.wholesaleMoq, wholesalePriceTiers: tiers },
    input.quantity,
  )!

  return {
    productId: input.productId,
    productOptionId: input.productOptionId,
    optionLabel: option.label,
    quantity: input.quantity,
    moq: option.wholesaleMoq,
    unitPrice: unitPrice.toString(),
    tier: { minQuantity: tier.minQuantity, maxQuantity: tier.maxQuantity, price: tier.price.toString() },
  }
}