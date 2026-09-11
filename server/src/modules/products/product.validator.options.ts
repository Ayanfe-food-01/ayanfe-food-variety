import { HttpError } from '../../utils/http.js'
import type { ProductOptionInput, WholesaleTierInput } from './product.types.js'
import { UUID_PATTERN, booleanValue, integerValue, isRecord, moneyValue, requiredText } from './product.validator.common.js'

export const MAX_PRODUCT_OPTIONS = 50
export const MAX_WHOLESALE_TIERS = 30

const positiveIntegerValue = (value: unknown, field: string): number => {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isInteger(number) || number < 1 || number > 1000000000) {
    throw new HttpError(400, `${field} must be a whole number of 1 or more.`)
  }
  return number
}

const wholesaleTierInput = (value: unknown, position: number): WholesaleTierInput => {
  if (!isRecord(value)) throw new HttpError(400, 'Each wholesale unit tier must be an object.')
  const minQuantity = positiveIntegerValue(value.minQuantity, 'Minimum wholesale quantity')
  const maxQuantity = value.maxQuantity === undefined || value.maxQuantity === null || String(value.maxQuantity).trim() === ''
    ? null
    : positiveIntegerValue(value.maxQuantity, 'Maximum wholesale quantity')
  if (maxQuantity !== null && maxQuantity < minQuantity) {
    throw new HttpError(400, `In tier ${position}, the maximum quantity cannot be lower than the minimum quantity.`)
  }
  const id = value.id === undefined || value.id === null ? undefined : (() => {
    const raw = String(value.id).trim()
    if (!UUID_PATTERN.test(raw)) throw new HttpError(400, 'Wholesale tier ID is invalid.')
    return raw
  })()
  return { id, minQuantity, maxQuantity, price: moneyValue(value.price, `Tier ${position} price`, false) }
}

const parseWholesaleTiers = (value: unknown): WholesaleTierInput[] | undefined => {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return undefined
  }
  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      throw new HttpError(400, 'Wholesale pricing must be a valid JSON array.')
    }
  }
  if (!Array.isArray(parsed)) throw new HttpError(400, 'Wholesale pricing must be an array.')
  if (parsed.length > MAX_WHOLESALE_TIERS) {
    throw new HttpError(400, `Each option can have at most ${MAX_WHOLESALE_TIERS} wholesale tiers.`)
  }

  const tiers = parsed.map((tier, index) => wholesaleTierInput(tier, index + 1))
  tiers.sort((a, b) => a.minQuantity - b.minQuantity || (a.maxQuantity ?? Infinity) - (b.maxQuantity ?? Infinity))

  for (let index = 1; index < tiers.length; index += 1) {
    const previous = tiers[index - 1]!
    const current = tiers[index]!
    if (previous.maxQuantity === null) {
      throw new HttpError(400, 'Only the final wholesale tier can have an unlimited maximum quantity.')
    }
    if (current.minQuantity === previous.minQuantity) {
      throw new HttpError(400, 'Each wholesale quantity range must be unique.')
    }
    if (previous.maxQuantity >= current.minQuantity) {
      throw new HttpError(400, 'Wholesale quantity ranges must not overlap.')
    }
  }

  return tiers
}

const wholesaleMoqValue = (value: unknown): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') return null
  return positiveIntegerValue(value, 'Minimum wholesale order')
}

const optionInput = (value: unknown): ProductOptionInput => {
  if (!isRecord(value)) throw new HttpError(400, 'Each product option must be an object.')
  const label = requiredText(value.label, 'Option label', 1, 80)
  const price = moneyValue(value.price, 'Option price', false)
  const id = value.id === undefined || value.id === null ? undefined : (() => {
    const raw = String(value.id).trim()
    if (!UUID_PATTERN.test(raw)) throw new HttpError(400, 'Option ID is invalid.')
    return raw
  })()
  return {
    id,
    label,
    price,
    stockQuantity: value.stockQuantity === undefined ? 0 : integerValue(value.stockQuantity, 'Option stock quantity'),
    lowStockThreshold: value.lowStockThreshold === undefined || value.lowStockThreshold === null || String(value.lowStockThreshold).trim() === ''
      ? null
      : integerValue(value.lowStockThreshold, 'Option low stock threshold'),
    sortOrder: value.sortOrder === undefined ? 0 : integerValue(value.sortOrder, 'Option order'),
    isActive: booleanValue(value.isActive, 'Option availability', true),
    wholesaleMoq: value.wholesaleMoq === undefined ? undefined : wholesaleMoqValue(value.wholesaleMoq),
    wholesalePrices: parseWholesaleTiers(value.wholesalePrices),
  }
}

export function parseProductOptions(value: unknown): ProductOptionInput[] | undefined {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return undefined
  }

  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      throw new HttpError(400, 'Product options must be a valid JSON array.')
    }
  }

  if (!Array.isArray(parsed)) throw new HttpError(400, 'Product options must be an array.')
  if (parsed.length > MAX_PRODUCT_OPTIONS) {
    throw new HttpError(400, `A product can have at most ${MAX_PRODUCT_OPTIONS} options.`)
  }

  const options = parsed.map(optionInput)

  const labels = new Set<string>()
  const orders = new Set<number>()
  for (const option of options) {
    const labelKey = option.label.toLowerCase()
    if (labels.has(labelKey)) throw new HttpError(400, `Duplicate option label "${option.label}".`)
    labels.add(labelKey)
    if (orders.has(option.sortOrder)) {
      throw new HttpError(400, 'Option order positions must be unique.')
    }
    orders.add(option.sortOrder)
  }

  return options
}