import { HttpError } from '../../utils/http.js'
import type { WholesalePackageInput } from './product.types.js'
import { UUID_PATTERN, booleanValue, integerValue, isRecord, moneyValue, requiredText } from './product.validator.common.js'

export const MAX_WHOLESALE_PACKAGES = 50

const positiveIntegerValue = (value: unknown, field: string): number => {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isInteger(number) || number < 1 || number > 1000000000) {
    throw new HttpError(400, `${field} must be a whole number of 1 or more.`)
  }
  return number
}

export function validateWholesalePackageId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw new HttpError(400, 'Wholesale package ID is invalid.')
  }
  return value.trim()
}

export function parseWholesalePackageInput(body: unknown): WholesalePackageInput {
  if (!isRecord(body)) throw new HttpError(400, 'A wholesale package is required.')

  const optionalId = (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined
    const raw = String(value).trim()
    if (!UUID_PATTERN.test(raw)) throw new HttpError(400, 'Wholesale package ID is invalid.')
    return raw
  }

  // The unit/size (ProductOption) a package belongs to. Explicit null means the
  // product's single unit; undefined means "not specified".
  const optionalOptionId = (value: unknown): string | null | undefined => {
    if (value === undefined) return undefined
    if (value === null) return null
    const raw = String(value).trim()
    if (!UUID_PATTERN.test(raw)) throw new HttpError(400, 'Wholesale package unit/size ID is invalid.')
    return raw
  }

  return {
    id: optionalId(body.id),
    productOptionId: optionalOptionId(body.productOptionId),
    name: requiredText(body.name, 'Package name', 1, 120),
    unitsPerPackage: positiveIntegerValue(body.unitsPerPackage, 'Units per package'),
    price: moneyValue(body.price, 'Package price', false),
    isActive: booleanValue(body.isActive, 'Package availability', true),
    sortOrder: body.sortOrder === undefined ? 0 : integerValue(body.sortOrder, 'Package order'),
  }
}

export function validateWholesalePackageStatusInput(body: unknown): boolean {
  if (!isRecord(body)) throw new HttpError(400, 'A wholesale package availability value is required.')
  return booleanValue(body.isActive, 'Package availability', true)
}

export function validateWholesalePackageReorderInput(body: unknown): string[] {
  if (!isRecord(body)) throw new HttpError(400, 'A wholesale package order is required.')
  if (!Array.isArray(body.packageIds) || body.packageIds.length === 0) {
    throw new HttpError(400, 'packageIds must be a non-empty array.')
  }
  if (body.packageIds.length > MAX_WHOLESALE_PACKAGES) {
    throw new HttpError(400, `A product can have at most ${MAX_WHOLESALE_PACKAGES} wholesale packages.`)
  }
  const seen = new Set<string>()
  const ids: string[] = []
  for (const value of body.packageIds) {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
      throw new HttpError(400, 'Wholesale package ID is invalid.')
    }
    const id = value.trim()
    if (seen.has(id)) throw new HttpError(400, 'Wholesale package IDs must be unique.')
    seen.add(id)
    ids.push(id)
  }
  return ids
}
