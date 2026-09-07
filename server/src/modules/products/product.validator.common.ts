import { HttpError } from '../../utils/http.js'
import type { ProductDiscountType } from '@prisma/client'
import type { ProductInput } from './product.types.js'

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const requiredText = (value: unknown, field: string, minLength: number, maxLength: number): string => {
  if (typeof value !== 'string' || value.trim().length < minLength || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} is required and must be valid.`)
  }
  return value.trim()
}

export const booleanValue = (value: unknown, field: string, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  throw new HttpError(400, `${field} must be true or false.`)
}

export const integerValue = (value: unknown, field: string): number => {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isInteger(number) || number < 0 || number > 1000000000) {
    throw new HttpError(400, `${field} must be a non-negative whole number.`)
  }
  return number
}

export const moneyValue = (value: unknown, field: string, allowZero: boolean): string => {
  if (typeof value !== 'string' && typeof value !== 'number') throw new HttpError(400, `${field} is required.`)
  const normalized = String(value).trim()
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized)
  if (!match) {
    throw new HttpError(400, `${field} must be ${allowZero ? 'zero or a' : 'greater than zero and a'} valid amount.`)
  }
  const wholePart = match[1]!.replace(/^0+(?=\d)/, '')
  const fractionalPart = (match[2] ?? '').padEnd(2, '0')
  if (!allowZero && wholePart === '0' && fractionalPart === '00') {
    throw new HttpError(400, `${field} must be greater than zero and valid.`)
  }
  if (
    wholePart.length > 10
    || (wholePart.length === 10 && wholePart > '1000000000')
    || (wholePart === '1000000000' && fractionalPart !== '00')
  ) {
    throw new HttpError(400, `${field} is too large.`)
  }
  return `${wholePart}.${fractionalPart}`
}

export const priceValue = (value: unknown): string => moneyValue(value, 'Price', false)
export const deliveryFeeValue = (value: unknown): string => moneyValue(value, 'Delivery fee', true)

export const discountTypeValue = (value: unknown): ProductDiscountType | null => {
  if (value === undefined || value === null || value === '') return null
  if (value === 'PERCENTAGE' || value === 'FIXED') return value
  throw new HttpError(400, 'Discount type must be percentage or fixed amount.')
}

export const discountFields = (
  typeValue: unknown,
  value: unknown,
  originalPrice: string,
): Pick<ProductInput, 'discountType' | 'discountValue'> => {
  const discountType = discountTypeValue(typeValue)
  const hasDiscountValue = value !== undefined && value !== null && String(value).trim() !== ''
  if (!discountType) {
    if (hasDiscountValue) throw new HttpError(400, 'A discount type is required when a discount value is provided.')
    return { discountType: null, discountValue: null }
  }

  const discountValue = moneyValue(value, 'Discount value', false)
  const numericValue = Number(discountValue)
  const numericPrice = Number(originalPrice)
  if (discountType === 'PERCENTAGE' && numericValue > 100) {
    throw new HttpError(400, 'Percentage discount cannot be greater than 100.')
  }
  if (discountType === 'FIXED' && numericValue > numericPrice) {
    throw new HttpError(400, 'Fixed discount cannot be greater than the product price.')
  }

  return { discountType, discountValue }
}