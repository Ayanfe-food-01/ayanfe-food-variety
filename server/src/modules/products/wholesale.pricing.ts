import { Prisma } from '@prisma/client'
import { HttpError } from '../../utils/http.js'

export interface WholesaleTierShape {
  minQuantity: number
  maxQuantity: number | null
  price: Prisma.Decimal
}

export interface WholesaleOrderableOption {
  wholesaleMoq: number | null
  wholesalePriceTiers: WholesaleTierShape[]
}

export const findWholesaleTier = (
  tiers: WholesaleTierShape[],
  quantity: number,
): WholesaleTierShape | null =>
  tiers.find(
    (tier) => quantity >= tier.minQuantity && (tier.maxQuantity === null || quantity <= tier.maxQuantity),
  ) ?? null

export const wholesaleUnitPriceFromOption = (
  option: WholesaleOrderableOption,
  quantity: number,
): Prisma.Decimal | null => {
  if (option.wholesalePriceTiers.length === 0) return null
  const tier = findWholesaleTier(option.wholesalePriceTiers, quantity)
  return tier ? tier.price : null
}

export const assertWholesaleOrderable = (option: WholesaleOrderableOption, quantity: number): void => {
  if (option.wholesaleMoq !== null && option.wholesaleMoq > 1 && quantity < option.wholesaleMoq) {
    throw new HttpError(400, `The minimum order for this size is ${option.wholesaleMoq} units.`)
  }
  if (option.wholesalePriceTiers.length === 0) return
  if (!findWholesaleTier(option.wholesalePriceTiers, quantity)) {
    throw new HttpError(400, 'This quantity does not fit any available wholesale pricing tier.')
  }
}